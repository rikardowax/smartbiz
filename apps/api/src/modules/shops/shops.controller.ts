import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../../common/decorators/current-user.decorator.js";
import { Public } from "../../common/decorators/public.decorator.js";
import { Roles } from "../../common/decorators/roles.decorator.js";
import { ShopAccessGuard } from "../../common/guards/shop-access.guard.js";
import type { AuthenticatedUser } from "../../common/types/authenticated-user.js";
import { Role } from "../../generated/prisma/enums.js";
import {
  CreateShopDto,
  CreateShopReviewDto,
  ShopSearchQueryDto,
  UpdateShopDto,
  UpdateShopStatusDto,
} from "./dto/shop.dto.js";
import { ShopsService } from "./shops.service.js";

@ApiTags("Boutiques")
@Controller("shops")
export class ShopsController {
  constructor(private readonly shopsService: ShopsService) {}

  @ApiBearerAuth()
  @Post()
  @ApiOperation({ summary: "Créer sa boutique (promeut l'utilisateur en vendeur)" })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateShopDto) {
    return this.shopsService.create(user, dto);
  }

  @ApiBearerAuth()
  @Get("mine")
  @ApiOperation({ summary: "Boutiques gérées par l'utilisateur connecté" })
  findMine(@CurrentUser("id") userId: string) {
    return this.shopsService.findMine(userId);
  }

  @Public()
  @Get("public")
  @ApiOperation({ summary: "Annuaire public des boutiques actives" })
  findPublic(@Query() query: ShopSearchQueryDto) {
    return this.shopsService.findPublic(query);
  }

  @Public()
  @Get("public/cities")
  @ApiOperation({ summary: "Villes couvertes par la marketplace" })
  listCities() {
    return this.shopsService.listCities();
  }

  @Public()
  @Get("public/:slug")
  @ApiOperation({ summary: "Vitrine publique d'une boutique" })
  findPublicBySlug(@Param("slug") slug: string) {
    return this.shopsService.findPublicBySlug(slug);
  }

  @Public()
  @Get("public/:slug/reviews")
  @ApiOperation({ summary: "Avis publics d'une boutique" })
  listShopReviews(@Param("slug") slug: string) {
    return this.shopsService.listShopReviews(slug);
  }

  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @Get("admin")
  @ApiOperation({ summary: "Lister toutes les boutiques (administration)" })
  findAllForAdmin(@Query() query: ShopSearchQueryDto) {
    return this.shopsService.findAllForAdmin(query);
  }

  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @Patch(":shopId/status")
  @ApiOperation({ summary: "Activer ou suspendre une boutique (administration)" })
  updateStatus(@Param("shopId") shopId: string, @Body() dto: UpdateShopStatusDto) {
    return this.shopsService.updateStatus(shopId, dto);
  }

  @ApiBearerAuth()
  @UseGuards(ShopAccessGuard)
  @Get(":shopId")
  @ApiOperation({ summary: "Détail d'une boutique gérée" })
  findOne(@Param("shopId") shopId: string) {
    return this.shopsService.findOneForOwner(shopId);
  }

  @ApiBearerAuth()
  @UseGuards(ShopAccessGuard)
  @Patch(":shopId")
  @ApiOperation({ summary: "Modifier les informations de sa boutique" })
  update(@Param("shopId") shopId: string, @Body() dto: UpdateShopDto) {
    return this.shopsService.update(shopId, dto);
  }

  @ApiBearerAuth()
  @UseGuards(ShopAccessGuard)
  @Delete(":shopId")
  @ApiOperation({ summary: "Supprimer sa boutique" })
  remove(@Param("shopId") shopId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.shopsService.remove(shopId, user);
  }

  @ApiBearerAuth()
  @Post(":shopId/reviews")
  @ApiOperation({ summary: "Laisser un avis sur une boutique (commande livrée requise)" })
  createShopReview(
    @Param("shopId") shopId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateShopReviewDto,
  ) {
    return this.shopsService.createShopReview(shopId, user.id, dto);
  }
}
