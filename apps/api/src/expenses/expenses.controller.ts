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
import { ExpensesService } from "./expenses.service";
import { CreateExpenseDto } from "./dto/create-expense.dto";
import { UpdateExpenseDto } from "./dto/update-expense.dto";
import { FilterExpensesDto } from "./dto/filter-expenses.dto";

@Controller("expenses")
@UseGuards(JwtAuthGuard)
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentUser("companyId") companyId: string,
    @Body() dto: CreateExpenseDto,
  ) {
    return this.expensesService.create(companyId, dto);
  }

  @Get()
  findAll(
    @CurrentUser("companyId") companyId: string,
    @Query() filters: FilterExpensesDto,
  ) {
    return this.expensesService.findAll(companyId, filters);
  }

  @Get("summary")
  getMonthlySummary(
    @CurrentUser("companyId") companyId: string,
    @Query("year") year: string,
    @Query("month") month: string,
  ) {
    return this.expensesService.getMonthlySummary(
      companyId,
      parseInt(year, 10),
      parseInt(month, 10),
    );
  }

  @Get(":id")
  async findOne(
    @CurrentUser("companyId") companyId: string,
    @Param("id") id: string,
  ) {
    const expense = await this.expensesService.findOne(companyId, id);
    if (!expense) throw new NotFoundException(`Expense not found: ${id}`);
    return expense;
  }

  @Patch(":id")
  update(
    @CurrentUser("companyId") companyId: string,
    @Param("id") id: string,
    @Body() dto: UpdateExpenseDto,
  ) {
    return this.expensesService.update(companyId, id, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser("companyId") companyId: string,
    @Param("id") id: string,
  ) {
    return this.expensesService.remove(companyId, id);
  }
}
