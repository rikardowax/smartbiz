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
import { PrismaService } from "../../prisma/prisma.service.js";
import { DashboardService } from "../dashboard/dashboard.service.js";
import { CustomersService } from "../partners/customers.service.js";
import { ProductsService } from "../products/products.service.js";

type AssistantContext = { shopId: string; userId: string; locale: string };

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

  private systemPrompt(locale: string): string {
    const instructions =
      locale === "en"
        ? "You are SmartBiz, a helpful assistant for African merchants. Use the available tools to answer questions or act on the seller's shop. Be concise and professional."
        : "Tu es SmartBiz, un assistant utile pour les commerçants africains. Utilise les outils disponibles pour répondre aux questions ou agir sur la boutique du vendeur. Sois concis et professionnel.";
    return instructions;
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
