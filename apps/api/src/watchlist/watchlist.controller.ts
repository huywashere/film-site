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
import { WatchlistService } from "./watchlist.service";
import { AddWatchlistDto } from "./watchlist.dto";

@Controller("watchlist")
export class WatchlistController {
  constructor(private watchlistService: WatchlistService) {}

  @Get()
  @UseGuards(AuthGuard("jwt"))
  getWatchlist(@Request() req, @Query("page") page = 1) {
    const safePage = Math.min(Math.max(Number(page) || 1, 1), 10_000);
    return this.watchlistService.getWatchlist(req.user.id, safePage);
  }

  @Post()
  @UseGuards(AuthGuard("jwt"))
  add(@Request() req, @Body() dto: AddWatchlistDto) {
    return this.watchlistService.add(req.user.id, dto.movieId, dto.movieData);
  }

  @Delete(":movieId")
  @UseGuards(AuthGuard("jwt"))
  remove(@Request() req, @Param("movieId") movieId: string) {
    return this.watchlistService.remove(req.user.id, movieId);
  }

  @Get("check/:movieId")
  @UseGuards(AuthGuard("jwt"))
  check(@Request() req, @Param("movieId") movieId: string) {
    return this.watchlistService.isInWatchlist(req.user.id, movieId);
  }
}
