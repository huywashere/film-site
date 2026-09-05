import { Controller, Get, Param, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { RecommendationsService } from './recommendations.service';

@Controller('recommendations')
export class RecommendationsController {
  constructor(private readonly recommendationsService: RecommendationsService) {}

  /**
   * Get AI-curated Top 10 movies for Duyệt Tìm (/genres).
   */
  @Get('top10')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  getTop10(@Query('userId') userId?: string) {
    return this.recommendationsService.getTop10(userId);
  }

  /**
   * Get AI-calculated similar & recommended movies for Watch page (/watch/[slug]).
   */
  @Get('similar/:slug')
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  getSimilar(
    @Param('slug') slug: string,
    @Query('limit') limit?: string,
  ) {
    const numLimit = limit ? Math.min(Math.max(Number(limit) || 12, 1), 30) : 12;
    return this.recommendationsService.getSimilar(slug, numLimit);
  }
}
