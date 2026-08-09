import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from "class-validator";

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
  @IsIn(["kkphim", "ophim", "nguonc", "vsmov"])
  source: string;
}
