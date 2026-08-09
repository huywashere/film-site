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
import { AuthGuard } from "@nestjs/passport";
import { ReviewsService } from "./reviews.service";
import { CreateReviewDto } from "./reviews.dto";

function safePage(value: unknown): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? Math.min(Math.max(parsed, 1), 10_000) : 1;
}

@Controller("reviews")
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
  toggleLike(@Request() req, @Param("id") id: string) {
    return this.reviewsService.toggleLike(req.user.id, id);
  }
}
