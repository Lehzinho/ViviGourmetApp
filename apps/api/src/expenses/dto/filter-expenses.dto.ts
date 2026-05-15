import { IsDateString, IsIn, IsOptional, IsString } from "class-validator";

export class FilterExpensesDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsIn(["monthly", "weekly", "one_time"])
  recurrence?: string;
}
