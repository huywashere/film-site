import { Module } from "@nestjs/common";
import { MoviesController } from "./movies.controller";
import { MoviesService } from "./movies.service";
import { VidsrcService } from "./vidsrc.service";
import { StreamTokenService } from "./stream-token.service";

@Module({
  controllers: [MoviesController],
  providers: [MoviesService, VidsrcService, StreamTokenService],
  exports: [MoviesService, StreamTokenService],
})
export class MoviesModule {}
