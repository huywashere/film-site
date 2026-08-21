import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

const DEFAULT_CONFIGURATION = {
  maintenanceMode: false,
  maintenanceNotice: "",
  announcementText: "",
  announcementLink: "",
  homePopupEnabled: false,
  homePopupTitle: "Thông báo từ NetPhim",
  homePopupBody: "",
  homePopupLink: "",
  homePopupLinkLabel: "Xem chi tiết",
  homePopupDismissLabel: "Đã hiểu",
  homePopupVersion: 1,
  heroMovieSlugs: [] as string[],
  providerPriority: ["kkphim", "ophim", "nguonc", "vsmov"],
  autoSkipIntro: false,
  watchPartyEnabled: true,
};

@Injectable()
export class SiteConfigService {
  constructor(private readonly prisma: PrismaService) {}

  async getConfiguration() {
    const stored = await this.prisma.siteConfiguration.findUnique({ where: { id: "primary" } });
    return stored || { id: "primary", ...DEFAULT_CONFIGURATION };
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
    const clean = {
      ...data,
      ...(popupChanged
        ? { homePopupVersion: (previous.homePopupVersion || 0) + 1 }
        : {}),
      ...(data.heroMovieSlugs ? { heroMovieSlugs: [...new Set(data.heroMovieSlugs.map((item) => item.trim()).filter(Boolean))] } : {}),
      ...(data.providerPriority ? { providerPriority: [...new Set(data.providerPriority)] } : {}),
      updatedBy,
    };
    return this.prisma.siteConfiguration.upsert({
      where: { id: "primary" },
      create: { id: "primary", ...DEFAULT_CONFIGURATION, ...clean },
      update: clean,
    });
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
      updatedAt: "updatedAt" in config ? config.updatedAt : null,
    };
  }
}
