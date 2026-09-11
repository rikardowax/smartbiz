import { Body, Controller, Get, Logger, Post, Query } from "@nestjs/common";
import { Public } from "../../common/decorators/public.decorator.js";
import { SalesbotService } from "./salesbot.service.js";
import { WhatsAppWebhookDto } from "./dto/whatsapp-webhook.dto.js";

@Public()
@Controller("webhooks")
export class SalesbotController {
  private readonly logger = new Logger(SalesbotController.name);

  constructor(private readonly salesbot: SalesbotService) {}

  @Get("whatsapp")
  verify(
    @Query("hub.mode") mode: string,
    @Query("hub.verify_token") token: string,
    @Query("hub.challenge") challenge: string,
  ) {
    if (mode === "subscribe" && this.salesbot.verifyToken(token)) {
      this.logger.log("WhatsApp webhook vérifié");
      return challenge;
    }
    this.logger.warn("Échec vérification webhook WhatsApp");
    return "";
  }

  @Post("whatsapp")
  async receive(@Body() body: WhatsAppWebhookDto) {
    await this.salesbot.handleWebhook(body);
    return { status: "ok" };
  }
}
