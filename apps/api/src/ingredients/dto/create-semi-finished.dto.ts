import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNumber,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { IngredientUnit } from "@prisma/client";

class CompositionItemDto {
  @IsString()
  ingredientId!: string;

  @IsNumber()
  @Min(0.0001)
  quantity!: number;

  @IsEnum(IngredientUnit)
  unit!: IngredientUnit;
}

export class CreateSemiFinishedDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsNumber()
  @Min(0.0001)
  yield!: number;

  @IsEnum(IngredientUnit)
  yieldUnit!: IngredientUnit;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CompositionItemDto)
  items!: CompositionItemDto[];
}
