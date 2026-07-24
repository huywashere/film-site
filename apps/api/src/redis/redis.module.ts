import { Global, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { RedisCacheService } from "./redis.service";

@Global()
@Module({
  imports: [ConfigModule],
  providers: [RedisCacheService],
  exports: [RedisCacheService],
})
export class RedisCacheModule {}
