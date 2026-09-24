import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";

/**
 * Client Prisma pour les scripts hors Nest (seed, provisioning admin…).
 * Reprend la même configuration TLS que PrismaService : les certificats
 * managés de Render sont auto-signés, pg les rejetterait sinon.
 */
const connectionString = process.env.DATABASE_URL as string;
const isRemote = !/localhost|127\.0\.0\.1/.test(connectionString);

export const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString,
    ssl: isRemote ? { rejectUnauthorized: false } : undefined,
    connectionTimeoutMillis: 10_000,
  }),
});
