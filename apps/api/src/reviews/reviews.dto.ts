import {
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

export class CreateReviewDto {
  @IsString()
  @MaxLength(180)
  movieId: string;

  @IsString()
  @MinLength(2)
  @MaxLength(5000)
  content: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0.5)
  @Max(5)
  rating?: number;
}
