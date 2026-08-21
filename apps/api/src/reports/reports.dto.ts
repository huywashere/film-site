import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";

export class CreateIssueReportDto {
  @IsString()
  @IsIn([
    "playback",
    "subtitles",
    "audio",
    "lag",
    "duplicate",
    "ui_bug",
    "other",
  ])
  category: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  filmTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  movieSlug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  episode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  serverName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  deviceInfo?: string;

  @IsString()
  @MinLength(10)
  @MaxLength(10_000)
  description: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(320)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  screenshotUrl?: string;
}
