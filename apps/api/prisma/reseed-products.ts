import { slugify } from "../src/common/utils/slug.util.js";
import { ProductStatus, StockMovementType } from "../src/generated/prisma/enums.js";
import { prisma } from "./db.js";

/**
 * Réensemence UNIQUEMENT le catalogue (catégories + produits) des boutiques
 * ACTIVES qui n'en ont pas — sans toucher aux utilisateurs, commandes ou avis.
 * Complément non destructif du seed complet (prisma/seed.ts).
 *
 * Usage : pnpm exec tsx prisma/reseed-products.ts
 */

const productImage = (name: string, category: string, seed: string, index: number) => {
  const prompt = `professional product photography of ${name}, ${category}, clean white background, e-commerce style, centered, soft shadows`;
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=900&height=900&nologo=true&seed=${seed}-${index}`;
};

const CATEGORIES = [
  { name: "Alimentation", iconName: "wheat", position: 1 },
  { name: "Boissons", iconName: "cup-soda", position: 2 },
  { name: "Mode & Textile", iconName: "shirt", position: 3 },
  { name: "Téléphonie & Électronique", iconName: "smartphone", position: 4 },
  { name: "Beauté & Cosmétique", iconName: "sparkles", position: 5 },
  { name: "Maison & Cuisine", iconName: "house", position: 6 },
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

/** Catalogue générique adapté à n'importe quelle boutique de démo. */
const CATALOG: ProductSeed[] = [
  {
    name: "Riz parfumé 5 kg",
    category: "Alimentation",
    price: 5500,
    costPrice: 4600,
    stock: 48,
    unit: "sac",
    description: "Sac de riz parfumé longs grains de 5 kg, qualité premium.",
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
    description: "Paquet de sucre en morceaux de 1 kg — stock faible, à réapprovisionner.",
    sold: 210,
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
    name: "Jus de bissap concentré 1 L",
    category: "Boissons",
    price: 1500,
    costPrice: 1100,
    stock: 40,
    unit: "bouteille",
    description: "Concentré de jus de bissap (hibiscus) artisanal, à diluer.",
    sold: 64,
  },
  {
    name: "Pagne wax premium 6 yards",
    category: "Mode & Textile",
    price: 9500,
    costPrice: 7800,
    stock: 22,
    unit: "pièce",
    description: "Pagne en coton wax authentique, motifs assortis, 6 yards.",
    featured: true,
    sold: 45,
  },
  {
    name: "Écouteurs Bluetooth TWS",
    category: "Téléphonie & Électronique",
    price: 7500,
    costPrice: 5200,
    stock: 35,
    unit: "pièce",
    description: "Écouteurs sans fil avec boîtier de charge, autonomie 24 h.",
    sold: 98,
  },
  {
    name: "Chargeur rapide 25 W USB-C",
    category: "Téléphonie & Électronique",
    price: 3500,
    costPrice: 2400,
    stock: 50,
    unit: "pièce",
    description: "Chargeur secteur rapide 25 W, câble USB-C inclus.",
    sold: 173,
  },
  {
    name: "Savon de Marseille pur 400 g",
    category: "Beauté & Cosmétique",
    price: 1800,
    costPrice: 1300,
    stock: 45,
    unit: "pain",
    description: "Pain de savon naturel multi-usage, 400 g.",
    sold: 77,
  },
  {
    name: "Beurre de karité brut 250 g",
    category: "Beauté & Cosmétique",
    price: 3000,
    costPrice: 2200,
    stock: 30,
    unit: "pot",
    description: "Pot de beurre de karité 100 % naturel, cheveux et peau.",
    featured: true,
    sold: 52,
  },
  {
    name: "Marmite antiadhésive 28 cm",
    category: "Maison & Cuisine",
    price: 12500,
    costPrice: 9800,
    stock: 15,
    unit: "pièce",
    description: "Marmite avec couvercle en verre, revêtement antiadhésif.",
    sold: 23,
  },
  {
    name: "Gel hydroalcoolique 500 ml",
    category: "Santé & Hygiène",
    price: 2500,
    costPrice: 1800,
    stock: 55,
    unit: "flacon",
    description: "Flacon pompe de gel hydroalcoolique 70 %, 500 ml.",
    sold: 89,
  },
];

async function main() {
  // 1. Catégories : crée uniquement celles qui manquent.
  const categories = new Map<string, string>();
  for (const cat of CATEGORIES) {
    const slug = slugify(cat.name);
    const existing = await prisma.category.upsert({
      where: { slug },
      create: { ...cat, slug },
      update: {},
    });
    categories.set(cat.name, existing.id);
  }
  console.log(`✓ ${categories.size} catégories prêtes`);

  // 2. Produits : uniquement pour les boutiques actives sans catalogue.
  const shops = await prisma.shop.findMany({
    where: { status: "ACTIVE" },
    select: {
      id: true,
      name: true,
      slug: true,
      ownerId: true,
      _count: { select: { products: true } },
    },
  });

  for (const shop of shops) {
    if (shop._count.products > 0) {
      console.log(`• ${shop.name} : ${shop._count.products} produits déjà présents — ignorée`);
      continue;
    }

    let index = 0;
    for (const seed of CATALOG) {
      index += 1;
      const slug = `${slugify(seed.name)}-${shop.slug.slice(0, 4)}`;
      const product = await prisma.product.create({
        data: {
          shopId: shop.id,
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
            productImage(seed.name, seed.category, `${shop.slug}-${slug}`, 1),
            productImage(seed.name, seed.category, `${shop.slug}-${slug}`, 2),
          ],
          status: ProductStatus.ACTIVE,
          isFeatured: seed.featured ?? false,
          soldCount: seed.sold ?? 0,
        },
      });
      await prisma.stockMovement.create({
        data: {
          shopId: shop.id,
          productId: product.id,
          userId: shop.ownerId,
          type: StockMovementType.IN,
          quantity: seed.stock,
          unitCost: seed.costPrice,
          stockAfter: seed.stock,
          reason: "Stock initial",
        },
      });
    }
    console.log(`✓ ${shop.name} : ${CATALOG.length} produits créés`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
