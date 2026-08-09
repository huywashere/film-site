import {
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
} from "class-validator";

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  displayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @IsOptional()
  @IsUrl({ protocols: ["https"], require_protocol: true })
  @MaxLength(2048)
  avatarUrl?: string;
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
