import { Module } from "@nestjs/common";
import { CustomersService } from "./customers.service.js";
import { CustomersController, SuppliersController } from "./partners.controller.js";
import { SuppliersService } from "./suppliers.service.js";

@Module({
  controllers: [CustomersController, SuppliersController],
  providers: [CustomersService, SuppliersService],
  exports: [CustomersService, SuppliersService],
})
export class PartnersModule {}
