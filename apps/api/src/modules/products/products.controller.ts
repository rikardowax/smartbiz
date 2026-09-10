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
import { ShopAccessGuard } from "../../common/guards/shop-access.guard.js";
import {
  CatalogQueryDto,
  CreateProductDto,
  CreateReviewDto,
  ProductQueryDto,
  UpdateProductDto,
} from "./dto/product.dto.js";
import { ProductsService } from "./products.service.js";

/** Catalogue accessible sans authentification (marketplace). */
@ApiTags("Catalogue")
@Controller("catalog")
export class CatalogController {
  constructor(private readonly productsService: ProductsService) {}

  @Public()
  @Get("products")
  @ApiOperation({ summary: "Rechercher dans le catalogue de la marketplace" })
  findCatalog(@Query() query: CatalogQueryDto) {
    return this.productsService.findCatalog(query);
  }

  @Public()
  @Get("highlights")
  @ApiOperation({ summary: "Sélections mises en avant sur la page d'accueil" })
  findHighlights() {
    return this.productsService.findHighlights();
  }

  @Public()
  @Get("products/:shopSlug/:productSlug")
  @ApiOperation({ summary: "Fiche produit publique" })
  findPublicBySlug(@Param("shopSlug") shopSlug: string, @Param("productSlug") productSlug: string) {
    return this.productsService.findPublicBySlug(shopSlug, productSlug);
  }

  @ApiBearerAuth()
  @Post("products/:productId/reviews")
  @ApiOperation({ summary: "Noter un produit reçu (commande livrée uniquement)" })
  createReview(
    @Param("productId") productId: string,
    @CurrentUser("id") userId: string,
    @Body() dto: CreateReviewDto,
  ) {
    return this.productsService.createReview(productId, userId, dto);
  }
}

/** Gestion du catalogue par le vendeur, dans le contexte de sa boutique. */
@ApiTags("Produits (vendeur)")
@ApiBearerAuth()
@UseGuards(ShopAccessGuard)
@Controller("shops/:shopId/products")
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @ApiOperation({ summary: "Ajouter un produit" })
  create(
    @Param("shopId") shopId: string,
    @CurrentUser("id") userId: string,
    @Body() dto: CreateProductDto,
  ) {
    return this.productsService.create(shopId, userId, dto);
  }

  @Get()
  @ApiOperation({ summary: "Lister les produits de la boutique" })
  findAll(@Param("shopId") shopId: string, @Query() query: ProductQueryDto) {
    return this.productsService.findAllForShop(shopId, query);
  }

  @Get(":productId")
  @ApiOperation({ summary: "Détail d'un produit avec ses derniers mouvements de stock" })
  findOne(@Param("shopId") shopId: string, @Param("productId") productId: string) {
    return this.productsService.findOneForShop(shopId, productId);
  }

  @Patch(":productId")
  @ApiOperation({ summary: "Modifier un produit (le stock passe par les mouvements)" })
  update(
    @Param("shopId") shopId: string,
    @Param("productId") productId: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.update(shopId, productId, dto);
  }

  @Delete(":productId")
  @ApiOperation({ summary: "Supprimer un produit (archivé s'il a déjà été commandé)" })
  remove(@Param("shopId") shopId: string, @Param("productId") productId: string) {
    return this.productsService.remove(shopId, productId);
  }
}
