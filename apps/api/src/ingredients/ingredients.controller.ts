import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { IngredientType } from "@prisma/client";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { CostCalculatorService } from "../cost-calculator/cost-calculator.service";
import { IngredientsService } from "./ingredients.service";
import { CreateRawMaterialDto } from "./dto/create-raw-material.dto";
import { AddPriceDto } from "./dto/add-price.dto";
import { CreateSemiFinishedDto } from "./dto/create-semi-finished.dto";
import { UpdateIngredientDto } from "./dto/update-ingredient.dto";

@Controller("ingredients")
@UseGuards(JwtAuthGuard)
export class IngredientsController {
  constructor(
    private readonly ingredientsService: IngredientsService,
    private readonly costCalculatorService: CostCalculatorService,
  ) {}

  @Get()
  findAll(
    @CurrentUser("companyId") companyId: string,
    @Query("type") type?: IngredientType,
  ) {
    return this.ingredientsService.findAll(companyId, type);
  }

  @Post("raw")
  createRaw(
    @CurrentUser("companyId") companyId: string,
    @Body() dto: CreateRawMaterialDto,
  ) {
    return this.ingredientsService.createRawMaterial(dto, companyId);
  }

  @Post(":id/prices")
  addPrice(
    @CurrentUser("companyId") companyId: string,
    @Param("id") ingredientId: string,
    @Body() dto: AddPriceDto,
  ) {
    return this.ingredientsService.addPrice(ingredientId, dto, companyId);
  }

  @Post("semi-finished")
  createSemiFinished(
    @CurrentUser("companyId") companyId: string,
    @Body() dto: CreateSemiFinishedDto,
  ) {
    return this.ingredientsService.createSemiFinished(dto, companyId);
  }

  @Get(":id/cost")
  getCost(
    @CurrentUser("companyId") companyId: string,
    @Param("id") ingredientId: string,
  ) {
    return this.costCalculatorService.calculateIngredientCost(ingredientId, companyId);
  }

  @Get(":id")
  findOne(
    @CurrentUser("companyId") companyId: string,
    @Param("id") id: string,
  ) {
    return this.ingredientsService.findDetail(id, companyId);
  }

  @Patch(":id")
  async update(
    @CurrentUser("companyId") companyId: string,
    @Param("id") id: string,
    @Body() dto: UpdateIngredientDto,
  ) {
    const result = await this.ingredientsService.update(id, dto, companyId);
    if (result.type === IngredientType.SEMI_FINISHED) {
      this.costCalculatorService.invalidateIngredientCache(id, companyId);
    }
    return result;
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser("companyId") companyId: string,
    @Param("id") id: string,
  ) {
    return this.ingredientsService.remove(id, companyId);
  }
}
