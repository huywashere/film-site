import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { OcrService } from "./ocr.service";
import { RecognizeBase64Dto, RecognizeUrlDto } from "./ocr.dto";

@Controller("ocr")
export class OcrController {
  constructor(private readonly ocrService: OcrService) {}

  @Post("upload")
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
      fileFilter: (_req, file, cb) => {
        const allowedExt = /\.(jpe?g|png|webp|bmp)$/i;
        if (!allowedExt.test(file.originalname)) {
          return cb(
            new BadRequestException("Chỉ chấp nhận file ảnh (jpg, png, webp, bmp)"),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async recognizeUploadedFile(
    @UploadedFile() file?: Express.Multer.File,
    @Query("lang") lang?: string,
  ) {
    if (!file) {
      throw new BadRequestException("Vui lòng đính kèm file ảnh (file)");
    }

    const result = await this.ocrService.recognize(file.buffer, lang || "vie+eng");
    return {
      success: true,
      ...result,
    };
  }

  @Post("url")
  @HttpCode(HttpStatus.OK)
  async recognizeUrl(@Body() dto: RecognizeUrlDto) {
    const result = await this.ocrService.recognizeFromUrl(dto.imageUrl, dto.lang);
    return {
      success: true,
      ...result,
    };
  }

  @Post("base64")
  @HttpCode(HttpStatus.OK)
  async recognizeBase64(@Body() dto: RecognizeBase64Dto) {
    const result = await this.ocrService.recognizeFromBase64(dto.base64, dto.lang);
    return {
      success: true,
      ...result,
    };
  }
}
