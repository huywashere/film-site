import { Module } from "@nestjs/common";
import { SubtitlesController } from "./subtitles.controller";
import { SubtitlesService } from "./subtitles.service";

@Module({
  controllers: [SubtitlesController],
  providers: [SubtitlesService],
  exports: [SubtitlesService],
})
export class SubtitlesModule {}
