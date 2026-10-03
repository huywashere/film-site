import { IsArray, IsOptional, IsString, MaxLength } from "class-validator";

export class TranslateTextDto {
  @IsString()
  @MaxLength(10000)
  text: string;

  @IsOptional()
  @IsString()
  from?: string = "auto";

  @IsOptional()
  @IsString()
  to?: string = "vi";
}

export class TranslateBatchDto {
  @IsArray()
  @IsString({ each: true })
  texts: string[];

  @IsOptional()
  @IsString()
  from?: string = "auto";

  @IsOptional()
  @IsString()
  to?: string = "vi";
}

export class TranslateSubtitleDto {
  @IsString()
  @MaxLength(500000)
  content: string;

  @IsOptional()
  @IsString()
  from?: string = "auto";

  @IsOptional()
  @IsString()
  to?: string = "vi";
}
