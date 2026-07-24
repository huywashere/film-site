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
import { WatchHistoryService, UpsertHistoryDto } from "./watch-history.service";

@Controller("watch-history")
@UseGuards(AuthGuard("jwt"))
export class WatchHistoryController {
  constructor(private readonly watchHistoryService: WatchHistoryService) {}

  /** Upsert progress — called every 30s from the player */
  @Post()
  upsert(
    @Request() req: { user: { id: string } },
    @Body() dto: UpsertHistoryDto,
  ) {
    return this.watchHistoryService.upsert(req.user.id, dto);
  }

  /** Paginated watch history list */
  @Get()
  getHistory(
    @Request() req: { user: { id: string } },
    @Query("page") page = "1",
    @Query("limit") limit = "20",
  ) {
    return this.watchHistoryService.getHistory(
      req.user.id,
      parseInt(page, 10),
      parseInt(limit, 10),
    );
  }

  /** Get resume data for a specific movie */
  @Get("resume/:movieId")
  getResume(
    @Request() req: { user: { id: string } },
    @Param("movieId") movieId: string,
  ) {
    return this.watchHistoryService.getResumeData(req.user.id, movieId);
  }

  /** Delete a single entry */
  @Delete(":id")
  deleteEntry(
    @Request() req: { user: { id: string } },
    @Param("id") id: string,
  ) {
    return this.watchHistoryService.deleteEntry(req.user.id, id);
  }

  /** Clear all history */
  @Delete()
  clearAll(@Request() req: { user: { id: string } }) {
    return this.watchHistoryService.clearAll(req.user.id);
  }
}
