import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { generateOrderNumber } from "../../common/utils/order-number.util.js";
import { BotMessageDirection } from "../../generated/prisma/enums.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import type { WhatsAppWebhookDto } from "./dto/whatsapp-webhook.dto.js";

/** Nombre de boutiques ou de produits listés par message. */
const PAGE_SIZE = 5;

interface ShopRef {
  id: string;
  name: string;
  slug: string;
  currency: string;
}

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

type Step =
  | "choose_shop"
  | "browsing"
  | "cart"
  | "checkout_name"
  | "checkout_phone"
  | "checkout_city"
  | "checkout_address"
  | "confirm";

interface SalesbotState {
  step: Step;
  shopId: string | null;
  cart: CartItem[];
  lastProducts: CatalogProduct[];
  lastShops: ShopRef[];
  checkout: CheckoutData;
}

const emptyState = (): SalesbotState => ({
  step: "choose_shop",
  shopId: null,
  cart: [],
  lastProducts: [],
  lastShops: [],
  checkout: {},
});

interface BotReply {
  state: SalesbotState;
  reply: string;
  order?: { id: string; orderNumber: string };
}

const money = (amount: number) => `${amount.toLocaleString("fr-FR")} FCFA`;

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

        for (const message of change.value.messages ?? []) {
          if (message.type !== "text" || !message.text?.body) continue;

          const customerPhone = this.normalizePhone(message.from);
          const contact = change.value.contacts?.find(
            (c) => this.normalizePhone(c.wa_id) === customerPhone,
          );

          await this.processIncoming(
            customerPhone,
            contact?.profile?.name ?? "",
            message.text.body,
          );
        }
      }
    }
  }

  private async processIncoming(customerPhone: string, customerName: string, text: string) {
    const conversation = await this.upsertConversation(customerPhone, customerName);
    const { state, reply, order } = await this.processMessage(
      customerPhone,
      customerName,
      text,
      this.parseState(conversation.state),
    );

    await this.prisma.botConversation.update({
      where: { id: conversation.id },
      data: {
        shopId: state.shopId,
        state: state as unknown as object,
        lastMessageAt: new Date(),
      },
    });

    await this.prisma.botMessage.createMany({
      data: [
        {
          conversationId: conversation.id,
          direction: BotMessageDirection.INBOUND,
          content: text,
        },
        {
          conversationId: conversation.id,
          direction: BotMessageDirection.OUTBOUND,
          content: reply,
          ...(order ? { payload: { orderId: order.id } as object } : {}),
        },
      ],
    });

    await this.sendWhatsApp(customerPhone, reply);
  }

  // --- Routage des messages --------------------------------------------------

  private async processMessage(
    customerPhone: string,
    customerName: string,
    text: string,
    state: SalesbotState,
  ): Promise<BotReply> {
    const raw = text.trim();
    const lower = raw.toLowerCase();

    // Un lien profond « boutique:slug » place directement le client dans la
    // bonne boutique, quel que soit l'état de la conversation.
    const deepLink = lower.match(/^(?:boutique|shop)\s*[:=]\s*([a-z0-9-]+)/);
    if (deepLink) {
      const shop = await this.findShopBySlug(deepLink[1]);
      if (shop) return this.enterShop(shop, state);
      return this.listShops({ ...state, shopId: null, step: "choose_shop" });
    }

    if (lower.match(/^(menu|aide|help|start|bonjour|bonsoir|salut|hi|hello)$/)) {
      return this.listShops({ ...emptyState(), cart: state.cart, shopId: state.shopId });
    }

    if (lower.match(/^(boutiques?|shops?|changer)$/)) {
      return this.listShops({ ...state, step: "choose_shop" });
    }

    if (state.step === "choose_shop") {
      return this.handleShopChoice(raw, state);
    }

    const shop = state.shopId ? await this.findShopById(state.shopId) : null;
    if (!shop) return this.listShops({ ...state, shopId: null, step: "choose_shop" });

    if (state.step.startsWith("checkout_")) {
      return this.handleCheckoutStep(raw, state);
    }

    if (state.step === "confirm") {
      if (lower.match(/^(confirmer|confirm|oui|ok)$/)) {
        return this.confirmOrder(shop, customerPhone, customerName, state);
      }
      return this.showCart({ ...state, step: "cart" });
    }

    if (lower.match(/^(catalogue|catalog|produits?|products?)$/)) {
      return this.listProducts(shop, state);
    }

    if (lower.match(/^(panier|cart)$/)) {
      return this.showCart(state);
    }

    if (lower.match(/^(commander|order|acheter|checkout)$/)) {
      return this.startCheckout(state);
    }

    if (lower.match(/^(vider|reset|annuler)$/)) {
      return {
        state: { ...state, cart: [], step: "browsing" },
        reply: `Panier vidé.\n\n${this.shopHelp(shop)}`,
      };
    }

    if (/^\d+$/.test(lower) && state.lastProducts.length > 0) {
      const product = state.lastProducts[Number.parseInt(lower, 10) - 1];
      if (product) return this.addToCart(state, product);
      return {
        state,
        reply: `Ce numéro ne correspond à aucun produit de la liste.\n\n${this.shopHelp(shop)}`,
      };
    }

    return this.listProducts(shop, state, raw);
  }

  // --- Sélection de boutique -------------------------------------------------

  private async listShops(state: SalesbotState): Promise<BotReply> {
    const shops = await this.prisma.shop.findMany({
      where: { status: "ACTIVE" },
      take: PAGE_SIZE,
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, slug: true, currency: true, city: true },
    });

    if (shops.length === 0) {
      return {
        state: { ...state, step: "choose_shop", lastShops: [] },
        reply: "Aucune boutique n'est disponible pour le moment.",
      };
    }

    const list = shops.map((s, i) => `${i + 1}. ${s.name} — ${s.city}`).join("\n");

    return {
      state: { ...state, step: "choose_shop", lastShops: shops, lastProducts: [] },
      reply: `Bienvenue sur SmartBiz.\n\nNos boutiques :\n${list}\n\nRépondez avec le numéro de la boutique qui vous intéresse.`,
    };
  }

  private async handleShopChoice(raw: string, state: SalesbotState): Promise<BotReply> {
    if (/^\d+$/.test(raw)) {
      const chosen = state.lastShops[Number.parseInt(raw, 10) - 1];
      if (chosen) return this.enterShop(chosen, state);
    }

    const byName = await this.prisma.shop.findFirst({
      where: { status: "ACTIVE", name: { contains: raw, mode: "insensitive" } },
      select: { id: true, name: true, slug: true, currency: true },
    });
    if (byName) return this.enterShop(byName, state);

    const fallback = await this.listShops(state);
    return { ...fallback, reply: `Je n'ai pas trouvé cette boutique.\n\n${fallback.reply}` };
  }

  private async enterShop(shop: ShopRef, state: SalesbotState): Promise<BotReply> {
    // Changer de boutique remet le panier à zéro : une commande ne peut pas
    // mélanger les produits de plusieurs vendeurs.
    const switched = state.shopId !== null && state.shopId !== shop.id;
    const base: SalesbotState = {
      ...state,
      shopId: shop.id,
      step: "browsing",
      cart: switched ? [] : state.cart,
      lastShops: [],
    };

    const { state: next, reply } = await this.listProducts(shop, base);
    return { state: next, reply: `*${shop.name}*\n\n${reply}` };
  }

  // --- Catalogue -------------------------------------------------------------

  private async listProducts(shop: ShopRef, state: SalesbotState, search = ""): Promise<BotReply> {
    const products = await this.prisma.product.findMany({
      where: {
        shopId: shop.id,
        status: "ACTIVE",
        stockQuantity: { gt: 0 },
        ...(search ? { name: { contains: search, mode: "insensitive" as const } } : {}),
      },
      take: PAGE_SIZE,
      orderBy: { soldCount: "desc" },
      select: { id: true, name: true, price: true, unit: true, stockQuantity: true },
    });

    if (products.length === 0) {
      const message = search
        ? `Aucun produit ne correspond à « ${search} ».`
        : "Cette boutique n'a pas encore de produit en ligne.";
      return {
        state: { ...state, step: "browsing", lastProducts: [] },
        reply: `${message}\n\nTapez *boutiques* pour changer de boutique.`,
      };
    }

    const list = products
      .map((p, i) => `${i + 1}. ${p.name} — ${money(p.price)}/${p.unit}`)
      .join("\n");

    return {
      state: { ...state, step: "browsing", lastProducts: products },
      reply: `${list}\n\n${this.shopHelp(shop)}`,
    };
  }

  private addToCart(state: SalesbotState, product: CatalogProduct): BotReply {
    const existing = state.cart.find((i) => i.productId === product.id);
    const cart = existing
      ? state.cart.map((i) =>
          i.productId === product.id
            ? { ...i, quantity: Math.min(i.quantity + 1, product.stockQuantity) }
            : i,
        )
      : [
          ...state.cart,
          {
            productId: product.id,
            name: product.name,
            price: product.price,
            unit: product.unit,
            quantity: 1,
          },
        ];

    return {
      state: { ...state, cart, step: "browsing" },
      reply: `${product.name} ajouté au panier.\nTotal : ${money(this.total(cart))}\n\nTapez un autre numéro, *panier* ou *commander*.`,
    };
  }

  private showCart(state: SalesbotState): BotReply {
    if (state.cart.length === 0) {
      return {
        state: { ...state, step: "browsing" },
        reply: "Votre panier est vide. Tapez *catalogue* pour voir les produits.",
      };
    }

    const items = state.cart
      .map((i) => `• ${i.name} x${i.quantity} — ${money(i.price * i.quantity)}`)
      .join("\n");

    return {
      state: { ...state, step: "cart" },
      reply: `Votre panier :\n${items}\n\nTotal : ${money(this.total(state.cart))}\n\nTapez *commander* pour finaliser ou *vider* pour recommencer.`,
    };
  }

  // --- Commande --------------------------------------------------------------

  private startCheckout(state: SalesbotState): BotReply {
    if (state.cart.length === 0) {
      return {
        state: { ...state, step: "browsing" },
        reply: "Votre panier est vide. Tapez *catalogue* pour voir les produits.",
      };
    }
    return {
      state: { ...state, step: "checkout_name" },
      reply: "Quel est le nom du destinataire ?",
    };
  }

  private handleCheckoutStep(text: string, state: SalesbotState): BotReply {
    const prompts: Record<string, { field: keyof CheckoutData; next: Step; prompt: string }> = {
      checkout_name: { field: "name", next: "checkout_phone", prompt: "Numéro de téléphone ?" },
      checkout_phone: { field: "phone", next: "checkout_city", prompt: "Ville de livraison ?" },
      checkout_city: { field: "city", next: "checkout_address", prompt: "Adresse de livraison ?" },
      checkout_address: { field: "address", next: "confirm", prompt: "" },
    };

    const current = prompts[state.step];
    const checkout = { ...state.checkout, [current.field]: text };

    if (current.next !== "confirm") {
      return { state: { ...state, step: current.next, checkout }, reply: current.prompt };
    }

    const items = state.cart
      .map((i) => `• ${i.name} x${i.quantity} — ${money(i.price * i.quantity)}`)
      .join("\n");

    return {
      state: { ...state, step: "confirm", checkout },
      reply: `Récapitulatif :\n${items}\n\nTotal : ${money(this.total(state.cart))}\n\nLivraison :\n${checkout.name}\n${checkout.phone}\n${checkout.city}\n${checkout.address}\n\nTapez *confirmer* pour valider ou *panier* pour modifier.`,
    };
  }

  private async confirmOrder(
    shop: ShopRef,
    customerPhone: string,
    customerName: string,
    state: SalesbotState,
  ): Promise<BotReply> {
    const customer = await this.upsertCustomer(
      shop.id,
      customerPhone,
      state.checkout.name || customerName || customerPhone,
      state.checkout.city,
    );

    const subtotal = this.total(state.cart);

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
        total: subtotal,
        currency: shop.currency,
        contactName: state.checkout.name ?? customer.name,
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
          create: { status: "PENDING", message: "Commande passée via WhatsApp SalesBot" },
        },
      },
    });

    return {
      state: { ...emptyState(), shopId: shop.id, step: "browsing" },
      reply: `Commande confirmée.\n\nNuméro : *${order.orderNumber}*\nTotal : ${money(subtotal)}\n\n${shop.name} vous contactera pour la livraison. Merci !`,
    };
  }

  // --- Accès aux données -----------------------------------------------------

  private findShopById(id: string) {
    return this.prisma.shop.findFirst({
      where: { id, status: "ACTIVE" },
      select: { id: true, name: true, slug: true, currency: true },
    });
  }

  private findShopBySlug(slug: string) {
    return this.prisma.shop.findFirst({
      where: { slug, status: "ACTIVE" },
      select: { id: true, name: true, slug: true, currency: true },
    });
  }

  private upsertConversation(customerPhone: string, customerName: string) {
    return this.prisma.botConversation.upsert({
      where: { customerPhone },
      create: {
        customerPhone,
        customerName: customerName || null,
        state: emptyState() as unknown as object,
      },
      update: { ...(customerName ? { customerName } : {}), lastMessageAt: new Date() },
    });
  }

  private upsertCustomer(shopId: string, phone: string, name: string, city?: string) {
    return this.prisma.customer.upsert({
      where: { shopId_phone: { shopId, phone } },
      create: { shopId, phone, name, city: city ?? null },
      update: { name, ...(city ? { city } : {}) },
    });
  }

  // --- Utilitaires -----------------------------------------------------------

  private total(cart: CartItem[]): number {
    return cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
  }

  private shopHelp(shop: ShopRef): string {
    return `Tapez le numéro d'un produit pour l'ajouter au panier, *panier*, *commander*, ou *boutiques* pour changer de vendeur.\n_${shop.name}_`;
  }

  private parseState(raw: unknown): SalesbotState {
    if (!raw || typeof raw !== "object") return emptyState();
    return { ...emptyState(), ...(raw as Partial<SalesbotState>) };
  }

  private normalizePhone(phone?: string): string {
    const digits = (phone ?? "").replace(/\D/g, "");
    return digits ? `+${digits}` : "";
  }

  private async sendWhatsApp(to: string, text: string): Promise<void> {
    const token = this.config.get<string>("WHATSAPP_TOKEN");
    const phoneNumberId = this.config.get<string>("WHATSAPP_PHONE_NUMBER_ID");
    const version = this.config.get<string>("WHATSAPP_API_VERSION") ?? "v20.0";

    if (!token || !phoneNumberId) {
      this.logger.warn("WhatsApp non configuré — réponse enregistrée mais non envoyée.");
      return;
    }

    const res = await fetch(`https://graph.facebook.com/${version}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: to.replace(/\D/g, ""),
        type: "text",
        text: { body: text },
      }),
    });

    if (!res.ok) {
      this.logger.error(`WhatsApp API ${res.status}: ${await res.text()}`);
    }
  }
}
