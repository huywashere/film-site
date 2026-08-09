import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Post,
  UnauthorizedException,
} from "@nestjs/common";
import { ClientTelemetryDto } from "./dto/client-telemetry.dto";
import { ClientTelemetryBatchDto } from "./dto/client-telemetry-batch.dto";
import { TelemetryService } from "./telemetry.service";

@Controller("telemetry")
export class TelemetryController {
  constructor(private readonly telemetry: TelemetryService) {}

  @Post("client")
  @HttpCode(202)
  captureClientEvent(@Body() event: ClientTelemetryDto) {
    this.telemetry.capture(event);
    return { accepted: true };
  }

  @Post("client/batch")
  @HttpCode(202)
  captureClientEvents(@Body() batch: ClientTelemetryBatchDto) {
    this.telemetry.captureMany(batch.events);
    return { accepted: batch.events.length };
  }

  @Get("metrics")
  metrics(@Headers("x-admin-metrics-token") token?: string) {
    const expected = process.env.ADMIN_METRICS_TOKEN;
    if (expected && token !== expected) {
      throw new UnauthorizedException();
    }
    return this.telemetry.snapshot();
  }
}
