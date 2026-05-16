import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { CostCalculatorModule } from "../cost-calculator/cost-calculator.module";
import { DashboardController } from "./dashboard.controller";
import { DashboardService } from "./dashboard.service";

@Module({
  imports: [PrismaModule, CostCalculatorModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
