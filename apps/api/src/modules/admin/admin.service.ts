import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { paginate } from "../../common/dto/pagination.dto.js";
import type { Prisma } from "../../generated/prisma/client.js";
import { OrderStatus, ProductStatus, Role, ShopStatus } from "../../generated/prisma/enums.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import type {
  AdminProductQueryDto,
  AdminShopQueryDto,
  AdminUserQueryDto,
  UpdateAdminUserDto,
} from "./dto/admin.dto.js";

const USER_SUMMARY = {
  id: true,
  firstName: true,
  lastName: true,
  phone: true,
  email: true,
  role: true,
  isActive: true,
  createdAt: true,
  lastLoginAt: true,
} satisfies Prisma.UserSelect;

/**
 * Opérations d'administration de la plateforme. Toutes les méthodes supposent
 * un appelant déjà authentifié comme ADMIN (RolesGuard le garantit) ; les
 * garde-fous ici protègent l'administration d'elle-même : ne pas se verrouiller
 * dehors et ne jamais laisser la plateforme sans administrateur.
 */
@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  // --- Utilisateurs --------------------------------------------------------

  async findUsers(query: AdminUserQueryDto) {
    const search = query.search?.trim();
    const activeFilter = query.activeFilter;
    const where: Prisma.UserWhereInput = {
      ...(query.role ? { role: query.role } : {}),
      ...(activeFilter === undefined ? {} : { isActive: activeFilter }),
      ...(search
        ? {
            OR: [
              { firstName: { contains: search, mode: "insensitive" as const } },
              { lastName: { contains: search, mode: "insensitive" as const } },
              { phone: { contains: search, mode: "insensitive" as const } },
              { email: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: {
          ...USER_SUMMARY,
          shops: { select: { id: true, name: true, slug: true, status: true } },
          _count: { select: { orders: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return paginate(items, total, query.page, query.limit);
  }

  async updateUser(actorId: string, userId: string, dto: UpdateAdminUserDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });
    if (!user) throw new NotFoundException("Utilisateur introuvable");

    // Se retirer soi-même les droits ou se désactiver revient à perdre l'accès
    // à l'administration sans pouvoir revenir en arrière.
    if (userId === actorId) {
      if (dto.role && dto.role !== Role.ADMIN) {
        throw new BadRequestException("Vous ne pouvez pas changer votre propre rôle");
      }
      if (dto.isActive === false) {
        throw new BadRequestException("Vous ne pouvez pas désactiver votre propre compte");
      }
    }

    if (
      user.role === Role.ADMIN &&
      ((dto.role && dto.role !== Role.ADMIN) || dto.isActive === false)
    ) {
      await this.assertNotLastAdmin(userId);
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.role ? { role: dto.role } : {}),
        ...(dto.isActive === undefined ? {} : { isActive: dto.isActive }),
      },
      select: USER_SUMMARY,
    });
  }

  /**
   * Supprime un compte. Les boutiques du vendeur suivent en cascade (et avec
   * elles produits, commandes et finances) : le décompte est renvoyé pour que
   * l'interface ait pu prévenir avant l'appel.
   */
  async removeUser(actorId: string, userId: string) {
    if (userId === actorId) {
      throw new BadRequestException("Vous ne pouvez pas supprimer votre propre compte");
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        firstName: true,
        lastName: true,
        _count: { select: { shops: true } },
      },
    });
    if (!user) throw new NotFoundException("Utilisateur introuvable");
    if (user.role === Role.ADMIN) await this.assertNotLastAdmin(userId);

    const shopIds = (
      await this.prisma.shop.findMany({ where: { ownerId: userId }, select: { id: true } })
    ).map((shop) => shop.id);

    const [productCount, orderCount] = await this.prisma.$transaction([
      this.prisma.product.count({ where: { shopId: { in: shopIds } } }),
      this.prisma.order.count({ where: { shopId: { in: shopIds } } }),
    ]);

    await this.prisma.user.delete({ where: { id: userId } });

    return {
      success: true,
      deleted: {
        user: `${user.firstName} ${user.lastName}`.trim(),
        shopCount: user._count.shops,
        productCount,
        orderCount,
      },
    };
  }

  private async assertNotLastAdmin(userId: string) {
    const otherAdmins = await this.prisma.user.count({
      where: { role: Role.ADMIN, isActive: true, id: { not: userId } },
    });
    if (otherAdmins === 0) {
      throw new BadRequestException(
        "Impossible : la plateforme doit conserver au moins un administrateur actif",
      );
    }
  }

  // --- Boutiques -----------------------------------------------------------

  async findShops(query: AdminShopQueryDto) {
    const search = query.search?.trim();
    const where: Prisma.ShopWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" as const } },
              { city: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.shop.findMany({
        where,
        include: {
          owner: {
            select: { id: true, firstName: true, lastName: true, phone: true, role: true },
          },
          _count: { select: { products: true, orders: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.shop.count({ where }),
    ]);

    return paginate(items, total, query.page, query.limit);
  }

  async updateShopStatus(shopId: string, status: ShopStatus) {
    const shop = await this.prisma.shop.findUnique({ where: { id: shopId }, select: { id: true } });
    if (!shop) throw new NotFoundException("Boutique introuvable");

    return this.prisma.shop.update({ where: { id: shopId }, data: { status } });
  }

  /** Supprime une boutique et tout ce qu'elle porte (produits, commandes, finances). */
  async removeShop(shopId: string) {
    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
      select: { id: true, name: true, _count: { select: { products: true, orders: true } } },
    });
    if (!shop) throw new NotFoundException("Boutique introuvable");

    await this.prisma.shop.delete({ where: { id: shopId } });

    return {
      success: true,
      deleted: {
        shop: shop.name,
        productCount: shop._count.products,
        orderCount: shop._count.orders,
      },
    };
  }

  // --- Produits ------------------------------------------------------------

  async findProducts(query: AdminProductQueryDto) {
    const search = query.search?.trim();
    const where: Prisma.ProductWhereInput = {
      ...(query.shopId ? { shopId: query.shopId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(search ? { name: { contains: search, mode: "insensitive" as const } } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        select: {
          id: true,
          name: true,
          slug: true,
          price: true,
          stockQuantity: true,
          status: true,
          images: true,
          createdAt: true,
          shop: { select: { id: true, name: true, slug: true } },
          category: { select: { id: true, name: true } },
          _count: { select: { orderItems: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    return paginate(items, total, query.page, query.limit);
  }

  /**
   * Même règle que côté vendeur : un produit déjà commandé est archivé pour ne
   * pas trouer l'historique des commandes, les autres sont réellement supprimés.
   */
  async removeProduct(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, name: true, _count: { select: { orderItems: true } } },
    });
    if (!product) throw new NotFoundException("Produit introuvable");

    if (product._count.orderItems > 0) {
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

  // --- Statistiques --------------------------------------------------------

  /** Indicateurs de la plateforme entière pour le tableau de bord admin. */
  async stats() {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [
      usersByRole,
      shopsByStatus,
      productCount,
      activeProductCount,
      orderCount,
      monthOrders,
      gmv,
      newUsersToday,
      pendingShops,
    ] = await this.prisma.$transaction([
      this.prisma.user.groupBy({ by: ["role"], _count: true }),
      this.prisma.shop.groupBy({ by: ["status"], _count: true }),
      this.prisma.product.count(),
      this.prisma.product.count({ where: { status: ProductStatus.ACTIVE } }),
      this.prisma.order.count(),
      this.prisma.order.aggregate({
        where: { placedAt: { gte: startOfMonth }, status: { not: OrderStatus.CANCELLED } },
        _sum: { total: true },
        _count: true,
      }),
      this.prisma.order.aggregate({
        where: { status: { not: OrderStatus.CANCELLED } },
        _sum: { total: true },
      }),
      this.prisma.user.count({ where: { createdAt: { gte: startOfToday } } }),
      this.prisma.shop.count({ where: { status: ShopStatus.PENDING } }),
    ]);

    const roleCount = (role: Role) => usersByRole.find((row) => row.role === role)?._count ?? 0;
    const statusCount = (status: ShopStatus) =>
      shopsByStatus.find((row) => row.status === status)?._count ?? 0;

    return {
      users: {
        total: usersByRole.reduce((sum, row) => sum + row._count, 0),
        admins: roleCount(Role.ADMIN),
        sellers: roleCount(Role.VENDEUR),
        buyers: roleCount(Role.ACHETEUR),
        newToday: newUsersToday,
      },
      shops: {
        total: shopsByStatus.reduce((sum, row) => sum + row._count, 0),
        active: statusCount(ShopStatus.ACTIVE),
        pending: pendingShops,
        suspended: statusCount(ShopStatus.SUSPENDED),
      },
      products: { total: productCount, active: activeProductCount },
      orders: {
        total: orderCount,
        month: monthOrders._count,
        monthRevenue: monthOrders._sum.total ?? 0,
        grossMerchandiseValue: gmv._sum.total ?? 0,
      },
    };
  }

  /** Inscriptions et commandes jour par jour, pour le graphique du tableau de bord. */
  async trend(days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - (days - 1));
    since.setHours(0, 0, 0, 0);

    const [users, orders] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where: { createdAt: { gte: since } },
        select: { createdAt: true },
      }),
      this.prisma.order.findMany({
        where: { placedAt: { gte: since }, status: { not: OrderStatus.CANCELLED } },
        select: { placedAt: true, total: true },
      }),
    ]);

    const buckets = new Map<
      string,
      { date: string; signups: number; orders: number; revenue: number }
    >();
    for (let offset = 0; offset < days; offset += 1) {
      const date = new Date(since);
      date.setDate(since.getDate() + offset);
      const key = date.toISOString().slice(0, 10);
      buckets.set(key, { date: key, signups: 0, orders: 0, revenue: 0 });
    }

    for (const user of users) {
      const bucket = buckets.get(user.createdAt.toISOString().slice(0, 10));
      if (bucket) bucket.signups += 1;
    }
    for (const order of orders) {
      const bucket = buckets.get(order.placedAt.toISOString().slice(0, 10));
      if (!bucket) continue;
      bucket.orders += 1;
      bucket.revenue += order.total;
    }

    return [...buckets.values()];
  }

  /** Dernières inscriptions et boutiques créées, pour le fil d'activité. */
  async activity() {
    const [recentUsers, recentShops, recentOrders] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        select: USER_SUMMARY,
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
      this.prisma.shop.findMany({
        select: {
          id: true,
          name: true,
          slug: true,
          city: true,
          status: true,
          createdAt: true,
          owner: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
      this.prisma.order.findMany({
        select: {
          id: true,
          orderNumber: true,
          total: true,
          status: true,
          placedAt: true,
          shop: { select: { name: true } },
        },
        orderBy: { placedAt: "desc" },
        take: 8,
      }),
    ]);

    return { recentUsers, recentShops, recentOrders };
  }
}
