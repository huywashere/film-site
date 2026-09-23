import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Post,
  UnauthorizedException,
  UseGuards,
  Request,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { timingSafeEqual } from 'crypto';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { ClientTelemetryDto } from './dto/client-telemetry.dto';
import { ClientTelemetryBatchDto } from './dto/client-telemetry-batch.dto';
import { TelemetryService } from './telemetry.service';

function secureTokenMatch(actual: string | undefined, expected: string): boolean {
  if (!actual) return false;
  const left = Buffer.from(actual);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

@Controller('telemetry')
export class TelemetryController {
  constructor(private readonly telemetry: TelemetryService) {}

  @Post('client')
  @UseGuards(OptionalJwtAuthGuard)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @HttpCode(202)
  captureClientEvent(@Request() req: { user?: { id: string } }, @Body() event: ClientTelemetryDto) {
    this.telemetry.capture(event, req.user?.id);
    return { accepted: true };
  }

  @Post('client/batch')
  @UseGuards(OptionalJwtAuthGuard)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @HttpCode(202)
  captureClientEvents(
    @Request() req: { user?: { id: string } },
    @Body() batch: ClientTelemetryBatchDto,
  ) {
    this.telemetry.captureMany(batch.events, req.user?.id);
    return { accepted: batch.events.length };
  }

  @Get('metrics')
  metrics(@Headers('x-admin-metrics-token') token?: string) {
    const expected = process.env.ADMIN_METRICS_TOKEN;
    if (!expected || !secureTokenMatch(token, expected)) {
      throw new UnauthorizedException();
    }
    return this.telemetry.snapshot();
  }
}
