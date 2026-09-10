import {
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";
import { Roles } from "../../common/decorators/roles.decorator.js";
import { ShopAccessGuard } from "../../common/guards/shop-access.guard.js";
import { Role } from "../../generated/prisma/enums.js";
import { DashboardService } from "./dashboard.service.js";

@ApiTags("Tableau de bord (vendeur)")
@ApiBearerAuth()
@UseGuards(ShopAccessGuard)
@Controller("shops/:shopId/dashboard")
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get("overview")
  @ApiOperation({ summary: "Indicateurs clés de la boutique" })
  overview(@Param("shopId") shopId: string) {
    return this.dashboardService.overview(shopId);
  }

  @Get("sales-trend")
  @ApiQuery({ name: "days", required: false, example: 30 })
  @ApiOperation({ summary: "Chiffre d'affaires jour par jour" })
  salesTrend(
    @Param("shopId") shopId: string,
    @Query("days", new DefaultValuePipe(30), ParseIntPipe) days: number,
  ) {
    return this.dashboardService.salesTrend(shopId, Math.min(Math.max(days, 7), 180));
  }

  @Get("top-products")
  @ApiQuery({ name: "days", required: false, example: 30 })
  @ApiOperation({ summary: "Produits les plus vendus" })
  topProducts(
    @Param("shopId") shopId: string,
    @Query("days", new DefaultValuePipe(30), ParseIntPipe) days: number,
  ) {
    return this.dashboardService.topProducts(shopId, Math.min(Math.max(days, 7), 365));
  }

  @Get("channels")
  @ApiQuery({ name: "days", required: false, example: 30 })
  @ApiOperation({ summary: "Répartition des ventes par canal" })
  salesByChannel(
    @Param("shopId") shopId: string,
    @Query("days", new DefaultValuePipe(30), ParseIntPipe) days: number,
  ) {
    return this.dashboardService.salesByChannel(shopId, Math.min(Math.max(days, 7), 365));
  }

  @Get("activity")
  @ApiOperation({ summary: "Dernières commandes et alertes de stock" })
  activity(@Param("shopId") shopId: string) {
    return this.dashboardService.activity(shopId);
  }
}

@ApiTags("Administration")
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller("admin/dashboard")
export class AdminDashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get("overview")
  @ApiOperation({ summary: "Vue d'ensemble de la plateforme" })
  overview() {
    return this.dashboardService.platformOverview();
  }
}
