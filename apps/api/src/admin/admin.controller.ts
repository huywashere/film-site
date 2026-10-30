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
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { mkdirSync } from "fs";
import { extname, resolve } from "path";
import { randomUUID } from "crypto";
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
import { MediaIngestService } from "./media-ingest.service";
import { CrawlerService } from "./crawler.service";
import { StoryboardService } from "./storyboard.service";
import { CreateMediaUploadDto } from "./media-upload.dto";
import { PrismaService } from "../prisma/prisma.service";
import { MoviesService } from "../movies/movies.service";

const mediaUploadDirectory = resolve(
  process.env.MEDIA_UPLOAD_TMP_DIR || "../../.local-data/uploads",
);
const acceptedVideoTypes = new Set([
  "video/mp4",
  "video/x-matroska",
  "video/webm",
  "video/quicktime",
  "video/x-msvideo",
  "video/mpeg",
]);

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

const HERO_SLUG_ALIASES: Record<string, string> = {
  "hope-vung-tu-dia": "vung-tu-dia",
  "joker-2019": "joker",
  "the-batman": "nguoi-doi-2022",
  "batman-2022": "nguoi-doi-2022",
  "avengers-hoi-ket": "biet-doi-sieu-anh-hung-4-hoi-ket",
  "avengers-endgame": "biet-doi-sieu-anh-hung-4-hoi-ket",
  "avengers-cuoc-chien-vo-cuc": "biet-doi-sieu-anh-hung-3-cuoc-chien-vo-cuc",
  "avengers-infinity-war": "biet-doi-sieu-anh-hung-3-cuoc-chien-vo-cuc",
  "the-dark-knight": "ky-si-bong-dem",
  "top-gun-maverick": "phi-cong-sieu-dang-maverick",
  "inception": "ke-danh-cap-giac-mo",
  "interstellar": "ho-den-tu-than",
  "avatar-2": "avatar-2-dong-chay-cua-nuoc",
  "spider-man-no-way-home": "nguoi-nhen-khong-con-nha",
  "dune-2": "dune-hanh-tinh-cat-2",
  "the-wolf-of-wall-street": "soi-gia-pho-wall",
  "the-revenant": "nguoi-ve-tu-coi-chet",
  "once-upon-a-time-in-hollywood": "chuyen-ngay-xua-o-hollywood",
  "the-irishman": "nguoi-dan-ong-xu-ireland",
  "the-departed": "ke-di-san",
};

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
    private readonly mediaIngest: MediaIngestService,
    private readonly crawler: CrawlerService,
    private readonly storyboard: StoryboardService,
    private readonly prisma: PrismaService,
    private readonly moviesService: MoviesService,
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
  @Get("movies/catalog-search")
  @RequireAdminPermissions("movies.read")
  async searchMovieCatalog(
    @Query("search") search?: string,
    @Query("slug") slug?: string,
    @Query("limit") limit?: string,
  ) {
    const limitNum = paginationValue(limit, 8, 50);
    const targetSlug = slug?.trim();
    const query = search?.trim();

    const formatImageUrl = (url?: string) => {
      if (!url) return "";
      if (url.startsWith("http://") || url.startsWith("https://")) return url;
      const clean = url.startsWith("/") ? url : `/${url}`;
      return `https://phimimg.com${clean}`;
    };

    const mapToMovieItem = (item: any) => ({
      id: item.slug || item.id || item._id,
      title: item.name || item.title || item.slug,
      originName: item.origin_name || item.originName || "",
      posterUrl: formatImageUrl(
        item.poster_url || item.posterUrl || item.thumb_url || item.thumbUrl,
      ),
      thumbUrl: formatImageUrl(
        item.thumb_url ||
          item.thumbUrl ||
          item.heroBackdrop ||
          item.poster_url ||
          item.posterUrl,
      ),
      year: item.year ? Number(item.year) : undefined,
      type: item.type || "single",
      quality: item.quality || "4K UHD",
      description: item.content || item.description || "",
      genres: Array.isArray(item.category)
        ? item.category.map((c: any) =>
            typeof c === "string" ? c : c.name || c.slug,
          )
        : Array.isArray(item.genres)
          ? item.genres
          : [],
    });

    if (targetSlug) {
      const lookup = HERO_SLUG_ALIASES[targetSlug] || targetSlug;
      const local = await this.prisma.movie
        .findFirst({
          where: {
            OR: [{ id: targetSlug }, { id: lookup }],
          },
        })
        .catch(() => null);
      if (local) {
        const mapped = mapToMovieItem(local);
        mapped.id = targetSlug;
        return { items: [mapped] };
      }

      try {
        const detail = await this.moviesService
          .getDetail(lookup)
          .catch(() => null);
        const movie =
          (detail as any)?.movie ||
          (detail as any)?.data?.movie ||
          (detail as any)?.data?.item ||
          (detail as any)?.item;
        if (movie?.name) {
          const mapped = mapToMovieItem(movie);
          mapped.id = targetSlug;
          return { items: [mapped] };
        }
      } catch {}

      // Fallback search upstream by slug or alias
      try {
        const searchRes = await this.moviesService
          .search(lookup, 1, 1)
          .catch(() => null);
        const first =
          (searchRes as any)?.data?.items?.[0] ||
          (searchRes as any)?.items?.[0];
        if (first?.slug) {
          const detail = await this.moviesService
            .getDetail(first.slug)
            .catch(() => null);
          const movie =
            (detail as any)?.movie ||
            (detail as any)?.data?.movie ||
            (detail as any)?.data?.item ||
            first;
          if (movie?.name) {
            const mapped = mapToMovieItem(movie);
            mapped.id = targetSlug;
            return { items: [mapped] };
          }
        }
      } catch {}

      return { items: [] };
    }

    if (!query) {
      return { items: [] };
    }

    const cleanQuery = query.toLowerCase().trim();
    const mappedAlias = HERO_SLUG_ALIASES[cleanQuery] || cleanQuery;

    const [localResults, upstreamResults, directSlugMatch, directAliasMatch] =
      await Promise.all([
        this.prisma.movie
          .findMany({
            where: {
              OR: [
                { id: { contains: query, mode: "insensitive" } },
                { title: { contains: query, mode: "insensitive" } },
                { originName: { contains: query, mode: "insensitive" } },
                ...(mappedAlias !== cleanQuery
                  ? [{ id: { contains: mappedAlias, mode: "insensitive" as const } }]
                  : []),
              ],
            },
            take: limitNum,
          })
          .catch(() => []),
        this.moviesService.search(query, 1, limitNum).catch(() => null),
        !query.includes(" ")
          ? this.moviesService.getDetail(query).catch(() => null)
          : null,
        mappedAlias !== cleanQuery
          ? this.moviesService.getDetail(mappedAlias).catch(() => null)
          : null,
      ]);

    const items: any[] = [];
    const seenSlugs = new Set<string>();

    const addCandidate = (raw: any) => {
      if (!raw) return;
      const mapped = mapToMovieItem(raw);
      if (!mapped.id || seenSlugs.has(mapped.id)) return;
      seenSlugs.add(mapped.id);
      items.push(mapped);
    };

    const directMovie =
      (directSlugMatch as any)?.movie ||
      (directSlugMatch as any)?.data?.movie ||
      (directSlugMatch as any)?.data?.item;
    if (directMovie?.name) {
      addCandidate(directMovie);
    }

    const directAliasMovie =
      (directAliasMatch as any)?.movie ||
      (directAliasMatch as any)?.data?.movie ||
      (directAliasMatch as any)?.data?.item;
    if (directAliasMovie?.name) {
      addCandidate(directAliasMovie);
    }

    for (const m of localResults) {
      addCandidate(m);
    }

    const upstreamList: any[] =
      (upstreamResults as any)?.data?.items ||
      (upstreamResults as any)?.items ||
      [];
    for (const m of upstreamList) {
      addCandidate(m);
    }

    return { items: items.slice(0, limitNum) };
  }

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

  @Post("media/uploads")
  @RequireAdminPermissions("movies.write")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: diskStorage({
        destination: (_request, _file, callback) => {
          mkdirSync(mediaUploadDirectory, { recursive: true });
          callback(null, mediaUploadDirectory);
        },
        filename: (_request, file, callback) => {
          const extension = extname(file.originalname).toLowerCase().slice(0, 12);
          callback(null, `${Date.now()}-${randomUUID()}${extension}`);
        },
      }),
      limits: {
        files: 1,
        fileSize: Math.min(
          Math.max(Number(process.env.MEDIA_UPLOAD_MAX_BYTES || 20 * 1024 ** 3), 1),
          100 * 1024 ** 3,
        ),
      },
      fileFilter: (_request, file, callback) => {
        if (!acceptedVideoTypes.has(file.mimetype)) {
          callback(new BadRequestException("Định dạng video không được hỗ trợ"), false);
          return;
        }
        callback(null, true);
      },
    }),
  )
  createMediaUpload(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() body: CreateMediaUploadDto,
    @Req() req: any,
  ) {
    return this.mediaIngest.createJob(file, body, req.user);
  }

  @Get("media/uploads")
  @RequireAdminPermissions("movies.read")
  getMediaUploads(@Query("movieId") movieId?: string) {
    return this.mediaIngest.listJobs(movieId?.slice(0, 180));
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

  // ── 2.1 Media Upload & Transcoding (FFmpeg Adaptive Bitrate HLS) ──
  @Get("media/uploads")
  @RequireAdminPermissions("movies.read")
  listMediaUploadJobs(@Query("movieId") movieId?: string) {
    return this.mediaIngest.listJobs(movieId);
  }

  @Post("media/uploads")
  @RequireAdminPermissions("movies.write")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          mkdirSync(mediaUploadDirectory, { recursive: true });
          cb(null, mediaUploadDirectory);
        },
        filename: (_req, file, cb) => {
          const ext = extname(file.originalname).toLowerCase();
          cb(null, `${randomUUID()}${ext}`);
        },
      }),
      fileFilter: (_req, file, cb) => {
        if (
          !acceptedVideoTypes.has(file.mimetype) &&
          !/\.(mp4|mkv|webm|mov|avi)$/i.test(file.originalname)
        ) {
          return cb(
            new BadRequestException("Định dạng video không được hỗ trợ"),
            false,
          );
        }
        cb(null, true);
      },
      limits: { fileSize: 4 * 1024 * 1024 * 1024 },
    }),
  )
  uploadMedia(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: CreateMediaUploadDto,
    @Req() req: any,
  ) {
    return this.mediaIngest.createJob(file, body, req.user);
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
  async updateConfiguration(
    @Body() body: UpdateSiteConfigurationDto,
    @Req() req: any,
  ) {
    const updated = await this.adminService.updateConfiguration(body, req.user);
    this.operations.revalidateWeb(["/"], req.user).catch(() => {});
    return updated;
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
  async restoreConfigurationRevision(@Param("id") id: string, @Req() req: any) {
    const restored = await this.adminService.restoreConfigurationRevision(id, req.user);
    this.operations.revalidateWeb(["/"], req.user).catch(() => {});
    return restored;
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

  // ── Crawler Tooling Endpoints ─────────────────────────────────────
  @Post("crawler/single")
  @RequireAdminPermissions("movies.write")
  crawlSingleMovie(@Body() body: { slugOrUrl: string; provider?: string }) {
    return this.crawler.crawlSingle(body.slugOrUrl, body.provider);
  }

  @Post("crawler/batch")
  @RequireAdminPermissions("movies.write")
  startBatchCrawler(
    @Body()
    body: {
      provider: string;
      category?: string;
      startPage?: number;
      endPage?: number;
      deep?: boolean;
      delayMs?: number;
    },
  ) {
    return this.crawler.startBatchJob(body);
  }

  @Get("crawler/jobs")
  @RequireAdminPermissions("movies.read")
  getCrawlerJobs() {
    return this.crawler.getJobs();
  }

  @Get("crawler/jobs/:id")
  @RequireAdminPermissions("movies.read")
  getCrawlerJob(@Param("id") id: string) {
    const job = this.crawler.getJob(id);
    if (!job) throw new NotFoundException("Không tìm thấy job cào phim");
    return job;
  }

  @Post("crawler/jobs/:id/cancel")
  @RequireAdminPermissions("movies.write")
  cancelCrawlerJob(@Param("id") id: string) {
    const ok = this.crawler.cancelJob(id);
    return { success: ok };
  }

  // ── Storyboard Fast Seeking Endpoints ─────────────────────────────
  @Post("storyboard/generate")
  @RequireAdminPermissions("movies.write")
  generateStoryboard(
    @Body()
    body: {
      movieId: string;
      episodeKey?: string;
      streamUrl?: string;
      intervalSeconds?: number;
    },
  ) {
    return this.storyboard.generateStoryboard(body);
  }

  @Post("storyboard/generate-movie")
  @RequireAdminPermissions("movies.write")
  generateStoryboardForMovie(@Body() body: { movieId: string }) {
    return this.storyboard.generateForMovie(body.movieId);
  }

  @Get("storyboard/status/:movieId/:episodeKey")
  @RequireAdminPermissions("movies.read")
  getStoryboardStatus(
    @Param("movieId") movieId: string,
    @Param("episodeKey") episodeKey: string,
  ) {
    const vttUrl = this.storyboard.getStoryboardVttUrl(movieId, episodeKey);
    return {
      exists: Boolean(vttUrl),
      vttUrl,
    };
  }
}
