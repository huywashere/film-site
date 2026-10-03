import { IsOptional, IsString, MaxLength } from "class-validator";

export class ConvertSubtitleDto {
  @IsString()
  @MaxLength(1000000)
  content: string;

  @IsOptional()
  @IsString()
  format?: string = "srt";
}
