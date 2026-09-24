"use client";

import { Bell, BellRing, Loader2, Package, ShoppingBag } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

const TYPE_ICONS: Record<string, typeof Bell> = {
  NEW_ORDER: ShoppingBag,
  ORDER_STATUS: Package,
};

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export default function NotificationsPage() {
  const t = useTranslations("account");
  const tNotif = useTranslations("notifications");
  const locale = useLocale();
  const router = useRouter();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [pushState, setPushState] = useState<"off" | "on" | "denied" | "unsupported">("off");
  const [pushBusy, setPushBusy] = useState(false);

  useEffect(() => {
    apiFetch<AppNotification[]>("/notifications")
      .then(setNotifications)
      .catch(() => setNotifications([]))
      .finally(() => setLoading(false));
  }, []);

  // État courant de l'abonnement push sur cet appareil.
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setPushState("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setPushState("denied");
      return;
    }
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setPushState(sub ? "on" : "off"))
      .catch(() => setPushState("off"));
  }, []);

  const togglePush = async () => {
    setPushBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();

      if (existing) {
        await apiFetch("/notifications/push/subscribe", {
          method: "DELETE",
          body: JSON.stringify({ endpoint: existing.endpoint }),
        });
        await existing.unsubscribe();
        setPushState("off");
        toast.success(tNotif("pushDisabled"));
        return;
      }

      const { publicKey } = await apiFetch<{ publicKey: string | null }>(
        "/notifications/push/vapid-key",
      );
      if (!publicKey) throw new Error("no-key");

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      const json = sub.toJSON();
      await apiFetch("/notifications/push/subscribe", {
        method: "POST",
        body: JSON.stringify({ endpoint: sub.endpoint, keys: json.keys }),
      });
      setPushState("on");
      toast.success(tNotif("pushEnabled"));
    } catch {
      if (Notification.permission === "denied") setPushState("denied");
      toast.error(tNotif("pushError"));
    } finally {
      setPushBusy(false);
    }
  };

  const openNotification = async (notif: AppNotification) => {
    if (!notif.isRead) {
      setNotifications((prev) => prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n)));
      apiFetch(`/notifications/${notif.id}/read`, { method: "POST" }).catch(() => {});
    }
    if (notif.link) router.push(notif.link);
  };

  const markAllRead = useCallback(async () => {
    try {
      await apiFetch("/notifications/read-all", { method: "POST" });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {
      // ignore
    }
  }, []);

  const filtered = filter === "unread" ? notifications.filter((n) => !n.isRead) : notifications;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">{t("notificationsTitle")}</h1>
        {notifications.some((n) => !n.isRead) && (
          <Button variant="outline" size="sm" onClick={markAllRead}>
            {t("markAllRead")}
          </Button>
        )}
      </div>

      {/* Bascule notifications push */}
      {pushState !== "unsupported" && (
        <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-card p-4">
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
              pushState === "on" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
            )}
          >
            <BellRing className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-card-foreground">{tNotif("pushTitle")}</p>
            <p className="text-xs text-muted-foreground">
              {pushState === "denied" ? tNotif("pushDenied") : tNotif("pushDesc")}
            </p>
          </div>
          <Button
            variant={pushState === "on" ? "outline" : "default"}
            size="sm"
            onClick={togglePush}
            disabled={pushBusy || pushState === "denied"}
            className="shrink-0"
          >
            {pushBusy && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            {pushState === "on" ? tNotif("pushDisable") : tNotif("pushEnable")}
          </Button>
        </div>
      )}

      <div className="flex gap-2">
        <Button
          variant={filter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("all")}
        >
          {t("allNotifications")}
        </Button>
        <Button
          variant={filter === "unread" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("unread")}
        >
          {t("unreadOnly")}
        </Button>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border/60 bg-card p-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Bell className="h-8 w-8 text-primary" />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-card-foreground">
            {t("noNotifications")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("noNotificationsDesc")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((notif) => {
            const Icon = TYPE_ICONS[notif.type] ?? Bell;
            return (
              <button
                type="button"
                key={notif.id}
                onClick={() => openNotification(notif)}
                className={cn(
                  "w-full rounded-lg border border-border/60 bg-card p-4 text-left transition-colors",
                  !notif.isRead && "border-primary/20 bg-primary/5",
                  notif.link && "hover:border-primary/40",
                )}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                      notif.isRead
                        ? "bg-muted text-muted-foreground"
                        : "bg-primary/10 text-primary",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-sm font-semibold text-card-foreground">{notif.title}</h3>
                      {!notif.isRead && (
                        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                      )}
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">{notif.body}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {new Date(notif.createdAt).toLocaleString(locale, {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
