import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  IsBoolean,
  IsInt,
  Min,
  Max,
  IsObject,
  Matches,
  ValidateNested,
  ArrayUnique,
  IsISO8601,
} from "class-validator";
import { Type } from "class-transformer";

export class UpdateMovieMetadataDto {
  @IsOptional()
  @IsString()
  @MaxLength(300)
  title?: string;

  @IsOptional()
  @IsUrl({ protocols: ["https"], require_protocol: true })
  @MaxLength(2048)
  posterUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20_000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  originName?: string;

  @IsOptional()
  @IsInt()
  @Min(1888)
  @Max(2200)
  year?: number;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  type?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  quality?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  language?: string;

  @IsOptional()
  @IsUrl({ protocols: ["https"], require_protocol: true })
  @MaxLength(2048)
  trailerUrl?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(40)
  @ArrayUnique()
  @IsString({ each: true })
  @MaxLength(120, { each: true })
  genres?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(40)
  @ArrayUnique()
  @IsString({ each: true })
  @MaxLength(120, { each: true })
  countries?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ArrayUnique()
  @IsString({ each: true })
  @MaxLength(160, { each: true })
  actors?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(40)
  @ArrayUnique()
  @IsString({ each: true })
  @MaxLength(160, { each: true })
  directors?: string[];

  @IsOptional()
  @IsObject()
  releaseSchedule?: Record<string, unknown>;
}

export class CreateMovieDto extends UpdateMovieMetadataDto {
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  @MaxLength(180)
  id!: string;

  @IsString()
  @MaxLength(300)
  declare title: string;

  @IsString()
  @MaxLength(40)
  declare type: string;
}

export class MergeMoviesDto {
  @IsString()
  @MaxLength(180)
  canonicalId!: string;

  @IsArray()
  @ArrayMaxSize(20)
  @ArrayUnique()
  @IsString({ each: true })
  sourceIds!: string[];
}

export class DeleteMovieDto {
  @IsString()
  @MaxLength(300)
  confirmation!: string;
}

export class SyncScheduleDto {
  @IsString()
  @MaxLength(120)
  name!: string;

  @IsString()
  @IsIn(["kkphim", "ophim", "nguonc", "vsmov", "vicdn"])
  source!: string;

  @IsInt()
  @Min(15)
  @Max(43_200)
  intervalMinutes!: number;

  @IsInt()
  @Min(1)
  @Max(50)
  pages!: number;

  @IsBoolean()
  enabled!: boolean;
}

export class RestoreBackupDto {
  @IsString()
  @MaxLength(200)
  confirmation!: string;
}

export class UpdateIncidentDto {
  @IsIn(["ACKNOWLEDGED", "RESOLVED"])
  status!: "ACKNOWLEDGED" | "RESOLVED";
}

export class PurgeCacheDto {
  @IsString()
  @Matches(/^[a-zA-Z0-9._-]{1,64}$/)
  namespace!: string;
}

export class UpdateMovieSourcesDto {
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  sources: string[];
}

export class ManualSyncDto {
  @IsString()
  @IsIn(["kkphim", "ophim", "nguonc", "vsmov", "vicdn"])
  source: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  pages?: number;
}

export class PlaybackSourceDto {
  @IsString()
  @IsIn(["kkphim", "ophim", "nguonc", "vsmov", "vicdn", "vidsrc", "custom"])
  provider: string;

  @IsString()
  @MaxLength(180)
  providerSlug: string;

  @IsString()
  @MaxLength(100)
  episodeKey: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  episodeName?: string;

  @IsString()
  @MaxLength(160)
  serverName: string;

  @IsOptional()
  @IsUrl({ protocols: ["http", "https"], require_protocol: true })
  @MaxLength(5000)
  streamUrl?: string;

  @IsOptional()
  @IsObject()
  subtitleUrls?: Record<string, string>;

  @IsOptional()
  @IsInt()
  @Min(0)
  introStart?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  introEnd?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  outroStart?: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(40)
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(0, { each: true })
  adCuePoints?: number[];

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(999)
  priority?: number;
}

export class ReplaceMoviePlaybackSourcesDto {
  @IsArray()
  @ArrayMaxSize(1000)
  @ValidateNested({ each: true })
  @Type(() => PlaybackSourceDto)
  items: PlaybackSourceDto[];
}

export class BulkMovieVisibilityDto {
  @IsArray()
  @ArrayMaxSize(200)
  @IsString({ each: true })
  ids: string[];

  @IsBoolean()
  hidden: boolean;
}

export class UpdateReviewModerationDto {
  @IsBoolean()
  hidden: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}

export class UpdateIssueReportDto {
  @IsOptional()
  @IsIn(["NEW", "IN_PROGRESS", "RESOLVED", "REJECTED"])
  status?: "NEW" | "IN_PROGRESS" | "RESOLVED" | "REJECTED";

  @IsOptional()
  @IsIn(["LOW", "NORMAL", "HIGH", "CRITICAL"])
  priority?: "LOW" | "NORMAL" | "HIGH" | "CRITICAL";

  @IsOptional()
  @IsString()
  @MaxLength(10_000)
  adminNote?: string;

  @IsOptional()
  @IsString()
  @MaxLength(320)
  assignedTo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10_000)
  resolutionMessage?: string;
}

export class UpdateUserRoleDto {
  @IsIn(["USER", "MODERATOR", "ADMIN", "CONTENT_EDITOR", "OPERATIONS", "ANALYST"])
  role: "USER" | "MODERATOR" | "ADMIN" | "CONTENT_EDITOR" | "OPERATIONS" | "ANALYST";
}

export class UpdateUserLockDto {
  @IsBoolean()
  locked: boolean;
}

export class UpdateSiteConfigurationDto {
  @IsOptional()
  @IsBoolean()
  maintenanceMode?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  maintenanceNotice?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  announcementText?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  announcementLink?: string;

  @IsOptional()
  @IsBoolean()
  homePopupEnabled?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  homePopupTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  homePopupBody?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  homePopupLink?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  homePopupLinkLabel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  homePopupDismissLabel?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(12)
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  heroMovieSlugs?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsIn(["kkphim", "ophim", "nguonc", "vsmov", "vicdn"], { each: true })
  providerPriority?: string[];

  @IsOptional()
  @IsBoolean()
  autoSkipIntro?: boolean;

  @IsOptional()
  @IsBoolean()
  watchPartyEnabled?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ArrayUnique()
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  homeTop10Slugs?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @ArrayUnique()
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  homeSectionOrder?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @ArrayUnique()
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  homeHiddenSections?: string[];

  @IsOptional()
  @IsObject()
  homeFeaturedRows?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  seoTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  seoDescription?: string;
}

const AD_TYPES = [
  "BANNER_TOP",
  "BANNER_BOTTOM",
  "BANNER_PLAYER",
  "VIDEO_PREROLL",
  "POPUNDER",
  "CUSTOM_HTML",
] as const;

export class CreateAdDto {
  @IsString()
  @MaxLength(160)
  title: string;

  @IsIn(AD_TYPES)
  type: string;

  @IsOptional()
  @IsUrl({ protocols: ["https"], require_protocol: true })
  @MaxLength(2048)
  imageUrl?: string;

  @IsOptional()
  @IsUrl({ protocols: ["https"], require_protocol: true })
  @MaxLength(2048)
  targetUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50_000)
  htmlContent?: string;

  @IsOptional()
  @IsUrl({ protocols: ["https"], require_protocol: true })
  @MaxLength(2048)
  videoVastUrl?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(600)
  videoDuration?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(120)
  skipOffsetSec?: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(60, { each: true })
  categories?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsISO8601()
  startDate?: string;

  @IsOptional()
  @IsISO8601()
  endDate?: string;
}

export class UpdateAdDto {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  title?: string;

  @IsOptional()
  @IsIn(AD_TYPES)
  type?: string;

  @IsOptional()
  @IsUrl({ protocols: ["https"], require_protocol: true })
  @MaxLength(2048)
  imageUrl?: string;

  @IsOptional()
  @IsUrl({ protocols: ["https"], require_protocol: true })
  @MaxLength(2048)
  targetUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50_000)
  htmlContent?: string;

  @IsOptional()
  @IsUrl({ protocols: ["https"], require_protocol: true })
  @MaxLength(2048)
  videoVastUrl?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(600)
  videoDuration?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(120)
  skipOffsetSec?: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(60, { each: true })
  categories?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsISO8601()
  startDate?: string;

  @IsOptional()
  @IsISO8601()
  endDate?: string;
}
