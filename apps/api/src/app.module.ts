import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { AuthModule } from "./auth/auth.module";
import { CostCalculatorModule } from "./cost-calculator/cost-calculator.module";
import { ExpensesModule } from "./expenses/expenses.module";
import { IngredientsModule } from "./ingredients/ingredients.module";
import { MenusModule } from "./menus/menus.module";
import { ProductsModule } from "./products/products.module";
import { RecipesModule } from "./recipes/recipes.module";
import { PrismaModule } from "./prisma/prisma.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    CostCalculatorModule,
    ExpensesModule,
    IngredientsModule,
    MenusModule,
    ProductsModule,
    RecipesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
