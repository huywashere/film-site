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
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ReviewsService } from './reviews.service';

@Controller('reviews')
export class ReviewsController {
  constructor(private reviewsService: ReviewsService) {}

  @Get()
  getRecent(@Query('page') page = 1) {
    return this.reviewsService.getRecent(+page);
  }

  @Get('movie/:movieId')
  getByMovie(@Param('movieId') movieId: string, @Query('page') page = 1) {
    return this.reviewsService.getByMovie(movieId, +page);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  create(@Request() req, @Body() dto: { movieId: string; content: string; rating?: number }) {
    return this.reviewsService.create(req.user.id, dto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  delete(@Request() req, @Param('id') id: string) {
    return this.reviewsService.delete(req.user.id, id);
  }

  @Post(':id/like')
  @UseGuards(AuthGuard('jwt'))
  toggleLike(@Request() req, @Param('id') id: string) {
    return this.reviewsService.toggleLike(req.user.id, id);
  }
}
