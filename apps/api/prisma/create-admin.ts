import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import * as bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { Role } from "../src/generated/prisma/enums.js";

/**
 * Provisionne un compte administrateur, idempotent :
 *   - le compte existe déjà → promu ADMIN et réactivé ;
 *   - sinon → créé avec le mot de passe fourni.
 *
 * Usage :
 *   pnpm db:admin
 *   ADMIN_PHONE=+2376XXXXXXXX ADMIN_PASSWORD=secret pnpm db:admin
 *
 * Sur Render : Shell du service smartbiz-api, puis la même commande.
 */
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL as string }),
});

const phone = (process.env.ADMIN_PHONE ?? "+237699000000").replace(/[\s().-]/g, "");
const email = process.env.ADMIN_EMAIL?.toLowerCase() || "admin@smartbiz.cm";
const password = process.env.ADMIN_PASSWORD ?? "SmartBiz2026";
const firstName = process.env.ADMIN_FIRSTNAME ?? "Admin";
const lastName = process.env.ADMIN_LASTNAME ?? "SmartBiz";

async function main() {
  // La recherche n'utilise que les identifiants explicitement fournis :
  // sinon ADMIN_PHONE=X promouvrait quand même l'admin par défaut via
  // l'e-mail par défaut, ce qui modifierait le mauvais compte.
  const lookup = [
    ...(process.env.ADMIN_PHONE ? [{ phone }] : []),
    ...(process.env.ADMIN_EMAIL ? [{ email }] : []),
  ];
  if (lookup.length === 0) lookup.push({ phone }, { email });

  const existing = await prisma.user.findFirst({ where: { OR: lookup } });

  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: { role: Role.ADMIN, isActive: true },
    });
    console.log(`✅ ${existing.firstName} ${existing.lastName} (${existing.phone}) promu ADMIN`);
  } else {
    await prisma.user.create({
      data: {
        phone,
        email,
        firstName,
        lastName,
        passwordHash: await bcrypt.hash(password, 12),
        role: Role.ADMIN,
      },
    });
    console.log(`✅ Compte administrateur créé : ${phone} / ${email}`);
  }

  if (password === "SmartBiz2026") {
    console.log("⚠️  Mot de passe par défaut utilisé — changez-le depuis /account/settings");
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
