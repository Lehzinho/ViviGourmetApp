import { IsArray, IsInt, IsString, Min, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

class ReorderItemEntry {
  @IsString()
  id!: string;

  @IsInt()
  @Min(0)
  order!: number;
}

export class ReorderItemsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReorderItemEntry)
  items!: ReorderItemEntry[];
}
