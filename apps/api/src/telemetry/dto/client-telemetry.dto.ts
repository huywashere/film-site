import {
  IsIn,
  IsISO8601,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class ClientTelemetryDto {
  @IsString()
  @MaxLength(96)
  name!: string;

  @IsOptional()
  @IsIn(["info", "warning", "error"])
  level?: "info" | "warning" | "error";

  @IsOptional()
  @IsString()
  @MaxLength(180)
  route?: string;

  @IsOptional()
  @IsISO8601()
  timestamp?: string;

  @IsOptional()
  @IsObject()
  properties?: Record<string, unknown>;
}
