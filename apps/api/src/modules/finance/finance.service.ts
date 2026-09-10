import { Injectable, NotFoundException } from "@nestjs/common";
import { paginate } from "../../common/dto/pagination.dto.js";
import type { Prisma } from "../../generated/prisma/client.js";
import { TransactionType } from "../../generated/prisma/enums.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import type {
  CreateTransactionDto,
  TransactionQueryDto,
  UpdateTransactionDto,
} from "./dto/finance.dto.js";

@Injectable()
export class FinanceService {
  constructor(private readonly prisma: PrismaService) {}

  create(shopId: string, dto: CreateTransactionDto) {
    return this.prisma.transaction.create({
      data: {
        ...dto,
        shopId,
        occurredAt: dto.occurredAt ? new Date(dto.occurredAt) : new Date(),
      },
    });
  }

  async findAll(shopId: string, query: TransactionQueryDto) {
    const where = this.buildWhere(shopId, query);

    const [items, total, sums] = await this.prisma.$transaction([
      this.prisma.transaction.findMany({
        where,
        include: { order: { select: { id: true, orderNumber: true } } },
        orderBy: { occurredAt: "desc" },
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.transaction.count({ where }),
      this.prisma.transaction.groupBy({
        by: ["type"],
        where,
        _sum: { amount: true },
      }),
    ]);

    const income = sums.find((row) => row.type === TransactionType.INCOME)?._sum.amount ?? 0;
    const expense = sums.find((row) => row.type === TransactionType.EXPENSE)?._sum.amount ?? 0;

    return {
      ...paginate(items, total, query.page, query.limit),
      totals: { income, expense, balance: income - expense },
    };
  }

  async update(shopId: string, transactionId: string, dto: UpdateTransactionDto) {
    await this.assertBelongsToShop(shopId, transactionId);
    return this.prisma.transaction.update({
      where: { id: transactionId },
      data: {
        ...dto,
        occurredAt: dto.occurredAt ? new Date(dto.occurredAt) : undefined,
      },
    });
  }

  async remove(shopId: string, transactionId: string) {
    await this.assertBelongsToShop(shopId, transactionId);
    await this.prisma.transaction.delete({ where: { id: transactionId } });
    return { success: true };
  }

  /**
   * Synthèse financière : totaux, répartition par catégorie et évolution
   * mensuelle sur les six derniers mois.
   */
  async summary(shopId: string, query: TransactionQueryDto) {
    const where = this.buildWhere(shopId, query);

    const [byType, byCategory] = await this.prisma.$transaction([
      this.prisma.transaction.groupBy({ by: ["type"], where, _sum: { amount: true } }),
      this.prisma.transaction.groupBy({
        by: ["type", "category"],
        where,
        _sum: { amount: true },
        orderBy: { _sum: { amount: "desc" } },
      }),
    ]);

    const income = byType.find((row) => row.type === TransactionType.INCOME)?._sum.amount ?? 0;
    const expense = byType.find((row) => row.type === TransactionType.EXPENSE)?._sum.amount ?? 0;

    const since = new Date();
    since.setMonth(since.getMonth() - 5);
    since.setDate(1);
    since.setHours(0, 0, 0, 0);

    const transactions = await this.prisma.transaction.findMany({
      where: { shopId, occurredAt: { gte: since } },
      select: { type: true, amount: true, occurredAt: true },
    });

    const monthly = new Map<string, { month: string; income: number; expense: number }>();
    for (let offset = 0; offset < 6; offset += 1) {
      const date = new Date(since);
      date.setMonth(since.getMonth() + offset);
      const key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}`;
      monthly.set(key, { month: key, income: 0, expense: 0 });
    }

    for (const transaction of transactions) {
      const key = `${transaction.occurredAt.getFullYear()}-${(transaction.occurredAt.getMonth() + 1)
        .toString()
        .padStart(2, "0")}`;
      const bucket = monthly.get(key);
      if (!bucket) continue;
      if (transaction.type === TransactionType.INCOME) bucket.income += transaction.amount;
      else bucket.expense += transaction.amount;
    }

    return {
      totals: { income, expense, balance: income - expense },
      byCategory: byCategory.map((row) => ({
        type: row.type,
        category: row.category,
        amount: row._sum.amount ?? 0,
      })),
      monthly: [...monthly.values()].map((bucket) => ({
        ...bucket,
        balance: bucket.income - bucket.expense,
      })),
    };
  }

  private buildWhere(shopId: string, query: TransactionQueryDto): Prisma.TransactionWhereInput {
    return {
      shopId,
      ...(query.type ? { type: query.type } : {}),
      ...(query.category ? { category: query.category } : {}),
      ...(query.from || query.to
        ? {
            occurredAt: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
    };
  }

  private async assertBelongsToShop(shopId: string, transactionId: string) {
    const count = await this.prisma.transaction.count({ where: { id: transactionId, shopId } });
    if (!count) throw new NotFoundException("Écriture introuvable dans cette boutique");
  }
}
