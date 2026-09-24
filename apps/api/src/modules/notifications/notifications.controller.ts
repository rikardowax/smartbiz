import { Body, Controller, Delete, Get, Param, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiTags } from "@nestjs/swagger";
import { IsObject, IsString, IsUrl } from "class-validator";
import { CurrentUser } from "../../common/decorators/current-user.decorator.js";
import { Public } from "../../common/decorators/public.decorator.js";
import type { AuthenticatedUser } from "../../common/types/authenticated-user.js";
import { NotificationsService } from "./notifications.service.js";

class PushSubscriptionDto {
  @ApiProperty()
  @IsUrl({ require_tld: false })
  endpoint: string;

  @ApiProperty({ example: { p256dh: "…", auth: "…" } })
  @IsObject()
  keys: { p256dh: string; auth: string };
}

class UnsubscribeDto {
  @ApiProperty()
  @IsString()
  endpoint: string;
}

@ApiTags("notifications")
@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @ApiBearerAuth()
  @Get()
  @ApiOperation({ summary: "Notifications de l'utilisateur connecté" })
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.list(user.id);
  }

  @ApiBearerAuth()
  @Get("unread-count")
  unreadCount(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.unreadCount(user.id);
  }

  @ApiBearerAuth()
  @Post(":id/read")
  markRead(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.notificationsService.markRead(user.id, id);
  }

  @ApiBearerAuth()
  @Post("read-all")
  markAllRead(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.markAllRead(user.id);
  }

  @Public()
  @Get("push/vapid-key")
  @ApiOperation({ summary: "Clé publique VAPID pour l'abonnement push" })
  vapidKey() {
    return this.notificationsService.getVapidPublicKey();
  }

  @ApiBearerAuth()
  @Post("push/subscribe")
  @ApiOperation({ summary: "Enregistrer un abonnement push" })
  subscribe(@CurrentUser() user: AuthenticatedUser, @Body() dto: PushSubscriptionDto) {
    return this.notificationsService.saveSubscription(user.id, dto.endpoint, dto.keys);
  }

  @ApiBearerAuth()
  @Delete("push/subscribe")
  @ApiOperation({ summary: "Supprimer un abonnement push" })
  unsubscribe(@CurrentUser() user: AuthenticatedUser, @Body() dto: UnsubscribeDto) {
    return this.notificationsService.removeSubscription(user.id, dto.endpoint);
  }
}
