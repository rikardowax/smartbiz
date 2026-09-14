"use client";

import { HelpCircle, Loader2, Send, ShoppingBag, User, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";

interface Message {
  id: string;
  role: "user" | "assistant";
  text: string;
}

function playBeep() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  } catch {
    // ignore
  }
}

export function BuyerAssistant() {
  const t = useTranslations("buyerAssistant");
  const locale = useLocale();
  const { user } = useAuthStore();
  const isSeller = user?.role === "VENDEUR" || user?.role === "ADMIN";
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { id: crypto.randomUUID(), role: "assistant", text: t("greeting") },
  ]);
  const [loading, setLoading] = useState(false);
  const prevCount = useRef(messages.length);

  useEffect(() => {
    if (messages.length > prevCount.current) {
      const last = messages[messages.length - 1];
      if (last.role === "assistant") {
        playBeep();
        if (!open) {
          toast.info(t("newAssistantMessage"), {
            action: { label: t("openChat"), onClick: () => setOpen(true) },
          });
        }
      }
    }
    prevCount.current = messages.length;
  }, [messages, open, t]);

  if (isSeller) return null;

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setMessages((m) => [...m, { id: crypto.randomUUID(), role: "user", text }]);
    setLoading(true);
    try {
      const res = await apiFetch<{ text: string }>("/assistant/buyer/chat", {
        method: "POST",
        body: JSON.stringify({ message: text, locale }),
      });
      setMessages((m) => [...m, { id: crypto.randomUUID(), role: "assistant", text: res.text }]);
    } catch (err: unknown) {
      setMessages((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: err instanceof Error ? err.message : t("error"),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        size="icon"
        className="fixed bottom-4 right-4 z-50 h-14 w-14 rounded-full border-2 border-white/20 bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-xl ring-2 ring-blue-500/20 transition-all hover:scale-105 hover:opacity-95 active:scale-95"
        onClick={() => setOpen((s) => !s)}
        aria-label={t("title")}
      >
        {open ? <X className="h-6 w-6" /> : <ShoppingBag className="h-6 w-6" />}
      </Button>

      {open && (
        <div className="fixed bottom-20 right-4 z-50 flex w-80 flex-col rounded-2xl border border-border/60 bg-card p-4 shadow-2xl sm:w-96">
          <div className="mb-3 flex items-center gap-2 border-b border-border/60 pb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-white">
              <HelpCircle className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-semibold text-card-foreground">{t("title")}</h3>
              <p className="text-xs text-muted-foreground">{t("subtitle")}</p>
            </div>
          </div>

          <div className="flex h-80 flex-col gap-3 overflow-y-auto pr-1">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}
              >
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {m.role === "user" ? (
                    <User className="h-3.5 w-3.5" />
                  ) : (
                    <ShoppingBag className="h-3.5 w-3.5" />
                  )}
                </div>
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("thinking")}
              </div>
            )}
          </div>

          <div className="mt-3 flex gap-2 border-t border-border/60 pt-3">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder={t("placeholder")}
              className="flex-1"
            />
            <Button onClick={send} disabled={loading || !input.trim()} size="icon">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
