import { IsEnum, IsNumber, IsPositive, IsString } from "class-validator";
import { IngredientUnit } from "@prisma/client";

export class RecipeItemDto {
  @IsString()
  ingredientId!: string;

  @IsNumber()
  @IsPositive()
  quantity!: number;

  @IsEnum(IngredientUnit)
  unit!: IngredientUnit;
}
