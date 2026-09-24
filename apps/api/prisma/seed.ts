import * as bcrypt from "bcryptjs";
import { generateOrderNumber } from "../src/common/utils/order-number.util.js";
import { slugify } from "../src/common/utils/slug.util.js";
import {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  ProductStatus,
  Role,
  SalesChannel,
  ShopStatus,
  StockMovementType,
  TransactionType,
} from "../src/generated/prisma/enums.js";
import { prisma } from "./db.js";

const DEMO_PASSWORD = "SmartBiz2026";

/** Une commande expédiée ou livrée a déjà consommé du stock. */
const isFulfilled = (status: OrderStatus) =>
  status === OrderStatus.SHIPPED || status === OrderStatus.DELIVERED;
const image = (seed: string) => `https://picsum.photos/seed/${seed}/900/900`;

const productImage = (name: string, category: string, seed: string, index: number) => {
  const prompt = `professional product photography of ${name}, ${category}, clean white background, e-commerce style, centered, soft shadows`;
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=900&height=900&nologo=true&seed=${seed}-${index}`;
};

/** Décale une date de N jours dans le passé. */
const daysAgo = (days: number, hour = 10) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hour, Math.floor(Math.random() * 60), 0, 0);
  return date;
};

const CATEGORIES = [
  { name: "Alimentation", iconName: "wheat", position: 1 },
  { name: "Boissons", iconName: "cup-soda", position: 2 },
  { name: "Mode & Textile", iconName: "shirt", position: 3 },
  { name: "Téléphonie & Électronique", iconName: "smartphone", position: 4 },
  { name: "Beauté & Cosmétique", iconName: "sparkles", position: 5 },
  { name: "Maison & Cuisine", iconName: "house", position: 6 },
  { name: "Papeterie & Bureau", iconName: "pencil", position: 7 },
  { name: "Santé & Hygiène", iconName: "heart-pulse", position: 8 },
];

interface ProductSeed {
  name: string;
  category: string;
  price: number;
  costPrice: number;
  stock: number;
  unit?: string;
  description: string;
  featured?: boolean;
  sold?: number;
}

const BOUTIQUE_AWA: ProductSeed[] = [
  {
    name: "Riz parfumé 5 kg",
    category: "Alimentation",
    price: 5500,
    costPrice: 4600,
    stock: 48,
    unit: "sac",
    description:
      "Sac de riz parfumé longs grains de 5 kg, qualité premium. Idéal pour la revente en détail.",
    featured: true,
    sold: 132,
  },
  {
    name: "Huile de palme raffinée 5 L",
    category: "Alimentation",
    price: 6800,
    costPrice: 5900,
    stock: 24,
    unit: "bidon",
    description: "Bidon de 5 litres d'huile de palme raffinée, sans additif.",
    sold: 87,
  },
  {
    name: "Sucre en morceaux 1 kg",
    category: "Alimentation",
    price: 1200,
    costPrice: 950,
    stock: 3,
    unit: "paquet",
    description: "Paquet de sucre en morceaux de 1 kg.",
    sold: 210,
  },
  {
    name: "Sardines à l'huile (carton de 50)",
    category: "Alimentation",
    price: 18500,
    costPrice: 16000,
    stock: 12,
    unit: "carton",
    description: "Carton de 50 boîtes de sardines à l'huile végétale, 125 g chacune.",
    sold: 34,
  },
  {
    name: "Eau minérale 1,5 L (pack de 6)",
    category: "Boissons",
    price: 2400,
    costPrice: 1950,
    stock: 60,
    unit: "pack",
    description: "Pack de 6 bouteilles d'eau minérale naturelle de 1,5 litre.",
    featured: true,
    sold: 156,
  },
  {
    name: "Jus d'ananas 1 L",
    category: "Boissons",
    price: 1500,
    costPrice: 1150,
    stock: 36,
    description: "Jus d'ananas 100 % pur, sans sucre ajouté, brique de 1 litre.",
    sold: 78,
  },
  {
    name: "Café soluble 200 g",
    category: "Boissons",
    price: 3200,
    costPrice: 2600,
    stock: 18,
    unit: "bocal",
    description: "Bocal de café soluble lyophilisé de 200 g.",
    sold: 61,
  },
  {
    name: "Savon de ménage (lot de 4)",
    category: "Santé & Hygiène",
    price: 1800,
    costPrice: 1350,
    stock: 42,
    unit: "lot",
    description: "Lot de 4 savons de ménage 400 g, longue durée.",
    sold: 143,
  },
  {
    name: "Papier hygiénique (pack de 8)",
    category: "Santé & Hygiène",
    price: 2900,
    costPrice: 2300,
    stock: 2,
    unit: "pack",
    description: "Pack de 8 rouleaux double épaisseur.",
    sold: 96,
  },
  {
    name: "Cahier 200 pages (lot de 5)",
    category: "Papeterie & Bureau",
    price: 2500,
    costPrice: 1900,
    stock: 55,
    unit: "lot",
    description: "Lot de 5 cahiers 200 pages grands carreaux, couverture rigide.",
    sold: 47,
  },
];

const BOUTIQUE_KAMGA: ProductSeed[] = [
  {
    name: "Smartphone Tecno Spark 20",
    category: "Téléphonie & Électronique",
    price: 92000,
    costPrice: 81000,
    stock: 14,
    description:
      'Écran 6,6" 90 Hz, 8 Go de RAM extensibles, 128 Go de stockage, batterie 5000 mAh. Garantie 12 mois.',
    featured: true,
    sold: 58,
  },
  {
    name: "Écouteurs Bluetooth TWS",
    category: "Téléphonie & Électronique",
    price: 12500,
    costPrice: 8900,
    stock: 40,
    unit: "paire",
    description: "Écouteurs sans fil avec boîtier de charge, autonomie 24 h, réduction de bruit.",
    featured: true,
    sold: 214,
  },
  {
    name: "Chargeur rapide 33 W USB-C",
    category: "Téléphonie & Électronique",
    price: 7500,
    costPrice: 5200,
    stock: 65,
    description: "Chargeur secteur 33 W avec câble USB-C tressé de 1 m inclus.",
    sold: 189,
  },
  {
    name: "Batterie externe 20 000 mAh",
    category: "Téléphonie & Électronique",
    price: 15900,
    costPrice: 11800,
    stock: 4,
    description: "Powerbank 20 000 mAh, double sortie USB, charge rapide 22,5 W, écran LED.",
    sold: 73,
  },
  {
    name: "Montre connectée SmartFit",
    category: "Téléphonie & Électronique",
    price: 21000,
    costPrice: 16500,
    stock: 11,
    description: "Suivi cardiaque, SpO2, podomètre, notifications, étanche IP67.",
    sold: 41,
  },
  {
    name: "Coque antichoc universelle",
    category: "Téléphonie & Électronique",
    price: 2500,
    costPrice: 1200,
    stock: 120,
    description: 'Coque en TPU renforcé aux angles, compatible modèles 6,1" à 6,7".',
    sold: 302,
  },
  {
    name: "Clé USB 64 Go",
    category: "Téléphonie & Électronique",
    price: 6500,
    costPrice: 4700,
    stock: 30,
    description: "Clé USB 3.0 de 64 Go, boîtier métal, vitesse de lecture jusqu'à 120 Mo/s.",
    sold: 118,
  },
  {
    name: "Enceinte Bluetooth 10 W",
    category: "Téléphonie & Électronique",
    price: 18000,
    costPrice: 13500,
    stock: 9,
    description: "Enceinte portable 10 W, radio FM, lecteur de carte microSD, autonomie 8 h.",
    sold: 66,
  },
  {
    name: "Lampe solaire rechargeable",
    category: "Maison & Cuisine",
    price: 8900,
    costPrice: 6400,
    stock: 22,
    description: "Lampe LED solaire avec panneau intégré, 3 niveaux d'éclairage, port USB.",
    featured: true,
    sold: 95,
  },
  {
    name: 'Ventilateur rechargeable 12"',
    category: "Maison & Cuisine",
    price: 24500,
    costPrice: 19000,
    stock: 6,
    description: "Ventilateur sur batterie, 4 vitesses, autonomie jusqu'à 9 h, éclairage LED.",
    sold: 38,
  },
];

async function main() {
  console.log("🌱 Réinitialisation des données de démonstration...");

  // L'ordre respecte les contraintes de clés étrangères.
  await prisma.botMessage.deleteMany();
  await prisma.botConversation.deleteMany();
  await prisma.assistantMessage.deleteMany();
  await prisma.assistantConversation.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.orderEvent.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.review.deleteMany();
  await prisma.product.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.shop.deleteMany();
  await prisma.category.deleteMany();
  await prisma.address.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  // --- Utilisateurs --------------------------------------------------------
  const admin = await prisma.user.create({
    data: {
      firstName: "Amina",
      lastName: "Bello",
      phone: "+237699000000",
      email: "admin@smartbiz.cm",
      passwordHash,
      role: Role.ADMIN,
    },
  });

  const awa = await prisma.user.create({
    data: {
      firstName: "Awa",
      lastName: "Ngono",
      phone: "+237699000001",
      email: "awa@smartbiz.cm",
      passwordHash,
      role: Role.VENDEUR,
    },
  });

  const kamga = await prisma.user.create({
    data: {
      firstName: "Serge",
      lastName: "Kamga",
      phone: "+237699000002",
      email: "serge@smartbiz.cm",
      passwordHash,
      role: Role.VENDEUR,
    },
  });

  const acheteur = await prisma.user.create({
    data: {
      firstName: "Marie",
      lastName: "Fotso",
      phone: "+237699000003",
      email: "marie@smartbiz.cm",
      passwordHash,
      role: Role.ACHETEUR,
      addresses: {
        create: {
          label: "Domicile",
          recipient: "Marie Fotso",
          phone: "+237699000003",
          city: "Yaoundé",
          line1: "Quartier Bastos, rue 1.234",
          isDefault: true,
        },
      },
    },
  });

  const acheteur2 = await prisma.user.create({
    data: {
      firstName: "Paul",
      lastName: "Mbarga",
      phone: "+237699000004",
      email: "paul@smartbiz.cm",
      passwordHash,
      role: Role.ACHETEUR,
    },
  });

  // --- Catégories ----------------------------------------------------------
  const categories = new Map<string, string>();
  for (const category of CATEGORIES) {
    const created = await prisma.category.create({
      data: { ...category, slug: slugify(category.name) },
    });
    categories.set(category.name, created.id);
  }

  // --- Boutiques -----------------------------------------------------------
  const boutiqueAwa = await prisma.shop.create({
    data: {
      ownerId: awa.id,
      name: "Alimentation Chez Awa",
      slug: "alimentation-chez-awa",
      description:
        "Boutique de quartier spécialisée en produits alimentaires et d'hygiène. Livraison dans tout Yaoundé sous 24 h.",
      logoUrl: image("logo-awa"),
      coverUrl: image("cover-awa"),
      phone: "+237699000001",
      whatsappNumber: "+237699000001",
      email: "awa@smartbiz.cm",
      city: "Yaoundé",
      address: "Marché Mokolo, hangar 12",
      status: ShopStatus.ACTIVE,
    },
  });

  const boutiqueKamga = await prisma.shop.create({
    data: {
      ownerId: kamga.id,
      name: "Kamga Électronique",
      slug: "kamga-electronique",
      description:
        "Téléphones, accessoires et petit électroménager. Produits garantis, service après-vente sur place.",
      logoUrl: image("logo-kamga"),
      coverUrl: image("cover-kamga"),
      phone: "+237699000002",
      whatsappNumber: "+237699000002",
      email: "serge@smartbiz.cm",
      city: "Douala",
      address: "Avenue de la Liberté, Akwa",
      status: ShopStatus.ACTIVE,
    },
  });

  // --- Produits + mouvements de stock initiaux -----------------------------
  async function createProducts(shopId: string, ownerId: string, seeds: ProductSeed[]) {
    const created = [];
    let index = 0;
    for (const seed of seeds) {
      index += 1;
      const slug = slugify(seed.name);
      const product = await prisma.product.create({
        data: {
          shopId,
          categoryId: categories.get(seed.category),
          name: seed.name,
          slug,
          description: seed.description,
          sku: `${slug.slice(0, 6).toUpperCase()}-${index.toString().padStart(3, "0")}`,
          unit: seed.unit ?? "pièce",
          price: seed.price,
          compareAtPrice: index % 3 === 0 ? Math.round(seed.price * 1.15) : null,
          costPrice: seed.costPrice,
          stockQuantity: seed.stock,
          lowStockThreshold: 5,
          images: [
            productImage(seed.name, seed.category, slug, 1),
            productImage(seed.name, seed.category, slug, 2),
          ],
          status: ProductStatus.ACTIVE,
          isFeatured: seed.featured ?? false,
          soldCount: seed.sold ?? 0,
        },
      });

      await prisma.stockMovement.create({
        data: {
          shopId,
          productId: product.id,
          userId: ownerId,
          type: StockMovementType.IN,
          quantity: seed.stock,
          unitCost: seed.costPrice,
          stockAfter: seed.stock,
          reason: "Stock initial à l'ouverture",
          createdAt: daysAgo(40),
        },
      });

      created.push(product);
    }
    return created;
  }

  const produitsAwa = await createProducts(boutiqueAwa.id, awa.id, BOUTIQUE_AWA);
  const produitsKamga = await createProducts(boutiqueKamga.id, kamga.id, BOUTIQUE_KAMGA);

  // --- Fournisseurs --------------------------------------------------------
  const fournisseurAwa = await prisma.supplier.create({
    data: {
      shopId: boutiqueAwa.id,
      name: "Grossiste Central Mokolo",
      phone: "+237677112233",
      email: "contact@grossiste-central.cm",
      address: "Marché Mokolo, bloc C",
      notes: "Livraison les mardis et vendredis. Paiement à 7 jours accepté.",
    },
  });

  await prisma.supplier.create({
    data: {
      shopId: boutiqueAwa.id,
      name: "SOCAPALM Distribution",
      phone: "+237677445566",
      notes: "Huiles et corps gras. Commande minimum 10 bidons.",
    },
  });

  await prisma.supplier.create({
    data: {
      shopId: boutiqueKamga.id,
      name: "Import Tech Douala",
      phone: "+237699887766",
      email: "sales@importtech.cm",
      address: "Zone industrielle Bassa",
      notes: "Importateur agréé Tecno et Itel. Garantie fournisseur 12 mois.",
    },
  });

  // --- Clients de boutique -------------------------------------------------
  const clientsAwa = await Promise.all(
    [
      { name: "Marie Fotso", phone: "+237699000003", city: "Yaoundé" },
      { name: "Boulangerie du Rond-Point", phone: "+237677001122", city: "Yaoundé" },
      { name: "Jeanne Atangana", phone: "+237655334455", city: "Yaoundé" },
      { name: "Restaurant Le Palmier", phone: "+237699887711", city: "Yaoundé" },
    ].map((customer) => prisma.customer.create({ data: { ...customer, shopId: boutiqueAwa.id } })),
  );

  const clientsKamga = await Promise.all(
    [
      { name: "Paul Mbarga", phone: "+237699000004", city: "Douala" },
      { name: "Cyber Espace Akwa", phone: "+237677556677", city: "Douala" },
      { name: "Aïcha Souleymane", phone: "+237690112233", city: "Douala" },
    ].map((customer) =>
      prisma.customer.create({ data: { ...customer, shopId: boutiqueKamga.id } }),
    ),
  );

  // --- Commandes -----------------------------------------------------------
  interface OrderSeed {
    shopId: string;
    buyerId?: string;
    customerId: string;
    contactName: string;
    contactPhone: string;
    city: string;
    line1: string;
    channel: SalesChannel;
    status: OrderStatus;
    paymentStatus: PaymentStatus;
    paymentMethod: PaymentMethod;
    daysAgo: number;
    lines: Array<{ productIndex: number; quantity: number }>;
    products: Array<{ id: string; name: string; price: number }>;
  }

  const orderSeeds: OrderSeed[] = [
    {
      shopId: boutiqueAwa.id,
      buyerId: acheteur.id,
      customerId: clientsAwa[0].id,
      contactName: "Marie Fotso",
      contactPhone: "+237699000003",
      city: "Yaoundé",
      line1: "Quartier Bastos, rue 1.234",
      channel: SalesChannel.MARKETPLACE,
      status: OrderStatus.DELIVERED,
      paymentStatus: PaymentStatus.PAID,
      paymentMethod: PaymentMethod.MOBILE_MONEY,
      daysAgo: 18,
      lines: [
        { productIndex: 0, quantity: 2 },
        { productIndex: 4, quantity: 3 },
      ],
      products: produitsAwa,
    },
    {
      shopId: boutiqueAwa.id,
      customerId: clientsAwa[1].id,
      contactName: "Boulangerie du Rond-Point",
      contactPhone: "+237677001122",
      city: "Yaoundé",
      line1: "Carrefour Nlongkak",
      channel: SalesChannel.WHATSAPP,
      status: OrderStatus.DELIVERED,
      paymentStatus: PaymentStatus.PAID,
      paymentMethod: PaymentMethod.CASH_ON_DELIVERY,
      daysAgo: 12,
      lines: [
        { productIndex: 2, quantity: 10 },
        { productIndex: 1, quantity: 2 },
      ],
      products: produitsAwa,
    },
    {
      shopId: boutiqueAwa.id,
      customerId: clientsAwa[2].id,
      contactName: "Jeanne Atangana",
      contactPhone: "+237655334455",
      city: "Yaoundé",
      line1: "Mvog-Mbi, face pharmacie",
      channel: SalesChannel.MARKETPLACE,
      status: OrderStatus.SHIPPED,
      paymentStatus: PaymentStatus.PAID,
      paymentMethod: PaymentMethod.MOBILE_MONEY,
      daysAgo: 3,
      lines: [
        { productIndex: 7, quantity: 4 },
        { productIndex: 5, quantity: 2 },
      ],
      products: produitsAwa,
    },
    {
      shopId: boutiqueAwa.id,
      customerId: clientsAwa[3].id,
      contactName: "Restaurant Le Palmier",
      contactPhone: "+237699887711",
      city: "Yaoundé",
      line1: "Avenue Kennedy",
      channel: SalesChannel.WHATSAPP,
      status: OrderStatus.PENDING,
      paymentStatus: PaymentStatus.PENDING,
      paymentMethod: PaymentMethod.CASH_ON_DELIVERY,
      daysAgo: 0,
      lines: [
        { productIndex: 3, quantity: 1 },
        { productIndex: 0, quantity: 4 },
      ],
      products: produitsAwa,
    },
    {
      shopId: boutiqueKamga.id,
      buyerId: acheteur2.id,
      customerId: clientsKamga[0].id,
      contactName: "Paul Mbarga",
      contactPhone: "+237699000004",
      city: "Douala",
      line1: "Bonapriso, rue des Palmiers",
      channel: SalesChannel.MARKETPLACE,
      status: OrderStatus.DELIVERED,
      paymentStatus: PaymentStatus.PAID,
      paymentMethod: PaymentMethod.MOBILE_MONEY,
      daysAgo: 22,
      lines: [
        { productIndex: 0, quantity: 1 },
        { productIndex: 2, quantity: 1 },
      ],
      products: produitsKamga,
    },
    {
      shopId: boutiqueKamga.id,
      customerId: clientsKamga[1].id,
      contactName: "Cyber Espace Akwa",
      contactPhone: "+237677556677",
      city: "Douala",
      line1: "Akwa, rue Joss",
      channel: SalesChannel.IN_STORE,
      status: OrderStatus.DELIVERED,
      paymentStatus: PaymentStatus.PAID,
      paymentMethod: PaymentMethod.CASH_ON_DELIVERY,
      daysAgo: 9,
      lines: [
        { productIndex: 1, quantity: 6 },
        { productIndex: 5, quantity: 10 },
      ],
      products: produitsKamga,
    },
    {
      shopId: boutiqueKamga.id,
      customerId: clientsKamga[2].id,
      contactName: "Aïcha Souleymane",
      contactPhone: "+237690112233",
      city: "Douala",
      line1: "Deido, carrefour Ancien Dalip",
      channel: SalesChannel.MARKETPLACE,
      status: OrderStatus.CONFIRMED,
      paymentStatus: PaymentStatus.PENDING,
      paymentMethod: PaymentMethod.CASH_ON_DELIVERY,
      daysAgo: 1,
      lines: [{ productIndex: 4, quantity: 1 }],
      products: produitsKamga,
    },
  ];

  for (const seed of orderSeeds) {
    const items = seed.lines.map((line) => {
      const product = seed.products[line.productIndex];
      return {
        productId: product.id,
        productName: product.name,
        unitPrice: product.price,
        quantity: line.quantity,
        total: product.price * line.quantity,
      };
    });

    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const deliveryFee = seed.channel === SalesChannel.IN_STORE ? 0 : 1000;
    const total = subtotal + deliveryFee;
    const placedAt = daysAgo(seed.daysAgo);

    const order = await prisma.order.create({
      data: {
        orderNumber: generateOrderNumber(placedAt),
        shopId: seed.shopId,
        buyerId: seed.buyerId,
        customerId: seed.customerId,
        channel: seed.channel,
        status: seed.status,
        paymentStatus: seed.paymentStatus,
        paymentMethod: seed.paymentMethod,
        subtotal,
        deliveryFee,
        total,
        contactName: seed.contactName,
        contactPhone: seed.contactPhone,
        deliveryCity: seed.city,
        deliveryLine1: seed.line1,
        placedAt,
        confirmedAt: seed.status === OrderStatus.PENDING ? null : daysAgo(seed.daysAgo, 12),
        shippedAt: isFulfilled(seed.status) ? daysAgo(Math.max(0, seed.daysAgo - 1), 9) : null,
        deliveredAt:
          seed.status === OrderStatus.DELIVERED ? daysAgo(Math.max(0, seed.daysAgo - 2), 15) : null,
        items: { create: items },
      },
    });

    // Chronologie de suivi
    const timeline: Array<{ status: OrderStatus; message: string; at: Date }> = [
      {
        status: OrderStatus.PENDING,
        message: "Commande reçue, en attente de confirmation du vendeur",
        at: placedAt,
      },
    ];
    if (seed.status !== OrderStatus.PENDING) {
      timeline.push({
        status: OrderStatus.CONFIRMED,
        message: "Commande confirmée par le vendeur",
        at: daysAgo(seed.daysAgo, 12),
      });
    }
    if (isFulfilled(seed.status)) {
      timeline.push({
        status: OrderStatus.SHIPPED,
        message: "Colis remis au livreur",
        at: daysAgo(Math.max(0, seed.daysAgo - 1), 9),
      });
    }
    if (seed.status === OrderStatus.DELIVERED) {
      timeline.push({
        status: OrderStatus.DELIVERED,
        message: "Commande livrée et réglée",
        at: daysAgo(Math.max(0, seed.daysAgo - 2), 15),
      });
    }

    await prisma.orderEvent.createMany({
      data: timeline.map((event) => ({
        orderId: order.id,
        status: event.status,
        message: event.message,
        createdAt: event.at,
      })),
    });

    // Sorties de stock et écriture financière pour les commandes honorées
    if (isFulfilled(seed.status)) {
      for (const item of items) {
        if (!item.productId) continue;
        const product = await prisma.product.findUniqueOrThrow({ where: { id: item.productId } });
        await prisma.stockMovement.create({
          data: {
            shopId: seed.shopId,
            productId: item.productId,
            type: StockMovementType.OUT,
            quantity: item.quantity,
            stockAfter: product.stockQuantity,
            reason: `Commande ${order.orderNumber}`,
            reference: order.orderNumber,
            createdAt: placedAt,
          },
        });
      }
    }

    if (seed.paymentStatus === PaymentStatus.PAID) {
      await prisma.transaction.create({
        data: {
          shopId: seed.shopId,
          orderId: order.id,
          type: TransactionType.INCOME,
          category: "Ventes",
          label: `Encaissement commande ${order.orderNumber}`,
          amount: total,
          occurredAt: placedAt,
        },
      });
    }

    await prisma.customer.update({
      where: { id: seed.customerId },
      data: {
        ordersCount: { increment: 1 },
        totalSpent: { increment: seed.paymentStatus === PaymentStatus.PAID ? total : 0 },
      },
    });
  }

  // --- Charges d'exploitation ---------------------------------------------
  const charges = [
    {
      shopId: boutiqueAwa.id,
      category: "Approvisionnement",
      label: "Réassort riz et huile",
      amount: 145000,
      days: 15,
    },
    {
      shopId: boutiqueAwa.id,
      category: "Loyer",
      label: "Loyer du hangar - septembre",
      amount: 60000,
      days: 10,
    },
    {
      shopId: boutiqueAwa.id,
      category: "Transport",
      label: "Frais de transport marchandises",
      amount: 12000,
      days: 7,
    },
    {
      shopId: boutiqueAwa.id,
      category: "Électricité",
      label: "Facture ENEO",
      amount: 18500,
      days: 5,
    },
    {
      shopId: boutiqueKamga.id,
      category: "Approvisionnement",
      label: "Lot de smartphones et accessoires",
      amount: 890000,
      days: 20,
    },
    {
      shopId: boutiqueKamga.id,
      category: "Loyer",
      label: "Loyer boutique Akwa - septembre",
      amount: 150000,
      days: 9,
    },
    {
      shopId: boutiqueKamga.id,
      category: "Salaires",
      label: "Salaire vendeur assistant",
      amount: 85000,
      days: 8,
    },
  ];

  for (const charge of charges) {
    await prisma.transaction.create({
      data: {
        shopId: charge.shopId,
        type: TransactionType.EXPENSE,
        category: charge.category,
        label: charge.label,
        amount: charge.amount,
        occurredAt: daysAgo(charge.days),
      },
    });
  }

  // --- Réapprovisionnement fournisseur ------------------------------------
  await prisma.stockMovement.create({
    data: {
      shopId: boutiqueAwa.id,
      productId: produitsAwa[0].id,
      userId: awa.id,
      supplierId: fournisseurAwa.id,
      type: StockMovementType.IN,
      quantity: 20,
      unitCost: 4600,
      stockAfter: produitsAwa[0].stockQuantity,
      reason: "Réassort hebdomadaire",
      createdAt: daysAgo(6),
    },
  });

  // --- Avis clients --------------------------------------------------------
  const reviews = [
    {
      productId: produitsAwa[0].id,
      userId: acheteur.id,
      rating: 5,
      comment: "Riz de très bonne qualité, livré le jour même. Je recommande !",
    },
    {
      productId: produitsAwa[4].id,
      userId: acheteur.id,
      rating: 4,
      comment: "Bon prix pour le pack, emballage correct.",
    },
    {
      productId: produitsKamga[0].id,
      userId: acheteur2.id,
      rating: 5,
      comment: "Téléphone neuf, scellé, avec la garantie. Vendeur sérieux.",
    },
    {
      productId: produitsKamga[1].id,
      userId: acheteur2.id,
      rating: 4,
      comment: "Bon son, autonomie conforme à la description.",
    },
    {
      productId: produitsKamga[1].id,
      userId: acheteur.id,
      rating: 5,
      comment: "Parfait pour le prix.",
    },
  ];

  for (const review of reviews) {
    await prisma.review.create({ data: review });
  }

  // Recalcul des notes moyennes
  for (const productId of new Set(reviews.map((review) => review.productId))) {
    const aggregate = await prisma.review.aggregate({
      where: { productId },
      _avg: { rating: true },
      _count: true,
    });
    await prisma.product.update({
      where: { id: productId },
      data: {
        ratingAverage: Math.round((aggregate._avg.rating ?? 0) * 10) / 10,
        ratingCount: aggregate._count,
      },
    });
  }

  // --- Notifications -------------------------------------------------------
  await prisma.notification.createMany({
    data: [
      {
        userId: awa.id,
        type: "STOCK_ALERT",
        title: "Stock faible",
        body: "3 produits sont sous leur seuil d'alerte de stock.",
        link: "/vendeur/stock",
      },
      {
        userId: awa.id,
        type: "NEW_ORDER",
        title: "Nouvelle commande WhatsApp",
        body: "Restaurant Le Palmier a passé une commande de 40 500 FCFA.",
        link: "/vendeur/commandes",
      },
      {
        userId: kamga.id,
        type: "NEW_ORDER",
        title: "Commande à confirmer",
        body: "Aïcha Souleymane attend la confirmation de sa commande.",
        link: "/vendeur/commandes",
      },
    ],
  });

  const counts = {
    utilisateurs: await prisma.user.count(),
    boutiques: await prisma.shop.count(),
    catégories: await prisma.category.count(),
    produits: await prisma.product.count(),
    commandes: await prisma.order.count(),
    clients: await prisma.customer.count(),
    transactions: await prisma.transaction.count(),
  };

  console.log("✅ Données de démonstration créées :", counts);
  console.log(`\n   Comptes de test (mot de passe : ${DEMO_PASSWORD})`);
  console.log(`   • Admin    ${admin.phone}`);
  console.log(`   • Vendeuse ${awa.phone}      — ${boutiqueAwa.name}`);
  console.log(`   • Vendeur  ${kamga.phone}      — ${boutiqueKamga.name}`);
  console.log(`   • Acheteur ${acheteur.phone}`);
}

main()
  .catch((error) => {
    console.error("❌ Échec du seed :", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
