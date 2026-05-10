import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { CostCalculatorService } from "./cost-calculator.service";

@Module({
  imports: [PrismaModule],
  providers: [CostCalculatorService],
  exports: [CostCalculatorService],
})
export class CostCalculatorModule {}
