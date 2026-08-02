import { Body, Controller, HttpCode, Post } from "@nestjs/common";
import { ClientTelemetryDto } from "./dto/client-telemetry.dto";
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
}
