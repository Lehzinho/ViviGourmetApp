import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { IngredientUnit } from "@prisma/client";

class UpdateCompositionItemDto {
  @IsString()
  ingredientId!: string;

  @IsNumber()
  @Min(0.0001)
  quantity!: number;

  @IsEnum(IngredientUnit)
  unit!: IngredientUnit;
}

export class UpdateIngredientDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsNumber()
  @Min(0.0001)
  yield?: number;

  @IsOptional()
  @IsEnum(IngredientUnit)
  yieldUnit?: IngredientUnit;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => UpdateCompositionItemDto)
  items?: UpdateCompositionItemDto[];
}
