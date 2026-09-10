import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { paginate } from "../../common/dto/pagination.dto.js";
import type { Prisma } from "../../generated/prisma/client.js";
import { StockMovementType } from "../../generated/prisma/enums.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import type { CreateStockMovementDto, StockMovementQueryDto } from "./dto/stock.dto.js";

/** Sens de variation du stock selon le type de mouvement. */
const DELTA: Record<StockMovementType, (quantity: number) => number> = {
  [StockMovementType.IN]: (quantity) => quantity,
  [StockMovementType.RETURN]: (quantity) => quantity,
  [StockMovementType.OUT]: (quantity) => -quantity,
  [StockMovementType.LOSS]: (quantity) => -quantity,
  // L'ajustement d'inventaire porte la quantité cible, pas une variation.
  [StockMovementType.ADJUSTMENT]: (quantity) => quantity,
};

@Injectable()
export class StockService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Enregistre un mouvement et met à jour le stock du produit dans la même
   * transaction : les deux informations ne doivent jamais diverger.
   */
  async createMovement(shopId: string, userId: string, dto: CreateStockMovementDto) {
    const product = await this.prisma.product.findFirst({
      where: { id: dto.productId, shopId },
      select: { id: true, stockQuantity: true, name: true, costPrice: true },
    });
    if (!product) throw new NotFoundException("Produit introuvable dans cette boutique");

    const stockAfter =
      dto.type === StockMovementType.ADJUSTMENT
        ? dto.quantity
        : product.stockQuantity + DELTA[dto.type](dto.quantity);

    if (stockAfter < 0) {
      throw new BadRequestException(
        `Stock insuffisant : ${product.name} ne compte que ${product.stockQuantity} unité(s)`,
      );
    }

    if (dto.supplierId) {
      const supplier = await this.prisma.supplier.count({
        where: { id: dto.supplierId, shopId },
      });
      if (!supplier) throw new NotFoundException("Fournisseur introuvable dans cette boutique");
    }

    const [movement] = await this.prisma.$transaction([
      this.prisma.stockMovement.create({
        data: {
          shopId,
          productId: dto.productId,
          userId,
          supplierId: dto.supplierId,
          type: dto.type,
          quantity: dto.quantity,
          unitCost: dto.unitCost,
          stockAfter,
          reason: dto.reason,
          reference: dto.reference,
        },
        include: { product: { select: { id: true, name: true, unit: true } } },
      }),
      this.prisma.product.update({
        where: { id: dto.productId },
        data: { stockQuantity: stockAfter },
      }),
    ]);

    return movement;
  }

  async findMovements(shopId: string, query: StockMovementQueryDto) {
    const where: Prisma.StockMovementWhereInput = {
      shopId,
      ...(query.productId ? { productId: query.productId } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.from || query.to
        ? {
            createdAt: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.stockMovement.findMany({
        where,
        include: {
          product: { select: { id: true, name: true, unit: true, images: true } },
          supplier: { select: { id: true, name: true } },
          user: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.stockMovement.count({ where }),
    ]);

    return paginate(items, total, query.page, query.limit);
  }

  /** Produits à réapprovisionner, triés du plus critique au moins critique. */
  async findAlerts(shopId: string) {
    const products = await this.prisma.product.findMany({
      where: { shopId, status: { not: "ARCHIVED" } },
      select: {
        id: true,
        name: true,
        slug: true,
        unit: true,
        images: true,
        price: true,
        costPrice: true,
        stockQuantity: true,
        lowStockThreshold: true,
        soldCount: true,
      },
    });

    const alerts = products
      .filter((product) => product.stockQuantity <= product.lowStockThreshold)
      .map((product) => ({
        ...product,
        severity: product.stockQuantity === 0 ? ("out_of_stock" as const) : ("low" as const),
      }))
      .sort((a, b) => a.stockQuantity - b.stockQuantity);

    return {
      items: alerts,
      outOfStockCount: alerts.filter((alert) => alert.severity === "out_of_stock").length,
      lowStockCount: alerts.filter((alert) => alert.severity === "low").length,
    };
  }

  /** Valorisation du stock : au prix d'achat et au prix de vente. */
  async valuation(shopId: string) {
    const products = await this.prisma.product.findMany({
      where: { shopId, status: { not: "ARCHIVED" } },
      select: { stockQuantity: true, price: true, costPrice: true },
    });

    return products.reduce(
      (totals, product) => ({
        productCount: totals.productCount + 1,
        totalUnits: totals.totalUnits + product.stockQuantity,
        costValue: totals.costValue + product.stockQuantity * (product.costPrice ?? 0),
        retailValue: totals.retailValue + product.stockQuantity * product.price,
      }),
      { productCount: 0, totalUnits: 0, costValue: 0, retailValue: 0 },
    );
  }
}
