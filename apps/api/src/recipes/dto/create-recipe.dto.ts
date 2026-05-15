import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNumber,
  IsPositive,
  IsString,
  MinLength,
  ValidateNested,
} from "class-validator";
import { IngredientUnit } from "@prisma/client";
import { RecipeItemDto } from "./recipe-item.dto";

export class CreateRecipeDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsNumber()
  @IsPositive()
  yield!: number;

  @IsEnum(IngredientUnit)
  yieldUnit!: IngredientUnit;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RecipeItemDto)
  items!: RecipeItemDto[];
}
