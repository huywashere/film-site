import {
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Max,
  MaxLength,
  Min,
} from "class-validator";

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  username?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  displayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @IsOptional()
  @Matches(
    /^(?:https:\/\/[^\s]+|\/[A-Za-z0-9/_\-.]+|data:image\/svg\+xml;utf8,%3Csvg[^\s]+)$/,
  )
  @MaxLength(50000)
  avatarUrl?: string;

  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/)
  nameColor?: string;

  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/)
  avatarFrameColor?: string;
}

export class SaveUserWatchHistoryDto {
  @IsString()
  @MaxLength(180)
  movieId: string;

  @IsString()
  @MaxLength(300)
  movieTitle: string;

  @IsOptional()
  @IsUrl({ protocols: ["https"], require_protocol: true })
  @MaxLength(2048)
  movieThumb?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  episode?: string;

  @IsNumber()
  @Min(0)
  @Max(604800)
  progress: number;

  @IsNumber()
  @Min(0)
  @Max(604800)
  duration: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  serverName?: string;
}

export class UserWatchlistDto {
  @IsString()
  @MaxLength(180)
  movieId: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  title?: string;

  @IsOptional()
  @IsUrl({ protocols: ["https"], require_protocol: true })
  @MaxLength(2048)
  thumbUrl?: string;
}

export class RemoveUserWatchlistDto {
  @IsString()
  @MaxLength(180)
  movieId: string;
}
