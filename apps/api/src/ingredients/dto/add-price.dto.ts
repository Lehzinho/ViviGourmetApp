import { IsNumber, Min } from "class-validator";

export class AddPriceDto {
  @IsNumber()
  @Min(0.0001)
  price!: number;

  @IsNumber()
  @Min(0.0001)
  quantity!: number;
}
