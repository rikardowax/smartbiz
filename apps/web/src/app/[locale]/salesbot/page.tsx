"use client";

import { Bot, Send, ShoppingCart, Store, User } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "@/i18n/navigation";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";

interface Product {
  id: string;
  name: string;
  price: number;
  unit: string;
  stockQuantity: number;
}

interface CartItem {
  product: Product;
  quantity: number;
}

interface BotAction {
  label: string;
  value: string;
  payload?: string;
}

interface Message {
  id: string;
  role: "user" | "bot";
  text: string;
  actions?: BotAction[];
}

type Step =
  | "idle"
  | "browsing"
  | "cart"
  | "checkout_name"
  | "checkout_phone"
  | "checkout_city"
  | "checkout_address"
  | "confirm"
  | "done";

interface Checkout {
  name: string;
  phone: string;
  city: string;
  address: string;
}

export default function SalesBotPage() {
  const t = useTranslations("salesbot");
  const { user } = useAuthStore();
  const isSeller = user?.role === "VENDEUR" || user?.role === "ADMIN";
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>(() => [
    {
      id: crypto.randomUUID(),
      role: "bot",
      text: t("welcome"),
      actions: [
        { label: t("catalogue"), value: "catalogue" },
        { label: t("cart"), value: "cart" },
        { label: t("order"), value: "order" },
      ],
    },
  ]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [step, setStep] = useState<Step>("idle");
  const [checkout, setCheckout] = useState<Checkout>({
    name: "",
    phone: "",
    city: "",
    address: "",
  });
  const [lastProducts, setLastProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const sendBot = (text: string, actions?: BotAction[]) => {
    setMessages((m) => [...m, { id: crypto.randomUUID(), role: "bot", text, actions }]);
  };

  const sendUser = (text: string) => {
    setMessages((m) => [...m, { id: crypto.randomUUID(), role: "user", text }]);
    setInput("");
  };

  const cartTotal = () => cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  const addToCart = (product: Product) => {
    setCart((c) => {
      const existing = c.find((i) => i.product.id === product.id);
      if (existing) {
        return c.map((i) => (i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...c, { product, quantity: 1 }];
    });
    sendBot(t("addedToCart", { name: product.name }), [
      { label: t("catalogue"), value: "catalogue" },
      { label: t("cart"), value: "cart" },
    ]);
    setStep("browsing");
  };

  const showCart = () => {
    if (cart.length === 0) {
      sendBot(t("emptyCart"), [{ label: t("catalogue"), value: "catalogue" }]);
      setStep("idle");
      return;
    }
    const items = cart.map((item) => `• ${item.product.name} x${item.quantity}`).join("\n");
    const total = cartTotal();
    sendBot(`${items}\n${t("cartTotal", { total })}`, [
      { label: t("order"), value: "order" },
      { label: t("catalogue"), value: "catalogue" },
    ]);
    setStep("cart");
  };

  const loadProducts = async (search = "") => {
    setLoading(true);
    try {
      const res = await apiFetch<{ items: Product[] }>(
        `/catalog/products?limit=5&search=${encodeURIComponent(search)}`,
      );
      const products = res.items || [];
      setLastProducts(products);
      if (products.length === 0) {
        sendBot(t("noProducts"), [{ label: t("catalogue"), value: "catalogue" }]);
      } else {
        const list = products
          .map((p, i) => `${i + 1}. ${p.name} — ${p.price.toLocaleString()} FCFA/${p.unit}`)
          .join("\n");
        const actions: BotAction[] = products.map((p, i) => ({
          label: `${t("add")} ${i + 1}`,
          value: "add",
          payload: p.id,
        }));
        actions.push({ label: t("cart"), value: "cart" });
        sendBot(`${list}\n\n${t("chooseProduct")}`, actions);
      }
      setStep("browsing");
    } catch (err: unknown) {
      sendBot(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  const startCheckout = () => {
    if (cart.length === 0) {
      sendBot(t("emptyCart"), [{ label: t("catalogue"), value: "catalogue" }]);
      return;
    }
    setCheckout({ name: "", phone: "", city: "", address: "" });
    sendBot(t("askName"));
    setStep("checkout_name");
  };

  const processCheckout = (text: string) => {
    const next = (field: keyof Checkout, nextStep: Step, prompt: string) => {
      setCheckout((c) => ({ ...c, [field]: text }));
      sendBot(prompt);
      setStep(nextStep);
    };

    switch (step) {
      case "checkout_name":
        next("name", "checkout_phone", t("askPhone"));
        break;
      case "checkout_phone":
        next("phone", "checkout_city", t("askCity"));
        break;
      case "checkout_city":
        next("city", "checkout_address", t("askAddress"));
        break;
      case "checkout_address": {
        const updated = { ...checkout, address: text };
        setCheckout(updated);
        const total = cartTotal();
        const summary = `\n${updated.name}\n${updated.phone}\n${updated.city}\n${updated.address}\n${t("cartTotal", { total })}`;
        sendBot(summary, [
          { label: t("confirmOrder"), value: "confirm" },
          { label: t("cancelOrder"), value: "cancel" },
        ]);
        setStep("confirm");
        break;
      }
      default:
        break;
    }
  };

  const confirmOrder = () => {
    const total = cartTotal();
    sendBot(t("confirmed", { total }));
    setCart([]);
    setStep("done");
    setCheckout({ name: "", phone: "", city: "", address: "" });
  };

  const handleAction = (value: string, payload?: string) => {
    switch (value) {
      case "catalogue":
        loadProducts();
        break;
      case "cart":
        showCart();
        break;
      case "order":
        startCheckout();
        break;
      case "add":
        if (payload) {
          const product = lastProducts.find((p) => p.id === payload);
          if (product) addToCart(product);
        }
        break;
      case "confirm":
        confirmOrder();
        break;
      case "cancel":
        setStep("idle");
        sendBot(t("welcome"), [
          { label: t("catalogue"), value: "catalogue" },
          { label: t("cart"), value: "cart" },
        ]);
        break;
      default:
        break;
    }
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text) return;
    sendUser(text);

    if (step.startsWith("checkout_")) {
      processCheckout(text);
      return;
    }

    if (step === "confirm" || step === "done") {
      if (text.toLowerCase() === t("confirmOrder").toLowerCase()) {
        confirmOrder();
      } else {
        setStep("idle");
        sendBot(t("welcome"), [
          { label: t("catalogue"), value: "catalogue" },
          { label: t("cart"), value: "cart" },
        ]);
      }
      return;
    }

    const normalized = text.toLowerCase();
    if (normalized.match(/^(catalogue|catalog|produits?|products?)$/)) {
      loadProducts();
    } else if (normalized.match(/^(panier|cart)$/)) {
      showCart();
    } else if (normalized.match(/^(commander|order)$/)) {
      startCheckout();
    } else if (/^\d+$/.test(normalized) && lastProducts.length > 0) {
      const index = Number.parseInt(normalized, 10) - 1;
      const product = lastProducts[index];
      if (product) {
        addToCart(product);
      } else {
        sendBot(t("noProducts"));
      }
    } else {
      await loadProducts(text);
    }
  };

  if (!isSeller) {
    return (
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-2xl flex-col items-center justify-center px-4 text-center">
        <Store className="h-16 w-16 text-muted-foreground" />
        <h1 className="mt-4 text-2xl font-bold text-foreground">{t("sellerOnly")}</h1>
        <p className="mt-2 text-muted-foreground">{t("createShopToUseSalesBot")}</p>
        <Button asChild className="mt-6">
          <Link href="/dashboard">{t("openDashboard")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-3xl flex-col bg-background p-4 sm:p-6">
      <div className="flex items-center gap-3 rounded-t-2xl bg-[#075E54] p-4 text-white dark:bg-[#128C7E]">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
          <Bot className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-semibold">{t("title")}</h1>
          <p className="text-xs opacity-90">{t("online")}</p>
        </div>
        <div className="ml-auto">
          <ShoppingCart className="h-5 w-5 opacity-80" />
          {cart.length > 0 && (
            <span className="absolute right-5 top-20 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold">
              {cart.length}
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto bg-[#E5DDD5] p-4 dark:bg-[#0B141A]">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
          >
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {msg.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
            </div>
            <div className="max-w-[80%]">
              <div
                className={`whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-card-foreground"
                }`}
              >
                {msg.text}
              </div>
              {msg.actions && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {msg.actions.map((action) => (
                    <button
                      type="button"
                      key={`${action.value}-${action.payload ?? action.label}`}
                      onClick={() => handleAction(action.value, action.payload)}
                      className="rounded-full bg-card px-3 py-1 text-xs font-medium text-card-foreground shadow-sm transition hover:bg-primary hover:text-primary-foreground"
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="rounded-b-2xl bg-[#F0F2F5] p-3 dark:bg-[#1F2C34]">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder={t("placeholder")}
            className="flex-1 bg-white dark:bg-[#2A3942]"
          />
          <Button onClick={handleSend} disabled={loading}>
            {loading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
