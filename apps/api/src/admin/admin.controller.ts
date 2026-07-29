import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from "@nestjs/common";
import { AdminService } from "./admin.service";
import { FirebaseAuthGuard } from "../auth/guards/firebase-auth.guard";
import { AdminRoleGuard } from "../auth/guards/admin-role.guard";

@Controller("admin")
@UseGuards(FirebaseAuthGuard, AdminRoleGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ── 1. Overview Dashboard ─────────────────────────────────────────
  @Get("stats")
  getOverviewStats() {
    return this.adminService.getOverviewStats();
  }

  // ── 2. Movie Management ───────────────────────────────────────────
  @Get("movies")
  getMovies(
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("search") search?: string,
    @Query("type") type?: string,
    @Query("isHidden") isHidden?: string,
  ) {
    return this.adminService.getMoviesPaginated({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 12,
      search,
      type,
      isHidden:
        isHidden === "true" ? true : isHidden === "false" ? false : undefined,
    });
  }

  @Patch("movies/:id/hide")
  toggleMovieHide(@Param("id") id: string, @Req() req: any) {
    return this.adminService.toggleMovieHide(id, req.user);
  }

  @Patch("movies/:id/metadata")
  updateMovieMetadata(
    @Param("id") id: string,
    @Body() body: { title?: string; posterUrl?: string; description?: string },
    @Req() req: any,
  ) {
    return this.adminService.updateMovieMetadata(id, body, req.user);
  }

  @Patch("movies/:id/sources")
  updateMovieSources(
    @Param("id") id: string,
    @Body() body: { sources: string[] },
    @Req() req: any,
  ) {
    return this.adminService.updateMovieSources(id, body.sources, req.user);
  }

  @Post("movies/sync")
  triggerManualSync(@Body() body: { source: string }, @Req() req: any) {
    return this.adminService.triggerManualSync(body.source, req.user);
  }

  // ── 3. User Management ────────────────────────────────────────────
  @Get("users")
  getUsers(
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("search") search?: string,
    @Query("status") status?: "active" | "banned" | "unverified",
  ) {
    return this.adminService.getUsersPaginated({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 12,
      search,
      status,
    });
  }

  @Get("users/:id")
  getUserDetail(@Param("id") id: string) {
    return this.adminService.getUserDetail(id);
  }

  @Patch("users/:id/ban")
  toggleUserBan(@Param("id") id: string, @Req() req: any) {
    return this.adminService.toggleUserBan(id, req.user);
  }
}
