import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";
import { MenusController } from "./menus.controller";
import { MenusService } from "./menus.service";

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [MenusController],
  providers: [MenusService],
  exports: [MenusService],
})
export class MenusModule {}
