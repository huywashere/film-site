import { IsOptional, IsString, Matches, MaxLength } from "class-validator";

export class CreateMediaUploadDto {
  @IsString()
  @MaxLength(180)
  movieId!: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z0-9._-]{1,100}$/)
  episodeKey?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  episodeName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  serverName?: string;
}
