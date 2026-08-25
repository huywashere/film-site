import { Module } from "@nestjs/common";
import { MoviesController } from "./movies.controller";
import { MoviesService } from "./movies.service";
import { VidsrcService } from "./vidsrc.service";
import { SearchIndexerService } from "./search-indexer.service";

@Module({
  controllers: [MoviesController],
  providers: [MoviesService, VidsrcService, SearchIndexerService],
  exports: [MoviesService, SearchIndexerService],
})
export class MoviesModule {}
