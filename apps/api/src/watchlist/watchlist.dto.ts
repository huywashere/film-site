import { Type } from "class-transformer";
import {
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";

export class WatchlistMovieDataDto {
  @IsOptional()
  @IsString()
  @MaxLength(300)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  titleEn?: string;

  @IsOptional()
  @IsUrl({ protocols: ["https"], require_protocol: true })
  @MaxLength(2048)
  posterUrl?: string;

  @IsOptional()
  @IsUrl({ protocols: ["https"], require_protocol: true })
  @MaxLength(2048)
  thumbUrl?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1888)
  @Max(2100)
  year?: number;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  type?: string;
}

export class AddWatchlistDto {
  @IsString()
  @MaxLength(180)
  movieId: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => WatchlistMovieDataDto)
  movieData?: WatchlistMovieDataDto;
}
