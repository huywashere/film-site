import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from "@nestjs/common";
import { Throttle, ThrottlerGuard } from "@nestjs/throttler";
import { AuthGuard } from "@nestjs/passport";
import { ReviewsService } from "./reviews.service";
import { CreateReviewDto } from "./reviews.dto";

function safePage(value: unknown): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? Math.min(Math.max(parsed, 1), 10_000) : 1;
}

@Controller("reviews")
@UseGuards(ThrottlerGuard)
export class ReviewsController {
  constructor(private reviewsService: ReviewsService) {}

  @Get()
  getRecent(@Query("page") page = 1) {
    return this.reviewsService.getRecent(safePage(page));
  }

  @Get("movie/:movieId")
  getByMovie(@Param("movieId") movieId: string, @Query("page") page = 1) {
    return this.reviewsService.getByMovie(movieId.slice(0, 180), safePage(page));
  }

  @Get("mine")
  @UseGuards(AuthGuard("jwt"))
  getMine(@Request() req, @Query("page") page = 1) {
    return this.reviewsService.getMine(req.user.id, safePage(page));
  }

  @Post()
  @UseGuards(AuthGuard("jwt"))
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // Max 10 reviews per minute to prevent comment spam
  create(
    @Request() req,
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviewsService.create(req.user.id, dto);
  }

  @Delete(":id")
  @UseGuards(AuthGuard("jwt"))
  delete(@Request() req, @Param("id") id: string) {
    return this.reviewsService.delete(req.user.id, id);
  }

  @Post(":id/like")
  @UseGuards(AuthGuard("jwt"))
  @Throttle({ default: { limit: 30, ttl: 60000 } }) // Max 30 likes per minute
  toggleLike(@Request() req, @Param("id") id: string) {
    return this.reviewsService.toggleLike(req.user.id, id);
  }
}
