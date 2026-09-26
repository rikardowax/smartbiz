# SmartBiz — Guide complet : l'app et le code

Document de référence : chaque fonctionnalité est expliquée **côté utilisateur** puis **côté code** (fichiers, endpoints, tables). Après lecture, vous savez utiliser l'app et retrouver n'importe quel comportement dans le code.

---

## 🗺️ Carte générale

```
apps/
├── api/    NestJS 12 + Prisma 7 + PostgreSQL     →  http://localhost:3000/api/v1
└── web/    Next.js 16 + React 19 + Tailwind 4     →  http://localhost:3001
```

| Couche | Technologie | Fichiers clés |
|---|---|---|
| Base de données | PostgreSQL via Prisma | `apps/api/prisma/schema.prisma` (23 modèles) |
| Backend | NestJS, 14 modules métier | `apps/api/src/modules/` |
| Frontend | Next.js App Router | `apps/web/src/app/[locale]/` |
| État client | Zustand (panier, auth) | `apps/web/src/lib/store.ts` |
| Appels API | `apiFetch` + refresh JWT auto | `apps/web/src/lib/api.ts` |
| i18n | `next-intl`, FR/EN | `apps/web/messages/{fr,en}.json` |
| Docs API | Swagger auto-généré | `http://localhost:3000/api/v1/docs` |

**Convention importante :** toutes les routes frontend sont sous `/[locale]/` → `/fr/...` ou `/en/...`. Tous les liens internes doivent utiliser `Link` depuis `@/i18n/navigation`.

---

## 🔐 1. Comptes & authentification

### Utilisateur
- Inscription : `/register` — téléphone ou email + mot de passe, ou Google
- Connexion : `/login` — les deux pages partagent une carte animée
- Mot de passe oublié : `/forgot-password` → lien → `/reset-password`
- Une fois connecté, le menu Compte donne accès à : commandes, favoris, notifications, profil, paramètres

### Code
- **API** `modules/auth/` — login, register, refresh, Google OAuth, reset password
  - Tables : `User`, `RefreshToken`, `PasswordResetToken`, `Address`
  - Deux tokens JWT : access 15 min + refresh 30 jours
- **Web** `app/[locale]/{login,register}/` + `components/auth/`
- `JwtAuthGuard` = garde globale ; sur les routes `@Public()` il tente quand même de décoder le token → une route publique peut avoir un utilisateur connecté (ex : checkout invité ou connecté, même code)
- Rôles : `BUYER` → `SELLER` (après création de boutique) → `ADMIN`

---

## 🛍️ 2. Marketplace (acheteur)

### Utilisateur
- `/marketplace` : recherche plein texte + filtres (catégorie, ville, prix, note, tri)
- `/shops` : annuaire des boutiques ; `/shops/[slug]` : vitrine d'une boutique
- `/products/[shopSlug]/[productSlug]` : fiche produit — photos, prix, stock, avis, avis de la boutique
- Panier persistant (Zustand) multi-boutiques

### Code
- **Pages** `app/[locale]/{marketplace,shops,products}/`
- **Composants** `components/marketplace/`, `product-card.tsx`, `shop-card.tsx`, `rating-stars.tsx`
- **API** `modules/products/` et `modules/shops/` — endpoints publics de listing/détail
  - Tables : `Product`, `Shop`, `Category`
  - `POST /products/:id/view` compte les vues

---

## 🛒 3. Panier, checkout & commandes

### Utilisateur
1. Ajouts au panier (icône 🛒, badge compteur)
2. `/checkout` : nom, téléphone, ville, adresse + moyen de paiement
3. **Invité autorisé** — pas besoin de compte
4. Un panier multi-boutiques crée **une commande par boutique** (numéros `SB-…` séparés)
5. Confirmation : pour Mobile Money/virement/carte → bouton **« Régler sur WhatsApp »** vers le numéro du vendeur ; pour « à la livraison » → bouton de contact
6. Suivi : `/track` (numéro + téléphone, sans compte) ou Compte → Commandes

### Cycle de vie
`PENDING → CONFIRMED → PREPARING → SHIPPED → DELIVERED` (ou `CANCELLED`) — chaque transition est historisée dans `OrderEvent` et notifie l'acheteur.

### Code
- **Web** `app/[locale]/{cart,checkout,track}/` + `app/[locale]/account/orders/`
- **API** `modules/orders/`
  - `POST /orders/checkout` — `@Public()`, `buyerId: null` pour invités
  - `POST /orders/track` — public, numéro + téléphone
  - `GET /orders/mine`, `PATCH /orders/:id/cancel`, transitions vendeur
  - Tables : `Order`, `OrderItem`, `OrderEvent`
  - `channel` distingue `WEB` / `WHATSAPP` / `POS` (vente en direct)
  - Annulation → **restitution automatique du stock** (`StockMovement`)
  - Création → notification vendeur + push
- Numéro de commande : `common/utils/order-number.util.ts`

### Paiement WhatsApp direct
Le bouton `wa.me` utilise `shop.whatsappNumber` (fallback `shop.phone`). **Ne passe pas par le SalesBot** — c'est une conversation libre vendeur↔acheteur. Le vendeur gère son numéro dans `/dashboard/shops` → Modifier (`components/seller/edit-shop.tsx`, `PATCH /shops/:id`).

---

## ⭐ 4. Favoris & avis

### Utilisateur
- Cœur ♡ sur les cartes produit → Compte → Favoris (nécessite un compte ; réinitialisé à la déconnexion)
- Après une commande **livrée** : noter le produit (1–5 ★) et la boutique — avis garantis « achat vérifié »

### Code
- **Web** `favorite-button.tsx`, `review-form.tsx`, `app/[locale]/account/favorites/`
- **API** `modules/favorites/` ; les avis vivent dans `modules/products/` et `modules/shops/`
  - Tables : `Favorite`, `Review`, `ShopReview`
  - Règle métier : avis possible uniquement si commande `DELIVERED` contenant le produit/de la boutique

---

## 🔔 5. Notifications & PWA

### Utilisateur
- Cloche 🔔 dans le header : badge non lus, liste, « marquer lu »
- Compte → Notifications : bouton **Activer les push** → alertes navigateur même app fermée
- Installation app : Android (menu → Installer) / iOS (Partager → Écran d'accueil)

### Code
- **API** `modules/notifications/`
  - `GET /notifications`, `/unread-count`, `POST /:id/read`, `/read-all`
  - `POST /notifications/push/subscribe` + `GET .../public-key` (VAPID)
  - Tables : `Notification` (`isRead`), `PushSubscription`
  - Émetteurs : nouvelle commande → vendeur ; changement de statut → acheteur ; stock bas → vendeur
- **Web** `app/[locale]/account/notifications/`, badge dans `components/layout/`
- **Push** `apps/web/public/sw.js` — handlers `push` + `notificationclick` ; envoi via `web-push` côté API
- Env requises en prod : `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`

---

## 🏪 6. ERP vendeur (`/dashboard`)

### Utilisateur
- Onboarding : `/become-seller` → nom, ville, téléphone, **WhatsApp**, catégories → le compte passe `SELLER`
- Dashboard : ventes, revenus, commandes en attente, top produits, alertes stock
- **Produits** : CRUD complet, photos (`product-image-upload.tsx`), archivage
- **Commandes** : pipeline de statuts + « Nouvelle vente » (caisse/téléphone, channel `POS`)
- **Stock** : mouvements, seuils d'alerte, valeur
- **Clients/Fournisseurs** : le client est créé auto à la 1ʳᵉ commande
- **Finances** : recettes/dépenses par catégorie, solde
- **Mes boutiques** : modifier infos + numéro WhatsApp

### Code
- **Web** `app/[locale]/dashboard/*` + `components/seller/`
- **API** modules `dashboard` (stats agrégées), `products`, `orders`, `stock`, `partners` (customers + suppliers), `finance`, `shops`
  - Tables : `StockMovement`, `Customer`, `Supplier`, `Transaction`
  - Garde `ShopAccessGuard` : vérifie que la boutique appartient au vendeur avant toute mutation
- Commande `POS` saisie à la main → même pipeline stock/finances/notifications que le web

---

## 🤖 7. Assistants IA (Gemini)

### Utilisateur
- **Acheteur** : bulle flottante sur le marketplace — « trouve-moi des chaussures < 20 000 FCFA »
- **Vendeur** : bulle dans le dashboard — « quelles commandes en attente ? » — répond sur VOS données

### Code
- **Web** `buyer-assistant.tsx`, `floating-assistant.tsx`, `app/[locale]/assistant/`
- **API** `modules/assistant/` — appelle `@google/genai` avec des *tools* (recherche produits, stats boutique) ; le LLM invoque les fonctions puis rédige
  - Tables : `AssistantConversation`, `AssistantMessage`
- Env : `GEMINI_API_KEY`, `GEMINI_MODEL=gemini-2.5-flash` — sans clé, l'app tourne, seul l'assistant est muet

---

## 💬 8. SalesBot WhatsApp

### Utilisateur
Le client écrit au numéro central SmartBiz : « bonjour » → liste des boutiques → choix → recherche produits → « panier » → « commander » → nom/ville/adresse → « confirmer ». Les boutons « Commander via SalesBot » du site pré-remplissent `boutique:<slug>` pour sauter le choix de boutique.

### Code
- **API** `modules/salesbot/` — machine à états déterministe (pas d'IA)
  - `GET /webhooks/whatsapp` : handshake de vérification Meta (`hub.verify_token`)
  - `POST /webhooks/whatsapp` : messages entrants → `SalesbotService`
  - Tables : `BotConversation.state` (étape, boutique courante, panier, dernières listes), `BotMessage`
  - Réponses envoyées via Graph API `/{phoneNumberId}/messages`
  - Commandes créées avec `channel: WHATSAPP` → même pipeline Order/stock/notification
- **Web** `salesbot-link.tsx` génère `wa.me/<bot>?text=boutique:<slug>`
- Env : `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN` + `NEXT_PUBLIC_WHATSAPP_BOT_NUMBER` (sans elle, boutons cachés)
- Limites Meta : fenêtre 24 h pour réponses libres ; tokens de test expirent
- Setup complet : voir `docs/ARCHITECTURE.md` § SalesBot / le README

---

## 👑 9. Administration (`/admin`)

### Utilisateur
Vue d'ensemble (compteurs), modération utilisateurs (rôles, activation), boutiques (suspendre), produits (retirer), activité récente.

### Code
- **Web** `app/[locale]/admin/` + `components/admin/` — protégé rôle `ADMIN`
- **API** `modules/admin/` — `@Roles('ADMIN')` partout
- Compte admin : `apps/api/prisma/create-admin.ts`

---

## 🌍 10. Internationalisation & thème

- `next-intl` : routes `/fr/...` `/en/...` ; messages `messages/{fr,en}.json` — **chaque clé doit exister dans les 2 fichiers** (sinon crash dev)
- Dates/formatage via la locale active (`useLocale`)
- Messages WhatsApp générés côté web sont traduits par interpolation

---

## 🗄️ 11. Modèle de données (résumé)

```
User ─┬─ Shop ─── Product ─── OrderItem ─── Order ─── OrderEvent
      │            │    └── StockMovement     │
      │            ├── Review                 └── Customer (auto)
      │            └── Favorite
      ├── ShopReview
      ├── Transaction (finance)
      ├── Supplier
      ├── Notification, PushSubscription
      ├── RefreshToken, PasswordResetToken, Address
      └── AssistantConversation ─ AssistantMessage

BotConversation ─ BotMessage   (SalesBot, indépendant du compte)
```

Règles clés : commande **mono-boutique** · stock décrémenté à la commande, restitué à l'annulation · avis réservés aux commandes livrées · `Notification.isRead` (pas `read`).

---

## 🚀 12. Démarrer & déployer

```bash
pnpm install
cp apps/api/.env.example apps/api/.env   # remplir DATABASE_URL, JWT_*
pnpm --filter @smartbiz/api db:deploy    # migrations
pnpm --filter @smartbiz/api db:seed      # données démo (comptes, boutiques, produits)
pnpm --filter @smartbiz/api exec tsx prisma/reseed-products.ts  # produits seuls, non destructif
pnpm dev                                 # api :3000 + web :3001
```

Vérifs avant commit : `pnpm --filter @smartbiz/api typecheck`, `pnpm --filter @smartbiz/web typecheck`, `pnpm exec biome check <fichiers>`.

**Render** : `render.yaml` provisionne PostgreSQL + `smartbiz-api` + `smartbiz-web`. Secrets dans le dashboard Render (jamais dans le repo). L'API exécute `prisma migrate deploy` au démarrage (`start:render`).

---

## 📁 13. « Où est le code de… »

| Je cherche… | Fichier |
|---|---|
| Machine à états WhatsApp | `apps/api/src/modules/salesbot/salesbot.service.ts` |
| Checkout invité | `apps/web/src/app/[locale]/checkout/page.tsx` + `orders.controller.ts` |
| Boutons WhatsApp vendeur | `checkout/page.tsx`, `track/page.tsx` (`wa.me` builder) |
| Le robot des boutons site | `apps/web/src/components/salesbot-link.tsx` |
| Notifications push | `modules/notifications/` + `apps/web/public/sw.js` |
| Panier persistant | `apps/web/src/lib/store.ts` (Zustand) |
| Login/Google/refresh | `modules/auth/` |
| IA acheteur/vendeur | `modules/assistant/` |
| Schéma complet BDD | `apps/api/prisma/schema.prisma` |
| Toutes les routes API | `http://localhost:3000/api/v1/docs` |

*Guide rapide non-dev : `docs/GUIDE-UTILISATEUR.md` · Architecture condensée : `docs/ARCHITECTURE.md`*
