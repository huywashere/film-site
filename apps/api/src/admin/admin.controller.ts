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
import { AdminSessionGuard } from "./guards/admin-session.guard";
import { AdminPermissionGuard } from "./guards/admin-permission.guard";
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
  CreateMovieDto,
  MergeMoviesDto,
  DeleteMovieDto,
  SyncScheduleDto,
  RestoreBackupDto,
  UpdateIncidentDto,
  PurgeCacheDto,
  CreateAdDto,
  UpdateAdDto,
} from "./admin.dto";
import { AdminOperationsService } from "./admin-operations.service";
import { RequireAdminPermissions } from "./admin-permissions";
import { AdminSecurityService } from "./admin-security.service";
import { AdminSyncSchedulerService } from "./admin-sync-scheduler.service";
import { AdsService } from "../ads/ads.service";
import { SystemNotificationsService } from "../system-notifications/system-notifications.service";
import {
  CreateSystemNotificationDto,
  UpdateSystemNotificationDto,
} from "../system-notifications/system-notifications.dto";

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
@UseGuards(AdminSessionGuard, AdminPermissionGuard)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly operations: AdminOperationsService,
    private readonly securityService: AdminSecurityService,
    private readonly syncScheduler: AdminSyncSchedulerService,
    private readonly adsService: AdsService,
    private readonly systemNotificationsService: SystemNotificationsService,
  ) {}

  // ── 1. Overview Dashboard ─────────────────────────────────────────
  @Get("stats")
  @RequireAdminPermissions("analytics.read")
  getOverviewStats(@Query("range") range?: string) {
    return this.adminService.getOverviewStats(range);
  }

  @Get("me")
  getCurrentAdmin(@Req() req: any) {
    return this.adminService.getCurrentAdmin(req.user);
  }

  // ── 2. Movie Management ───────────────────────────────────────────
  @Get("movies")
  @RequireAdminPermissions("movies.read")
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

  @Post("movies")
  @RequireAdminPermissions("movies.write")
  createMovie(@Body() body: CreateMovieDto, @Req() req: any) {
    return this.operations.createMovie(body as unknown as Record<string, unknown>, req.user);
  }

  @Get("movies/duplicates")
  @RequireAdminPermissions("movies.read")
  getMovieDuplicates() {
    return this.operations.findDuplicateMovies();
  }

  @Post("movies/duplicates/merge")
  @RequireAdminPermissions("movies.write")
  mergeMovieDuplicates(@Body() body: MergeMoviesDto, @Req() req: any) {
    return this.operations.mergeMovies(body.canonicalId, body.sourceIds, req.user);
  }

  @Delete("movies/:id")
  @RequireAdminPermissions("movies.write")
  deleteMovie(@Param("id") id: string, @Body() body: DeleteMovieDto, @Req() req: any) {
    return this.operations.hardDeleteMovie(id, body.confirmation, req.user);
  }

  @Patch("movies/:id/hide")
  @RequireAdminPermissions("movies.write")
  toggleMovieHide(@Param("id") id: string, @Req() req: any) {
    return this.adminService.toggleMovieHide(id, req.user);
  }

  @Patch("movies/:id/metadata")
  @RequireAdminPermissions("movies.write")
  updateMovieMetadata(
    @Param("id") id: string,
    @Body() body: UpdateMovieMetadataDto,
    @Req() req: any,
  ) {
    return this.adminService.updateMovieMetadata(id, body, req.user);
  }

  @Patch("movies/:id/sources")
  @RequireAdminPermissions("movies.write")
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
  @RequireAdminPermissions("playback.manage")
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
  @RequireAdminPermissions("sync.manage")
  triggerManualSync(@Body() body: ManualSyncDto, @Req() req: any) {
    return this.adminService.triggerManualSync(
      body.source,
      req.user,
      body.pages,
    );
  }

  @Post("sync-jobs/:id/retry")
  @RequireAdminPermissions("sync.manage")
  retrySyncJob(@Param("id") id: string, @Req() req: any) {
    return this.adminService.retrySyncJob(id, req.user);
  }

  // ── 3. User Management ────────────────────────────────────────────
  @Get("users")
  @RequireAdminPermissions("users.manage")
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
  @RequireAdminPermissions("users.manage")
  getUserDetail(@Param("id") id: string) {
    return this.adminService.getUserDetail(id);
  }

  @Patch("users/:id/ban")
  @RequireAdminPermissions("users.manage")
  toggleUserBan(@Param("id") id: string, @Req() req: any) {
    return this.adminService.toggleUserBan(id, req.user);
  }

  @Patch("movies/bulk/visibility")
  @RequireAdminPermissions("movies.write")
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
  @RequireAdminPermissions("users.manage")
  updateUserRole(
    @Param("id") id: string,
    @Body() body: UpdateUserRoleDto,
    @Req() req: any,
  ) {
    return this.adminService.updateUserRole(id, body.role, req.user);
  }

  @Patch("users/:id/lock")
  @RequireAdminPermissions("users.manage")
  updateUserLock(
    @Param("id") id: string,
    @Body() body: UpdateUserLockDto,
    @Req() req: any,
  ) {
    return this.adminService.updateUserLock(id, body.locked, req.user);
  }

  @Delete("users/:id/sessions/:sessionId")
  @RequireAdminPermissions("users.manage")
  revokeUserSession(
    @Param("id") id: string,
    @Param("sessionId") sessionId: string,
    @Req() req: any,
  ) {
    return this.adminService.revokeUserSession(id, sessionId, req.user);
  }

  @Patch("users/:id/verification")
  @RequireAdminPermissions("users.manage")
  updateUserVerification(
    @Param("id") id: string,
    @Body() body: UpdateUserLockDto,
    @Req() req: any,
  ) {
    return this.adminService.updateUserVerification(id, body.locked, req.user);
  }

  @Delete("users/:id/two-factor")
  @RequireAdminPermissions("users.manage")
  resetUserTwoFactor(@Param("id") id: string, @Req() req: any) {
    return this.adminService.resetUserTwoFactor(id, req.user);
  }

  @Get("reports")
  @RequireAdminPermissions("reports.manage")
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
  @RequireAdminPermissions("reports.manage")
  updateReport(
    @Param("id") id: string,
    @Body() body: UpdateIssueReportDto,
    @Req() req: any,
  ) {
    return this.adminService.updateReport(id, body, req.user);
  }

  @Get("reports/:id")
  @RequireAdminPermissions("reports.manage")
  getReportDetail(@Param("id") id: string) {
    return this.adminService.getReportDetail(id);
  }

  @Get("reviews")
  @RequireAdminPermissions("reviews.manage")
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
  @RequireAdminPermissions("reviews.manage")
  deleteReview(@Param("id") id: string, @Req() req: any) {
    return this.adminService.deleteReview(id, req.user);
  }

  @Patch("reviews/:id/moderation")
  @RequireAdminPermissions("reviews.manage")
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
  @RequireAdminPermissions("audit.read")
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
  @RequireAdminPermissions("sync.manage")
  getSyncJobs(@Query("limit") limit?: string) {
    return this.adminService.getSyncJobs(paginationValue(limit, 20, 100));
  }

  @Get("watch-parties")
  @RequireAdminPermissions("watch-party.manage")
  getWatchParties() {
    return this.adminService.getWatchParties();
  }

  @Get("watch-party-archives")
  @RequireAdminPermissions("watch-party.manage")
  getWatchPartyArchives(@Query("limit") limit?: string) {
    return this.adminService.getWatchPartyArchives(
      paginationValue(limit, 30, 100),
    );
  }

  @Delete("watch-parties/:id")
  @RequireAdminPermissions("watch-party.manage")
  closeWatchParty(@Param("id") id: string, @Req() req: any) {
    return this.adminService.closeWatchParty(id, req.user);
  }

  @Get("system")
  @RequireAdminPermissions("analytics.read")
  getSystemHealth() {
    return this.adminService.getSystemHealth();
  }

  @Get("playback-analytics")
  @RequireAdminPermissions("analytics.read")
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
  @RequireAdminPermissions("cms.manage")
  getConfiguration() {
    return this.adminService.getConfiguration();
  }

  @Patch("configuration")
  @RequireAdminPermissions("cms.manage")
  updateConfiguration(
    @Body() body: UpdateSiteConfigurationDto,
    @Req() req: any,
  ) {
    return this.adminService.updateConfiguration(body, req.user);
  }

  @Get("configuration/revisions")
  @RequireAdminPermissions("cms.manage")
  getConfigurationRevisions(@Query("limit") limit?: string) {
    return this.adminService.getConfigurationRevisions(
      paginationValue(limit, 20, 100),
    );
  }

  @Post("configuration/revisions/:id/restore")
  @RequireAdminPermissions("cms.manage")
  restoreConfigurationRevision(@Param("id") id: string, @Req() req: any) {
    return this.adminService.restoreConfigurationRevision(id, req.user);
  }

  @Get("sync-schedules")
  @RequireAdminPermissions("sync.manage")
  getSyncSchedules() { return this.operations.listSyncSchedules(); }

  @Post("sync-schedules")
  @RequireAdminPermissions("sync.manage")
  createSyncSchedule(@Body() body: SyncScheduleDto, @Req() req: any) {
    return this.operations.saveSyncSchedule(undefined, body, req.user);
  }

  @Patch("sync-schedules/:id")
  @RequireAdminPermissions("sync.manage")
  updateSyncSchedule(@Param("id") id: string, @Body() body: SyncScheduleDto, @Req() req: any) {
    return this.operations.saveSyncSchedule(id, body, req.user);
  }

  @Delete("sync-schedules/:id")
  @RequireAdminPermissions("sync.manage")
  deleteSyncSchedule(@Param("id") id: string, @Req() req: any) {
    return this.operations.deleteSyncSchedule(id, req.user);
  }

  @Get("backups")
  @RequireAdminPermissions("backups.manage")
  getBackups() { return this.operations.listBackups(); }

  @Post("backups")
  @RequireAdminPermissions("backups.manage")
  createBackup(@Req() req: any) { return this.operations.requestBackup(req.user); }

  @Post("backups/:id/restore")
  @RequireAdminPermissions("backups.manage")
  restoreBackup(@Param("id") id: string, @Body() body: RestoreBackupDto, @Req() req: any) {
    return this.operations.restoreBackup(id, body.confirmation, req.user);
  }

  @Get("incidents")
  @RequireAdminPermissions("incidents.manage")
  getIncidents(@Query("status") status?: string) { return this.operations.listIncidents(status); }

  @Patch("incidents/:id")
  @RequireAdminPermissions("incidents.manage")
  updateIncident(@Param("id") id: string, @Body() body: UpdateIncidentDto, @Req() req: any) {
    return this.operations.updateIncident(id, body.status, req.user);
  }

  @Get("cache")
  @RequireAdminPermissions("cache.manage")
  getCache() { return this.operations.getCacheOverview(); }

  @Delete("cache")
  @RequireAdminPermissions("cache.manage")
  purgeCache(@Body() body: PurgeCacheDto, @Req() req: any) {
    return this.operations.purgeCache(body.namespace, req.user);
  }

  @Post("cache/revalidate")
  @RequireAdminPermissions("cache.manage")
  revalidateWeb(@Body() body: { paths?: string[] }, @Req() req: any) {
    return this.operations.revalidateWeb(Array.isArray(body.paths) ? body.paths.slice(0, 20) : ["/"], req.user);
  }

  @Get("analytics/advanced")
  @RequireAdminPermissions("analytics.read")
  getAdvancedAnalytics(@Query("range") range?: string) {
    return this.operations.getAdvancedAnalytics(range);
  }

  @Post("operations/prune-logs")
  @RequireAdminPermissions("system.manage")
  pruneLogs(@Body() body: { retentionDays?: number }) {
    return this.operations.pruneExpiredLogs(body?.retentionDays);
  }

  // ── 9. Security & IP Blacklist ──────────────────────────────────────
  @Get("security/blocked-ips")
  @RequireAdminPermissions("system.manage")
  getBlockedIps(
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("search") search?: string,
  ) {
    return this.securityService.getBlockedIps(
      Number(page) || 1,
      Number(limit) || 20,
      search,
    );
  }

  @Post("security/block-ip")
  @RequireAdminPermissions("system.manage")
  blockIp(
    @Body() body: { ipAddress: string; reason?: string; durationHours?: number },
    @Req() req: any,
  ) {
    return this.securityService.blockIp({
      ipAddress: body.ipAddress,
      reason: body.reason,
      durationHours: body.durationHours,
      blockedBy: req.user?.email || "Admin",
    });
  }

  @Delete("security/unblock-ip/:id")
  @RequireAdminPermissions("system.manage")
  unblockIp(@Param("id") id: string) {
    return this.securityService.unblockIp(id);
  }

  @Get("security/suspicious-ips")
  @RequireAdminPermissions("system.manage")
  getSuspiciousIps() {
    return this.securityService.getSuspiciousIps();
  }

  // ── 10. Auto-Sync Scheduler ─────────────────────────────────────────
  @Get("sync/schedules")
  @RequireAdminPermissions("sync.manage")
  getSyncSchedulesList() {
    return this.syncScheduler.getSchedules();
  }

  @Post("sync/schedules")
  @RequireAdminPermissions("sync.manage")
  createSyncScheduleItem(
    @Body()
    body: {
      name: string;
      source: string;
      cron: string;
      pages: number;
      enabled?: boolean;
    },
    @Req() req: any,
  ) {
    return this.syncScheduler.createSchedule({
      ...body,
      createdBy: req.user?.email || "Admin",
    });
  }

  @Patch("sync/schedules/:id")
  @RequireAdminPermissions("sync.manage")
  updateSyncScheduleItem(@Param("id") id: string, @Body() body: any) {
    return this.syncScheduler.updateSchedule(id, body);
  }

  @Post("sync/schedules/:id/toggle")
  @RequireAdminPermissions("sync.manage")
  toggleSyncScheduleItem(@Param("id") id: string) {
    return this.syncScheduler.toggleSchedule(id);
  }

  @Post("sync/schedules/:id/run")
  @RequireAdminPermissions("sync.manage")
  runSyncScheduleItem(@Param("id") id: string, @Req() req: any) {
    return this.syncScheduler.runScheduleNow(id, req.user?.email || "Admin");
  }

  @Delete("sync/schedules/:id")
  @RequireAdminPermissions("sync.manage")
  deleteSyncScheduleItem(@Param("id") id: string) {
    return this.syncScheduler.deleteSchedule(id);
  }

  @Get("sync/stats")
  @RequireAdminPermissions("sync.manage")
  getSyncStats() {
    return this.syncScheduler.getStats();
  }

  // ── 11. Ads Management ──────────────────────────────────────────────
  @Get("ads")
  @RequireAdminPermissions("cms.manage")
  getAdsList() {
    return this.adsService.getAllAdsAdmin();
  }

  @Post("ads")
  @RequireAdminPermissions("cms.manage")
  createAdItem(@Body() body: CreateAdDto) {
    return this.adsService.createAd(body);
  }

  @Patch("ads/:id")
  @RequireAdminPermissions("cms.manage")
  updateAdItem(@Param("id") id: string, @Body() body: UpdateAdDto) {
    return this.adsService.updateAd(id, body);
  }

  @Post("ads/:id/toggle")
  @RequireAdminPermissions("cms.manage")
  toggleAdItem(@Param("id") id: string) {
    return this.adsService.toggleAd(id);
  }

  @Delete("ads/:id")
  @RequireAdminPermissions("cms.manage")
  deleteAdItem(@Param("id") id: string) {
    return this.adsService.deleteAd(id);
  }

  // ── 12. System Notifications Management ──────────────────────────────
  @Get("system-notifications")
  @RequireAdminPermissions("cms.manage")
  getSystemNotifications(
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("search") search?: string,
    @Query("tag") tag?: string,
  ) {
    return this.systemNotificationsService.getAllAdmin({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      search,
      tag,
    });
  }

  @Post("system-notifications")
  @RequireAdminPermissions("cms.manage")
  createSystemNotification(@Body() body: CreateSystemNotificationDto) {
    return this.systemNotificationsService.create(body);
  }

  @Patch("system-notifications/:id")
  @RequireAdminPermissions("cms.manage")
  updateSystemNotification(
    @Param("id") id: string,
    @Body() body: UpdateSystemNotificationDto,
  ) {
    return this.systemNotificationsService.update(id, body);
  }

  @Post("system-notifications/:id/toggle")
  @RequireAdminPermissions("cms.manage")
  toggleSystemNotification(@Param("id") id: string) {
    return this.systemNotificationsService.toggle(id);
  }

  @Delete("system-notifications/:id")
  @RequireAdminPermissions("cms.manage")
  deleteSystemNotification(@Param("id") id: string) {
    return this.systemNotificationsService.delete(id);
  }
}
