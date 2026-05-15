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
import { RecipesService } from "./recipes.service";
import { CreateRecipeDto } from "./dto/create-recipe.dto";
import { UpdateRecipeDto } from "./dto/update-recipe.dto";

@Controller("recipes")
@UseGuards(JwtAuthGuard)
export class RecipesController {
  constructor(private readonly recipesService: RecipesService) {}

  @Get()
  findAll(@CurrentUser("companyId") companyId: string) {
    return this.recipesService.findAll(companyId);
  }

  @Get(":id")
  findOne(
    @CurrentUser("companyId") companyId: string,
    @Param("id") id: string,
  ) {
    return this.recipesService.findOne(companyId, id);
  }

  @Post()
  create(
    @CurrentUser("companyId") companyId: string,
    @Body() dto: CreateRecipeDto,
  ) {
    return this.recipesService.create(companyId, dto);
  }

  @Patch(":id")
  update(
    @CurrentUser("companyId") companyId: string,
    @Param("id") id: string,
    @Body() dto: UpdateRecipeDto,
  ) {
    return this.recipesService.update(companyId, id, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser("companyId") companyId: string,
    @Param("id") id: string,
  ) {
    return this.recipesService.remove(companyId, id);
  }
}
