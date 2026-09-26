# SmartBiz — Documentation technique

> Guide de compréhension du projet pour tout développeur qui débarque.
> Lecture : ~10 minutes.

## 1. C'est quoi ?

Une plateforme de commerce pour les commerçants africains, en 3 produits :

| Produit | Pour qui | Quoi |
|---|---|---|
| **Marketplace publique** | Acheteurs (avec ou sans compte) | Catalogue, recherche, boutiques, panier, commande, suivi |
| **ERP vendeur** | Commerçants | Produits, stock, commandes, clients, fournisseurs, finances, dashboard |
| **SalesBot WhatsApp** | Acheteurs WhatsApp | Commander par chat, machine à états déterministe |

Plus : assistants IA (Gemini) pour acheteur et vendeur, notifications push PWA, espace admin, bilingue FR/EN.

## 2. Vue d'ensemble

```
┌─────────────┐     ┌──────────────┐     ┌────────────┐
│  Next.js 16 │────▶│   NestJS 12  │────▶│ PostgreSQL │
│  (web :3001)│     │  (api :3000) │     │  (Prisma 7)│
└─────────────┘     └──────┬───────┘     └────────────┘
      PWA + i18n           │
                           ├──▶ WhatsApp (Meta Graph API)  ← SalesBot
                           ├──▶ Google Gemini             ← Assistants IA
                           └──▶ Web Push (VAPID)          ← Notifications PWA
```

Monorepo **pnpm workspaces** :

```
smartbiz/
├── apps/
│   ├── web/          # Next.js — tout le frontend (acheteur + vendeur + admin)
│   └── api/          # NestJS — toute la logique métier + Prisma
├── render.yaml       # blueprint déploiement Render
└── docs/ARCHITECTURE.md
```

## 3. Modèle de données (essentiel)

```
User ──┬── Shop ────┬── Product ──── OrderItem ── Order ── OrderEvent
       │            │       │                          └─── Transaction (finances)
       │            ├── StockMovement                     └─── Customer
       │            ├── Supplier
       │            └── ShopReview
       ├── Favorite (produit ♡)
       ├── Review (avis produit — achat livré requis)
       ├── Notification (+ PushSubscription pour le push)
       ├── RefreshToken, PasswordResetToken
       └── BotConversation / AssistantConversation (historiques IA)
```

Points clés :

- **Une commande = une seule boutique** — un panier multi-boutiques crée N commandes
- `OrderStatus` : `PENDING → CONFIRMED → PREPARING → SHIPPED → DELIVERED` (+`CANCELLED`)
- Le stock est **réservé à la commande** et **restitué à l'annulation** (transaction atomique)
- Avis : un seul par utilisateur par cible (upsert), uniquement après commande `DELIVERED`
- `ratingAverage`/`ratingCount` dénormalisés sur Product et Shop (mis à jour à chaque avis)

## 4. Frontend (`apps/web`)

| Dossier | Contenu |
|---|---|
| `src/app/[locale]/` | Toutes les pages, préfixées `/fr` ou `/en` |
| `src/components/` | UI réutilisable (cartes, formulaires, header…) |
| `src/stores/` | Zustand persistés : `auth`, `cart`, `favorites` |
| `src/lib/api.ts` | `apiFetch()` — fetch avec refresh-token automatique |
| `src/i18n/` | `routing.ts` (fr/en), `navigation.ts` (Link/router localisés) |
| `src/middleware.ts` | next-intl — résout la locale depuis l'URL |
| `messages/` | `fr.json` + `en.json` — toutes les chaînes |
| `public/sw.js` | Service worker (cache + push handlers) |

Règles maison :

- **Toujours** `Link`/`useRouter` de `@/i18n/navigation` — jamais `next/link` direct
- Chaînes via `useTranslations(ns)` — les clés manquantes font crasher la page en dev
- Routes : marketplace/public · `/account/*` (acheteur) · `/dashboard/*` (ERP) · `/admin/*`

## 5. Backend (`apps/api`)

Un module NestJS par domaine dans `src/modules/` :

```
auth        → JWT access+refresh, Google OAuth, reset mot de passe
products    → /catalog/* public + /shops/:id/products vendeur (upload images)
shops       → CRUD boutique, avis boutique, public/:slug
orders      → checkout, cycle de vie, suivi public, ventes manuelles
favorites   → ♡ toggle + liste
stock       → mouvements IN/OUT/RETURN, alertes, valorisation
partners    → customers + suppliers
finance     → transactions, résumé financier
dashboard   → stats vendeur + admin
notifications → in-app + Web Push (VAPID)
salesbot    → webhook WhatsApp (machine à états)
assistant   → chat Gemini (buyer + seller)
admin       → gestion users/shops/products
categories  → arborescence catalogue
```

Sécurité — trois niveaux via guards globaux :

| Niveau | Mécanisme |
|---|---|
| `@Public()` | Accès libre **avec auth optionnelle** (`req.user` peuplé si token valide) |
| Défaut | JWT obligatoire |
| `@Roles(ADMIN)` | + rôle ; `@UseGuards(ShopAccessGuard)` pour les routes `/shops/:id/*` |

## 6. Parcours clés

**Acheteur invité** : marketplace → panier (localStorage) → checkout **sans compte** → confirmation avec n° `SB-…` + bouton « Régler sur WhatsApp » du vendeur → suivi public sur `/track` (n° + téléphone).

**Acheteur connecté** : idem + historique `/account/orders`, favoris, avis après livraison, notifications.

**Vendeur** : `/become-seller` → boutique → ERP `/dashboard/*` → notification `NEW_ORDER` (+ push) à chaque commande → changements de statut → notifications acheteur.

**WhatsApp SalesBot** : `boutique:slug` (deep-link) ou `menu` → choix boutique → produits → panier → `commander` → nom/ville/adresse → `confirmer` → vraie `Order` (canal `WHATSAPP`).

## 7. API — carte rapide

Préfixe `/api/v1`. Swagger : `http://localhost:3000/api/v1/docs`.

```
PUBLIC     GET /catalog/products|highlights|categories
           GET /shops/public*    POST /orders/checkout|track
           POST /assistant/buyer/chat    GET /notifications/push/vapid-key
AUTH       POST /auth/login|register|google|refresh|forgot|reset-password
ACHETEUR   GET /orders/mine    /favorites*    POST …/reviews
           GET/POST /notifications*    POST /shops (devenir vendeur)
VENDEUR    /shops/:id/{dashboard,products,orders,customers,suppliers,
                     finance,stock}/*    POST /assistant/chat
ADMIN      /admin/{stats,trend,activity,users,shops,products}
WEBHOOK    GET|POST /webhooks/whatsapp
```

## 8. Configuration (.env)

| Variable | Où | Rôle |
|---|---|---|
| `DATABASE_URL` | api | PostgreSQL |
| `JWT_ACCESS/REFRESH_SECRET` | api | tokens |
| `GEMINI_API_KEY` | api | assistants IA |
| `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN` | api | SalesBot |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | api | push web |
| `NEXT_PUBLIC_API_URL` | web | proxy API (rewrites `/api/*` → api) |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | web | bouton Google |
| `NEXT_PUBLIC_WHATSAPP_BOT_NUMBER` | web | bouton « Commander via SalesBot » |

Sans WhatsApp/Gemini/VAPID, l'app tourne quand même — ces fonctions se désactivent proprement.

## 9. Commandes

```bash
pnpm dev                              # api + web en parallèle
pnpm --filter @smartbiz/api db:seed   # données de démo COMPLETES (destructif)
pnpm --filter @smartbiz/api exec tsx prisma/reseed-products.ts  # produits seuls (safe)
pnpm typecheck && pnpm exec biome check apps/   # vérifs avant commit
```

Comptes démo (seed) : `+237699000000` admin, `+237699000001` vendeur, `+237699000003` acheteur — mdp `SmartBiz2026`.

## 10. Déploiement

- **Render** : `render.yaml` provisionne PostgreSQL + `smartbiz-api` + `smartbiz-web`. Migrations auto via `start:render = prisma migrate deploy && node dist/main`.
- **Cloudflare Worker** : proxy custom en amont (domaine `*.workers.dev`).
- À renseigner en env Render : toutes les variables du tableau §8.
