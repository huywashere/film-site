import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
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
  UpdateIssueReportDto,
  UpdateUserRoleDto,
  UpdateUserLockDto,
  UpdateSiteConfigurationDto,
  BulkMovieVisibilityDto,
  ReplaceMoviePlaybackSourcesDto,
  UpdateReviewModerationDto,
} from "./admin.dto";

function paginationValue(
  value: string | undefined,
  fallback: number,
  max: number,
) {
  const parsed = Number(value);
  return Number.isInteger(parsed)
    ? Math.min(Math.max(parsed, 1), max)
    : fallback;
}

@Controller("admin")
@UseGuards(FirebaseAuthGuard, AdminRoleGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ── 1. Overview Dashboard ─────────────────────────────────────────
  @Get("stats")
  getOverviewStats(@Query("range") range?: string) {
    return this.adminService.getOverviewStats(range);
  }

  @Get("me")
  getCurrentAdmin(@Req() req: any) {
    return this.adminService.getCurrentAdmin(req.user);
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

  @Get("movies/:id/playback-sources")
  getMoviePlaybackSources(@Param("id") id: string) {
    return this.adminService.getMoviePlaybackSources(id);
  }

  @Patch("movies/:id/playback-sources")
  replaceMoviePlaybackSources(
    @Param("id") id: string,
    @Body() body: ReplaceMoviePlaybackSourcesDto,
    @Req() req: any,
  ) {
    return this.adminService.replaceMoviePlaybackSources(
      id,
      body.items,
      req.user,
    );
  }

  @Post("movies/sync")
  triggerManualSync(@Body() body: ManualSyncDto, @Req() req: any) {
    return this.adminService.triggerManualSync(
      body.source,
      req.user,
      body.pages,
    );
  }

  @Post("sync-jobs/:id/retry")
  retrySyncJob(@Param("id") id: string, @Req() req: any) {
    return this.adminService.retrySyncJob(id, req.user);
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

  @Patch("movies/bulk/visibility")
  updateMovieVisibilityBulk(
    @Body() body: BulkMovieVisibilityDto,
    @Req() req: any,
  ) {
    return this.adminService.updateMovieVisibilityBulk(
      body.ids,
      body.hidden,
      req.user,
    );
  }

  @Patch("users/:id/role")
  updateUserRole(
    @Param("id") id: string,
    @Body() body: UpdateUserRoleDto,
    @Req() req: any,
  ) {
    return this.adminService.updateUserRole(id, body.role, req.user);
  }

  @Patch("users/:id/lock")
  updateUserLock(
    @Param("id") id: string,
    @Body() body: UpdateUserLockDto,
    @Req() req: any,
  ) {
    return this.adminService.updateUserLock(id, body.locked, req.user);
  }

  @Delete("users/:id/sessions/:sessionId")
  revokeUserSession(
    @Param("id") id: string,
    @Param("sessionId") sessionId: string,
    @Req() req: any,
  ) {
    return this.adminService.revokeUserSession(id, sessionId, req.user);
  }

  @Patch("users/:id/verification")
  updateUserVerification(
    @Param("id") id: string,
    @Body() body: UpdateUserLockDto,
    @Req() req: any,
  ) {
    return this.adminService.updateUserVerification(id, body.locked, req.user);
  }

  @Delete("users/:id/two-factor")
  resetUserTwoFactor(@Param("id") id: string, @Req() req: any) {
    return this.adminService.resetUserTwoFactor(id, req.user);
  }

  @Get("reports")
  getReports(
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("status") status?: string,
    @Query("search") search?: string,
  ) {
    return this.adminService.getReports({
      page: paginationValue(page, 1, 10_000),
      limit: paginationValue(limit, 20, 100),
      status,
      search: search?.slice(0, 200),
    });
  }

  @Patch("reports/:id")
  updateReport(
    @Param("id") id: string,
    @Body() body: UpdateIssueReportDto,
    @Req() req: any,
  ) {
    return this.adminService.updateReport(id, body, req.user);
  }

  @Get("reports/:id")
  getReportDetail(@Param("id") id: string) {
    return this.adminService.getReportDetail(id);
  }

  @Get("reviews")
  getReviews(
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("search") search?: string,
  ) {
    return this.adminService.getReviews({
      page: paginationValue(page, 1, 10_000),
      limit: paginationValue(limit, 20, 100),
      search: search?.slice(0, 200),
    });
  }

  @Delete("reviews/:id")
  deleteReview(@Param("id") id: string, @Req() req: any) {
    return this.adminService.deleteReview(id, req.user);
  }

  @Patch("reviews/:id/moderation")
  moderateReview(
    @Param("id") id: string,
    @Body() body: UpdateReviewModerationDto,
    @Req() req: any,
  ) {
    return this.adminService.moderateReview(
      id,
      body.hidden,
      body.note,
      req.user,
    );
  }

  @Get("audit-logs")
  getAuditLogs(
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("search") search?: string,
  ) {
    return this.adminService.getAuditLogs({
      page: paginationValue(page, 1, 10_000),
      limit: paginationValue(limit, 30, 100),
      search: search?.slice(0, 200),
    });
  }

  @Get("sync-jobs")
  getSyncJobs(@Query("limit") limit?: string) {
    return this.adminService.getSyncJobs(paginationValue(limit, 20, 100));
  }

  @Get("watch-parties")
  getWatchParties() {
    return this.adminService.getWatchParties();
  }

  @Get("watch-party-archives")
  getWatchPartyArchives(@Query("limit") limit?: string) {
    return this.adminService.getWatchPartyArchives(
      paginationValue(limit, 30, 100),
    );
  }

  @Delete("watch-parties/:id")
  closeWatchParty(@Param("id") id: string, @Req() req: any) {
    return this.adminService.closeWatchParty(id, req.user);
  }

  @Get("system")
  getSystemHealth() {
    return this.adminService.getSystemHealth();
  }

  @Get("playback-analytics")
  getPlaybackAnalytics(@Query("range") range?: string) {
    return this.adminService.getPlaybackAnalytics(range);
  }

  @Get("notifications")
  getNotifications(@Query("limit") limit: string | undefined, @Req() req: any) {
    return this.adminService.getNotifications(
      req.user,
      paginationValue(limit, 20, 100),
    );
  }

  @Patch("notifications/:id/read")
  markNotificationRead(@Param("id") id: string, @Req() req: any) {
    return this.adminService.markNotificationRead(id, req.user);
  }

  @Patch("notifications/read-all")
  markAllNotificationsRead(@Req() req: any) {
    return this.adminService.markAllNotificationsRead(req.user);
  }

  @Get("configuration")
  getConfiguration() {
    return this.adminService.getConfiguration();
  }

  @Patch("configuration")
  updateConfiguration(
    @Body() body: UpdateSiteConfigurationDto,
    @Req() req: any,
  ) {
    return this.adminService.updateConfiguration(body, req.user);
  }

  @Get("configuration/revisions")
  getConfigurationRevisions(@Query("limit") limit?: string) {
    return this.adminService.getConfigurationRevisions(
      paginationValue(limit, 20, 100),
    );
  }

  @Post("configuration/revisions/:id/restore")
  restoreConfigurationRevision(@Param("id") id: string, @Req() req: any) {
    return this.adminService.restoreConfigurationRevision(id, req.user);
  }
}
