import { Module } from "@nestjs/common";
import { SalesbotController } from "./salesbot.controller.js";
import { SalesbotService } from "./salesbot.service.js";

@Module({
  controllers: [SalesbotController],
  providers: [SalesbotService],
})
export class SalesbotModule {}
