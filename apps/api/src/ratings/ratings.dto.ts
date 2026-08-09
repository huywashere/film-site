import { IsNumber, IsString, MaxLength, Min, Max } from "class-validator";

export class CreateRatingDto {
  @IsString()
  @MaxLength(180)
  movieId: string;

  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0.5)
  @Max(5)
  score: number;
}
