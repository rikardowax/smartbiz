/** Montants en francs CFA, groupés par milliers et sans décimales. */
export function formatPrice(amount: number) {
  return `${amount.toLocaleString("fr-FR")} FCFA`;
}

/** Pourcentage de remise entre le prix barré et le prix de vente. */
export function discountPercent(price: number, compareAtPrice: number | null) {
  if (!compareAtPrice || compareAtPrice <= price) return 0;
  return Math.round(((compareAtPrice - price) / compareAtPrice) * 100);
}

/** Compteurs de ventes et d'avis : 1 240 devient 1,2k pour tenir sur une ligne. */
export function formatCompact(value: number) {
  if (value < 1000) return value.toString();
  return `${(value / 1000).toFixed(value < 10_000 ? 1 : 0).replace(".0", "")}k`;
}
