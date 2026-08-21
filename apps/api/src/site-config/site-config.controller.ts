import { Controller, Get } from "@nestjs/common";
import { SiteConfigService } from "./site-config.service";

@Controller("config")
export class SiteConfigController {
  constructor(private readonly siteConfig: SiteConfigService) {}

  @Get("public")
  getPublicConfiguration() {
    return this.siteConfig.getPublicConfiguration();
  }
}
