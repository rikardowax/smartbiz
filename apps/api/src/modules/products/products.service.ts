import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { paginate } from "../../common/dto/pagination.dto.js";
import { uniqueSlug } from "../../common/utils/slug.util.js";
import type { Prisma } from "../../generated/prisma/client.js";
import { ProductStatus, ShopStatus, StockMovementType } from "../../generated/prisma/enums.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import type {
  CatalogQueryDto,
  CreateProductDto,
  CreateReviewDto,
  ProductQueryDto,
  UpdateProductDto,
} from "./dto/product.dto.js";

const CATALOG_SELECT = {
  id: true,
  name: true,
  slug: true,
  description: true,
  price: true,
  compareAtPrice: true,
  unit: true,
  images: true,
  stockQuantity: true,
  ratingAverage: true,
  ratingCount: true,
  soldCount: true,
  createdAt: true,
  category: { select: { id: true, name: true, slug: true } },
  shop: { select: { id: true, name: true, slug: true, city: true, logoUrl: true } },
} as const;

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  // --- Espace vendeur ------------------------------------------------------

  async create(shopId: string, userId: string, dto: CreateProductDto) {
    if (dto.compareAtPrice != null && dto.compareAtPrice <= dto.price) {
      throw new BadRequestException("Le prix barré doit être supérieur au prix de vente");
    }

    const slug = await uniqueSlug(
      dto.name,
      async (candidate) =>
        (await this.prisma.product.count({ where: { shopId, slug: candidate } })) > 0,
    );

    const stockQuantity = dto.stockQuantity ?? 0;

    const product = await this.prisma.product.create({
      data: {
        ...dto,
        sku: dto.sku?.trim() || null,
        slug,
        shopId,
        stockQuantity,
        status: dto.status ?? ProductStatus.ACTIVE,
      },
    });

    // Tout stock initial est tracé : l'historique doit toujours expliquer la
    // quantité présente en rayon.
    if (stockQuantity > 0) {
      await this.prisma.stockMovement.create({
        data: {
          shopId,
          productId: product.id,
          userId,
          type: StockMovementType.IN,
          quantity: stockQuantity,
          unitCost: dto.costPrice,
          stockAfter: stockQuantity,
          reason: "Stock initial à la création du produit",
        },
      });
    }

    return product;
  }

  async findAllForShop(shopId: string, query: ProductQueryDto) {
    const where: Prisma.ProductWhereInput = {
      shopId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: "insensitive" } },
              { description: { contains: query.search, mode: "insensitive" } },
              { sku: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        include: { category: { select: { id: true, name: true } } },
        orderBy: this.orderBy(query.sort),
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    // Le seuil d'alerte varie par produit : le filtre est appliqué après la
    // requête, faute de comparaison colonne à colonne dans Prisma.
    const filtered = query.lowStockOnly
      ? items.filter((product) => product.stockQuantity <= product.lowStockThreshold)
      : items;

    return paginate(
      filtered,
      query.lowStockOnly ? filtered.length : total,
      query.page,
      query.limit,
    );
  }

  async findOneForShop(shopId: string, productId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, shopId },
      include: {
        category: { select: { id: true, name: true } },
        stockMovements: { orderBy: { createdAt: "desc" }, take: 15 },
        _count: { select: { orderItems: true, reviews: true } },
      },
    });
    if (!product) throw new NotFoundException("Produit introuvable dans cette boutique");
    return product;
  }

  async update(shopId: string, productId: string, dto: UpdateProductDto) {
    const product = await this.prisma.product.findFirst({ where: { id: productId, shopId } });
    if (!product) throw new NotFoundException("Produit introuvable dans cette boutique");

    const price = dto.price ?? product.price;
    const compareAtPrice = dto.compareAtPrice ?? product.compareAtPrice;
    if (compareAtPrice != null && compareAtPrice <= price) {
      throw new BadRequestException("Le prix barré doit être supérieur au prix de vente");
    }

    const slug =
      dto.name && dto.name !== product.name
        ? await uniqueSlug(
            dto.name,
            async (candidate) =>
              (await this.prisma.product.count({
                where: { shopId, slug: candidate, NOT: { id: productId } },
              })) > 0,
          )
        : undefined;

    // Le stock ne se modifie pas ici : il passe par les mouvements de stock.
    const { stockQuantity: _ignored, ...data } = dto;

    return this.prisma.product.update({
      where: { id: productId },
      data: { ...data, ...(slug ? { slug } : {}), sku: dto.sku?.trim() || undefined },
    });
  }

  async remove(shopId: string, productId: string) {
    const product = await this.prisma.product.findFirst({ where: { id: productId, shopId } });
    if (!product) throw new NotFoundException("Produit introuvable dans cette boutique");

    const ordered = await this.prisma.orderItem.count({ where: { productId } });
    if (ordered > 0) {
      // On préserve l'historique des commandes : archivage plutôt que suppression.
      await this.prisma.product.update({
        where: { id: productId },
        data: { status: ProductStatus.ARCHIVED },
      });
      return {
        success: true,
        archived: true,
        message: "Produit archivé car il apparaît dans des commandes existantes",
      };
    }

    await this.prisma.product.delete({ where: { id: productId } });
    return { success: true, archived: false };
  }

  // --- Catalogue public ----------------------------------------------------

  /** Categories avec le nombre de produits actifs. */
  async findCategories() {
    const categories = await this.prisma.category.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        _count: {
          select: {
            products: {
              where: { status: ProductStatus.ACTIVE, shop: { status: ShopStatus.ACTIVE } },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    });
    return categories.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      productCount: c._count.products,
    }));
  }

  async findCatalog(query: CatalogQueryDto) {
    // Le filtre multi-villes prime sur la ville unique : la sidebar de la
    // marketplace envoie `cities`, les liens de partage envoient `city`.
    const cities = query.cities?.length ? query.cities : query.city ? [query.city] : [];

    const where: Prisma.ProductWhereInput = {
      status: ProductStatus.ACTIVE,
      shop: {
        status: ShopStatus.ACTIVE,
        ...(query.shop ? { slug: query.shop } : {}),
        ...(cities.length ? { city: { in: cities, mode: "insensitive" } } : {}),
      },
      ...(query.category ? { category: { slug: query.category } } : {}),
      ...(query.inStockOnly ? { stockQuantity: { gt: 0 } } : {}),
      ...(query.minRating != null ? { ratingAverage: { gte: query.minRating } } : {}),
      ...(query.minPrice != null || query.maxPrice != null
        ? {
            price: {
              gte: query.minPrice ?? 0,
              ...(query.maxPrice != null ? { lte: query.maxPrice } : {}),
            },
          }
        : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: "insensitive" } },
              { description: { contains: query.search, mode: "insensitive" } },
              { shop: { name: { contains: query.search, mode: "insensitive" } } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        select: CATALOG_SELECT,
        orderBy: this.catalogOrderBy(query.sort),
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    return paginate(items, total, query.page, query.limit);
  }

  /** Sélection éditoriale pour la page d'accueil de la marketplace. */
  async findHighlights() {
    const [featured, bestSellers, newest] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where: {
          status: ProductStatus.ACTIVE,
          isFeatured: true,
          shop: { status: ShopStatus.ACTIVE },
        },
        select: CATALOG_SELECT,
        orderBy: { soldCount: "desc" },
        take: 8,
      }),
      this.prisma.product.findMany({
        where: { status: ProductStatus.ACTIVE, shop: { status: ShopStatus.ACTIVE } },
        select: CATALOG_SELECT,
        orderBy: { soldCount: "desc" },
        take: 8,
      }),
      this.prisma.product.findMany({
        where: { status: ProductStatus.ACTIVE, shop: { status: ShopStatus.ACTIVE } },
        select: CATALOG_SELECT,
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
    ]);

    return { featured, bestSellers, newest };
  }

  async findPublicBySlug(shopSlug: string, productSlug: string) {
    const product = await this.prisma.product.findFirst({
      where: {
        slug: productSlug,
        status: ProductStatus.ACTIVE,
        shop: { slug: shopSlug, status: ShopStatus.ACTIVE },
      },
      select: {
        ...CATALOG_SELECT,
        lowStockThreshold: true,
        shop: {
          select: {
            id: true,
            name: true,
            slug: true,
            city: true,
            logoUrl: true,
            phone: true,
            whatsappNumber: true,
            description: true,
          },
        },
        reviews: {
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            id: true,
            rating: true,
            comment: true,
            createdAt: true,
            user: { select: { firstName: true, lastName: true, avatarUrl: true } },
          },
        },
      },
    });
    if (!product) throw new NotFoundException("Produit introuvable");

    const related = await this.prisma.product.findMany({
      where: {
        status: ProductStatus.ACTIVE,
        shop: { status: ShopStatus.ACTIVE },
        categoryId: product.category?.id,
        NOT: { id: product.id },
      },
      select: CATALOG_SELECT,
      take: 6,
      orderBy: { soldCount: "desc" },
    });

    return { ...product, related };
  }

  // --- Avis ----------------------------------------------------------------

  async createReview(productId: string, userId: string, dto: CreateReviewDto) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException("Produit introuvable");

    // Seul un acheteur ayant reçu le produit peut le noter.
    const purchased = await this.prisma.orderItem.count({
      where: { productId, order: { buyerId: userId, status: "DELIVERED" } },
    });
    if (purchased === 0) {
      throw new ForbiddenException(
        "Vous ne pouvez évaluer qu'un produit reçu dans une commande livrée",
      );
    }

    await this.prisma.review.upsert({
      where: { productId_userId: { productId, userId } },
      create: { productId, userId, rating: dto.rating, comment: dto.comment },
      update: { rating: dto.rating, comment: dto.comment },
    });

    const aggregate = await this.prisma.review.aggregate({
      where: { productId },
      _avg: { rating: true },
      _count: true,
    });

    return this.prisma.product.update({
      where: { id: productId },
      data: {
        ratingAverage: Math.round((aggregate._avg.rating ?? 0) * 10) / 10,
        ratingCount: aggregate._count,
      },
      select: { id: true, ratingAverage: true, ratingCount: true },
    });
  }

  // --- Tris ----------------------------------------------------------------

  private orderBy(sort: ProductQueryDto["sort"]): Prisma.ProductOrderByWithRelationInput[] {
    switch (sort) {
      case "price_asc":
        return [{ price: "asc" }];
      case "price_desc":
        return [{ price: "desc" }];
      case "name":
        return [{ name: "asc" }];
      case "popular":
        return [{ soldCount: "desc" }];
      case "stock_asc":
        return [{ stockQuantity: "asc" }];
      default:
        return [{ createdAt: "desc" }];
    }
  }

  private catalogOrderBy(sort: CatalogQueryDto["sort"]): Prisma.ProductOrderByWithRelationInput[] {
    switch (sort) {
      case "price_asc":
        return [{ price: "asc" }];
      case "price_desc":
        return [{ price: "desc" }];
      case "popular":
        return [{ soldCount: "desc" }];
      case "rating":
        return [{ ratingAverage: "desc" }, { ratingCount: "desc" }];
      default:
        return [{ createdAt: "desc" }];
    }
  }
}
