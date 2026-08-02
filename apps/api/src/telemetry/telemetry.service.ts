import { Injectable, Logger } from "@nestjs/common";
import * as Sentry from "@sentry/node";
import { ClientTelemetryDto } from "./dto/client-telemetry.dto";

@Injectable()
export class TelemetryService {
  private readonly logger = new Logger(TelemetryService.name);

  capture(event: ClientTelemetryDto) {
    const level = event.level || "info";
    const tags = {
      client_event: event.name,
      route: event.route || "unknown",
    };

    this.logger.debug({ ...tags, properties: event.properties });
    Sentry.withScope((scope) => {
      scope.setTags(tags);
      scope.setContext("client_event", {
        ...event.properties,
        timestamp: event.timestamp,
      });
      Sentry.captureMessage(`Client telemetry: ${event.name}`, level);
    });
  }
}
