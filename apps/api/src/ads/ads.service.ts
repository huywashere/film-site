import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisCacheService } from '../redis/redis.service';
import { FilterXSS, type IFilterXSSOptions } from 'xss';

const ACTIVE_ADS_CACHE_KEY = 'ads:active:all';

const AD_HTML_OPTIONS: IFilterXSSOptions = {
  whiteList: {
    a: ['href', 'title'],
    img: ['src', 'alt', 'title', 'width', 'height'],
    article: ['class'],
    b: ['class'],
    br: ['class'],
    div: ['class'],
    em: ['class'],
    figure: ['class'],
    figcaption: ['class'],
    h2: ['class'],
    h3: ['class'],
    p: ['class'],
    small: ['class'],
    span: ['class'],
    strong: ['class'],
  },
  stripIgnoreTag: true,
  stripIgnoreTagBody: ['script', 'style', 'iframe', 'object', 'embed'],
  css: false,
  onTagAttr: (_tag, name, value) => {
    if (name !== 'href' && name !== 'src') return undefined;
    const url = value.trim();
    if (/^https:\/\//i.test(url) || /^\/(?!\/)/.test(url)) return undefined;
    return '';
  },
};
const adHtmlFilter = new FilterXSS(AD_HTML_OPTIONS);

function cleanText(value: unknown, maxLength: number): string {
  return String(value || '')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim()
    .slice(0, maxLength);
}

function cleanExternalUrl(value: unknown): string | null {
  const raw = cleanText(value, 2048);
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' || url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function cleanAdHtml(value: unknown): string | null {
  const cleaned = adHtmlFilter
    .process(cleanText(value, 50_000))
    .replace(/<a(?=\s|>)/g, '<a target="_blank" rel="noopener noreferrer nofollow sponsored"')
    .replace(/<img(?=\s|>)/g, '<img loading="lazy"')
    .trim();
  return cleaned || null;
}

export function sanitizeAdRecord<T extends Record<string, any>>(ad: T): T {
  return {
    ...ad,
    title: cleanText(ad.title, 160),
    imageUrl: cleanExternalUrl(ad.imageUrl),
    targetUrl: cleanExternalUrl(ad.targetUrl),
    htmlContent: cleanAdHtml(ad.htmlContent),
    videoVastUrl: cleanExternalUrl(ad.videoVastUrl),
  };
}

@Injectable()
export class AdsService {
  private readonly logger = new Logger(AdsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: RedisCacheService,
  ) {}

  /** Public API: Cached in Redis (1 hour), returns all currently active ads */
  async getActiveAds(category?: string) {
    const cached = await this.cache.getJson<any[]>(ACTIVE_ADS_CACHE_KEY);
    let allAds: any[] = [];

    if (cached !== null) {
      allAds = cached;
    } else {
      const now = new Date();
      allAds = await (this.prisma as any).adPlacement.findMany({
        where: {
          isActive: true,
          OR: [{ startDate: null }, { startDate: { lte: now } }],
          AND: [{ OR: [{ endDate: null }, { endDate: { gte: now } }] }],
        },
        orderBy: { createdAt: 'desc' },
      });
      await this.cache.setJson(ACTIVE_ADS_CACHE_KEY, allAds, 3600);
    }

    const safeAds = allAds.map((ad) => sanitizeAdRecord(ad));

    if (!category) return safeAds;

    // Filter by category if specified
    return safeAds.filter((ad) => {
      if (!ad.categories || ad.categories.length === 0) return true;
      return ad.categories.includes(category);
    });
  }

  /** Record Impression */
  async recordImpression(adId: string, userId: string) {
    const lockKey = `ad_impression:${userId}:${adId}`;
    const acquired = await this.cache.acquireLock(lockKey, 60 * 60 * 1000);
    if (!acquired) return { recorded: false };
    try {
      await (this.prisma as any).adPlacement.update({
        where: { id: adId },
        data: { impressions: { increment: 1 } },
      });
    } catch {
      await this.cache.releaseLock(lockKey).catch(() => false);
      return { recorded: false };
    }
    return { recorded: true };
  }

  /** Record Click */
  async recordClick(adId: string, userId: string) {
    const lockKey = `ad_click:${userId}:${adId}`;
    const acquired = await this.cache.acquireLock(lockKey, 5 * 60 * 1000);
    if (!acquired) return { recorded: false };
    try {
      await (this.prisma as any).adPlacement.update({
        where: { id: adId },
        data: { clicks: { increment: 1 } },
      });
    } catch {
      await this.cache.releaseLock(lockKey).catch(() => false);
      return { recorded: false };
    }
    return { recorded: true };
  }

  /** Admin List All */
  async getAllAdsAdmin() {
    return (this.prisma as any).adPlacement.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Admin Create */
  async createAd(dto: {
    title: string;
    type: string;
    imageUrl?: string;
    targetUrl?: string;
    htmlContent?: string;
    videoVastUrl?: string;
    videoDuration?: number;
    skipOffsetSec?: number;
    categories?: string[];
    isActive?: boolean;
    startDate?: string | null;
    endDate?: string | null;
  }) {
    const created = await (this.prisma as any).adPlacement.create({
      data: {
        title: cleanText(dto.title, 160),
        type: cleanText(dto.type, 40),
        imageUrl: cleanExternalUrl(dto.imageUrl),
        targetUrl: cleanExternalUrl(dto.targetUrl),
        htmlContent: cleanAdHtml(dto.htmlContent),
        videoVastUrl: cleanExternalUrl(dto.videoVastUrl),
        videoDuration: Math.min(Math.max(Number(dto.videoDuration) || 15, 1), 600),
        skipOffsetSec: Math.min(Math.max(Number(dto.skipOffsetSec) || 5, 0), 120),
        categories: (dto.categories || [])
          .map((item) => cleanText(item, 60))
          .filter(Boolean)
          .slice(0, 30),
        isActive: dto.isActive ?? true,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
      },
    });

    await this.cache.del(ACTIVE_ADS_CACHE_KEY);
    return created;
  }

  /** Admin Update */
  async updateAd(
    id: string,
    dto: Partial<{
      title: string;
      type: string;
      imageUrl: string | null;
      targetUrl: string | null;
      htmlContent: string | null;
      videoVastUrl: string | null;
      videoDuration: number;
      skipOffsetSec: number;
      categories: string[];
      isActive: boolean;
      startDate: string | null;
      endDate: string | null;
    }>,
  ) {
    const updated = await (this.prisma as any).adPlacement.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: cleanText(dto.title, 160) } : {}),
        ...(dto.type !== undefined ? { type: cleanText(dto.type, 40) } : {}),
        ...(dto.imageUrl !== undefined ? { imageUrl: cleanExternalUrl(dto.imageUrl) } : {}),
        ...(dto.targetUrl !== undefined ? { targetUrl: cleanExternalUrl(dto.targetUrl) } : {}),
        ...(dto.htmlContent !== undefined ? { htmlContent: cleanAdHtml(dto.htmlContent) } : {}),
        ...(dto.videoVastUrl !== undefined
          ? { videoVastUrl: cleanExternalUrl(dto.videoVastUrl) }
          : {}),
        ...(dto.videoDuration !== undefined
          ? { videoDuration: Math.min(Math.max(Number(dto.videoDuration) || 15, 1), 600) }
          : {}),
        ...(dto.skipOffsetSec !== undefined
          ? { skipOffsetSec: Math.min(Math.max(Number(dto.skipOffsetSec) || 0, 0), 120) }
          : {}),
        ...(dto.categories !== undefined
          ? {
              categories: dto.categories
                .map((item) => cleanText(item, 60))
                .filter(Boolean)
                .slice(0, 30),
            }
          : {}),
        ...(dto.isActive !== undefined ? { isActive: Boolean(dto.isActive) } : {}),
        startDate: dto.startDate ? new Date(dto.startDate) : dto.startDate,
        endDate: dto.endDate ? new Date(dto.endDate) : dto.endDate,
      },
    });

    await this.cache.del(ACTIVE_ADS_CACHE_KEY);
    return updated;
  }

  /** Admin Toggle Active */
  async toggleAd(id: string) {
    const ad = await (this.prisma as any).adPlacement.findUnique({ where: { id } });
    if (!ad) throw new NotFoundException('Không tìm thấy quảng cáo');

    const updated = await (this.prisma as any).adPlacement.update({
      where: { id },
      data: { isActive: !ad.isActive },
    });

    await this.cache.del(ACTIVE_ADS_CACHE_KEY);
    return updated;
  }

  /** Admin Delete */
  async deleteAd(id: string) {
    const deleted = await (this.prisma as any).adPlacement.delete({ where: { id } });
    await this.cache.del(ACTIVE_ADS_CACHE_KEY);
    return deleted;
  }
}
