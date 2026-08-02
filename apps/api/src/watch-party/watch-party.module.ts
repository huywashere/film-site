import { Module } from "@nestjs/common";
import { WatchPartyGateway } from "./watch-party.gateway";
import { WatchPartyService } from "./watch-party.service";

@Module({
  providers: [WatchPartyGateway, WatchPartyService],
})
export class WatchPartyModule {}
