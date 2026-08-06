import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  UseGuards,
  Request,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { UsersService } from "./users.service";

@Controller("users")
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get(":username")
  getProfile(@Param("username") username: string) {
    return this.usersService.getProfile(username);
  }

  @Get(":username/activity")
  getActivity(@Param("username") username: string) {
    return this.usersService.getRecentActivity(username);
  }

  @Put("me")
  @UseGuards(AuthGuard("jwt"))
  updateMe(
    @Request() req,
    @Body() dto: { displayName?: string; bio?: string; avatarUrl?: string },
  ) {
    return this.usersService.updateMe(req.user.id, dto);
  }

  // ── Watch History Endpoints ─────────────────────────────────────────
  @Get("me/watch-history")
  @UseGuards(AuthGuard("jwt"))
  getWatchHistory(@Request() req) {
    return this.usersService.getWatchHistory(req.user.id);
  }

  @Put("me/watch-history")
  @UseGuards(AuthGuard("jwt"))
  saveWatchHistory(
    @Request() req,
    @Body()
    dto: {
      movieId: string;
      movieTitle: string;
      movieThumb?: string;
      episode?: string;
      progress: number;
      duration: number;
      serverName?: string;
    },
  ) {
    return this.usersService.saveWatchHistory(req.user.id, dto);
  }

  // ── Watchlist Endpoints ─────────────────────────────────────────────
  @Get("me/watchlist")
  @UseGuards(AuthGuard("jwt"))
  getWatchlist(@Request() req) {
    return this.usersService.getWatchlist(req.user.id);
  }

  @Put("me/watchlist")
  @UseGuards(AuthGuard("jwt"))
  addToWatchlist(
    @Request() req,
    @Body() dto: { movieId: string; title?: string; thumbUrl?: string },
  ) {
    return this.usersService.addToWatchlist(req.user.id, dto);
  }

  @Put("me/watchlist/remove")
  @UseGuards(AuthGuard("jwt"))
  removeFromWatchlist(@Request() req, @Body() dto: { movieId: string }) {
    return this.usersService.removeFromWatchlist(req.user.id, dto.movieId);
  }
}
