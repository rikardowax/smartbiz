import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiPropertyOptional, ApiTags } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength } from "class-validator";
import { CurrentUser } from "../../common/decorators/current-user.decorator.js";
import { Public } from "../../common/decorators/public.decorator.js";
import { ShopAccessGuard } from "../../common/guards/shop-access.guard.js";
import {
  CheckoutDto,
  CreateManualOrderDto,
  OrderQueryDto,
  TrackOrderDto,
  UpdateOrderStatusDto,
  UpdatePaymentStatusDto,
} from "./dto/order.dto.js";
import { OrdersService } from "./orders.service.js";

export class CancelOrderDto {
  @ApiPropertyOptional({ example: "Je me suis trompé de quantité" })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  reason?: string;
}

/** Parcours acheteur : commander, suivre, annuler. */
@ApiTags("Commandes (acheteur)")
@Controller("orders")
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Public()
  @Post("checkout")
  @ApiOperation({ summary: "Valider le panier (une commande par boutique, invité accepté)" })
  checkout(@CurrentUser("id") userId: string | undefined, @Body() dto: CheckoutDto) {
    return this.ordersService.checkout(userId ?? null, dto);
  }

  @ApiBearerAuth()
  @Get("mine")
  @ApiOperation({ summary: "Mes commandes" })
  findMine(@CurrentUser("id") userId: string, @Query() query: OrderQueryDto) {
    return this.ordersService.findForBuyer(userId, query);
  }

  @Public()
  @Post("track")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Suivre une commande sans compte (numéro + téléphone)" })
  track(@Body() dto: TrackOrderDto) {
    return this.ordersService.track(dto.orderNumber, dto.phone);
  }

  @ApiBearerAuth()
  @Get(":orderId")
  @ApiOperation({ summary: "Détail d'une de mes commandes" })
  findOne(@CurrentUser("id") userId: string, @Param("orderId") orderId: string) {
    return this.ordersService.findOneForBuyer(userId, orderId);
  }

  @ApiBearerAuth()
  @Patch(":orderId/cancel")
  @ApiOperation({ summary: "Annuler une commande non expédiée" })
  cancel(
    @CurrentUser("id") userId: string,
    @Param("orderId") orderId: string,
    @Body() dto: CancelOrderDto,
  ) {
    return this.ordersService.cancelAsBuyer(userId, orderId, dto.reason);
  }
}

/** Traitement des commandes par le vendeur. */
@ApiTags("Commandes (vendeur)")
@ApiBearerAuth()
@UseGuards(ShopAccessGuard)
@Controller("shops/:shopId/orders")
export class ShopOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: "Enregistrer une vente au comptoir ou par téléphone" })
  create(@Param("shopId") shopId: string, @Body() dto: CreateManualOrderDto) {
    return this.ordersService.createManualOrder(shopId, dto);
  }

  @Get()
  @ApiOperation({ summary: "Lister les commandes de la boutique" })
  findAll(@Param("shopId") shopId: string, @Query() query: OrderQueryDto) {
    return this.ordersService.findForShop(shopId, query);
  }

  @Get(":orderId")
  @ApiOperation({ summary: "Détail d'une commande avec sa chronologie" })
  findOne(@Param("shopId") shopId: string, @Param("orderId") orderId: string) {
    return this.ordersService.findOneForShop(shopId, orderId);
  }

  @Patch(":orderId/status")
  @ApiOperation({ summary: "Faire avancer la commande dans son cycle de vie" })
  updateStatus(
    @Param("shopId") shopId: string,
    @Param("orderId") orderId: string,
    @CurrentUser("id") userId: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateStatus(shopId, orderId, userId, dto);
  }

  @Patch(":orderId/payment")
  @ApiOperation({ summary: "Mettre à jour le règlement (génère l'écriture d'encaissement)" })
  updatePayment(
    @Param("shopId") shopId: string,
    @Param("orderId") orderId: string,
    @Body() dto: UpdatePaymentStatusDto,
  ) {
    return this.ordersService.updatePaymentStatus(shopId, orderId, dto);
  }
}
