import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from "@nestjs/common";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const connectionString = process.env.DATABASE_URL as string;
    const isRemote = !/localhost|127\.0\.0\.1/.test(connectionString);

    super({
      adapter: new PrismaPg({
        connectionString,
        // Render fournit des certificats gérés ; on garde le comportement
        // permissif seulement pour les connexions distantes managées.
        ssl: isRemote ? { rejectUnauthorized: false } : undefined,
        connectionTimeoutMillis: 10_000,
        max: Number.parseInt(process.env.DATABASE_POOL_MAX ?? "10", 10),
      }),
    });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log("Connexion à PostgreSQL établie");
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
