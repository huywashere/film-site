import { Injectable, Logger } from "@nestjs/common";
import axios from "axios";
import { createWorker } from "tesseract.js";

export interface OcrResult {
  text: string;
  confidence: number;
  lang: string;
}

@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);

  /**
   * Run OCR on image buffer
   */
  async recognize(buffer: Buffer, lang = "vie+eng"): Promise<OcrResult> {
    const worker = await createWorker(lang);
    try {
      const ret = await worker.recognize(buffer);
      await worker.terminate();

      return {
        text: ret.data.text.trim(),
        confidence: Math.round(ret.data.confidence),
        lang,
      };
    } catch (err: unknown) {
      await worker.terminate().catch(() => {});
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`OCR recognition failed: ${msg}`);
      throw err;
    }
  }

  /**
   * Run OCR on remote image URL (e.g. video frame snapshot, poster, subtitle watermark)
   */
  async recognizeFromUrl(imageUrl: string, lang = "vie+eng"): Promise<OcrResult> {
    const response = await axios.get(imageUrl, {
      responseType: "arraybuffer",
      timeout: 10000,
    });
    const buffer = Buffer.from(response.data);
    return this.recognize(buffer, lang);
  }

  /**
   * Run OCR on base64 string
   */
  async recognizeFromBase64(base64Str: string, lang = "vie+eng"): Promise<OcrResult> {
    const cleanBase64 = base64Str.replace(/^data:image\/[a-z]+;base64,/, "");
    const buffer = Buffer.from(cleanBase64, "base64");
    return this.recognize(buffer, lang);
  }
}
