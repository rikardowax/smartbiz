import { randomInt } from "node:crypto";

/**
 * Numéro de commande lisible par un commerçant au téléphone :
 * `SB-260910-4821`.
 */
export function generateOrderNumber(date = new Date()): string {
  const stamp = [
    date.getFullYear().toString().slice(-2),
    (date.getMonth() + 1).toString().padStart(2, "0"),
    date.getDate().toString().padStart(2, "0"),
  ].join("");
  return `SB-${stamp}-${randomInt(1000, 9999)}`;
}
