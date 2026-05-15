import { IsBoolean, IsInt, IsOptional, IsString, Min, MinLength } from "class-validator";

export class AddMenuItemDto {
  @IsString()
  @MinLength(1)
  productId!: string;

  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}
