import { Type } from "class-transformer";
import { ArrayMaxSize, ArrayMinSize, ValidateNested } from "class-validator";
import { ClientTelemetryDto } from "./client-telemetry.dto";

export class ClientTelemetryBatchDto {
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => ClientTelemetryDto)
  events!: ClientTelemetryDto[];
}
