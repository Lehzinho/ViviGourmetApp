import { IsBoolean, IsInt, IsOptional, Min } from "class-validator";

export class UpdateMenuItemDto {
  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}
