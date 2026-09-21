"use client";

import { Loader2, User } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api";
import { type User as UserType, useAuthStore } from "@/stores/auth-store";

export default function ProfilePage() {
  const t = useTranslations("account");
  const { user, setUser } = useAuthStore();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [_city, _setCity] = useState("");

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName ?? "");
      setLastName(user.lastName ?? "");
      setEmail(user.email ?? "");
    }
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await apiFetch<UserType>("/auth/me", {
        method: "PATCH",
        body: JSON.stringify({ firstName, lastName, email: email || undefined }),
      });
      setUser(updated);
      setEditing(false);
      toast.success(t("profileUpdated"));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("error"));
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  const initials = `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">{t("profileTitle")}</h1>

      <div className="rounded-xl border border-border/60 bg-card p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
            {initials || <User className="h-8 w-8" />}
          </div>
          <div>
            <h2 className="text-xl font-semibold text-card-foreground">
              {user.firstName} {user.lastName}
            </h2>
            <p className="text-sm text-muted-foreground">{user.phone}</p>
            {user.email && <p className="text-sm text-muted-foreground">{user.email}</p>}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border/60 bg-card p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-card-foreground">{t("personalInfo")}</h3>
          {!editing && (
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              {t("edit")}
            </Button>
          )}
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <Label>{t("firstName")}</Label>
            {editing ? (
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            ) : (
              <p className="mt-1 text-sm text-foreground">{user.firstName}</p>
            )}
          </div>
          <div>
            <Label>{t("lastName")}</Label>
            {editing ? (
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
            ) : (
              <p className="mt-1 text-sm text-foreground">{user.lastName}</p>
            )}
          </div>
          <div>
            <Label>{t("phone")}</Label>
            <p className="mt-1 text-sm text-foreground">{user.phone}</p>
          </div>
          <div>
            <Label>{t("emailLabel")}</Label>
            {editing ? (
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            ) : (
              <p className="mt-1 text-sm text-foreground">{user.email || "-"}</p>
            )}
          </div>
        </div>

        {editing && (
          <div className="mt-4 flex gap-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("save")}
            </Button>
            <Button variant="outline" onClick={() => setEditing(false)}>
              {t("cancel")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
