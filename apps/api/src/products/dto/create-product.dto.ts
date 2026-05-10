import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";
import { IngredientUnit } from "@prisma/client";

export class CreateProductItemDto {
  @IsString()
  @MinLength(1)
  ingredientId!: string;

  @IsNumber()
  @IsPositive()
  quantity!: number;

  @IsString()
  unit!: IngredientUnit;
}

export class CreateProductExtraCostDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsNumber()
  @Min(0)
  unitCost!: number;
}

export class CreateProductDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsNumber()
  @Min(0)
  sellingPrice!: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  photoUrl?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  weight?: number;

  @IsOptional()
  @IsString()
  dimensions?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateProductItemDto)
  items!: CreateProductItemDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductExtraCostDto)
  extraCosts!: CreateProductExtraCostDto[];
}
