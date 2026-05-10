import { IsEnum, IsNumber, IsString, Min, MinLength } from "class-validator";
import { IngredientUnit } from "@prisma/client";

export class CreateRawMaterialDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsEnum(IngredientUnit)
  unit!: IngredientUnit;

  @IsNumber()
  @Min(0.0001)
  price!: number;

  @IsNumber()
  @Min(0.0001)
  quantity!: number;
}
