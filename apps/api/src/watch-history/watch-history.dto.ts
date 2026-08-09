import {
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
} from "class-validator";

export class UpsertHistoryDto {
  @IsString()
  @MaxLength(180)
  movieId: string;

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

  @IsString()
  @MaxLength(300)
  movieTitle: string;

  @IsOptional()
  @IsUrl({ protocols: ["https"], require_protocol: true })
  @MaxLength(2048)
  movieThumb?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  serverName?: string;
}
