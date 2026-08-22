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
import {
  RemoveUserWatchlistDto,
  SaveUserWatchHistoryDto,
  UpdateProfileDto,
  UserWatchlistDto,
} from "./users.dto";

@Controller("users")
export class UsersController {
  constructor(private usersService: UsersService) {}

  // ── 🏆 Leaderboard Top Watchers (Public & Cached) ─────────────────
  @Get("leaderboard")
  getLeaderboard() {
    return this.usersService.getLeaderboard();
  }

  // ── 📊 Real User Stats ────────────────────────────────────────────
  @Get("me/stats")
  @UseGuards(AuthGuard("jwt"))
  getMyStats(@Request() req) {
    return this.usersService.getUserStats(req.user.id);
  }

  @Get(":username/stats")
  getUserStats(@Param("username") username: string) {
    return this.usersService.getUserStats(username);
  }

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
    @Body() dto: UpdateProfileDto,
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
    @Body() dto: SaveUserWatchHistoryDto,
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
    @Body() dto: UserWatchlistDto,
  ) {
    return this.usersService.addToWatchlist(req.user.id, dto);
  }

  @Put("me/watchlist/remove")
  @UseGuards(AuthGuard("jwt"))
  removeFromWatchlist(@Request() req, @Body() dto: RemoveUserWatchlistDto) {
    return this.usersService.removeFromWatchlist(req.user.id, dto.movieId);
  }
}
