import { IsOptional, IsString, IsUrl } from "class-validator";

export class RecognizeUrlDto {
  @IsUrl()
  imageUrl: string;

  @IsOptional()
  @IsString()
  lang?: string = "vie+eng";
}

export class RecognizeBase64Dto {
  @IsString()
  base64: string;

  @IsOptional()
  @IsString()
  lang?: string = "vie+eng";
}
