import { Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { TranslateService } from "./translate.service";
import {
  TranslateBatchDto,
  TranslateSubtitleDto,
  TranslateTextDto,
} from "./translate.dto";

@Controller("translate")
export class TranslateController {
  constructor(private readonly translateService: TranslateService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async translate(@Body() dto: TranslateTextDto) {
    const translated = await this.translateService.translateText(
      dto.text,
      dto.from || "auto",
      dto.to || "vi",
    );
    return {
      success: true,
      original: dto.text,
      translated,
      from: dto.from || "auto",
      to: dto.to || "vi",
    };
  }

  @Post("batch")
  @HttpCode(HttpStatus.OK)
  async translateBatch(@Body() dto: TranslateBatchDto) {
    const results = await this.translateService.translateBatch(
      dto.texts,
      dto.from || "auto",
      dto.to || "vi",
    );
    return {
      success: true,
      count: results.length,
      translated: results,
      from: dto.from || "auto",
      to: dto.to || "vi",
    };
  }

  @Post("subtitle")
  @HttpCode(HttpStatus.OK)
  async translateSubtitle(@Body() dto: TranslateSubtitleDto) {
    const translated = await this.translateService.translateSubtitle(
      dto.content,
      dto.from || "auto",
      dto.to || "vi",
    );
    return {
      success: true,
      translated,
      from: dto.from || "auto",
      to: dto.to || "vi",
    };
  }
}
