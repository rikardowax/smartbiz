# SmartBiz — Guide utilisateur

Bienvenue sur SmartBiz, la plateforme qui connecte acheteurs et commerçants.
Ce guide s'adresse à **trois publics** : l'acheteur, le vendeur, l'administrateur.

---

## 🛍️ Partie 1 — Acheteur

### Naviguer sans compte

Vous pouvez tout faire **sans créer de compte** :

1. Ouvrez **Produits** (ou **Boutiques** pour choisir un commerçant d'abord)
2. Filtrez par catégorie, ville, prix, note — ou tapez un mot-clé
3. Cliquez sur un produit pour voir sa fiche : photos, prix, stock, avis clients
4. Appuyez sur **Ajouter** pour le mettre au panier

### Commander

1. Ouvrez le **panier** (icône 🛒 en haut) — ajustez les quantités ou supprimez
2. **Commander** → remplissez nom, téléphone, ville, adresse
3. Choisissez le moyen de paiement :
   - **À la livraison** — vous payez à la réception
   - **Mobile Money / Virement / Carte** — un bouton **« Régler sur WhatsApp »** apparaît pour payer directement le vendeur
4. Validez → écran de confirmation avec votre **numéro de commande** (`SB-…`)

> 💡 Un panier avec des produits de plusieurs boutiques crée **une commande par vendeur** — chacun a son numéro.

### Suivre une commande

- Page **« Suivre ma commande »** (`/track`) : numéro `SB-…` + téléphone de livraison
- Ou depuis le site : après la commande, le bouton **Suivre la commande** vous y emmène
- Vous voyez la progression : Reçue → Confirmée → En préparation → Expédiée → Livrée

### Avec un compte (optionnel mais recommandé)

Créez un compte via **« Créer un compte »** (téléphone ou email + mot de passe, ou Google) :

| Fonction | Où |
|---|---|
| **Mes commandes** | Compte → Commandes |
| **Favoris** ♡ | Cœur sur les produits → Compte → Favoris |
| **Notifications** 🔔 | Cloche en haut — statut des commandes en temps réel |
| **Avis** ⭐ | Après livraison, notez le produit et la boutique (1–5 étoiles + commentaire) |
| **Profil** | Compte → Infos perso / Paramètres |

### Installer l'app sur votre téléphone (PWA)

- **Android** : Chrome → menu ⋮ → « Installer l'application »
- **iPhone** : Safari → bouton Partager → « Sur l'écran d'accueil »
- L'icône SmartBiz s'ajoute à l'écran d'accueil — comme une vraie app, avec notifications push si vous les activez (Compte → Notifications → **Activer**)

### Changer de langue

Bouton **EN** / **FR** dans le menu (en haut sur ordinateur, dans le menu ☰ sur mobile).

### WhatsApp

Deux boutons verts :

- **Commander via SalesBot** — le robot SmartBiz vous guide : choix boutique → produits → commande, tout en chat
- **Commander sur WhatsApp** — discussion directe avec le vendeur

---

## 🏪 Partie 2 — Vendeur

### Devenir vendeur

1. Créez un compte puis cliquez **« Devenir vendeur »** (`/become-seller`)
2. Remplissez : nom de la boutique, ville, téléphone, **numéro WhatsApp** (important : c'est lui qui reçoit les paiements et messages clients)
3. Votre vitrine publique est en ligne immédiatement sur `/boutiques/votre-slug`

### Le tableau de bord (`/dashboard`)

| Page | Utilité |
|---|---|
| **Tableau de bord** | Ventes, revenus, commandes en attente, top produits, alertes stock |
| **Produits** | Ajouter (nom, prix, stock, photos, catégorie), modifier, archiver |
| **Commandes** | Traiter : confirmer → préparer → expédier → livrer, ou annuler |
| **Clients** | Fiches clients créées automatiquement à chaque commande |
| **Fournisseurs** | Carnet de fournisseurs |
| **Stock** | Entrées/sorties, seuils d'alerte, valeur du stock |
| **Finances** | Recettes/dépenses, solde, graphiques par catégorie |
| **Mes boutiques** | Modifier les infos (téléphone, WhatsApp, adresse) |

### Recevoir et traiter une commande

1. Notification 🔔 (+ notification push si activée) : *« Nouvelle commande — X a commandé pour Y FCFA »*
2. Commandes → ouvrez la commande → **Confirmer**
3. Quand le client paie (MoMo/virement) : marquez **Payée** ; à l'envoi : **Expédiée** ; à la remise : **Livrée**
4. Le client est notifié à chaque étape. Les commandes livrées deviennent éligibles aux avis.
5. Annuler une commande **restitue automatiquement le stock**.

### Ventes en direct (hors site)

**Commandes → Nouvelle vente** : saisissez une vente au comptoir ou reçue par téléphone — le stock et les finances se mettent à jour pareil.

### L'assistant IA vendeur

L'icône flottante en bas à droite du dashboard : posez vos questions en français — *« Quel produit vend le mieux ? », « Quelles commandes sont en attente ? »* — l'assistant lit vos vraies données et répond.

---

## 🛡️ Partie 3 — Administrateur

Accès `/admin` (réservé au rôle ADMIN) :

- **Vue d'ensemble** : utilisateurs, boutiques, produits, commandes, revenus
- **Utilisateurs** : activer/désactiver des comptes, changer les rôles
- **Boutiques** : modérer (activer/suspendre), supprimer
- **Produits** : retirer un produit contraire aux règles
- **Activité** : derniers événements de la plateforme

---

## ❓ Questions fréquentes

**Le bouton « Régler sur WhatsApp » n'apparaît pas ?**
Le vendeur n'a pas renseigné son numéro — il peut l'ajouter dans *Mes boutiques → Modifier*.

**Je n'ai pas reçu de notification ?**
Vérifiez : connecté + push activés (Compte → Notifications → Activer) + notifications autorisées dans le navigateur.

**Je n'arrive pas à laisser un avis ?**
C'est voulu : seuls les acheteurs d'une commande **livrée** peuvent noter — les avis sont garantis authentiques.

**Une erreur « stock insuffisant » au checkout ?**
Le produit a été vendu entre-temps ; la quantité disponible est affichée sur la fiche.

**Le site en français/anglais ?**
L'URL contient la langue : `/fr/...` ou `/en/...` — le bouton EN/FR bascule instantanément.
