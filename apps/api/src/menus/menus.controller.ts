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
import { MenusService } from "./menus.service";
import { CreateMenuDto } from "./dto/create-menu.dto";
import { UpdateMenuDto } from "./dto/update-menu.dto";
import { AddMenuItemDto } from "./dto/add-menu-item.dto";
import { UpdateMenuItemDto } from "./dto/update-menu-item.dto";

@Controller("menus")
@UseGuards(JwtAuthGuard)
export class MenusController {
  constructor(private readonly menusService: MenusService) {}

  @Get()
  findAll(@CurrentUser("companyId") companyId: string) {
    return this.menusService.findAll(companyId);
  }

  @Get(":id")
  findOne(
    @CurrentUser("companyId") companyId: string,
    @Param("id") id: string,
  ) {
    return this.menusService.findOne(id, companyId);
  }

  @Post()
  create(
    @CurrentUser("companyId") companyId: string,
    @Body() dto: CreateMenuDto,
  ) {
    return this.menusService.create(dto, companyId);
  }

  @Patch(":id")
  update(
    @CurrentUser("companyId") companyId: string,
    @Param("id") id: string,
    @Body() dto: UpdateMenuDto,
  ) {
    return this.menusService.update(id, dto, companyId);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser("companyId") companyId: string,
    @Param("id") id: string,
  ) {
    return this.menusService.remove(id, companyId);
  }

  @Post(":id/items")
  addItem(
    @CurrentUser("companyId") companyId: string,
    @Param("id") menuId: string,
    @Body() dto: AddMenuItemDto,
  ) {
    return this.menusService.addItem(menuId, dto, companyId);
  }

  @Patch(":menuId/items/:itemId")
  updateItem(
    @CurrentUser("companyId") companyId: string,
    @Param("menuId") menuId: string,
    @Param("itemId") itemId: string,
    @Body() dto: UpdateMenuItemDto,
  ) {
    return this.menusService.updateItem(menuId, itemId, dto, companyId);
  }

  @Delete(":menuId/items/:itemId")
  @HttpCode(HttpStatus.NO_CONTENT)
  removeItem(
    @CurrentUser("companyId") companyId: string,
    @Param("menuId") menuId: string,
    @Param("itemId") itemId: string,
  ) {
    return this.menusService.removeItem(menuId, itemId, companyId);
  }
}
