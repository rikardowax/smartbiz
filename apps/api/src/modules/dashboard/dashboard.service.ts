import { Injectable } from "@nestjs/common";
import {
  OrderStatus,
  PaymentStatus,
  ProductStatus,
  TransactionType,
} from "../../generated/prisma/enums.js";
import { PrismaService } from "../../prisma/prisma.service.js";

/** Bornes de la journée, du mois courant et du mois précédent. */
function periods(now = new Date()) {
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  return { now, startOfToday, startOfMonth, startOfPreviousMonth };
}

/** Variation en pourcentage, robuste au cas où la base de comparaison est nulle. */
function evolution(current: number, previous: number) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  /** Indicateurs clés affichés en tête du tableau de bord vendeur. */
  async overview(shopId: string) {
    const { startOfToday, startOfMonth, startOfPreviousMonth } = periods();

    const [
      todayOrders,
      monthOrders,
      previousMonthOrders,
      pendingOrders,
      monthIncome,
      monthExpense,
      previousMonthIncome,
      productCount,
      customerCount,
      unpaidOrders,
    ] = await this.prisma.$transaction([
      this.prisma.order.aggregate({
        where: { shopId, placedAt: { gte: startOfToday }, status: { not: OrderStatus.CANCELLED } },
        _sum: { total: true },
        _count: true,
      }),
      this.prisma.order.aggregate({
        where: { shopId, placedAt: { gte: startOfMonth }, status: { not: OrderStatus.CANCELLED } },
        _sum: { total: true },
        _count: true,
      }),
      this.prisma.order.aggregate({
        where: {
          shopId,
          placedAt: { gte: startOfPreviousMonth, lt: startOfMonth },
          status: { not: OrderStatus.CANCELLED },
        },
        _sum: { total: true },
        _count: true,
      }),
      this.prisma.order.count({
        where: { shopId, status: { in: [OrderStatus.PENDING, OrderStatus.CONFIRMED] } },
      }),
      this.prisma.transaction.aggregate({
        where: { shopId, type: TransactionType.INCOME, occurredAt: { gte: startOfMonth } },
        _sum: { amount: true },
      }),
      this.prisma.transaction.aggregate({
        where: { shopId, type: TransactionType.EXPENSE, occurredAt: { gte: startOfMonth } },
        _sum: { amount: true },
      }),
      this.prisma.transaction.aggregate({
        where: {
          shopId,
          type: TransactionType.INCOME,
          occurredAt: { gte: startOfPreviousMonth, lt: startOfMonth },
        },
        _sum: { amount: true },
      }),
      this.prisma.product.count({ where: { shopId, status: ProductStatus.ACTIVE } }),
      this.prisma.customer.count({ where: { shopId } }),
      this.prisma.order.aggregate({
        where: {
          shopId,
          paymentStatus: { in: [PaymentStatus.PENDING, PaymentStatus.PARTIAL] },
          status: { not: OrderStatus.CANCELLED },
        },
        _sum: { total: true },
        _count: true,
      }),
    ]);

    // Le seuil d'alerte étant propre à chaque produit, la comparaison se fait
    // en mémoire sur les seules colonnes utiles.
    const stockRows = await this.prisma.product.findMany({
      where: { shopId, status: { not: ProductStatus.ARCHIVED } },
      select: { stockQuantity: true, lowStockThreshold: true, price: true, costPrice: true },
    });

    const lowStockCount = stockRows.filter(
      (row) => row.stockQuantity <= row.lowStockThreshold && row.stockQuantity > 0,
    ).length;
    const outOfStockCount = stockRows.filter((row) => row.stockQuantity === 0).length;
    const stockValue = stockRows.reduce(
      (sum, row) => sum + row.stockQuantity * (row.costPrice ?? 0),
      0,
    );

    const income = monthIncome._sum.amount ?? 0;
    const expense = monthExpense._sum.amount ?? 0;

    return {
      today: { orderCount: todayOrders._count, revenue: todayOrders._sum.total ?? 0 },
      month: {
        orderCount: monthOrders._count,
        revenue: monthOrders._sum.total ?? 0,
        income,
        expense,
        profit: income - expense,
        revenueEvolution: evolution(
          monthOrders._sum.total ?? 0,
          previousMonthOrders._sum.total ?? 0,
        ),
        orderEvolution: evolution(monthOrders._count, previousMonthOrders._count),
        incomeEvolution: evolution(income, previousMonthIncome._sum.amount ?? 0),
      },
      operations: {
        pendingOrders,
        unpaidOrderCount: unpaidOrders._count,
        unpaidAmount: unpaidOrders._sum.total ?? 0,
        lowStockCount,
        outOfStockCount,
      },
      catalog: { productCount, customerCount, stockValue },
    };
  }

  /** Chiffre d'affaires jour par jour, pour le graphique de tendance. */
  async salesTrend(shopId: string, days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - (days - 1));
    since.setHours(0, 0, 0, 0);

    const orders = await this.prisma.order.findMany({
      where: { shopId, placedAt: { gte: since }, status: { not: OrderStatus.CANCELLED } },
      select: { total: true, placedAt: true },
      orderBy: { placedAt: "asc" },
    });

    const buckets = new Map<string, { date: string; revenue: number; orders: number }>();
    for (let offset = 0; offset < days; offset += 1) {
      const date = new Date(since);
      date.setDate(since.getDate() + offset);
      const key = date.toISOString().slice(0, 10);
      buckets.set(key, { date: key, revenue: 0, orders: 0 });
    }

    for (const order of orders) {
      const bucket = buckets.get(order.placedAt.toISOString().slice(0, 10));
      if (!bucket) continue;
      bucket.revenue += order.total;
      bucket.orders += 1;
    }

    return [...buckets.values()];
  }

  /** Meilleures ventes sur la période, en quantité et en chiffre d'affaires. */
  async topProducts(shopId: string, days = 30, limit = 8) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const rows = await this.prisma.orderItem.groupBy({
      by: ["productId", "productName"],
      where: {
        order: { shopId, placedAt: { gte: since }, status: { not: OrderStatus.CANCELLED } },
      },
      _sum: { quantity: true, total: true },
      orderBy: { _sum: { total: "desc" } },
      take: limit,
    });

    return rows.map((row) => ({
      productId: row.productId,
      productName: row.productName,
      quantity: row._sum.quantity ?? 0,
      revenue: row._sum.total ?? 0,
    }));
  }

  /** Répartition du chiffre d'affaires par canal de vente. */
  async salesByChannel(shopId: string, days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const rows = await this.prisma.order.groupBy({
      by: ["channel"],
      where: { shopId, placedAt: { gte: since }, status: { not: OrderStatus.CANCELLED } },
      _sum: { total: true },
      _count: true,
    });

    return rows.map((row) => ({
      channel: row.channel,
      revenue: row._sum.total ?? 0,
      orderCount: row._count,
    }));
  }

  /** Dernières commandes et alertes de stock, pour la colonne « à traiter ». */
  async activity(shopId: string) {
    const [recentOrders, lowStock] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where: { shopId },
        orderBy: { placedAt: "desc" },
        take: 8,
        select: {
          id: true,
          orderNumber: true,
          contactName: true,
          total: true,
          status: true,
          paymentStatus: true,
          channel: true,
          placedAt: true,
        },
      }),
      this.prisma.product.findMany({
        where: { shopId, status: { not: ProductStatus.ARCHIVED } },
        select: {
          id: true,
          name: true,
          images: true,
          unit: true,
          stockQuantity: true,
          lowStockThreshold: true,
        },
        orderBy: { stockQuantity: "asc" },
        take: 30,
      }),
    ]);

    return {
      recentOrders,
      stockAlerts: lowStock
        .filter((product) => product.stockQuantity <= product.lowStockThreshold)
        .slice(0, 8),
    };
  }

  /** Vue d'ensemble de la plateforme, réservée aux administrateurs. */
  async platformOverview() {
    const { startOfMonth } = periods();

    const [users, shops, products, orders, monthOrders, gmv] = await this.prisma.$transaction([
      this.prisma.user.groupBy({ by: ["role"], _count: true }),
      this.prisma.shop.groupBy({ by: ["status"], _count: true }),
      this.prisma.product.count(),
      this.prisma.order.count(),
      this.prisma.order.count({ where: { placedAt: { gte: startOfMonth } } }),
      this.prisma.order.aggregate({
        where: { status: { not: OrderStatus.CANCELLED } },
        _sum: { total: true },
      }),
    ]);

    return {
      usersByRole: users.map((row) => ({ role: row.role, count: row._count })),
      shopsByStatus: shops.map((row) => ({ status: row.status, count: row._count })),
      productCount: products,
      orderCount: orders,
      monthOrderCount: monthOrders,
      grossMerchandiseValue: gmv._sum.total ?? 0,
    };
  }
}
