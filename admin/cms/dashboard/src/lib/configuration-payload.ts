export type EditableSiteConfiguration = {
  maintenanceMode: boolean;
  maintenanceNotice: string | null;
  announcementText: string | null;
  announcementLink: string | null;
  homePopupEnabled: boolean;
  homePopupTitle: string | null;
  homePopupBody: string | null;
  homePopupLink: string | null;
  homePopupLinkLabel: string | null;
  homePopupDismissLabel: string | null;
  heroMovieSlugs: string[];
  providerPriority: string[];
  autoSkipIntro: boolean;
  watchPartyEnabled: boolean;
  homeTop10Slugs: string[];
  homeSectionOrder: string[];
  homeHiddenSections: string[];
  homeFeaturedRows?: Record<string, unknown> | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
};

export function configurationUpdatePayload(config: EditableSiteConfiguration) {
  return {
    maintenanceMode: config.maintenanceMode,
    maintenanceNotice: config.maintenanceNotice || "",
    announcementText: config.announcementText || "",
    announcementLink: config.announcementLink || "",
    homePopupEnabled: config.homePopupEnabled,
    homePopupTitle: config.homePopupTitle || "",
    homePopupBody: config.homePopupBody || "",
    homePopupLink: config.homePopupLink || "",
    homePopupLinkLabel: config.homePopupLinkLabel || "",
    homePopupDismissLabel: config.homePopupDismissLabel || "",
    heroMovieSlugs: config.heroMovieSlugs,
    providerPriority: config.providerPriority,
    autoSkipIntro: config.autoSkipIntro,
    watchPartyEnabled: config.watchPartyEnabled,
    homeTop10Slugs: config.homeTop10Slugs,
    homeSectionOrder: config.homeSectionOrder,
    homeHiddenSections: config.homeHiddenSections,
    homeFeaturedRows: config.homeFeaturedRows || {},
    seoTitle: config.seoTitle || "",
    seoDescription: config.seoDescription || "",
  };
}
