import {
  Body,
  Controller,
  Delete,
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
import { CreateCustomerDto } from "./dto/create-customer.dto";
import { UpdateCustomerDto } from "./dto/update-customer.dto";
import { FilterCustomersDto } from "./dto/filter-customers.dto";

@Controller("customers")
@UseGuards(JwtAuthGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentUser("companyId") companyId: string,
    @Body() dto: CreateCustomerDto,
  ) {
    return this.customersService.createCustomer(companyId, dto);
  }

  @Get()
  findAll(
    @CurrentUser("companyId") companyId: string,
    @Query() filters: FilterCustomersDto,
  ) {
    return this.customersService.findAllCustomers(companyId, filters);
  }

  @Get(":id/profile")
  async getProfile(
    @CurrentUser("companyId") companyId: string,
    @Param("id") id: string,
  ) {
    const profile = await this.customersService.getCustomerProfile(companyId, id);
    if (!profile) throw new NotFoundException(`Customer not found: ${id}`);
    return profile;
  }

  @Get(":id")
  async findOne(
    @CurrentUser("companyId") companyId: string,
    @Param("id") id: string,
  ) {
    const customer = await this.customersService.findOneCustomer(companyId, id);
    if (!customer) throw new NotFoundException(`Customer not found: ${id}`);
    return customer;
  }

  @Patch(":id")
  update(
    @CurrentUser("companyId") companyId: string,
    @Param("id") id: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.customersService.updateCustomer(companyId, id, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser("companyId") companyId: string,
    @Param("id") id: string,
  ) {
    return this.customersService.removeCustomer(companyId, id);
  }
}
