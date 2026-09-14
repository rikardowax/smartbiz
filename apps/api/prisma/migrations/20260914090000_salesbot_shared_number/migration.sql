-- Le SalesBot utilise désormais un numéro WhatsApp unique pour toute la
-- plateforme : une conversation est identifiée par le numéro du client, et la
-- boutique en cours devient optionnelle.

-- DropForeignKey
ALTER TABLE "bot_conversations" DROP CONSTRAINT "bot_conversations_shopId_fkey";

-- DropIndex
DROP INDEX "bot_conversations_shopId_customerPhone_key";

-- Une conversation par numéro client : on supprime les doublons éventuels en
-- conservant la plus récente.
DELETE FROM "bot_conversations" a
USING "bot_conversations" b
WHERE a."customerPhone" = b."customerPhone"
  AND (a."lastMessageAt" < b."lastMessageAt"
    OR (a."lastMessageAt" = b."lastMessageAt" AND a."id" < b."id"));

-- AlterTable
ALTER TABLE "bot_conversations" ALTER COLUMN "shopId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "bot_conversations_customerPhone_key" ON "bot_conversations"("customerPhone");

-- AddForeignKey
ALTER TABLE "bot_conversations" ADD CONSTRAINT "bot_conversations_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "shops"("id") ON DELETE SET NULL ON UPDATE CASCADE;
