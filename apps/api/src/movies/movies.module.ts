import { Module } from "@nestjs/common";
import { MoviesController } from "./movies.controller";
import { MoviesService } from "./movies.service";
import { VidsrcService } from "./vidsrc.service";

@Module({
  controllers: [MoviesController],
  providers: [MoviesService, VidsrcService],
  exports: [MoviesService],
})
export class MoviesModule {}
