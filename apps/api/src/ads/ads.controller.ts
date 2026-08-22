import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  Query,
} from "@nestjs/common";
import { AdsService } from "./ads.service";

@Controller("ads")
export class AdsController {
  constructor(private readonly adsService: AdsService) {}

  /** Public: Get all active ads */
  @Get("active")
  getActiveAds(@Query("category") category?: string) {
    return this.adsService.getActiveAds(category);
  }

  /** Public: Track Impression */
  @Post(":id/view")
  recordView(@Param("id") id: string) {
    return this.adsService.recordImpression(id);
  }

  /** Public: Track Click */
  @Post(":id/click")
  recordClick(@Param("id") id: string) {
    return this.adsService.recordClick(id);
  }
}
