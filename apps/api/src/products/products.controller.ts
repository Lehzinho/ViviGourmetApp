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
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { CostCalculatorService } from "../cost-calculator/cost-calculator.service";
import { ProductsService } from "./products.service";
import { CreateProductDto } from "./dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto";

@Controller("products")
@UseGuards(JwtAuthGuard)
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly costCalculatorService: CostCalculatorService,
  ) {}

  @Get()
  findAll(@CurrentUser("companyId") companyId: string) {
    return this.productsService.findAll(companyId);
  }

  @Get(":id/cost")
  getCost(
    @CurrentUser("companyId") companyId: string,
    @Param("id") id: string,
  ) {
    return this.costCalculatorService.calculateProductCost(id, companyId);
  }

  @Get(":id")
  findOne(
    @CurrentUser("companyId") companyId: string,
    @Param("id") id: string,
  ) {
    return this.productsService.findOne(id, companyId);
  }

  @Post()
  create(
    @CurrentUser("companyId") companyId: string,
    @Body() dto: CreateProductDto,
  ) {
    return this.productsService.create(dto, companyId);
  }

  @Patch(":id")
  update(
    @CurrentUser("companyId") companyId: string,
    @Param("id") id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.update(id, dto, companyId);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser("companyId") companyId: string,
    @Param("id") id: string,
  ) {
    return this.productsService.remove(id, companyId);
  }
}
