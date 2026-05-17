import { IsEnum, IsIn, IsOptional, IsString } from "class-validator";
import { OrderStatus } from "@prisma/client";

export class UpdateOrderDto {
  @IsIn(["dinheiro", "pix", "cartao_credito", "cartao_debito", "outro"])
  @IsOptional()
  paymentMethod?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsEnum(OrderStatus)
  @IsOptional()
  status?: OrderStatus;
}
