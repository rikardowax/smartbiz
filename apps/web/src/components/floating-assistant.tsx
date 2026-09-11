"use client";

import { Bot, Loader2, MessageSquare, Send, User, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";

interface Message {
  id: string;
  role: "user" | "assistant";
  text: string;
}

export function FloatingAssistant() {
  const t = useTranslations("assistant");
  const locale = useLocale();
  const { user } = useAuthStore();
  const isSeller = user?.role === "VENDEUR" || user?.role === "ADMIN";
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { id: crypto.randomUUID(), role: "assistant", text: t("greeting") },
  ]);
  const [loading, setLoading] = useState(false);

  if (!isSeller) return null;

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setMessages((m) => [...m, { id: crypto.randomUUID(), role: "user", text }]);
    setLoading(true);
    try {
      const res = await apiFetch<{ text: string }>("/assistant/chat", {
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
        className="fixed bottom-4 right-4 z-50 h-14 w-14 rounded-full shadow-lg"
        onClick={() => setOpen((s) => !s)}
        aria-label={t("title")}
      >
        {open ? <X className="h-6 w-6" /> : <MessageSquare className="h-6 w-6" />}
      </Button>

      {open && (
        <div className="fixed bottom-20 right-4 z-50 flex w-80 flex-col rounded-2xl border border-border/60 bg-card p-4 shadow-2xl sm:w-96">
          <div className="mb-3 flex items-center gap-2 border-b border-border/60 pb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Bot className="h-4 w-4" />
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
                    <Bot className="h-3.5 w-3.5" />
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
