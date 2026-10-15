# Mise en préproduction / production sur VPS

État au 16/10/2026 : **prêt pour une préproduction (staging) privée, pas pour une ouverture publique.**
Rien n'a été déployé.

## Bloquants avant une mise en ligne publique

| # | Bloquant | Responsable |
|---|---|---|
| 1 | **Autorisation écrite** du client pour les 6 photos et pour la vente d'articles portant des marques tierces (Nike, CBF, Itaú, Vivo). Aujourd'hui : confirmation verbale seulement (`SOURCES.json` → `pending-written-authorization`). | Client |
| 2 | **Mentions légales, CGV, politique de confidentialité** (obligatoires en France pour un site marchand). Pages inexistantes. | Client + juriste |
| 3 | **E-mail de contact réel** (actuellement `contact@kaltshop.club`, à confirmer) et circuit de réponse aux demandes de commande. | Client |
| 4 | **Conditions de livraison et de retour** (gratuite, 2–4 j, 14 j) reprises de la référence : à valider. | Client |
| 5 | **Aucun e-mail automatique** (ni au client, ni à l'admin) : l'équipe doit surveiller l'admin pour traiter les demandes. | Décision client |

Non bloquants pour la préproduction : paiement en ligne non branché (volontaire), avis non
publiés, vues dos/détail manquantes, guide des tailles provisoire.

## Ce qui est prêt et vérifié

- Typecheck, lint, 8 tests unitaires, 6 vérifications de bout en bout, build de production sans avertissement.
- Démarrage production testé : refus de démarrer (code de sortie 1) si `MONGODB_URI` manque, si
  `NEXT_PUBLIC_SITE_URL` n'est pas en https au build, ou si `UPLOAD_DIR` est absent ou non inscriptible.
- Cookie admin en production : `Secure; HttpOnly; SameSite=Lax`, session stockée hachée, 7 jours.
- En-têtes : `HSTS` (production), `CSP` de base (`frame-ancestors`, `object-src`, `base-uri`,
  `form-action`), `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`,
  `no-store` + `noindex` sur l'admin.
- Journaux structurés JSON (journald) : `order.created`, `order.rejected`, `admin.login`,
  `admin.login_failed`, erreurs API. Aucune donnée personnelle client n'est journalisée.
- Téléversements admin dans un dossier persistant (`UPLOAD_DIR`) hors release, servis par `/uploads/…`.
- Commandes sans paiement : créées `pending_confirmation` / `awaiting_payment_setup`. Un
  `paymentStatus` envoyé par le client est ignoré, le webhook répond 501, la page client affiche
  « Non payée ». L'admin doit confirmer avant de marquer « Payée » ou d'expédier une commande non
  payée. Le tableau de bord ne compte comme encaissées que les commandes `paid`.
- Données protégées : `seed` n'insère que ce qui manque. `seed --reset` est refusé en production
  et dès qu'une commande existe. Les commandes de démo, le smoke test et la base locale refusent de
  s'exécuter avec `APP_ENV=production`.

## Pré-requis serveur

- Ubuntu 22.04/24.04, Node.js 22 LTS, nginx, certbot, MongoDB 7/8 (local) **ou** Atlas.
- Utilisateur système `kalt` sans shell de connexion.
- Dossiers : `/srv/kalt/releases/<date>`, `/srv/kalt/current` (lien), `/srv/kalt/shared/.env.local`
  (chmod 600), `/var/lib/kalt/uploads` (propriétaire `kalt`), `/var/backups/kalt`.

## Checklist de déploiement (préproduction)

1. **DNS** : `staging.<domaine>` → IP du VPS. Ne pas indexer (ajouter une authentification basique
   nginx tant que les bloquants ne sont pas levés est recommandé).
2. **MongoDB** : authentification activée, écoute `127.0.0.1` uniquement, utilisateur dédié
   `readWrite` sur la base `kalt` seulement. Pas de port 27017 ouvert sur Internet.
3. **Fichier d'environnement** `/srv/kalt/shared/.env.local` (modèle : `.env.example`) :
   `APP_ENV=production`, `MONGODB_URI` avec identifiants, `NEXT_PUBLIC_SITE_URL=https://staging.<domaine>`,
   `UPLOAD_DIR=/var/lib/kalt/uploads`, `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` (mot de passe fort,
   ≥ 16 caractères, différent de celui du développement), `PAYMENT_PROVIDER` vide.
4. **Release** : copier le dépôt dans `/srv/kalt/releases/<date>`, lier `.env.local`, puis
   `MONGOMS_DISABLE_POSTINSTALL=1 npm ci` (évite de télécharger le MongoDB de développement) et
   `npm run build`. **Le build doit voir le `.env.local` de production** :
   `NEXT_PUBLIC_SITE_URL` est figé à ce moment-là.
5. **Données initiales** (une seule fois) : `npm run seed` (crée les 6 produits avec les photos,
   les réglages, les avis non publiés et l'admin). Puis vider `SEED_ADMIN_PASSWORD` du fichier.
   Ne pas lancer `demo:orders`.
6. **Service** : installer `deploy/systemd/kalt.service`, `systemctl enable --now kalt`,
   vérifier `journalctl -u kalt` → `startup.ok`.
7. **nginx + TLS** : installer `deploy/nginx/kalt.conf`, `certbot --nginx`, recharger nginx.
   Les en-têtes `Host`, `X-Real-IP` et `X-Forwarded-Proto` sont indispensables (CSRF et limitation
   de débit).
8. **Pare-feu** : uniquement 22, 80, 443.
9. **Sauvegardes** : `deploy/backup.sh` quotidien (base + images téléversées), copie hors serveur,
   test de restauration dans une base séparée.
10. **Recette** : accueil, 6 fiches, pack 2 couleurs, panier, demande de commande (vérifier
    « Non payée »), connexion admin en https, changement de statut, export CSV, téléversement
    d'image puis redémarrage du service (l'image doit rester), réglages.
11. **Commandes de test** : les annuler depuis l'admin ou les supprimer avant l'ouverture.

## Mise à jour et retour arrière

Nouvelle release dans `releases/<date>`, `npm ci` + `npm run build`, bascule du lien `current`,
`systemctl restart kalt`. Retour arrière : repointer `current` vers la release précédente et
redémarrer. Les données (MongoDB, `UPLOAD_DIR`) ne sont pas dans les releases.

## Limites d'exploitation connues

- Une seule instance applicative (limiteur de débit en mémoire).
- Images produits initiales servies depuis `public/products/reference` (versionnées). Les
  nouvelles images passent par l'admin → `UPLOAD_DIR`.
- CSP sans restriction de scripts (nonce) : renforcement possible plus tard.
- Pas de supervision externe : prévoir une sonde HTTP sur `/` et une alerte sur `journalctl -p err`.
