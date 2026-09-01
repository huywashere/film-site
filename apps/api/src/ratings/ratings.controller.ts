import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { AuthGuard } from "@nestjs/passport";
import { RatingsService } from "./ratings.service";
import { CreateRatingDto } from "./ratings.dto";

@Controller("ratings")
export class RatingsController {
  constructor(private ratingsService: RatingsService) {}

  @Post()
  @UseGuards(AuthGuard("jwt"))
  @Throttle({ default: { limit: 15, ttl: 60000 } }) // Max 15 ratings per minute to prevent score manipulation bots
  rate(@Request() req, @Body() dto: CreateRatingDto) {
    return this.ratingsService.rate(req.user.id, dto.movieId, dto.score);
  }

  @Get("movie/:movieId/average")
  getAverage(@Param("movieId") movieId: string) {
    return this.ratingsService.getAverage(movieId);
  }

  @Get("movie/:movieId/mine")
  @UseGuards(AuthGuard("jwt"))
  getMine(@Request() req, @Param("movieId") movieId: string) {
    return this.ratingsService.getUserRating(req.user.id, movieId);
  }
}
