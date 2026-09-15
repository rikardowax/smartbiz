import {
  createModelContent,
  createPartFromFunctionCall,
  createPartFromFunctionResponse,
  createPartFromText,
  createUserContent,
  type FunctionCall,
  FunctionCallingConfigMode,
  type FunctionDeclaration,
  GoogleGenAI,
  type Tool,
} from "@google/genai";
import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ShopStatus } from "../../generated/prisma/enums.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import { DashboardService } from "../dashboard/dashboard.service.js";
import { CustomersService } from "../partners/customers.service.js";
import type { CatalogQueryDto } from "../products/dto/product.dto.js";
import { ProductsService } from "../products/products.service.js";

type AssistantContext = { shopId: string; userId: string; locale: string };
type BuyerAssistantContext = { locale: string };

@Injectable()
export class AssistantService {
  private readonly ai: GoogleGenAI | null;
  private readonly model: string;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly products: ProductsService,
    private readonly customers: CustomersService,
    private readonly dashboard: DashboardService,
  ) {
    const apiKey = this.config.get<string>("gemini.apiKey") ?? "";
    this.model = this.config.get<string>("gemini.model") ?? "gemini-2.5-flash";
    this.ai = apiKey ? new GoogleGenAI({ apiKey }) : null;
  }

  private getTools(): Tool[] {
    const declarations: FunctionDeclaration[] = [
      {
        name: "getOverview",
        description: "Récupère les indicateurs clés du tableau de bord de la boutique.",
        parametersJsonSchema: { type: "object", properties: {}, required: [] },
      },
      {
        name: "listProducts",
        description: "Liste les produits du vendeur.",
        parametersJsonSchema: {
          type: "object",
          properties: { limit: { type: "integer", default: 10 } },
          required: [],
        },
      },
      {
        name: "listLowStock",
        description: "Liste les produits en rupture ou sous le seuil d'alerte.",
        parametersJsonSchema: { type: "object", properties: {}, required: [] },
      },
      {
        name: "listCustomers",
        description: "Liste les clients de la boutique.",
        parametersJsonSchema: {
          type: "object",
          properties: { limit: { type: "integer", default: 10 } },
          required: [],
        },
      },
      {
        name: "createCustomer",
        description: "Crée un client dans la boutique.",
        parametersJsonSchema: {
          type: "object",
          properties: {
            name: { type: "string" },
            phone: { type: "string" },
            city: { type: "string" },
            email: { type: "string" },
          },
          required: ["name", "phone"],
        },
      },
      {
        name: "createProduct",
        description: "Crée un produit dans la boutique.",
        parametersJsonSchema: {
          type: "object",
          properties: {
            name: { type: "string" },
            price: { type: "integer" },
            stockQuantity: { type: "integer" },
            unit: { type: "string" },
            costPrice: { type: "integer" },
            categoryId: { type: "string" },
          },
          required: ["name", "price"],
        },
      },
    ];

    return [{ functionDeclarations: declarations }];
  }

  private buyerSystemPrompt(locale: string): string {
    const instructions =
      locale === "en"
        ? "You are SmartBiz, a helpful shopping assistant for African buyers. Guide the customer to find the right products, compare offers, check availability, and make a purchase. Be concise, friendly, and practical. Always answer in the language of the user."
        : "Tu es SmartBiz, un assistant d'achat utile pour les acheteurs africains. Guide le client pour trouver les bons produits, comparer les offres, vérifier la disponibilité et passer une commande. Sois concis, amical et pratique. Réponds toujours dans la langue de l'utilisateur.";
    return instructions;
  }

  private systemPrompt(locale: string): string {
    const instructions =
      locale === "en"
        ? "You are SmartBiz, a helpful assistant for African merchants. Use the available tools to answer questions or act on the seller's shop. Be concise and professional."
        : "Tu es SmartBiz, un assistant utile pour les commerçants africains. Utilise les outils disponibles pour répondre aux questions ou agir sur la boutique du vendeur. Sois concis et professionnel.";
    return instructions;
  }

  private getBuyerTools(): Tool[] {
    const declarations: FunctionDeclaration[] = [
      {
        name: "searchProducts",
        description:
          "Recherche des produits dans la marketplace. Utilise cette fonction pour trouver, filtrer ou comparer des produits.",
        parametersJsonSchema: {
          type: "object",
          properties: {
            search: {
              type: "string",
              description: "Mots-clés de recherche (nom, catégorie, boutique)",
            },
            category: { type: "string", description: "Slug de la catégorie" },
            shop: { type: "string", description: "Slug de la boutique" },
            city: { type: "string", description: "Ville du vendeur" },
            minPrice: { type: "integer", description: "Prix minimum en FCFA" },
            maxPrice: { type: "integer", description: "Prix maximum en FCFA" },
            inStockOnly: { type: "boolean", default: true },
            sort: {
              type: "string",
              enum: ["recent", "price_asc", "price_desc", "popular", "rating"],
              default: "popular",
            },
            limit: { type: "integer", default: 8 },
          },
          required: [],
        },
      },
      {
        name: "getProductDetails",
        description: "Récupère les détails d'un produit spécifique et des produits similaires.",
        parametersJsonSchema: {
          type: "object",
          properties: {
            shopSlug: { type: "string" },
            productSlug: { type: "string" },
          },
          required: ["shopSlug", "productSlug"],
        },
      },
      {
        name: "listCategories",
        description: "Liste les catégories de produits disponibles.",
        parametersJsonSchema: {
          type: "object",
          properties: {},
          required: [],
        },
      },
      {
        name: "listShops",
        description: "Liste les boutiques actives sur la marketplace.",
        parametersJsonSchema: {
          type: "object",
          properties: {
            city: { type: "string" },
            limit: { type: "integer", default: 10 },
          },
          required: [],
        },
      },
      {
        name: "getCartHelp",
        description:
          "Explique comment ajouter un produit au panier, passer commande ou contacter le vendeur via WhatsApp.",
        parametersJsonSchema: { type: "object", properties: {}, required: [] },
      },
    ];

    return [{ functionDeclarations: declarations }];
  }

  async chat(message: string, context: AssistantContext) {
    if (!this.ai) {
      throw new ServiceUnavailableException(
        "Clé GEMINI_API_KEY manquante. Ajoutez-la pour activer l'assistant.",
      );
    }

    const system = this.systemPrompt(context.locale);
    const initial = await this.ai.models.generateContent({
      model: this.model,
      contents: [
        createModelContent([createPartFromText(system)]),
        createUserContent([createPartFromText(message)]),
      ],
      config: {
        tools: this.getTools(),
        toolConfig: {
          functionCallingConfig: { mode: FunctionCallingConfigMode.AUTO },
        },
      },
    });

    const calls = initial.functionCalls;
    if (calls && calls.length > 0) {
      const functionContents = await this.executeCalls(calls, context);
      const followUp = await this.ai.models.generateContent({
        model: this.model,
        contents: [
          createModelContent([createPartFromText(system)]),
          createUserContent([createPartFromText(message)]),
          ...functionContents,
        ],
      });
      return { text: followUp.text ?? "" };
    }

    return { text: initial.text ?? "" };
  }

  async chatBuyer(message: string, context: BuyerAssistantContext) {
    if (!this.ai) {
      throw new ServiceUnavailableException(
        "Clé GEMINI_API_KEY manquante. Ajoutez-la pour activer l'assistant.",
      );
    }

    const system = this.buyerSystemPrompt(context.locale);
    const initial = await this.ai.models.generateContent({
      model: this.model,
      contents: [
        createModelContent([createPartFromText(system)]),
        createUserContent([createPartFromText(message)]),
      ],
      config: {
        tools: this.getBuyerTools(),
        toolConfig: {
          functionCallingConfig: { mode: FunctionCallingConfigMode.AUTO },
        },
      },
    });

    const calls = initial.functionCalls;
    if (calls && calls.length > 0) {
      const functionContents = await this.executeBuyerCalls(calls, context);
      const followUp = await this.ai.models.generateContent({
        model: this.model,
        contents: [
          createModelContent([createPartFromText(system)]),
          createUserContent([createPartFromText(message)]),
          ...functionContents,
        ],
      });
      return { text: followUp.text ?? "" };
    }

    return { text: initial.text ?? "" };
  }

  private async executeBuyerCalls(
    calls: FunctionCall[],
    context: BuyerAssistantContext,
  ): Promise<ReturnType<typeof createModelContent>[]> {
    const results: ReturnType<typeof createModelContent>[] = [];

    for (const call of calls) {
      const id = call.id ?? "";
      const name = call.name ?? "";
      const args = (call.args ?? {}) as Record<string, unknown>;
      const result = await this.executeBuyerTool(name, args);

      results.push(createModelContent([createPartFromFunctionCall(name, args)]));
      results.push(
        createUserContent([createPartFromFunctionResponse(id, name, { output: result })]),
      );
    }

    return results;
  }

  private async executeBuyerTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    switch (name) {
      case "searchProducts":
        return this.products.findCatalog({
          search: args.search ? String(args.search) : undefined,
          category: args.category ? String(args.category) : undefined,
          shop: args.shop ? String(args.shop) : undefined,
          city: args.city ? String(args.city) : undefined,
          minPrice: args.minPrice ? Number(args.minPrice) : undefined,
          maxPrice: args.maxPrice ? Number(args.maxPrice) : undefined,
          inStockOnly:
            args.inStockOnly === true || (args.inStockOnly as unknown as string) === "true",
          sort: (args.sort ? String(args.sort) : "popular") as CatalogQueryDto["sort"],
          page: 1,
          limit: args.limit ? Number(args.limit) : 8,
          skip: 0,
        } as CatalogQueryDto);
      case "getProductDetails":
        return this.products.findPublicBySlug(String(args.shopSlug), String(args.productSlug));
      case "listCategories":
        return this.prisma.category.findMany({
          orderBy: { name: "asc" },
          select: { id: true, name: true, slug: true },
        });
      case "listShops":
        return this.prisma.shop.findMany({
          where: {
            status: ShopStatus.ACTIVE,
            ...(args.city ? { city: { equals: String(args.city), mode: "insensitive" } } : {}),
          },
          orderBy: { name: "asc" },
          take: Number(args.limit ?? 10),
          select: { id: true, name: true, slug: true, city: true, phone: true },
        });
      case "getCartHelp":
        return {
          steps: [
            "1. Ouvrez la page du produit qui vous intéresse.",
            "2. Choisissez la quantité et cliquez sur 'Ajouter au panier'.",
            "3. Allez dans le panier pour vérifier votre commande.",
            "4. Validez la commande ou contactez le vendeur par WhatsApp.",
          ],
          whatsappHelp:
            "Sur la page boutique ou produit, utilisez le bouton 'Commander sur WhatsApp' pour discuter directement avec le vendeur.",
        };
      default:
        return { error: "Fonction inconnue" };
    }
  }

  private async executeCalls(
    calls: FunctionCall[],
    context: AssistantContext,
  ): Promise<ReturnType<typeof createModelContent>[]> {
    const results: ReturnType<typeof createModelContent>[] = [];

    for (const call of calls) {
      const id = call.id ?? "";
      const name = call.name ?? "";
      const args = (call.args ?? {}) as Record<string, unknown>;
      const result = await this.executeTool(name, args, context);

      results.push(createModelContent([createPartFromFunctionCall(name, args)]));
      results.push(
        createUserContent([createPartFromFunctionResponse(id, name, { output: result })]),
      );
    }

    return results;
  }

  private async executeTool(
    name: string,
    args: Record<string, unknown>,
    { shopId, userId }: AssistantContext,
  ): Promise<unknown> {
    switch (name) {
      case "getOverview":
        return this.dashboard.overview(shopId);
      case "listProducts":
        return this.prisma.product.findMany({
          where: { shopId },
          orderBy: { createdAt: "desc" },
          take: Number(args.limit ?? 10),
          select: {
            id: true,
            name: true,
            price: true,
            stockQuantity: true,
            status: true,
          },
        });
      case "listLowStock":
        return (
          await this.prisma.product.findMany({
            where: { shopId },
            select: { id: true, name: true, stockQuantity: true, lowStockThreshold: true },
          })
        ).filter((p) => p.stockQuantity <= p.lowStockThreshold || p.stockQuantity <= 0);
      case "listCustomers":
        return this.prisma.customer.findMany({
          where: { shopId },
          orderBy: { totalSpent: "desc" },
          take: Number(args.limit ?? 10),
          select: { id: true, name: true, phone: true, totalSpent: true },
        });
      case "createCustomer":
        return this.customers.create(shopId, {
          name: String(args.name),
          phone: String(args.phone),
          city: args.city ? String(args.city) : undefined,
          email: args.email ? String(args.email) : undefined,
        });
      case "createProduct":
        return this.products.create(shopId, userId, {
          name: String(args.name),
          price: Number(args.price),
          stockQuantity: args.stockQuantity ? Number(args.stockQuantity) : undefined,
          unit: args.unit ? String(args.unit) : undefined,
          costPrice: args.costPrice ? Number(args.costPrice) : undefined,
          categoryId: args.categoryId ? String(args.categoryId) : undefined,
        });
      default:
        return { error: "Fonction inconnue" };
    }
  }
}
