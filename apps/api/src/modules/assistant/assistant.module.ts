import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module.js";
import { DashboardModule } from "../dashboard/dashboard.module.js";
import { PartnersModule } from "../partners/partners.module.js";
import { ProductsModule } from "../products/products.module.js";
import { AssistantController } from "./assistant.controller.js";
import { AssistantService } from "./assistant.service.js";

@Module({
  imports: [PrismaModule, ProductsModule, PartnersModule, DashboardModule],
  controllers: [AssistantController],
  providers: [AssistantService],
})
export class AssistantModule {}
