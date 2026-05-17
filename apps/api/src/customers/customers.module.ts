import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";
import { CustomersController } from "./customers.controller";
import { OrdersController } from "./orders.controller";
import { CustomersService } from "./customers.service";

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [CustomersController, OrdersController],
  providers: [CustomersService],
  exports: [CustomersService],
})
export class CustomersModule {}
