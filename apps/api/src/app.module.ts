import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { AppController } from "./app.controller.js";
import { JwtAuthGuard } from "./common/guards/jwt-auth.guard.js";
import { RolesGuard } from "./common/guards/roles.guard.js";
import { configuration, validateEnv } from "./config/configuration.js";
import { AdminModule } from "./modules/admin/admin.module.js";
import { AssistantModule } from "./modules/assistant/assistant.module.js";
import { AuthModule } from "./modules/auth/auth.module.js";
import { CategoriesModule } from "./modules/categories/categories.module.js";
import { DashboardModule } from "./modules/dashboard/dashboard.module.js";
import { FinanceModule } from "./modules/finance/finance.module.js";
import { OrdersModule } from "./modules/orders/orders.module.js";
import { PartnersModule } from "./modules/partners/partners.module.js";
import { ProductsModule } from "./modules/products/products.module.js";
import { SalesbotModule } from "./modules/salesbot/salesbot.module.js";
import { ShopsModule } from "./modules/shops/shops.module.js";
import { StockModule } from "./modules/stock/stock.module.js";
import { PrismaModule } from "./prisma/prisma.module.js";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [configuration],
      validate: validateEnv,
    }),
    ThrottlerModule.forRoot([{ name: "default", ttl: 60_000, limit: 120 }]),
    PrismaModule,
    AuthModule,
    ShopsModule,
    CategoriesModule,
    ProductsModule,
    StockModule,
    PartnersModule,
    OrdersModule,
    FinanceModule,
    DashboardModule,
    AssistantModule,
    SalesbotModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [
    // Ordre important : limitation de débit, puis authentification, puis RBAC.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
