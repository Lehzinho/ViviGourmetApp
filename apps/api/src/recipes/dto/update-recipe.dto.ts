import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MinLength,
  ValidateNested,
} from "class-validator";
import { IngredientUnit } from "@prisma/client";
import { RecipeItemDto } from "./recipe-item.dto";

export class UpdateRecipeDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  yield?: number;

  @IsOptional()
  @IsEnum(IngredientUnit)
  yieldUnit?: IngredientUnit;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RecipeItemDto)
  items?: RecipeItemDto[];
}
