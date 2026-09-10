#!/usr/bin/env bash
# Vérification de bout en bout des parcours métier de l'API SmartBiz.
# Prérequis : API démarrée et base alimentée par `pnpm db:seed`.
# Usage : ./scripts/smoke-api.sh [base_url]
set -euo pipefail

BASE="${1:-http://localhost:3000/api/v1}"
PASSWORD="SmartBiz2026"
PASS=0
FAIL=0

# Extrait une valeur d'une réponse JSON : jqp "['items'][0]['id']"
jqp() { python3 -c 'import sys,json;d=json.load(sys.stdin);print(eval(sys.argv[1]))' "d$1"; }

check() {
  local label="$1" expected="$2" actual="$3"
  if [ "$expected" = "$actual" ]; then
    printf '  \033[32m✓\033[0m %s\n' "$label"
    PASS=$((PASS + 1))
  else
    printf '  \033[31m✗\033[0m %s (attendu %s, obtenu %s)\n' "$label" "$expected" "$actual"
    FAIL=$((FAIL + 1))
  fi
}

status() { curl -s -o /dev/null -w '%{http_code}' "$@"; }

login() {
  curl -s -X POST "$BASE/auth/login" -H 'Content-Type: application/json' \
    -d "{\"identifier\":\"$1\",\"password\":\"$PASSWORD\"}" | jqp "['accessToken']"
}

echo "→ Santé et catalogue public"
check "santé de l'API" 200 "$(status "$BASE/health")"
check "catalogue accessible sans compte" 200 "$(status "$BASE/catalog/products?limit=5")"
check "catégories publiques" 200 "$(status "$BASE/categories")"
check "annuaire des boutiques" 200 "$(status "$BASE/shops/public")"
check "espace vendeur protégé" 401 "$(status "$BASE/shops/mine")"

echo "→ Authentification"
VENDEUR_TOKEN=$(login "+237699000001")
ACHETEUR_TOKEN=$(login "+237699000003")
check "connexion vendeuse" 200 "$(status "$BASE/auth/me" -H "Authorization: Bearer $VENDEUR_TOKEN")"
check "connexion acheteuse" 200 "$(status "$BASE/auth/me" -H "Authorization: Bearer $ACHETEUR_TOKEN")"

SHOP_ID=$(curl -s "$BASE/shops/mine" -H "Authorization: Bearer $VENDEUR_TOKEN" | jqp "[0]['id']")
# Première boutique de l'annuaire qui n'appartient pas à la vendeuse connectée.
OTHER_SHOP_ID=$(curl -s "$BASE/shops/public" | python3 -c 'import sys,json;print(next(s["id"] for s in json.load(sys.stdin)["items"] if s["id"] != sys.argv[1]))' "$SHOP_ID")
echo "  boutique de la vendeuse : $SHOP_ID"

echo "→ Cloisonnement des boutiques (RBAC)"
check "accès à sa boutique" 200 "$(status "$BASE/shops/$SHOP_ID/products" -H "Authorization: Bearer $VENDEUR_TOKEN")"
check "boutique d'un tiers refusée" 403 "$(status "$BASE/shops/$OTHER_SHOP_ID/products" -H "Authorization: Bearer $VENDEUR_TOKEN")"
check "acheteuse sans accès ERP" 403 "$(status "$BASE/shops/$SHOP_ID/products" -H "Authorization: Bearer $ACHETEUR_TOKEN")"
check "administration refusée au vendeur" 403 "$(status "$BASE/admin/dashboard/overview" -H "Authorization: Bearer $VENDEUR_TOKEN")"

echo "→ ERP : produit, stock, tableau de bord"
PRODUCT=$(curl -s -X POST "$BASE/shops/$SHOP_ID/products" \
  -H "Authorization: Bearer $VENDEUR_TOKEN" -H 'Content-Type: application/json' \
  -d '{"name":"Lait en poudre 400 g","price":3500,"costPrice":2800,"stockQuantity":10,"unit":"boîte"}')
PRODUCT_ID=$(echo "$PRODUCT" | jqp "['id']")
check "création de produit" true "$([ -n "$PRODUCT_ID" ] && echo true || echo false)"

check "prix barré incohérent rejeté" 400 "$(status -X POST "$BASE/shops/$SHOP_ID/products" \
  -H "Authorization: Bearer $VENDEUR_TOKEN" -H 'Content-Type: application/json' \
  -d '{"name":"Produit incoherent","price":5000,"compareAtPrice":4000}')"

check "entrée de stock" 201 "$(status -X POST "$BASE/shops/$SHOP_ID/stock/movements" \
  -H "Authorization: Bearer $VENDEUR_TOKEN" -H 'Content-Type: application/json' \
  -d "{\"productId\":\"$PRODUCT_ID\",\"type\":\"IN\",\"quantity\":15,\"unitCost\":2800,\"reason\":\"Réassort\"}")"

STOCK=$(curl -s "$BASE/shops/$SHOP_ID/products/$PRODUCT_ID" -H "Authorization: Bearer $VENDEUR_TOKEN" | jqp "['stockQuantity']")
check "stock cumulé après entrée" 25 "$STOCK"

check "sortie supérieure au stock refusée" 400 "$(status -X POST "$BASE/shops/$SHOP_ID/stock/movements" \
  -H "Authorization: Bearer $VENDEUR_TOKEN" -H 'Content-Type: application/json' \
  -d "{\"productId\":\"$PRODUCT_ID\",\"type\":\"OUT\",\"quantity\":999}")"

check "inventaire (ajustement)" 201 "$(status -X POST "$BASE/shops/$SHOP_ID/stock/movements" \
  -H "Authorization: Bearer $VENDEUR_TOKEN" -H 'Content-Type: application/json' \
  -d "{\"productId\":\"$PRODUCT_ID\",\"type\":\"ADJUSTMENT\",\"quantity\":20,\"reason\":\"Inventaire mensuel\"}")"
STOCK=$(curl -s "$BASE/shops/$SHOP_ID/products/$PRODUCT_ID" -H "Authorization: Bearer $VENDEUR_TOKEN" | jqp "['stockQuantity']")
check "stock aligné sur l'inventaire" 20 "$STOCK"

check "tableau de bord" 200 "$(status "$BASE/shops/$SHOP_ID/dashboard/overview" -H "Authorization: Bearer $VENDEUR_TOKEN")"
check "tendance des ventes" 200 "$(status "$BASE/shops/$SHOP_ID/dashboard/sales-trend?days=30" -H "Authorization: Bearer $VENDEUR_TOKEN")"
check "alertes de stock" 200 "$(status "$BASE/shops/$SHOP_ID/stock/alerts" -H "Authorization: Bearer $VENDEUR_TOKEN")"
check "synthèse financière" 200 "$(status "$BASE/shops/$SHOP_ID/finance/summary" -H "Authorization: Bearer $VENDEUR_TOKEN")"

echo "→ Marketplace : commande, réservation de stock, suivi"
CHECKOUT=$(curl -s -X POST "$BASE/orders/checkout" \
  -H "Authorization: Bearer $ACHETEUR_TOKEN" -H 'Content-Type: application/json' \
  -d "{\"items\":[{\"productId\":\"$PRODUCT_ID\",\"quantity\":3}],\"contactName\":\"Marie Fotso\",\"contactPhone\":\"+237699000003\",\"deliveryCity\":\"Yaoundé\",\"deliveryLine1\":\"Bastos\"}")
ORDER_ID=$(echo "$CHECKOUT" | jqp "['orders'][0]['id']")
ORDER_NUMBER=$(echo "$CHECKOUT" | jqp "['orders'][0]['orderNumber']")
check "passage de commande" true "$([ -n "$ORDER_ID" ] && echo true || echo false)"

STOCK=$(curl -s "$BASE/shops/$SHOP_ID/products/$PRODUCT_ID" -H "Authorization: Bearer $VENDEUR_TOKEN" | jqp "['stockQuantity']")
check "stock réservé par la commande" 17 "$STOCK"

check "commande au-delà du stock refusée" 400 "$(status -X POST "$BASE/orders/checkout" \
  -H "Authorization: Bearer $ACHETEUR_TOKEN" -H 'Content-Type: application/json' \
  -d "{\"items\":[{\"productId\":\"$PRODUCT_ID\",\"quantity\":9999}],\"contactName\":\"Marie\",\"contactPhone\":\"+237699000003\",\"deliveryCity\":\"Yaoundé\",\"deliveryLine1\":\"Bastos\"}")"

check "suivi public de la commande" 200 "$(status -X POST "$BASE/orders/track" -H 'Content-Type: application/json' \
  -d "{\"orderNumber\":\"$ORDER_NUMBER\",\"phone\":\"+237699000003\"}")"
check "suivi avec mauvais téléphone refusé" 404 "$(status -X POST "$BASE/orders/track" -H 'Content-Type: application/json' \
  -d "{\"orderNumber\":\"$ORDER_NUMBER\",\"phone\":\"+237600000000\"}")"

echo "→ Cycle de vie de la commande"
check "confirmation" 200 "$(status -X PATCH "$BASE/shops/$SHOP_ID/orders/$ORDER_ID/status" \
  -H "Authorization: Bearer $VENDEUR_TOKEN" -H 'Content-Type: application/json' -d '{"status":"CONFIRMED"}')"
check "transition interdite (CONFIRMED → DELIVERED)" 400 "$(status -X PATCH "$BASE/shops/$SHOP_ID/orders/$ORDER_ID/status" \
  -H "Authorization: Bearer $VENDEUR_TOKEN" -H 'Content-Type: application/json' -d '{"status":"DELIVERED"}')"
check "expédition" 200 "$(status -X PATCH "$BASE/shops/$SHOP_ID/orders/$ORDER_ID/status" \
  -H "Authorization: Bearer $VENDEUR_TOKEN" -H 'Content-Type: application/json' -d '{"status":"SHIPPED"}')"
check "encaissement" 200 "$(status -X PATCH "$BASE/shops/$SHOP_ID/orders/$ORDER_ID/payment" \
  -H "Authorization: Bearer $VENDEUR_TOKEN" -H 'Content-Type: application/json' -d '{"paymentStatus":"PAID","paymentMethod":"MOBILE_MONEY"}')"
check "livraison" 200 "$(status -X PATCH "$BASE/shops/$SHOP_ID/orders/$ORDER_ID/status" \
  -H "Authorization: Bearer $VENDEUR_TOKEN" -H 'Content-Type: application/json' -d '{"status":"DELIVERED"}')"
check "annulation impossible après livraison" 400 "$(status -X PATCH "$BASE/orders/$ORDER_ID/cancel" \
  -H "Authorization: Bearer $ACHETEUR_TOKEN" -H 'Content-Type: application/json' -d '{}')"

echo "→ Annulation et restitution du stock"
CHECKOUT2=$(curl -s -X POST "$BASE/orders/checkout" \
  -H "Authorization: Bearer $ACHETEUR_TOKEN" -H 'Content-Type: application/json' \
  -d "{\"items\":[{\"productId\":\"$PRODUCT_ID\",\"quantity\":2}],\"contactName\":\"Marie Fotso\",\"contactPhone\":\"+237699000003\",\"deliveryCity\":\"Yaoundé\",\"deliveryLine1\":\"Bastos\"}")
ORDER2_ID=$(echo "$CHECKOUT2" | jqp "['orders'][0]['id']")
STOCK_BEFORE=$(curl -s "$BASE/shops/$SHOP_ID/products/$PRODUCT_ID" -H "Authorization: Bearer $VENDEUR_TOKEN" | jqp "['stockQuantity']")
curl -s -X PATCH "$BASE/orders/$ORDER2_ID/cancel" -H "Authorization: Bearer $ACHETEUR_TOKEN" \
  -H 'Content-Type: application/json' -d '{"reason":"Erreur de quantité"}' > /dev/null
STOCK_AFTER=$(curl -s "$BASE/shops/$SHOP_ID/products/$PRODUCT_ID" -H "Authorization: Bearer $VENDEUR_TOKEN" | jqp "['stockQuantity']")
check "stock restitué après annulation" "$((STOCK_BEFORE + 2))" "$STOCK_AFTER"

echo "→ Nettoyage"
curl -s -X DELETE "$BASE/shops/$SHOP_ID/products/$PRODUCT_ID" -H "Authorization: Bearer $VENDEUR_TOKEN" > /dev/null

echo
printf '\033[1m%s réussis, %s échoués\033[0m\n' "$PASS" "$FAIL"
[ "$FAIL" -eq 0 ]
