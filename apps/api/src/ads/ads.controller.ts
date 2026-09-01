import { Controller, Get, Post, Param, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { AdsService } from './ads.service';

@Controller('ads')
export class AdsController {
  constructor(private readonly adsService: AdsService) {}

  /** Public: Get all active ads */
  @Get('active')
  getActiveAds(@Query('category') category?: string) {
    return this.adsService.getActiveAds(category);
  }

  /** Authenticated: Track Impression */
  @Post(':id/view')
  @UseGuards(AuthGuard('jwt'))
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  recordView(@Request() req: { user: { id: string } }, @Param('id') id: string) {
    return this.adsService.recordImpression(id, req.user.id);
  }

  /** Authenticated: Track Click */
  @Post(':id/click')
  @UseGuards(AuthGuard('jwt'))
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  recordClick(@Request() req: { user: { id: string } }, @Param('id') id: string) {
    return this.adsService.recordClick(id, req.user.id);
  }
}
