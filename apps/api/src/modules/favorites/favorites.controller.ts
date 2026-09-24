import { Controller, Get, Param, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../../common/decorators/current-user.decorator.js";
import type { AuthenticatedUser } from "../../common/types/authenticated-user.js";
import { FavoritesService } from "./favorites.service.js";

@ApiTags("favorites")
@ApiBearerAuth()
@Controller("favorites")
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Get()
  @ApiOperation({ summary: "Produits favoris de l'utilisateur connecté" })
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.favoritesService.list(user.id);
  }

  @Get("ids")
  @ApiOperation({ summary: "Identifiants des produits favoris (pour l'état des cœurs)" })
  ids(@CurrentUser() user: AuthenticatedUser) {
    return this.favoritesService.ids(user.id);
  }

  @Post(":productId/toggle")
  @ApiOperation({ summary: "Ajouter ou retirer un produit des favoris" })
  toggle(@CurrentUser() user: AuthenticatedUser, @Param("productId") productId: string) {
    return this.favoritesService.toggle(user.id, productId);
  }
}
