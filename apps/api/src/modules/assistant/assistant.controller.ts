import { Body, Controller, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Public } from "../../common/decorators/public.decorator.js";
import { CurrentUser } from "../../common/decorators/current-user.decorator.js";
import type { AuthenticatedUser } from "../../common/types/authenticated-user.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import { AssistantService } from "./assistant.service.js";
import { AssistantChatDto } from "./dto/assistant.dto.js";

@ApiTags("Assistant")
@ApiBearerAuth()
@Controller("assistant")
export class AssistantController {
  constructor(
    private readonly assistant: AssistantService,
    private readonly prisma: PrismaService,
  ) {}

  @Post("chat")
  @ApiOperation({ summary: "Discuter avec l'assistant vendeur SmartBiz" })
  async chat(@Body() dto: AssistantChatDto, @CurrentUser() user: AuthenticatedUser) {
    const me = await this.prisma.user.findUnique({
      where: { id: user.id },
      include: { shops: { orderBy: { createdAt: "asc" }, take: 1 } },
    });

    const shop = me?.shops[0];
    if (!shop) {
      return {
        text: "Vous devez avoir une boutique pour utiliser l'assistant.",
      };
    }

    const response = await this.assistant.chat(dto.message, {
      shopId: shop.id,
      userId: user.id,
      locale: dto.locale ?? "fr",
    });

    return { text: response.text };
  }

  @Public()
  @Post("buyer/chat")
  @ApiOperation({ summary: "Discuter avec l'assistant acheteur SmartBiz" })
  async chatBuyer(@Body() dto: AssistantChatDto) {
    const response = await this.assistant.chatBuyer(dto.message, {
      locale: dto.locale ?? "fr",
    });
    return { text: response.text };
  }
}
