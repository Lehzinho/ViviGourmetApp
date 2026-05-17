import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { CustomersService } from "./customers.service";
import { CreateOrderDto } from "./dto/create-order.dto";
import { UpdateOrderDto } from "./dto/update-order.dto";
import { FilterOrdersDto } from "./dto/filter-orders.dto";

@Controller("orders")
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentUser("companyId") companyId: string,
    @Body() dto: CreateOrderDto,
  ) {
    return this.customersService.createOrder(companyId, dto);
  }

  @Get()
  findAll(
    @CurrentUser("companyId") companyId: string,
    @Query() filters: FilterOrdersDto,
  ) {
    return this.customersService.findAllOrders(companyId, filters);
  }

  @Get(":id")
  async findOne(
    @CurrentUser("companyId") companyId: string,
    @Param("id") id: string,
  ) {
    const order = await this.customersService.findOneOrder(companyId, id);
    if (!order) throw new NotFoundException(`Order not found: ${id}`);
    return order;
  }

  @Patch(":id")
  update(
    @CurrentUser("companyId") companyId: string,
    @Param("id") id: string,
    @Body() dto: UpdateOrderDto,
  ) {
    return this.customersService.updateOrder(companyId, id, dto);
  }

  @Patch(":id/cancel")
  @HttpCode(HttpStatus.OK)
  cancel(
    @CurrentUser("companyId") companyId: string,
    @Param("id") id: string,
  ) {
    return this.customersService.cancelOrder(companyId, id);
  }
}
