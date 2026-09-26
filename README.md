# SmartBiz

Marketplace et ERP intelligent pour les commerçants africains.

> **Nouveau sur le projet ?** Lisez [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) —
> vue d'ensemble, modèle de données, parcours utilisateurs, carte des API et configuration.

## Stack

- **Backend** : NestJS 12, Prisma 7, PostgreSQL 16, JWT, RBAC
- **Frontend** : Next.js 16, React 19, Tailwind CSS 4, next-intl
- **IA** : Google Gemini (`@google/genai`)
- **PWA** : manifest + service worker
- **Déploiement** : Render (blueprint `render.yaml`)

## Prérequis

- Node.js >= 22
- pnpm 10+ (via Corepack)
- PostgreSQL 16+ ou instance gérée Render

## Installation locale

```bash
corepack enable
corepack prepare pnpm@10.33.0 --activate
pnpm install
```

## Configuration

1. **Base de données**

   ```bash
   # Copiez l'exemple et ajustez
   cp apps/api/.env.example apps/api/.env
   ```

   Le `DATABASE_URL` local pointe déjà vers `127.0.0.1:5433/smartbiz`.

2. **Migrations et seed**

   ```bash
   pnpm --filter @smartbiz/api db:deploy
   pnpm --filter @smartbiz/api db:seed
   ```

3. **Variables d'environnement**

   Dans `apps/api/.env` :

   - `GEMINI_API_KEY` : clé Google AI Studio
   - `GOOGLE_CLIENT_ID` : pour la connexion Google (optionnel)
   - `WHATSAPP_TOKEN` / `WHATSAPP_PHONE_NUMBER_ID` : SalesBot WhatsApp (optionnel)

   Pour le web, créez `apps/web/.env.local` avec :

   - `NEXT_PUBLIC_GOOGLE_CLIENT_ID` : identique à `GOOGLE_CLIENT_ID`
   - `NEXT_PUBLIC_API_URL` : `http://localhost:3000` en local
   - `NEXT_PUBLIC_WHATSAPP_BOT_NUMBER` : numéro du SalesBot, ex. `+237651385391`

## SalesBot WhatsApp

La plateforme utilise **un seul numéro WhatsApp** pour toutes les boutiques.
Le bot identifie la boutique de trois façons :

1. **Lien profond** — les boutons « Commander sur WhatsApp » du site ouvrent
   WhatsApp avec `boutique:<slug>` prérempli.
2. **Menu** — un client qui écrit `menu` reçoit la liste des boutiques et
   répond par un numéro.
3. **Recherche par nom** — le client peut taper le nom de la boutique.

La boutique en cours est mémorisée dans `bot_conversations.state`. Changer de
boutique vide le panier : une commande ne mélange pas plusieurs vendeurs.

Webhook à déclarer dans Meta :

```
https://<domaine-api>/api/v1/webhooks/whatsapp
```

## Démarrage

```bash
pnpm dev
```

- API : `http://localhost:3000/api/v1`
- Swagger : `http://localhost:3000/api/v1/docs`
- Web : `http://localhost:3001`

## Fonctionnalités

- Authentification (email/téléphone, Google)
- Rôles acheteur / vendeur
- Marketplace public
- ERP vendeur (produits, stock, commandes, clients, fournisseurs, finances)
- Tableau de bord vendeur avec indicateurs et graphiques
- Smart Assistant Gemini avec function calling
- Simulateur WhatsApp SalesBot
- PWA installable

## Déploiement Render

1. Créez un Blueprint Render et pointez vers ce dépôt.
2. `render.yaml` provisionne automatiquement :
   - la base PostgreSQL
   - le service API `smartbiz-api`
   - le service web `smartbiz-web`
3. Renseignez les variables d'environnement sensibles dans le dashboard Render :
   - `GEMINI_API_KEY`
   - `GOOGLE_CLIENT_ID` / `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
   - `NEXT_PUBLIC_API_URL` (URL du service API)
4. Déployez.

## Comptes de démonstration

Les seeds créent des utilisateurs et boutiques de test. Consultez `apps/api/prisma/seed.ts` pour les identifiants.
