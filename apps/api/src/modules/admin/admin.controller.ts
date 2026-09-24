import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../../common/decorators/current-user.decorator.js";
import { Roles } from "../../common/decorators/roles.decorator.js";
import { Role } from "../../generated/prisma/enums.js";
import { UpdateShopStatusDto } from "../shops/dto/shop.dto.js";
import { AdminService } from "./admin.service.js";
import {
  AdminProductQueryDto,
  AdminShopQueryDto,
  AdminUserQueryDto,
  UpdateAdminUserDto,
} from "./dto/admin.dto.js";

@ApiTags("Administration")
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller("admin")
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // --- Tableau de bord -----------------------------------------------------

  @Get("stats")
  @ApiOperation({ summary: "Indicateurs de la plateforme" })
  stats() {
    return this.adminService.stats();
  }

  @Get("trend")
  @ApiQuery({ name: "days", required: false, example: 30 })
  @ApiOperation({ summary: "Inscriptions et commandes jour par jour" })
  trend(@Query("days", new DefaultValuePipe(30), ParseIntPipe) days: number) {
    return this.adminService.trend(Math.min(Math.max(days, 7), 180));
  }

  @Get("activity")
  @ApiOperation({ summary: "Dernières inscriptions, boutiques et commandes" })
  activity() {
    return this.adminService.activity();
  }

  // --- Utilisateurs --------------------------------------------------------

  @Get("users")
  @ApiOperation({ summary: "Lister les comptes de la plateforme" })
  findUsers(@Query() query: AdminUserQueryDto) {
    return this.adminService.findUsers(query);
  }

  @Patch("users/:userId")
  @ApiOperation({ summary: "Changer le rôle ou l'état d'activation d'un compte" })
  updateUser(
    @CurrentUser("id") actorId: string,
    @Param("userId") userId: string,
    @Body() dto: UpdateAdminUserDto,
  ) {
    return this.adminService.updateUser(actorId, userId, dto);
  }

  @Delete("users/:userId")
  @ApiOperation({ summary: "Supprimer un compte (et en cascade ses boutiques)" })
  removeUser(@CurrentUser("id") actorId: string, @Param("userId") userId: string) {
    return this.adminService.removeUser(actorId, userId);
  }

  // --- Boutiques -----------------------------------------------------------

  @Get("shops")
  @ApiOperation({ summary: "Lister toutes les boutiques" })
  findShops(@Query() query: AdminShopQueryDto) {
    return this.adminService.findShops(query);
  }

  @Patch("shops/:shopId/status")
  @ApiOperation({ summary: "Activer, suspendre ou remettre en attente une boutique" })
  updateShopStatus(@Param("shopId") shopId: string, @Body() dto: UpdateShopStatusDto) {
    return this.adminService.updateShopStatus(shopId, dto.status);
  }

  @Delete("shops/:shopId")
  @ApiOperation({ summary: "Supprimer une boutique et son contenu" })
  removeShop(@Param("shopId") shopId: string) {
    return this.adminService.removeShop(shopId);
  }

  // --- Produits ------------------------------------------------------------

  @Get("products")
  @ApiOperation({ summary: "Lister les produits de toutes les boutiques" })
  findProducts(@Query() query: AdminProductQueryDto) {
    return this.adminService.findProducts(query);
  }

  @Delete("products/:productId")
  @ApiOperation({ summary: "Supprimer un produit (archivé s'il a déjà été commandé)" })
  removeProduct(@Param("productId") productId: string) {
    return this.adminService.removeProduct(productId);
  }
}
