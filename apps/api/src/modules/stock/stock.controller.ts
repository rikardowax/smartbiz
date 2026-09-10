import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../../common/decorators/current-user.decorator.js";
import { ShopAccessGuard } from "../../common/guards/shop-access.guard.js";
import { CreateStockMovementDto, StockMovementQueryDto } from "./dto/stock.dto.js";
import { StockService } from "./stock.service.js";

@ApiTags("Stock (vendeur)")
@ApiBearerAuth()
@UseGuards(ShopAccessGuard)
@Controller("shops/:shopId/stock")
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Post("movements")
  @ApiOperation({ summary: "Enregistrer une entrée, sortie, perte, retour ou un inventaire" })
  createMovement(
    @Param("shopId") shopId: string,
    @CurrentUser("id") userId: string,
    @Body() dto: CreateStockMovementDto,
  ) {
    return this.stockService.createMovement(shopId, userId, dto);
  }

  @Get("movements")
  @ApiOperation({ summary: "Historique des mouvements de stock" })
  findMovements(@Param("shopId") shopId: string, @Query() query: StockMovementQueryDto) {
    return this.stockService.findMovements(shopId, query);
  }

  @Get("alerts")
  @ApiOperation({ summary: "Produits en rupture ou sous le seuil d'alerte" })
  findAlerts(@Param("shopId") shopId: string) {
    return this.stockService.findAlerts(shopId);
  }

  @Get("valuation")
  @ApiOperation({ summary: "Valorisation du stock au prix d'achat et au prix de vente" })
  valuation(@Param("shopId") shopId: string) {
    return this.stockService.valuation(shopId);
  }
}
