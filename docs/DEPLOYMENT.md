# Déploiement Rio District sur un VPS Ubuntu

Mise à jour d’une installation existante autorisée le 17/10/2026 : suivre le §10 ci-dessous.
Les §1–9 décrivent l’installation initiale historique et ne constituent PAS des commandes
à réexécuter sur le VPS existant. Ne pas réinstaller MongoDB/nginx, recréer des comptes,
modifier le pare-feu ou renouveler les certificats pour une simple mise à jour.
Le service, le port, les chemins et les variables réellement en production font autorité.

## 1. Ce qu'il faut avant de commencer

| Élément | Exemple | Fourni ? |
|---|---|---|
| VPS Ubuntu 22.04 / 24.04, 2 vCPU, 2–4 Go RAM, 20 Go disque | — | **Non** |
| Accès SSH par clé (pas de mot de passe root) | — | **Non** |
| Nom de domaine + DNS (`www` et racine → IP du VPS) | `www.riodistrict.fr` | **Non** |
| E-mail de contact Rio District | `contact@<domaine>` | **Non (bloquant)** |
| Destination des sauvegardes hors serveur | stockage objet, autre serveur | **Non** |
| Autorisation écrite : photos, avis, marques tierces | voir LAUNCH-READINESS | **Non** |

## 2. Préparation du serveur (une fois)

```bash
# Paquets
sudo apt update && sudo apt -y upgrade
sudo apt -y install nginx certbot python3-certbot-nginx ufw curl git
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt -y install nodejs   # Node 22 LTS

# Pare-feu : SSH + web uniquement (MongoDB n'est JAMAIS ouvert)
sudo ufw allow OpenSSH && sudo ufw allow 'Nginx Full' && sudo ufw enable

# Utilisateur applicatif sans shell, dossiers
sudo useradd --system --home /var/lib/rio-district --shell /usr/sbin/nologin riodistrict
sudo mkdir -p /srv/rio-district/{releases,shared} /var/lib/rio-district/uploads /var/backups/rio-district
sudo chown -R riodistrict:riodistrict /srv/rio-district /var/lib/rio-district
sudo chmod 700 /var/backups/rio-district
```

### MongoDB (local, avec authentification)

Installer MongoDB 8 selon la documentation officielle (dépôt `repo.mongodb.org`), puis dans
`/etc/mongod.conf` :

```yaml
net:
  bindIp: 127.0.0.1          # jamais 0.0.0.0
  port: 27017
security:
  authorization: enabled
```

```bash
sudo systemctl enable --now mongod
# Créer d'abord un administrateur, puis l'utilisateur applicatif limité à SA base :
mongosh --eval 'db.getSiblingDB("admin").createUser({user:"admin",pwd:passwordPrompt(),roles:["root"]})'
mongosh -u admin -p --authenticationDatabase admin --eval \
  'db.getSiblingDB("riodistrict").createUser({user:"riodistrict_app",pwd:passwordPrompt(),roles:[{role:"readWrite",db:"riodistrict"}]})'
sudo systemctl restart mongod
```

(Alternative : MongoDB Atlas, accès IP restreint à l'IP du VPS, même utilisateur `readWrite`.)

### Fichier d'environnement

`/srv/rio-district/shared/.env.local` (propriétaire `riodistrict`, `chmod 600`) — modèle :
[.env.example](../.env.example).

```dotenv
APP_ENV=production
MONGODB_URI=mongodb://riodistrict_app:<MOT_DE_PASSE>@127.0.0.1:27017/riodistrict?authSource=riodistrict
NEXT_PUBLIC_SITE_URL=https://www.<domaine>
UPLOAD_DIR=/var/lib/rio-district/uploads
SEED_ADMIN_EMAIL=
SEED_ADMIN_PASSWORD=
IMAGE_REMOTE_HOSTS=
PAYMENT_PROVIDER=
```

`NEXT_PUBLIC_SITE_URL` est **figé au moment du build** : il doit être correct avant `npm run build`.
Au démarrage, l'application refuse de tourner (code 1) si `MONGODB_URI` manque, si l'URL n'est
pas en https ou si `UPLOAD_DIR` n'est pas inscriptible.

## 3. Première release

```bash
REL=/srv/rio-district/releases/$(date +%Y%m%d-%H%M)
sudo -u riodistrict git clone --depth 1 --branch <branche-approuvée> <dépôt> "$REL"
sudo -u riodistrict ln -s /srv/rio-district/shared/.env.local "$REL/.env.local"
cd "$REL"
sudo -u riodistrict MONGOMS_DISABLE_POSTINSTALL=1 npm ci          # sans le MongoDB de développement
sudo -u riodistrict npm run build                                   # lit le .env.local de production
sudo ln -sfn "$REL" /srv/rio-district/current
```

## 4. Données de production (migration)

La migration ne copie **que** les données métier approuvées : 6 produits (mêmes identifiants,
images, tailles, stocks, prix), catégories, réglages (compte à rebours et pop-ups **désactivés**),
avis de la boutique de référence (en attente, non publiés). Jamais : commandes, clients, messages,
avis de test ou de démo, comptes admin, sessions, compteurs.

Sur le **poste de travail** (base source = base locale validée) :

```bash
npm run migrate:prod -- export --contact-email contact@<domaine> --out .data/migration/rio-district-<date>
# Le rapport liste les bloquants éventuels (e-mail manquant, image absente, contenu « démo »…)
scp -r .data/migration/rio-district-<date> <user>@<vps>:/tmp/rio-district-migration
```

Sur le **VPS** :

```bash
cd /srv/rio-district/current
sudo -u riodistrict npm run migrate:prod -- import --bundle /tmp/rio-district-migration           # simulation
sudo -u riodistrict npm run migrate:prod -- import --bundle /tmp/rio-district-migration --apply   # écriture
```

- Idempotente : relancée, elle n'insère rien de plus et ne modifie jamais un enregistrement existant.
- Refuse `--apply` si le bundle contient un bloquant ou si sa somme de contrôle ne correspond pas.
- Si la base contient déjà des données : `--backup <archive mongodump de moins de 24 h>` obligatoire.
- Chaque exécution est tracée dans la collection `migrations`.
- Retour arrière d'une migration : `npm run migrate:prod -- rollback --id <id>` (simulation) puis
  `--apply`. Ne retire que ce que cette migration a inséré et qui n'a pas été modifié depuis ;
  refusé si des commandes utilisent les produits (dans ce cas : restaurer la sauvegarde).
- Avis : publiés uniquement avec `--publish-approved` **et** une confirmation écrite complète dans
  `scripts/data/reference-reviews.json` ; photos téléchargées uniquement avec `--with-photos`
  **et** `photosAuthorized: true`.

### Compte administrateur (jamais celui du développement)

```bash
read -rs ADMIN_PASSWORD && export ADMIN_PASSWORD     # ≥ 16 caractères, lettres et chiffres (vérifié)
sudo -u riodistrict --preserve-env=ADMIN_PASSWORD npm run admin:create -- --email <admin@domaine>
unset ADMIN_PASSWORD
```

## 5. Service, nginx, HTTPS, supervision

```bash
sudo cp deploy/systemd/rio-district.service deploy/systemd/rio-district-health.{service,timer} /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now rio-district rio-district-health.timer
journalctl -u rio-district -n 50          # doit contenir "startup.ok"
curl -s http://127.0.0.1:3000/api/health  # {"status":"ok","db":"up",…}

sudo cp deploy/nginx/rio-district.conf /etc/nginx/sites-available/   # remplacer www.example.com
sudo ln -s /etc/nginx/sites-available/rio-district.conf /etc/nginx/sites-enabled/
sudo certbot --nginx -d www.<domaine> -d <domaine>
sudo nginx -t && sudo systemctl reload nginx
```

Points vérifiés par la configuration fournie :

- L'application n'écoute que sur `127.0.0.1:3000` ; nginx est le seul point d'entrée.
- nginx transmet `Host`, `X-Forwarded-Proto` et `X-Real-IP` depuis la connexion réelle : la
  protection CSRF (Origin = Host) et la limitation de débit (par IP) en dépendent.
- HTTPS : redirection 80 → 443, HSTS (envoyé par l'application en production), cookie admin
  `Secure; HttpOnly; SameSite=Lax`.
- En-têtes : CSP de base, `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`,
  `noindex` + `no-store` sur l'admin.
- Corps de requête : 6 Mo par défaut, 20 Mo uniquement pour `/api/reviews` (3 photos).
- Supervision : `rio-district-health.timer` interroge `/api/health` toutes les 5 min ; brancher
  une alerte (sonde externe sur `https://www.<domaine>/api/health` et/ou `journalctl -p err`).

## 6. Sauvegardes

```bash
sudo cp deploy/backup.sh /etc/cron.daily/rio-district-backup && sudo chmod 750 /etc/cron.daily/rio-district-backup
sudo /etc/cron.daily/rio-district-backup    # premier essai
```

Base + dossier `UPLOAD_DIR` (images admin et photos d'avis), 14 jours en local, contrôle de
lisibilité. **Copier hors serveur** chaque jour et **tester une restauration** dans une base
séparée (`riodistrict_restore`) avant le lancement.

## 7. Recette sur le serveur (avant ouverture)

Accueil, 6 fiches, pack 2 couleurs (24,95 €), panier, demande de commande (page « Non payée »),
admin en https, changement de statut, export CSV, téléversement d'une image puis
`systemctl restart rio-district` (l'image doit rester), envoi d'un avis (doit rester en attente),
activation puis désactivation d'un pop-up, `curl /api/health`. Annuler ou supprimer les commandes
de test avant l'ouverture.

## 8. Mise à jour et retour arrière applicatif

```bash
REL=/srv/rio-district/releases/<nouvelle-date>   # clone + lien .env.local + npm ci + npm run build (comme au §3)
sudo mongodump --uri="<MONGODB_URI>" --archive=/var/backups/rio-district/pre-release.archive.gz --gzip
sudo ln -sfn "$REL" /srv/rio-district/current && sudo systemctl restart rio-district
```

Retour arrière : repointer `current` vers la release précédente et redémarrer. Les données
(MongoDB, `UPLOAD_DIR`) sont hors des releases. Données : `mongorestore` de la dernière archive
dans une nouvelle base, vérification, puis bascule de `MONGODB_URI`.

## 9. Garde-fous en production (`APP_ENV=production`)

Refusés : `seed --reset`, `demo:orders`, `demo:marketing`, `test:smoke`, `db:local`.
`migrate:prod` et `reviews:import` sont en simulation par défaut. Aucun script ne supprime de
données existantes. Le webhook de paiement répond 501 tant qu'aucun prestataire n'est implémenté.

## Limites d'exploitation connues

- Une seule instance applicative (limiteur de débit en mémoire).
- Images produits initiales servies depuis `public/products/reference` (versionnées avec le code) ;
  images ajoutées par l'admin et photos d'avis dans `UPLOAD_DIR`.
- CSP sans nonce pour les scripts : renforcement possible plus tard.
- Aucun e-mail automatique (ni client, ni admin) : l'équipe surveille l'admin.

## 10. Mise à jour de l’installation existante (Rio District uniquement)

1. Vérifier et pousser le commit approuvé sur `main`, sans forcer l’historique. Conserver
   les changements locaux et exclure secrets, uploads, sauvegardes et fichiers temporaires.
2. Inspection SSH en lecture seule : service Rio District exact, répertoire courant/release
   précédente, port, utilisateur applicatif, configuration nginx du seul domaine concerné,
   état TLS, variables (sans afficher leurs valeurs privées), URI MongoDB et uploads.
   Établir une référence de santé des autres services/sites avant toute mutation.
3. Vérifier ressources et droits ; créer une sauvegarde privée de cette application,
   de sa configuration, de SA base et de SES uploads. Tester la lisibilité/restauration
   isolée. Ne pas exécuter aveuglément le script quotidien ni son nettoyage par rétention.
4. Préparer une nouvelle release isolée du commit exact, avec le lockfile et l’environnement
   existant. Ne pas reseeder, importer la base locale, modifier les stocks/avis ou écraser
   les médias ajoutés en production. Les nouveaux champs Order/PaymentAttempt sont additifs ;
   vérifier la compatibilité et les index existants avant tout changement de schéma/index.
5. Garder Everflow désactivé, pixels vides et aucune approbation live :

   ```dotenv
   PAYMENT_PROVIDER=everflow
   EVERFLOW_ENABLED=false
   EVERFLOW_MODE=live
   EVERFLOW_SINGLE_CHECKOUT_URL=https://www.molipy8trk.com/2J23GL9/TTF23GH/
   EVERFLOW_BUNDLE_CHECKOUT_URL=https://www.molipy8trk.com/2J23GL9/TRSKRX3/
   EVERFLOW_PUBLIC_ASSET_BASE_URL=https://riodistrict.store
   EVERFLOW_LIVE_APPROVED=false
   EVERFLOW_VARIANTS_APPROVED=false
   EVERFLOW_BUNDLE_METADATA_APPROVED=false
   EVERFLOW_PIXEL_PLATFORM=
   EVERFLOW_PIXEL_APPROVED=false
   RIO_EVERFLOW_TEST=false
   ```

   Ces valeurs non secrètes s’ajoutent sans remplacer l’URI MongoDB, l’URL réelle du site,
   les réglages légitimes, les authentifications, les uploads ou les variables privées.
   Tous les identifiants publicitaires restent vides. Le checkout conserve la demande
   de commande non payée ; le webhook Everflow répond 501.
6. Installer avec `npm ci` dans la nouvelle release, construire avec les vraies variables
   de production et valider sur un port loopback libre temporaire, sans commandes client.
7. Uniquement après sauvegarde/rollback vérifiés et candidat sain : bascule atomique
   de la release selon l’architecture observée, puis redémarrage du SEUL service Rio District.
   Ne pas redémarrer MongoDB, nginx, tous les services, toutes les apps Node ou `pm2 all`.
   Un reload nginx n’est nécessaire que si sa configuration doit effectivement changer,
   après validation ; les autres virtual hosts doivent rester identiques.
8. Vérifier santé HTTP/DB, storefront, admin, photos persistantes, prix 19,99€/24,95€,
   retours 15 jours, avis et marketing légitimes. Recette à 375/390/414/768/1440 px.
   Aucune redirection live, données client transmises, commande payée ou faux compte à rebours.
9. Comparer les autres sites/services à la référence. En cas de panne critique, revenir
   à la release précédente et redémarrer uniquement Rio District. Ne jamais restaurer
   un ancien dump par-dessus des commandes récentes sans autorisation explicite.
10. Consigner commit exact, date, release/rollback, contrôles et état des flags après
    le déploiement réel. Aucun rapport « déployé » n’est valable avant ces preuves.

La documentation de paiement et les questions restantes sont dans
[EVERFLOW_CHECKOUT.md](EVERFLOW_CHECKOUT.md). L’activation live nécessite une autorisation
distincte, des preuves de paiement authentifiées, la corrélation des variantes/commandes,
la validation du domaine destinataire et les approbations de partage de données.
