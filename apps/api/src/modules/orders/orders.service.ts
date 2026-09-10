import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { paginate } from "../../common/dto/pagination.dto.js";
import { generateOrderNumber } from "../../common/utils/order-number.util.js";
import type { Prisma } from "../../generated/prisma/client.js";
import {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  ProductStatus,
  SalesChannel,
  StockMovementType,
  TransactionType,
} from "../../generated/prisma/enums.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import { CustomersService } from "../partners/customers.service.js";
import type {
  CheckoutDto,
  CheckoutItemDto,
  CreateManualOrderDto,
  OrderQueryDto,
  UpdateOrderStatusDto,
  UpdatePaymentStatusDto,
} from "./dto/order.dto.js";

/** Transitions autorisées du cycle de vie d'une commande. */
const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  [OrderStatus.CONFIRMED]: [OrderStatus.PREPARING, OrderStatus.SHIPPED, OrderStatus.CANCELLED],
  [OrderStatus.PREPARING]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
  [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
  [OrderStatus.DELIVERED]: [],
  [OrderStatus.CANCELLED]: [],
};

const STATUS_LABELS: Record<OrderStatus, string> = {
  [OrderStatus.PENDING]: "Commande reçue, en attente de confirmation du vendeur",
  [OrderStatus.CONFIRMED]: "Commande confirmée par le vendeur",
  [OrderStatus.PREPARING]: "Commande en préparation",
  [OrderStatus.SHIPPED]: "Commande expédiée",
  [OrderStatus.DELIVERED]: "Commande livrée",
  [OrderStatus.CANCELLED]: "Commande annulée",
};

const ORDER_DETAIL_INCLUDE = {
  items: {
    include: {
      product: { select: { id: true, slug: true, images: true, unit: true } },
    },
  },
  events: { orderBy: { createdAt: "asc" } },
  shop: {
    select: {
      id: true,
      name: true,
      slug: true,
      phone: true,
      whatsappNumber: true,
      city: true,
      logoUrl: true,
    },
  },
  customer: { select: { id: true, name: true, phone: true } },
} satisfies Prisma.OrderInclude;

const DEFAULT_DELIVERY_FEE = 1000;

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly customers: CustomersService,
  ) {}

  /**
   * Passage de commande depuis la marketplace. Un panier multi-boutiques donne
   * une commande par boutique : chaque vendeur gère la sienne indépendamment.
   */
  async checkout(buyerId: string | null, dto: CheckoutDto) {
    const products = await this.loadProducts(dto.items);
    const byShop = new Map<string, CheckoutItemDto[]>();
    for (const item of dto.items) {
      const shopId = products.get(item.productId)!.shopId;
      byShop.set(shopId, [...(byShop.get(shopId) ?? []), item]);
    }

    const orders = [];
    for (const [shopId, items] of byShop) {
      const customer = await this.customers.findOrCreateByPhone(
        shopId,
        dto.contactPhone,
        dto.contactName,
        { city: dto.deliveryCity, address: dto.deliveryLine1 },
      );

      orders.push(
        await this.createOrder({
          shopId,
          buyerId,
          customerId: customer.id,
          items,
          products,
          channel: SalesChannel.MARKETPLACE,
          paymentMethod: dto.paymentMethod ?? PaymentMethod.CASH_ON_DELIVERY,
          paymentStatus: PaymentStatus.PENDING,
          contactName: dto.contactName,
          contactPhone: dto.contactPhone,
          deliveryCity: dto.deliveryCity,
          deliveryLine1: dto.deliveryLine1,
          deliveryNotes: dto.deliveryNotes,
          deliveryFee: DEFAULT_DELIVERY_FEE,
          discount: 0,
        }),
      );
    }

    return { orders, count: orders.length };
  }

  /** Vente saisie par le vendeur depuis l'ERP. */
  async createManualOrder(shopId: string, dto: CreateManualOrderDto) {
    const products = await this.loadProducts(dto.items, shopId);
    const customer = await this.customers.findOrCreateByPhone(
      shopId,
      dto.contactPhone,
      dto.contactName,
      { city: dto.deliveryCity, address: dto.deliveryLine1 },
    );

    const channel = dto.channel ?? SalesChannel.IN_STORE;
    const paymentStatus = dto.paymentStatus ?? PaymentStatus.PAID;

    return this.createOrder({
      shopId,
      buyerId: null,
      customerId: customer.id,
      items: dto.items,
      products,
      channel,
      paymentMethod: dto.paymentMethod ?? PaymentMethod.CASH_ON_DELIVERY,
      paymentStatus,
      contactName: dto.contactName,
      contactPhone: dto.contactPhone,
      deliveryCity: dto.deliveryCity,
      deliveryLine1: dto.deliveryLine1,
      deliveryFee: dto.deliveryFee ?? 0,
      discount: dto.discount ?? 0,
      // Une vente au comptoir est immédiatement honorée.
      initialStatus:
        channel === SalesChannel.IN_STORE ? OrderStatus.DELIVERED : OrderStatus.PENDING,
    });
  }

  // --- Consultation --------------------------------------------------------

  async findForShop(shopId: string, query: OrderQueryDto) {
    const where = this.buildWhere({ shopId }, query);

    const [items, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        include: {
          items: { select: { id: true, productName: true, quantity: true, total: true } },
          customer: { select: { id: true, name: true, phone: true } },
        },
        orderBy: { placedAt: "desc" },
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    return paginate(items, total, query.page, query.limit);
  }

  async findForBuyer(buyerId: string, query: OrderQueryDto) {
    const where = this.buildWhere({ buyerId }, query);

    const [items, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        include: {
          items: {
            select: {
              id: true,
              productName: true,
              quantity: true,
              total: true,
              product: { select: { images: true, slug: true } },
            },
          },
          shop: { select: { id: true, name: true, slug: true, logoUrl: true, phone: true } },
        },
        orderBy: { placedAt: "desc" },
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    return paginate(items, total, query.page, query.limit);
  }

  async findOneForShop(shopId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, shopId },
      include: ORDER_DETAIL_INCLUDE,
    });
    if (!order) throw new NotFoundException("Commande introuvable dans cette boutique");
    return order;
  }

  async findOneForBuyer(buyerId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, buyerId },
      include: ORDER_DETAIL_INCLUDE,
    });
    if (!order) throw new NotFoundException("Commande introuvable");
    return order;
  }

  /** Suivi public : numéro de commande + numéro de téléphone du client. */
  async track(orderNumber: string, phone: string) {
    const order = await this.prisma.order.findFirst({
      where: {
        orderNumber: orderNumber.trim().toUpperCase(),
        contactPhone: phone.replace(/[\s().-]/g, ""),
      },
      include: ORDER_DETAIL_INCLUDE,
    });
    if (!order) {
      throw new NotFoundException(
        "Aucune commande ne correspond à ce numéro de commande et ce téléphone",
      );
    }
    return order;
  }

  // --- Cycle de vie --------------------------------------------------------

  async updateStatus(shopId: string, orderId: string, userId: string, dto: UpdateOrderStatusDto) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, shopId },
      include: { items: true },
    });
    if (!order) throw new NotFoundException("Commande introuvable dans cette boutique");

    if (order.status === dto.status) return this.findOneForShop(shopId, orderId);

    if (!ALLOWED_TRANSITIONS[order.status].includes(dto.status)) {
      throw new BadRequestException(
        `Transition impossible : une commande « ${order.status} » ne peut pas passer à « ${dto.status} »`,
      );
    }

    const now = new Date();
    const timestamps: Prisma.OrderUpdateInput = {};
    if (dto.status === OrderStatus.CONFIRMED) timestamps.confirmedAt = now;
    if (dto.status === OrderStatus.SHIPPED) timestamps.shippedAt = now;
    if (dto.status === OrderStatus.DELIVERED) timestamps.deliveredAt = now;
    if (dto.status === OrderStatus.CANCELLED) timestamps.cancelledAt = now;

    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: { status: dto.status, ...timestamps },
      });

      await tx.orderEvent.create({
        data: {
          orderId,
          userId,
          status: dto.status,
          message: dto.message?.trim() || STATUS_LABELS[dto.status],
        },
      });

      // L'annulation restitue le stock réservé à la commande.
      if (dto.status === OrderStatus.CANCELLED) {
        for (const item of order.items) {
          if (!item.productId) continue;
          const product = await tx.product.update({
            where: { id: item.productId },
            data: {
              stockQuantity: { increment: item.quantity },
              soldCount: { decrement: item.quantity },
            },
          });
          await tx.stockMovement.create({
            data: {
              shopId,
              productId: item.productId,
              userId,
              type: StockMovementType.RETURN,
              quantity: item.quantity,
              stockAfter: product.stockQuantity,
              reason: `Annulation de la commande ${order.orderNumber}`,
              reference: order.orderNumber,
            },
          });
        }

        // L'encaissement éventuel est neutralisé par une écriture de sens inverse.
        if (order.paymentStatus === PaymentStatus.PAID) {
          await tx.order.update({
            where: { id: orderId },
            data: { paymentStatus: PaymentStatus.REFUNDED },
          });
          await tx.transaction.create({
            data: {
              shopId,
              orderId,
              type: TransactionType.EXPENSE,
              category: "Remboursements",
              label: `Remboursement commande ${order.orderNumber}`,
              amount: order.total,
            },
          });
          await tx.customer.updateMany({
            where: { id: order.customerId ?? "" },
            data: { totalSpent: { decrement: order.total } },
          });
        }
      }
    });

    return this.findOneForShop(shopId, orderId);
  }

  async updatePaymentStatus(shopId: string, orderId: string, dto: UpdatePaymentStatusDto) {
    const order = await this.prisma.order.findFirst({ where: { id: orderId, shopId } });
    if (!order) throw new NotFoundException("Commande introuvable dans cette boutique");
    if (order.paymentStatus === dto.paymentStatus) return order;

    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: { paymentStatus: dto.paymentStatus, paymentMethod: dto.paymentMethod },
      });

      const wasPaid = order.paymentStatus === PaymentStatus.PAID;
      const isPaid = dto.paymentStatus === PaymentStatus.PAID;

      if (!wasPaid && isPaid) {
        await tx.transaction.create({
          data: {
            shopId,
            orderId,
            type: TransactionType.INCOME,
            category: "Ventes",
            label: `Encaissement commande ${order.orderNumber}`,
            amount: order.total,
          },
        });
        if (order.customerId) {
          await tx.customer.update({
            where: { id: order.customerId },
            data: { totalSpent: { increment: order.total } },
          });
        }
      }
    });

    return this.prisma.order.findUniqueOrThrow({ where: { id: orderId } });
  }

  /** L'acheteur peut annuler tant que la commande n'est pas expédiée. */
  async cancelAsBuyer(buyerId: string, orderId: string, reason?: string) {
    const order = await this.prisma.order.findFirst({ where: { id: orderId, buyerId } });
    if (!order) throw new NotFoundException("Commande introuvable");
    if (order.status !== OrderStatus.PENDING && order.status !== OrderStatus.CONFIRMED) {
      throw new BadRequestException(
        "Cette commande est déjà en cours de livraison : contactez le vendeur",
      );
    }

    await this.updateStatus(order.shopId, orderId, buyerId, {
      status: OrderStatus.CANCELLED,
      message: reason?.trim() || "Annulée par le client",
    });

    return this.findOneForBuyer(buyerId, orderId);
  }

  // --- Fabrique interne ----------------------------------------------------

  /**
   * Crée la commande, réserve le stock et enregistre les écritures associées
   * dans une seule transaction : aucun état intermédiaire n'est observable.
   */
  private async createOrder(input: {
    shopId: string;
    buyerId: string | null;
    customerId: string;
    items: CheckoutItemDto[];
    products: Map<string, LoadedProduct>;
    channel: SalesChannel;
    paymentMethod: PaymentMethod;
    paymentStatus: PaymentStatus;
    contactName: string;
    contactPhone: string;
    deliveryCity?: string;
    deliveryLine1?: string;
    deliveryNotes?: string;
    deliveryFee: number;
    discount: number;
    initialStatus?: OrderStatus;
  }) {
    const lines = input.items.map((item) => {
      const product = input.products.get(item.productId)!;
      return {
        productId: product.id,
        productName: product.name,
        unitPrice: product.price,
        quantity: item.quantity,
        total: product.price * item.quantity,
      };
    });

    const subtotal = lines.reduce((sum, line) => sum + line.total, 0);
    const discount = Math.min(input.discount, subtotal);
    const total = subtotal + input.deliveryFee - discount;
    const status = input.initialStatus ?? OrderStatus.PENDING;
    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          orderNumber: generateOrderNumber(),
          shopId: input.shopId,
          buyerId: input.buyerId,
          customerId: input.customerId,
          channel: input.channel,
          status,
          paymentStatus: input.paymentStatus,
          paymentMethod: input.paymentMethod,
          subtotal,
          deliveryFee: input.deliveryFee,
          discount,
          total,
          contactName: input.contactName,
          contactPhone: input.contactPhone,
          deliveryCity: input.deliveryCity,
          deliveryLine1: input.deliveryLine1,
          deliveryNotes: input.deliveryNotes,
          confirmedAt: status === OrderStatus.PENDING ? null : now,
          deliveredAt: status === OrderStatus.DELIVERED ? now : null,
          items: { create: lines },
          events: {
            create: {
              status,
              message: STATUS_LABELS[status],
            },
          },
        },
        include: ORDER_DETAIL_INCLUDE,
      });

      // Le stock est réservé dès la commande : c'est ce que fait un commerçant
      // qui met les articles de côté.
      for (const line of lines) {
        const product = await tx.product.update({
          where: { id: line.productId },
          data: {
            stockQuantity: { decrement: line.quantity },
            soldCount: { increment: line.quantity },
          },
        });
        await tx.stockMovement.create({
          data: {
            shopId: input.shopId,
            productId: line.productId,
            type: StockMovementType.OUT,
            quantity: line.quantity,
            stockAfter: product.stockQuantity,
            reason: `Commande ${order.orderNumber}`,
            reference: order.orderNumber,
          },
        });
      }

      await tx.customer.update({
        where: { id: input.customerId },
        data: {
          ordersCount: { increment: 1 },
          totalSpent: { increment: input.paymentStatus === PaymentStatus.PAID ? total : 0 },
        },
      });

      if (input.paymentStatus === PaymentStatus.PAID) {
        await tx.transaction.create({
          data: {
            shopId: input.shopId,
            orderId: order.id,
            type: TransactionType.INCOME,
            category: "Ventes",
            label: `Encaissement commande ${order.orderNumber}`,
            amount: total,
          },
        });
      }

      // Notifie le vendeur pour qu'il traite la commande sans délai.
      const shop = await tx.shop.findUniqueOrThrow({
        where: { id: input.shopId },
        select: { ownerId: true, name: true },
      });
      await tx.notification.create({
        data: {
          userId: shop.ownerId,
          type: "NEW_ORDER",
          title: "Nouvelle commande",
          body: `${input.contactName} a commandé pour ${total.toLocaleString("fr-FR")} FCFA`,
          link: "/vendeur/commandes",
        },
      });

      return order;
    });
  }

  /** Charge et valide les produits du panier (existence, publication, stock). */
  private async loadProducts(items: CheckoutItemDto[], shopId?: string) {
    const ids = [...new Set(items.map((item) => item.productId))];
    if (ids.length !== items.length) {
      throw new BadRequestException("Le panier contient deux fois le même produit");
    }

    const products = await this.prisma.product.findMany({
      where: { id: { in: ids }, ...(shopId ? { shopId } : {}) },
      select: {
        id: true,
        name: true,
        price: true,
        stockQuantity: true,
        status: true,
        shopId: true,
        unit: true,
        shop: { select: { status: true, name: true } },
      },
    });

    if (products.length !== ids.length) {
      throw new BadRequestException("Un ou plusieurs produits du panier n'existent plus");
    }

    const map = new Map(products.map((product) => [product.id, product]));
    for (const item of items) {
      const product = map.get(item.productId)!;
      if (product.status !== ProductStatus.ACTIVE || product.shop.status !== "ACTIVE") {
        throw new BadRequestException(`« ${product.name} » n'est plus disponible à la vente`);
      }
      if (product.stockQuantity < item.quantity) {
        throw new BadRequestException(
          `Stock insuffisant pour « ${product.name} » : ${product.stockQuantity} ${product.unit}(s) disponible(s)`,
        );
      }
    }

    return map;
  }

  private buildWhere(base: Prisma.OrderWhereInput, query: OrderQueryDto): Prisma.OrderWhereInput {
    return {
      ...base,
      ...(query.status ? { status: query.status } : {}),
      ...(query.paymentStatus ? { paymentStatus: query.paymentStatus } : {}),
      ...(query.channel ? { channel: query.channel } : {}),
      ...(query.from || query.to
        ? {
            placedAt: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
      ...(query.search
        ? {
            OR: [
              { orderNumber: { contains: query.search, mode: "insensitive" } },
              { contactName: { contains: query.search, mode: "insensitive" } },
              { contactPhone: { contains: query.search } },
            ],
          }
        : {}),
    };
  }
}

type LoadedProduct = {
  id: string;
  name: string;
  price: number;
  stockQuantity: number;
  shopId: string;
};
