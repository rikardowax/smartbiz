import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { BotMessageDirection } from "../../generated/prisma/enums.js";
import { generateOrderNumber } from "../../common/utils/order-number.util.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import { WhatsAppWebhookDto } from "./dto/whatsapp-webhook.dto.js";

const LOCALE = "fr";

interface CatalogProduct {
  id: string;
  name: string;
  price: number;
  unit: string;
  stockQuantity: number;
}

interface CartItem {
  productId: string;
  name: string;
  price: number;
  unit: string;
  quantity: number;
}

interface CheckoutData {
  name?: string;
  phone?: string;
  city?: string;
  address?: string;
}

interface SalesbotState {
  step:
    | "idle"
    | "browsing"
    | "cart"
    | "checkout_name"
    | "checkout_phone"
    | "checkout_city"
    | "checkout_address"
    | "confirm"
    | "done";
  cart: CartItem[];
  lastProducts: CatalogProduct[];
  checkout: CheckoutData;
  locale: string;
}

const defaultState = (): SalesbotState => ({
  step: "idle",
  cart: [],
  lastProducts: [],
  checkout: {},
  locale: LOCALE,
});

@Injectable()
export class SalesbotService {
  private readonly logger = new Logger(SalesbotService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  verifyToken(token: string): boolean {
    const expected = this.config.get<string>("WHATSAPP_VERIFY_TOKEN");
    return !!expected && token === expected;
  }

  async handleWebhook(dto: WhatsAppWebhookDto): Promise<void> {
    for (const entry of dto.entry) {
      for (const change of entry.changes) {
        if (change.field !== "messages") continue;
        const metadata = change.value.metadata;
        const businessPhone = this.normalizePhone(metadata.display_phone_number);

        const shop = await this.findShop(businessPhone);
        if (!shop) {
          this.logger.warn(`Aucune boutique trouvée pour ${businessPhone}`);
          continue;
        }

        for (const message of change.value.messages ?? []) {
          if (message.type !== "text" || !message.text?.body) continue;
          const customerPhone = this.normalizePhone(message.from);
          const customerName = change.value.contacts?.find((c) => this.normalizePhone(c.wa_id) === customerPhone)?.profile
            ?.name;

          await this.processIncoming(shop, customerPhone, customerName ?? "", message.text.body);
        }
      }
    }
  }

  private async processIncoming(shop: { id: string; currency: string; name: string }, customerPhone: string, customerName: string, text: string) {
    const conversation = await this.upsertConversation(shop.id, customerPhone, customerName);
    const state: SalesbotState = this.parseState(conversation.state);

    const { state: newState, reply, order } = await this.processMessage(shop, customerPhone, text, state);

    await this.prisma.$transaction([
      this.prisma.botConversation.update({
        where: { id: conversation.id },
        data: { state: newState as object, lastMessageAt: new Date() },
      }),
      this.prisma.botMessage.create({
        data: { conversationId: conversation.id, direction: BotMessageDirection.OUTBOUND, content: reply },
      }),
    ]);

    if (order) {
      await this.prisma.botMessage.create({
        data: {
          conversationId: conversation.id,
          direction: BotMessageDirection.OUTBOUND,
          content: `Commande ${order.orderNumber} enregistrée.`,
          payload: { orderId: order.id } as object,
        },
      });
    }

    const phoneNumberId = this.config.get<string>("WHATSAPP_PHONE_NUMBER_ID");
    if (phoneNumberId) {
      await this.sendWhatsApp(customerPhone, reply, phoneNumberId);
    } else {
      this.logger.warn("WHATSAPP_PHONE_NUMBER_ID non configuré — message non envoyé.");
    }
  }

  private async processMessage(
    shop: { id: string; currency: string; name: string },
    customerPhone: string,
    text: string,
    state: SalesbotState,
  ): Promise<{ state: SalesbotState; reply: string; order?: { id: string; orderNumber: string } }> {
    const lower = text.toLowerCase().trim();

    if (state.step.startsWith("checkout_")) {
      return this.processCheckout(shop, customerPhone, text, state);
    }

    if (state.step === "confirm" || state.step === "done") {
      if (lower === "confirmer" || lower === "oui") {
        return this.confirmOrder(shop, customerPhone, state);
      }
      return { state: { ...defaultState(), locale: state.locale }, reply: this.welcome() };
    }

    if (lower.match(/^(catalogue|catalog|produits?|products?)$/)) {
      return this.loadProducts(shop.id, state);
    }

    if (lower.match(/^(panier|cart)$/)) {
      return this.showCart(state);
    }

    if (lower.match(/^(commander|order|acheter)$/)) {
      return this.startCheckout(state);
    }

    if (/^\d+$/.test(lower) && state.lastProducts.length > 0) {
      const index = Number.parseInt(lower, 10) - 1;
      const product = state.lastProducts[index];
      if (product && product.stockQuantity > 0) {
        return this.addToCart(state, product);
      }
      return { state, reply: "Ce numéro ne correspond à aucun produit disponible." };
    }

    return this.loadProducts(shop.id, state, text);
  }

  private async loadProducts(
    shopId: string,
    state: SalesbotState,
    search = "",
  ): Promise<{ state: SalesbotState; reply: string }> {
    const products = await this.prisma.product.findMany({
      where: {
        shopId,
        status: "ACTIVE",
        stockQuantity: { gt: 0 },
        ...(search ? { name: { contains: search, mode: "insensitive" as const } } : {}),
      },
      take: 5,
      orderBy: { soldCount: "desc" },
      select: { id: true, name: true, price: true, unit: true, stockQuantity: true },
    });

    if (products.length === 0) {
      return { state: { ...state, step: "idle", lastProducts: [] }, reply: "Je n'ai trouvé aucun produit. Tapez *catalogue* pour la liste complète." };
    }

    const list = products
      .map((p, i) => `${i + 1}. ${p.name} — ${p.price.toLocaleString()} FCFA/${p.unit}`)
      .join("\n");
    const instructions = `Tapez le numéro du produit pour l'ajouter au panier, *panier* pour voir votre panier ou *commander* pour finaliser.`;

    return {
      state: { ...state, step: "browsing", lastProducts: products },
      reply: `${list}\n\n${instructions}`,
    };
  }

  private addToCart(state: SalesbotState, product: CatalogProduct): { state: SalesbotState; reply: string } {
    const existing = state.cart.find((i) => i.productId === product.id);
    const cart = existing
      ? state.cart.map((i) => (i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i))
      : [...state.cart, { productId: product.id, name: product.name, price: product.price, unit: product.unit, quantity: 1 }];

    const total = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
    return {
      state: { ...state, cart, step: "browsing" },
      reply: `${product.name} ajouté.\nTotal panier : ${total.toLocaleString()} FCFA\n*panier* / *commander* / *catalogue*`,
    };
  }

  private showCart(state: SalesbotState): { state: SalesbotState; reply: string } {
    if (state.cart.length === 0) {
      return { state: { ...state, step: "idle" }, reply: "Votre panier est vide. Tapez *catalogue* pour parcourir." };
    }

    const items = state.cart.map((i) => `• ${i.name} x${i.quantity}`).join("\n");
    const total = state.cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
    return {
      state: { ...state, step: "cart" },
      reply: `${items}\n\nTotal : ${total.toLocaleString()} FCFA\nTapez *commander* pour passer la commande.`,
    };
  }

  private startCheckout(state: SalesbotState): { state: SalesbotState; reply: string } {
    if (state.cart.length === 0) {
      return { state: { ...state, step: "idle" }, reply: "Votre panier est vide." };
    }
    return {
      state: { ...state, step: "checkout_name", checkout: {} },
      reply: "Quel est le nom du destinataire ?",
    };
  }

  private processCheckout(
    shop: { id: string; currency: string; name: string },
    customerPhone: string,
    text: string,
    state: SalesbotState,
  ): { state: SalesbotState; reply: string; order?: { id: string; orderNumber: string } } {
    const field = state.step.replace("checkout_", "") as "name" | "phone" | "city" | "address";
    const nextSteps: Record<string, { step: SalesbotState["step"]; prompt: string }> = {
      name: { step: "checkout_phone", prompt: "Quel est le numéro de téléphone ?" },
      phone: { step: "checkout_city", prompt: "Quelle est la ville de livraison ?" },
      city: { step: "checkout_address", prompt: "Quelle est l'adresse de livraison ?" },
      address: { step: "confirm", prompt: "" },
    };

    const checkout = { ...state.checkout, [field]: text };

    if (field === "address") {
      const total = state.cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
      const summary = `
${checkout.name}
${checkout.phone}
${checkout.city}
${checkout.address}

Total : ${total.toLocaleString()} FCFA

Tapez *confirmer* pour valider ou *annuler* pour recommencer.`;
      return { state: { ...state, step: "confirm", checkout }, reply: summary };
    }

    return { state: { ...state, step: nextSteps[field].step, checkout }, reply: nextSteps[field].prompt };
  }

  private async confirmOrder(
    shop: { id: string; currency: string; name: string },
    customerPhone: string,
    state: SalesbotState,
  ): Promise<{ state: SalesbotState; reply: string; order: { id: string; orderNumber: string } }> {
    const customer = await this.upsertCustomer(shop.id, customerPhone, state.checkout.name);

    const subtotal = state.cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const total = subtotal;

    const order = await this.prisma.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        shopId: shop.id,
        customerId: customer.id,
        channel: "WHATSAPP",
        status: "PENDING",
        paymentStatus: "PENDING",
        paymentMethod: "CASH_ON_DELIVERY",
        subtotal,
        deliveryFee: 0,
        discount: 0,
        total,
        currency: shop.currency,
        contactName: state.checkout.name ?? customer.name ?? "",
        contactPhone: state.checkout.phone ?? customerPhone,
        deliveryCity: state.checkout.city ?? "",
        deliveryLine1: state.checkout.address ?? "",
        items: {
          create: state.cart.map((i) => ({
            productId: i.productId,
            productName: i.name,
            unitPrice: i.price,
            quantity: i.quantity,
            total: i.price * i.quantity,
          })),
        },
        events: {
          create: {
            status: "PENDING",
            message: "Commande passée via WhatsApp SalesBot",
          },
        },
      },
    });

    return {
      state: { ...defaultState(), locale: state.locale },
      reply: `Commande confirmée ! Numéro : *${order.orderNumber}*. Total : ${total.toLocaleString()} FCFA. Merci pour votre confiance.`,
      order: { id: order.id, orderNumber: order.orderNumber },
    };
  }

  private welcome(): string {
    return `Bonjour ! Bienvenue dans notre boutique WhatsApp.\n\nTapez :\n• *catalogue* — voir les produits\n• *panier* — voir le panier\n• *commander* — passer commande`;
  }

  private async findShop(phone: string) {
    const allShops = await this.prisma.shop.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, name: true, phone: true, whatsappNumber: true, currency: true },
    });

    return allShops.find((s) => this.normalizePhone(s.whatsappNumber ?? s.phone) === phone);
  }

  private async upsertConversation(shopId: string, customerPhone: string, customerName: string) {
    const conv = await this.prisma.botConversation.upsert({
      where: { shopId_customerPhone: { shopId, customerPhone } },
      create: { shopId, customerPhone, customerName, state: defaultState() as object },
      update: { customerName, lastMessageAt: new Date() },
    });

    if (!conv) {
      throw new Error("Impossible de créer la conversation");
    }

    return conv;
  }

  private async upsertCustomer(shopId: string, phone: string, name?: string) {
    const customer = await this.prisma.customer.upsert({
      where: { shopId_phone: { shopId, phone } },
      create: { shopId, phone, name: name ?? phone },
      update: { name: name ?? undefined },
    });
    return customer;
  }

  private parseState(raw: unknown): SalesbotState {
    try {
      return { ...defaultState(), ...(raw as Record<string, unknown> ?? {}) } as SalesbotState;
    } catch {
      return defaultState();
    }
  }

  private normalizePhone(phone?: string): string {
    if (!phone) return "";
    const digits = phone.replace(/\D/g, "");
    return digits ? `+${digits}` : "";
  }

  private async sendWhatsApp(to: string, text: string, phoneNumberId: string): Promise<void> {
    const token = this.config.get<string>("WHATSAPP_TOKEN");
    const version = this.config.get<string>("WHATSAPP_API_VERSION") ?? "v20.0";

    if (!token) {
      this.logger.warn("WHATSAPP_TOKEN non configuré.");
      return;
    }

    const res = await fetch(`https://graph.facebook.com/${version}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: this.cleanPhoneForApi(to),
        type: "text",
        text: { body: text },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      this.logger.error(`WhatsApp API error ${res.status}: ${err}`);
    }
  }

  private cleanPhoneForApi(phone: string): string {
    return phone.replace(/\D/g, "");
  }
}
