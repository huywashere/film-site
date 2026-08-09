import { Module } from "@nestjs/common";
import { WatchPartyGateway } from "./watch-party.gateway";
import { WatchPartyService } from "./watch-party.service";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [AuthModule],
  providers: [WatchPartyGateway, WatchPartyService],
})
export class WatchPartyModule {}
