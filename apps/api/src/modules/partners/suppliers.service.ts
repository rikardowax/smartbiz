import { Injectable, NotFoundException } from "@nestjs/common";
import { paginate } from "../../common/dto/pagination.dto.js";
import type { Prisma } from "../../generated/prisma/client.js";
import { StockMovementType } from "../../generated/prisma/enums.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import type { CreateSupplierDto, PartnerQueryDto, UpdateSupplierDto } from "./dto/partner.dto.js";

@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: PrismaService) {}

  create(shopId: string, dto: CreateSupplierDto) {
    return this.prisma.supplier.create({ data: { ...dto, shopId } });
  }

  async findAll(shopId: string, query: PartnerQueryDto) {
    const where: Prisma.SupplierWhereInput = {
      shopId,
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: "insensitive" } },
              { phone: { contains: query.search } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.supplier.findMany({
        where,
        orderBy: { name: "asc" },
        skip: query.skip,
        take: query.limit,
        include: { _count: { select: { stockMovements: true } } },
      }),
      this.prisma.supplier.count({ where }),
    ]);

    return paginate(items, total, query.page, query.limit);
  }

  async findOne(shopId: string, supplierId: string) {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id: supplierId, shopId },
      include: {
        stockMovements: {
          orderBy: { createdAt: "desc" },
          take: 20,
          include: { product: { select: { id: true, name: true, unit: true } } },
        },
      },
    });
    if (!supplier) throw new NotFoundException("Fournisseur introuvable dans cette boutique");

    // Montant total approvisionné auprès de ce fournisseur.
    const purchases = supplier.stockMovements
      .filter((movement) => movement.type === StockMovementType.IN)
      .reduce((sum, movement) => sum + movement.quantity * (movement.unitCost ?? 0), 0);

    return { ...supplier, totalPurchases: purchases };
  }

  async update(shopId: string, supplierId: string, dto: UpdateSupplierDto) {
    await this.assertBelongsToShop(shopId, supplierId);
    return this.prisma.supplier.update({ where: { id: supplierId }, data: dto });
  }

  async remove(shopId: string, supplierId: string) {
    await this.assertBelongsToShop(shopId, supplierId);
    await this.prisma.supplier.delete({ where: { id: supplierId } });
    return { success: true };
  }

  private async assertBelongsToShop(shopId: string, supplierId: string) {
    const count = await this.prisma.supplier.count({ where: { id: supplierId, shopId } });
    if (!count) throw new NotFoundException("Fournisseur introuvable dans cette boutique");
  }
}
