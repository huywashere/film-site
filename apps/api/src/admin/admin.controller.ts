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
import {
  ManualSyncDto,
  UpdateMovieMetadataDto,
  UpdateMovieSourcesDto,
} from "./admin.dto";

function paginationValue(value: string | undefined, fallback: number, max: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? Math.min(Math.max(parsed, 1), max) : fallback;
}

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
      page: paginationValue(page, 1, 10_000),
      limit: paginationValue(limit, 12, 100),
      search: search?.slice(0, 200),
      type: type?.slice(0, 40),
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
    @Body() body: UpdateMovieMetadataDto,
    @Req() req: any,
  ) {
    return this.adminService.updateMovieMetadata(id, body, req.user);
  }

  @Patch("movies/:id/sources")
  updateMovieSources(
    @Param("id") id: string,
    @Body() body: UpdateMovieSourcesDto,
    @Req() req: any,
  ) {
    return this.adminService.updateMovieSources(id, body.sources, req.user);
  }

  @Post("movies/sync")
  triggerManualSync(@Body() body: ManualSyncDto, @Req() req: any) {
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
      page: paginationValue(page, 1, 10_000),
      limit: paginationValue(limit, 12, 100),
      search: search?.slice(0, 200),
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
