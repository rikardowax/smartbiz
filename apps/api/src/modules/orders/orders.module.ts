import { Module } from "@nestjs/common";
import { PartnersModule } from "../partners/partners.module.js";
import { OrdersController, ShopOrdersController } from "./orders.controller.js";
import { OrdersService } from "./orders.service.js";

@Module({
  imports: [PartnersModule],
  controllers: [OrdersController, ShopOrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
