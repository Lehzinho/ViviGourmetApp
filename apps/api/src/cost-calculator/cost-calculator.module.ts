import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";
import { CostCalculatorController } from "./cost-calculator.controller";
import { CostCalculatorService } from "./cost-calculator.service";

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [CostCalculatorController],
  providers: [CostCalculatorService],
  exports: [CostCalculatorService],
})
export class CostCalculatorModule {}
