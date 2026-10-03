import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Response } from "express";
import { SubtitlesService } from "./subtitles.service";
import { ConvertSubtitleDto } from "./subtitles.dto";

@Controller("subtitles")
export class SubtitlesController {
  constructor(private readonly subtitlesService: SubtitlesService) {}

  @Post("upload")
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
      fileFilter: (_req, file, cb) => {
        const allowedExt = /\.(srt|vtt)$/i;
        if (!allowedExt.test(file.originalname)) {
          return cb(
            new BadRequestException("Chỉ chấp nhận file phụ đề .srt hoặc .vtt"),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async uploadSubtitle(@UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException("Vui lòng đính kèm file phụ đề (file)");
    }

    const result = await this.subtitlesService.saveSubtitleFile(
      file.buffer,
      file.originalname,
    );

    return {
      success: true,
      filename: result.filename,
      url: `/api/v1/subtitles/file/${result.filename}`,
      size: result.size,
    };
  }

  @Post("convert")
  @HttpCode(HttpStatus.OK)
  convertSubtitle(@Body() dto: ConvertSubtitleDto) {
    const vtt = this.subtitlesService.convertSrtToVtt(dto.content);
    return {
      success: true,
      vtt,
    };
  }

  @Get("file/:filename")
  async getSubtitleFile(
    @Param("filename") filename: string,
    @Res() res: Response,
  ) {
    const content = await this.subtitlesService.getSubtitleContent(filename);
    res.setHeader("Content-Type", "text/vtt; charset=utf-8");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "public, max-age=86400");
    return res.send(content);
  }
}
