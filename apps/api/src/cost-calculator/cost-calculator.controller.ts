import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { CostCalculatorService } from "./cost-calculator.service";

@Controller("cost-calculator")
@UseGuards(JwtAuthGuard)
export class CostCalculatorController {
  constructor(private readonly costCalculatorService: CostCalculatorService) {}

  @Get("recipe/:id")
  getRecipeCost(
    @CurrentUser("companyId") companyId: string,
    @Param("id") id: string,
  ) {
    return this.costCalculatorService.calculateRecipeCost(id, companyId);
  }
}
