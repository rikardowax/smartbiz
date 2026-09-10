import { Injectable, NotFoundException } from "@nestjs/common";
import { paginate } from "../../common/dto/pagination.dto.js";
import type { Prisma } from "../../generated/prisma/client.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import type { CreateCustomerDto, PartnerQueryDto, UpdateCustomerDto } from "./dto/partner.dto.js";

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  create(shopId: string, dto: CreateCustomerDto) {
    return this.prisma.customer.create({ data: { ...dto, shopId } });
  }

  async findAll(shopId: string, query: PartnerQueryDto) {
    const where: Prisma.CustomerWhereInput = {
      shopId,
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: "insensitive" } },
              { phone: { contains: query.search } },
              { email: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.customer.findMany({
        where,
        orderBy: [{ totalSpent: "desc" }, { name: "asc" }],
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.customer.count({ where }),
    ]);

    return paginate(items, total, query.page, query.limit);
  }

  async findOne(shopId: string, customerId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, shopId },
      include: {
        orders: {
          orderBy: { placedAt: "desc" },
          take: 20,
          select: {
            id: true,
            orderNumber: true,
            status: true,
            paymentStatus: true,
            total: true,
            channel: true,
            placedAt: true,
          },
        },
      },
    });
    if (!customer) throw new NotFoundException("Client introuvable dans cette boutique");
    return customer;
  }

  async update(shopId: string, customerId: string, dto: UpdateCustomerDto) {
    await this.assertBelongsToShop(shopId, customerId);
    return this.prisma.customer.update({ where: { id: customerId }, data: dto });
  }

  async remove(shopId: string, customerId: string) {
    await this.assertBelongsToShop(shopId, customerId);
    await this.prisma.customer.delete({ where: { id: customerId } });
    return { success: true };
  }

  /**
   * Retrouve ou crée la fiche client à partir d'un numéro de téléphone.
   * Utilisé par la marketplace et le SalesBot pour alimenter le CRM du vendeur
   * sans double saisie.
   */
  async findOrCreateByPhone(
    shopId: string,
    phone: string,
    name: string,
    extra: { city?: string; address?: string } = {},
  ) {
    const normalized = phone.replace(/[\s().-]/g, "");
    return this.prisma.customer.upsert({
      where: { shopId_phone: { shopId, phone: normalized } },
      create: { shopId, phone: normalized, name, ...extra },
      update: { name, ...extra },
    });
  }

  private async assertBelongsToShop(shopId: string, customerId: string) {
    const count = await this.prisma.customer.count({ where: { id: customerId, shopId } });
    if (!count) throw new NotFoundException("Client introuvable dans cette boutique");
  }
}
