import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { RedisCacheService } from "../redis/redis.service";

const ACTIVE_ADS_CACHE_KEY = "ads:active:all";

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
        orderBy: { createdAt: "desc" },
      });
      await this.cache.setJson(ACTIVE_ADS_CACHE_KEY, allAds, 3600);
    }

    if (!category) return allAds;

    // Filter by category if specified
    return allAds.filter((ad) => {
      if (!ad.categories || ad.categories.length === 0) return true;
      return ad.categories.includes(category);
    });
  }

  /** Record Impression */
  async recordImpression(adId: string) {
    try {
      await (this.prisma as any).adPlacement.update({
        where: { id: adId },
        data: { impressions: { increment: 1 } },
      });
    } catch {
      // ignore
    }
    return { recorded: true };
  }

  /** Record Click */
  async recordClick(adId: string) {
    try {
      await (this.prisma as any).adPlacement.update({
        where: { id: adId },
        data: { clicks: { increment: 1 } },
      });
    } catch {
      // ignore
    }
    return { recorded: true };
  }

  /** Admin List All */
  async getAllAdsAdmin() {
    return (this.prisma as any).adPlacement.findMany({
      orderBy: { createdAt: "desc" },
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
        title: dto.title,
        type: dto.type,
        imageUrl: dto.imageUrl || null,
        targetUrl: dto.targetUrl || null,
        htmlContent: dto.htmlContent || null,
        videoVastUrl: dto.videoVastUrl || null,
        videoDuration: dto.videoDuration || 15,
        skipOffsetSec: dto.skipOffsetSec || 5,
        categories: dto.categories || [],
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
        ...dto,
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
    if (!ad) throw new NotFoundException("Không tìm thấy quảng cáo");

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
