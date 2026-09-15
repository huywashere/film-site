import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Prisma } from "@prisma/client";

const DEFAULT_CONFIGURATION = {
  maintenanceMode: false,
  maintenanceNotice: "",
  announcementText: "",
  announcementLink: "",
  homePopupEnabled: false,
  homePopupTitle: "Thông báo từ FlexPhim",
  homePopupBody: "",
  homePopupLink: "",
  homePopupLinkLabel: "Xem chi tiết",
  homePopupDismissLabel: "Đã hiểu",
  homePopupVersion: 1,
  heroMovieSlugs: [] as string[],
  providerPriority: ["kkphim", "ophim", "nguonc", "vsmov", "vicdn"],
  autoSkipIntro: false,
  watchPartyEnabled: true,
  homeTop10Slugs: [] as string[],
  homeSectionOrder: ["top10", "continue", "latest", "vfx", "usuk-series", "action", "scifi"],
  homeHiddenSections: [] as string[],
  homeFeaturedRows: {} as Prisma.InputJsonValue,
  seoTitle: "FlexPhim - Xem phim trực tuyến",
  seoDescription: "Kho phim trực tuyến đa nguồn, cập nhật liên tục.",
  cacheVersion: 1,
};

import { RedisCacheService } from "../redis/redis.service";

const CONFIG_CACHE_KEY = "site-config:primary";

const BRAND_TEXT_FIELDS = [
  "maintenanceNotice",
  "announcementText",
  "homePopupTitle",
  "homePopupBody",
  "homePopupLinkLabel",
  "homePopupDismissLabel",
  "seoTitle",
  "seoDescription",
] as const;

function normalizeLegacyBrand<T extends Record<string, unknown>>(config: T): T {
  const normalized: Record<string, unknown> = { ...config };
  for (const field of BRAND_TEXT_FIELDS) {
    const value = normalized[field];
    if (typeof value === "string" && value.includes("NetPhim")) {
      normalized[field] = value.replace(/NetPhim/g, "FlexPhim");
    }
  }
  return normalized as T;
}

@Injectable()
export class SiteConfigService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: RedisCacheService,
  ) {}

  async getConfiguration() {
    const cached = await this.cache.getJson<any>(CONFIG_CACHE_KEY);
    if (cached) return normalizeLegacyBrand(cached);

    const stored = await this.prisma.siteConfiguration.findUnique({ where: { id: "primary" } });
    const result = normalizeLegacyBrand(stored || { id: "primary", ...DEFAULT_CONFIGURATION });
    await this.cache.setJson(CONFIG_CACHE_KEY, result, 3600);
    return result;
  }

  async updateConfiguration(data: Partial<typeof DEFAULT_CONFIGURATION>, updatedBy: string) {
    const previous = await this.getConfiguration();
    const popupKeys = [
      "homePopupEnabled",
      "homePopupTitle",
      "homePopupBody",
      "homePopupLink",
      "homePopupLinkLabel",
      "homePopupDismissLabel",
    ] as const;
    const popupChanged = popupKeys.some(
      (key) => key in data && data[key] !== previous[key],
    );
    const clean = normalizeLegacyBrand({
      ...data,
      ...(popupChanged
        ? { homePopupVersion: (previous.homePopupVersion || 0) + 1 }
        : {}),
      ...(data.heroMovieSlugs ? { heroMovieSlugs: [...new Set(data.heroMovieSlugs.map((item) => item.trim()).filter(Boolean))] } : {}),
      ...(data.providerPriority ? { providerPriority: [...new Set(data.providerPriority)] } : {}),
      ...(data.homeTop10Slugs ? { homeTop10Slugs: [...new Set(data.homeTop10Slugs.map((item) => item.trim()).filter(Boolean))] } : {}),
      ...(data.homeSectionOrder ? { homeSectionOrder: [...new Set(data.homeSectionOrder.map((item) => item.trim()).filter(Boolean))] } : {}),
      ...(data.homeHiddenSections ? { homeHiddenSections: [...new Set(data.homeHiddenSections.map((item) => item.trim()).filter(Boolean))] } : {}),
      ...(data.homeFeaturedRows ? { homeFeaturedRows: data.homeFeaturedRows as Prisma.InputJsonValue } : {}),
      ...(["heroMovieSlugs", "homeTop10Slugs", "homeSectionOrder", "homeHiddenSections", "homeFeaturedRows", "seoTitle", "seoDescription"].some((key) => key in data)
        ? { cacheVersion: (previous.cacheVersion || 0) + 1 }
        : {}),
      updatedBy,
    });
    const updated = await this.prisma.siteConfiguration.upsert({
      where: { id: "primary" },
      create: { id: "primary", ...DEFAULT_CONFIGURATION, ...clean },
      update: clean,
    });
    await this.cache.del(CONFIG_CACHE_KEY);
    return updated;
  }

  async getPublicConfiguration() {
    const config = await this.getConfiguration();
    return {
      maintenanceMode: config.maintenanceMode,
      maintenanceNotice: config.maintenanceNotice,
      announcementText: config.announcementText,
      announcementLink: config.announcementLink,
      homePopupEnabled: config.homePopupEnabled,
      homePopupTitle: config.homePopupTitle,
      homePopupBody: config.homePopupBody,
      homePopupLink: config.homePopupLink,
      homePopupLinkLabel: config.homePopupLinkLabel,
      homePopupDismissLabel: config.homePopupDismissLabel,
      homePopupVersion: config.homePopupVersion,
      heroMovieSlugs: config.heroMovieSlugs,
      providerPriority: config.providerPriority,
      autoSkipIntro: config.autoSkipIntro,
      watchPartyEnabled: config.watchPartyEnabled,
      homeTop10Slugs: config.homeTop10Slugs,
      homeSectionOrder: config.homeSectionOrder,
      homeHiddenSections: config.homeHiddenSections,
      homeFeaturedRows: config.homeFeaturedRows,
      seoTitle: config.seoTitle,
      seoDescription: config.seoDescription,
      cacheVersion: config.cacheVersion,
      updatedAt: "updatedAt" in config ? config.updatedAt : null,
    };
  }
}
