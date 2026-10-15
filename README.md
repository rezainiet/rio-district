# KALT — Vestes Brésil

Boutique e-commerce en français (Next.js 16 + MongoDB) inspirée de kaltshop.club :
6 vestes, pack de 2 vestes à couleurs mélangées, guide des tailles, panier, **demande de commande
sans paiement** et espace d'administration complet.

> Le paiement en ligne n'est **volontairement pas branché**. Chaque commande est enregistrée avec
> `paymentStatus = "awaiting_payment_setup"` et `status = "pending_confirmation"`. Voir
> [docs/PAYMENTS.md](docs/PAYMENTS.md) pour brancher un prestataire.

## Démarrage rapide (local)

Prérequis : Node.js ≥ 20.9 (testé en 22.13), npm.

```bash
npm install
cp .env.example .env.local      # puis compléter (voir ci-dessous)
npm run db:local                # MongoDB local persistant (terminal dédié) — inutile si vous avez Atlas
npm run seed                    # catalogue, réglages, avis (non publiés), compte admin
npm run dev                     # http://localhost:3000  ·  admin : http://localhost:3000/admin
```

`npm run db:local` télécharge une fois un binaire `mongod` officiel (mongodb-memory-server) et
stocke les données dans `.data/mongo`. Pour un vrai serveur ou Atlas, renseignez simplement
`MONGODB_URI`.

### Variables d'environnement

| Variable | Rôle |
|---|---|
| `MONGODB_URI` | Connexion MongoDB (obligatoire). Jamais exposée au navigateur. |
| `NEXT_PUBLIC_SITE_URL` | URL publique (SEO, Open Graph, sitemap). |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | Compte admin créé par `npm run seed` (mot de passe ≥ 10 caractères). |
| `IMAGE_REMOTE_HOSTS` | Domaines d'images distantes autorisés (ex. un CDN), séparés par des virgules. |
| `PAYMENT_PROVIDER` | Laisser vide tant qu'aucun adaptateur de paiement n'est implémenté. |

`.env.local` est ignoré par git. Ne commitez jamais de secrets.

## Compte administrateur

Il n'existe **aucune page d'inscription publique**. Deux façons de créer un admin :

```bash
# 1. Au seed, à partir de SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD
npm run seed

# 2. À tout moment (crée le compte ou réinitialise son mot de passe)
npm run admin:create -- --email vous@exemple.fr --password "un-mot-de-passe-long"
```

Connexion sur `/admin/login`. Sessions : jeton aléatoire en cookie `HttpOnly` + `SameSite=Lax`
(+ `Secure` en production), seul son hash SHA-256 est stocké en base (expiration 7 jours,
révocable). Mots de passe hachés avec bcrypt (coût 12). Connexion limitée en fréquence.

## Scripts

| Commande | Effet |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` / `npm start` | Build et serveur de production |
| `npm run seed` | Insère ce qui manque (n'écrase rien). `npm run seed -- --reset` réinitialise les 6 produits et les réglages |
| `npm run admin:create` | Crée / réinitialise un admin |
| `npm run db:local` | MongoDB local persistant |
| `npm test` | Tests unitaires (prix, pack, stock, guide des tailles) |
| `npm run test:smoke` | Tests de bout en bout HTTP contre un serveur lancé (`npm run dev`) |
| `npm run lint` / `npm run typecheck` | Qualité |
| `npm run screenshots -- --set after` | Captures pleine page de l'app lancée (Chrome local) dans `docs/screenshots/<set>/` ; `--reference` capture aussi kaltshop.club |
| `npm run demo:orders` | 3 commandes « (DÉMO) » pour revoir l'admin ; `-- --clean` les supprime |

## Fonctionnalités

**Boutique** — accueil (bandeau, hero, collection, pack, détails produit, avis publiés, FAQ,
contact) · fiche produit dynamique (`/produit/[slug]`) : galerie + miniatures + zoom au survol +
visionneuse, coloris, tailles XS→3XL avec disponibilité réelle, simulateur de taille, offre
« veste seule » / « pack 2 vestes » avec coloris et taille indépendants pour chaque veste,
économie affichée, barre d'achat collante sur mobile · panier (tiroir + page) : quantités,
modification couleur/taille, suppression, persistance `localStorage` · commande : formulaire
validé côté client **et** serveur, récapitulatif recalculé par le serveur, page de confirmation
privée (lien à jeton) · SEO : métadonnées, Open Graph, JSON-LD Product et FAQPage, sitemap,
robots.

**Administration** (`/admin`) — tableau de bord (compteurs par statut ; montant encaissé
séparé des demandes non payées) · commandes : recherche, filtres (statut, paiement, dates),
pagination, détail, changement de statut avec transitions contrôlées, statut de paiement séparé,
notes internes, historique, annulation (libère le stock), export CSV (Excel FR) · produits :
création, édition, brouillon/en ligne/archivé, suppression sûre (uniquement sans commande liée),
prix, prix barré, coloris, groupe de coloris, tailles proposées, stock par taille (ou non suivi),
images (téléversement ou URL, ordre, texte alternatif), SEO · réglages : nom, e-mail, bandeau,
promotion, prix du pack, livraison, retours, ouverture des commandes, mention paiement, FAQ,
barème du guide des tailles · messages de contact · modération des avis.

## Architecture

```
src/
  app/(store)/        pages boutique (layout avec panier)    app/admin/   login + (panel)
  app/api/            orders, cart/quote, contact, admin/*, payments/webhook/[provider]
  components/store/   UI boutique (client/serveur)            components/admin/  UI admin
  components/ui/      Button, Modal (<dialog> natif), icônes
  lib/                logique métier pure ou serveur :
    pricing.ts        calcul du panier (partagé client/serveur, sans I/O)
    orders.ts         création de commande, réservation de stock atomique, transitions
    catalog.ts        lecture produits/réglages (DTO publics)
    validation.ts     schémas Zod partagés formulaire ↔ API
    auth.ts           sessions admin        payments/   interface prestataire (inactive)
  models/             Mongoose : Product, Category, Order, Settings, AdminUser, AdminSession,
                      ContactMessage, Testimonial, PaymentAttempt, Counter
  proxy.ts            garde optimiste /admin (la vraie vérification est côté serveur)
scripts/              seed, create-admin, local-mongo, smoke, placeholders (visuels SVG)
```

Règles clés :

- **Le serveur ne lit jamais un prix envoyé par le client.** `POST /api/orders` reçoit seulement
  `productId`, `size`, `quantity` ; prix, remise pack et total sont recalculés depuis MongoDB
  (`lib/pricing.ts`), le pack ne pouvant jamais coûter plus cher que les vestes séparées.
- **Stock** : décrément conditionnel atomique par taille (`$elemMatch stock >= qty` + `$inc`),
  compensation en cas d'échec, restitution à l'annulation. `stock: null` = non suivi.
- **Doublons** : clé d'idempotence générée par le navigateur et index unique en base ; un
  renvoi (double clic, réseau) renvoie la même commande.
- **Montants** en centimes entiers ; affichage `Intl` fr-FR EUR.
- Catalogue 100 % en base : produits, catégories, groupes de coloris, images, tailles, prix
  illimités ; aucun produit codé en dur dans l'UI.
- Rendu dynamique (`force-dynamic`) : toute modification admin est visible immédiatement.

## Déploiement

1. Base MongoDB Atlas (ou autre) → `MONGODB_URI`.
2. Variables d'environnement de production (`NEXT_PUBLIC_SITE_URL` en https).
3. `npm run build && npm start` (Node) ou hébergeur Next.js.
4. `npm run seed` une fois contre la base de production, puis changer le mot de passe admin.
5. **Images téléversées** : stockées dans `public/uploads/`, adapté à un serveur unique avec
   disque persistant. Sur un hébergement serverless (Vercel…), remplacer
   `src/app/api/admin/uploads/route.ts` par un stockage objet (S3, R2, Cloudinary) et
   ajouter le domaine à `IMAGE_REMOTE_HOSTS`.
6. Le limiteur de fréquence est en mémoire (par processus) : utiliser Redis/Upstash si plusieurs
   instances.

## Documents

- [docs/AUDIT.md](docs/AUDIT.md) — audit du site de référence, fonctionnalités confirmées / non inspectables, direction visuelle
- [docs/QA.md](docs/QA.md) — résultats des tests fonctionnels
- [docs/VISUAL-AUDIT.md](docs/VISUAL-AUDIT.md) — comparaison visuelle avec la référence, affinages, captures avant/après
- [docs/PAYMENTS.md](docs/PAYMENTS.md) — passation pour l'intégration du paiement
- [docs/LIMITATIONS.md](docs/LIMITATIONS.md) — limites connues et contenus à fournir par le client
