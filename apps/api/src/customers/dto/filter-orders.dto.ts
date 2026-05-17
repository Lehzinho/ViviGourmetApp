import { IsDateString, IsEnum, IsOptional, IsString } from "class-validator";
import { OrderStatus } from "@prisma/client";

export class FilterOrdersDto {
  @IsString()
  @IsOptional()
  customerId?: string;

  @IsEnum(OrderStatus)
  @IsOptional()
  status?: OrderStatus;

  @IsDateString()
  @IsOptional()
  from?: string;

  @IsDateString()
  @IsOptional()
  to?: string;
}
