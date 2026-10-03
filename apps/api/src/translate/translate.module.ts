import { Module } from "@nestjs/common";
import { TranslateController } from "./translate.controller";
import { TranslateService } from "./translate.service";
import { RedisCacheModule } from "../redis/redis.module";

@Module({
  imports: [RedisCacheModule],
  controllers: [TranslateController],
  providers: [TranslateService],
  exports: [TranslateService],
})
export class TranslateModule {}
