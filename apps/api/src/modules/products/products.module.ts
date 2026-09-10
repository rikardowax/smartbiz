import { Module } from "@nestjs/common";
import { CatalogController, ProductsController } from "./products.controller.js";
import { ProductsService } from "./products.service.js";

@Module({
  controllers: [CatalogController, ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
