import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import webpush from "web-push";
import type { AppConfig } from "../../config/configuration.js";
import { PrismaService } from "../../prisma/prisma.service.js";

interface NotifyInput {
  type: string;
  title: string;
  body: string;
  link?: string;
}

interface PushKeys {
  p256dh: string;
  auth: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly vapidConfigured: boolean;
  private readonly vapidPublicKey: string;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService<AppConfig, true>,
  ) {
    const vapid = config.get("vapid", { infer: true });
    this.vapidConfigured = Boolean(vapid.publicKey && vapid.privateKey);
    this.vapidPublicKey = vapid.publicKey;
    if (this.vapidConfigured) {
      webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);
    } else {
      this.logger.warn("Clés VAPID absentes — les notifications push sont désactivées");
    }
  }

  // --- Centre de notifications -------------------------------------------------

  list(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  unreadCount(userId: string) {
    return this.prisma.notification.count({ where: { userId, isRead: false } });
  }

  async markRead(userId: string, id: string) {
    await this.prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
    return { success: true };
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    return { success: true };
  }

  // --- Push web ----------------------------------------------------------------

  getVapidPublicKey() {
    return { publicKey: this.vapidConfigured ? this.vapidPublicKey : null };
  }

  async saveSubscription(userId: string, endpoint: string, keys: PushKeys) {
    await this.prisma.pushSubscription.upsert({
      where: { endpoint },
      create: { userId, endpoint, keys: keys as object },
      update: { userId, keys: keys as object },
    });
    return { success: true };
  }

  async removeSubscription(userId: string, endpoint: string) {
    await this.prisma.pushSubscription.deleteMany({ where: { userId, endpoint } });
    return { success: true };
  }

  /** Crée la notification in-app puis tente l'envoi push à tous les appareils. */
  async notify(userId: string, input: NotifyInput) {
    const notification = await this.prisma.notification.create({
      data: { userId, ...input },
    });
    this.sendPushToUser(userId, input).catch((err: unknown) =>
      this.logger.warn(`Push non envoyé : ${err instanceof Error ? err.message : err}`),
    );
    return notification;
  }

  /** Push seul — utile quand la notification est déjà créée dans une transaction. */
  async sendPushToUser(userId: string, input: NotifyInput) {
    if (!this.vapidConfigured) return;

    const subscriptions = await this.prisma.pushSubscription.findMany({
      where: { userId },
    });

    const payload = JSON.stringify({
      title: input.title,
      body: input.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      url: input.link ?? "/",
    });

    const stale: string[] = [];
    await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: sub.keys as unknown as PushKeys },
            payload,
          );
        } catch (err) {
          const status = (err as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) stale.push(sub.id);
          else throw err;
        }
      }),
    );

    // Les endpoints expirés sont nettoyés pour ne pas s'accumuler.
    if (stale.length) {
      await this.prisma.pushSubscription.deleteMany({ where: { id: { in: stale } } });
    }
  }
}
