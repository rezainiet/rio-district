# Rio District — état de préparation au lancement

Audit et préparation du 16/10/2026. **Rien n'a été déployé, aucune migration de production n'a
été exécutée, aucun commit final n'a été créé.**

**Verdict : techniquement prêt et répété en conditions de production, mais PAS prêt pour une
ouverture publique.** Des bloquants juridiques, de contenu et d'infrastructure restent ouverts
(§ 12). Une préproduction privée est possible dès que l'infrastructure existe.

## 1. Fonctionnalités prêtes à déployer

Boutique : accueil, 6 fiches produit, galeries, coloris et tailles, pack 2 vestes, panier
(tiroir + page), commande sans paiement, confirmation, affichage des avis, dépôt d'avis, compte à
rebours, pop-ups (bienvenue, intention de sortie, rappel de panier), FAQ, contact.
Admin : connexion sécurisée, tableau de bord, commandes, produits et stocks, modération des
avis, promotions (compte à rebours + pop-ups), messages, réglages, téléversement d'images.
Backend : modèles MongoDB, toutes les routes API, sessions admin, validation serveur (Zod), prix
recalculés côté serveur, réservation de stock atomique, modération, planification des campagnes,
limitation de débit, journaux JSON, en-têtes de sécurité, sonde `/api/health`.
Tout est dans la même base de code : rien n'a été écarté parce qu'il avait été testé en local.

## 2. Avis de la boutique de référence : constat

Relevé de https://www.kaltshop.club/ (accueil et fiche produit, même liste) :

| Constat | Conséquence |
|---|---|
| **28 avis écrits** : nom, note, texte, photo (23 sur 28). | Tous relevés tels quels dans `scripts/data/reference-reviews.json`. |
| **Aucune date** publiée. | Aucune date affichée (« Date d'origine inconnue » dans l'admin). Rien n'est inventé. |
| Produit = « Veste Brésil », **sans coloris**. | Avis rattachés au modèle : visibles sur les 6 fiches, sans mention de coloris. |
| **Aucun lien avec une commande.** | Aucun ne porte « Achat vérifié ». |
| Notes globales par coloris (« 4,92 · 323 avis », etc.) **étiquetées « DÉMO »** sur la référence (champ `demoRating`). Le compte à rebours « Fin dans 24:00:00 » et « Il ne reste que 7 articles » le sont aussi. | **Non repris.** La note affichée sur Rio District est calculée uniquement à partir des avis publiés. |
| **17 photos nommées `ziyva-*.jpg`** (nom d'une autre boutique). | Signal d'alerte : l'origine de ces avis/photos doit être confirmée. |
| Vidéos clients (`/temoignages/avis-*.mp4`). | Non reprises (le module d'avis ne gère pas la vidéo). |

Le fait que le client possède la boutique de référence ne prouve pas que ces avis viennent de
vrais clients ni qu'ils peuvent être réutilisés. **Statut : authenticité et autorisation NON
confirmées.**

## 3. Avis préparés pour la migration

- Les 6 avis déjà en base (Imen D., Carla G., Shaima A., Hicham Q., Ayoub K., Julien) ont été
  **reliés** au relevé (même auteur et même texte), sans doublon.
- Les 22 autres ont été **ajoutés en attente**, non publiés, avec leur provenance (URL, date de
  relevé, photo d'origine). Base locale : 28 avis, 0 publié.
- Import idempotent (`npm run reviews:import`) : clé unique par avis, une seconde exécution ne
  change rien ; aucun avis n'est jamais dépublié ni écrasé.
- Publication : uniquement si le manifeste contient une confirmation **écrite** complète (qui,
  quand, preuve) **et** que l'avis est marqué `approved: true`, ou manuellement dans l'admin.
- Photos : téléchargées seulement si `photosAuthorized: true`, puis ré-encodées sans
  métadonnées dans `UPLOAD_DIR`.
- Aucun avis synthétique n'est en base locale. Les avis « [Démo] » existent seulement dans la base
  séparée `kalt_demo` (outil de captures), jamais exportée.

## 4. Contenu de démonstration retiré du jeu de production

- Code : aucun texte « démo », de remplissage ou de test dans les composants de la boutique (audit
  par recherche plein texte, puis vérification du texte visible en mode production à 375, 390,
  768 et 1440 px).
- Données : l'export de production refuse tout produit ou réglage contenant « démo », « lorem » ou
  « smoke » et n'exporte ni commandes, ni clients, ni messages, ni avis de test, ni comptes admin,
  ni sessions, ni compteurs, ni campagnes.
- Le fichier interne `public/products/reference/SOURCES.json` (notes d'autorisation) était
  **accessible publiquement** : déplacé vers `docs/provenance/product-images.json` (404 vérifié).
- Les mentions légales et opérationnelles ont été conservées (paiement non disponible, demande de
  commande sans débit).

## 5. Compte à rebours

Fonctionnel, réglable dans Admin → Promotions, stocké en base (UTC, affiché en heure de Paris),
identique après rechargement et sur tous les appareils (horloge du serveur), disparaît seul à
l'échéance. La campagne « DÉMO — OFFRE DE LANCEMENT » n'existe que dans `kalt_demo`.
**Production : configuré vide et désactivé** (aucune date de fin réelle fournie). Activable
immédiatement depuis l'admin dès qu'une vraie campagne est approuvée. Il ne modifie aucun prix.

## 6. Pop-ups

Textes neutres fournis, enregistrés **désactivés** :

| Pop-up | Titre | Texte | Bouton |
|---|---|---|---|
| Bienvenue | Bienvenue chez Rio District | Découvre notre collection de vestes Brésil, disponible en six coloris. | Découvrir la collection → `/#collection` |
| Sortie | Avant de partir | Découvre nos vestes et compose ton pack de deux coloris au choix. | Composer mon pack → pack |
| Panier | Ton panier t'attend | Retrouve les articles que tu as sélectionnés. | Voir mon panier (fixe) |

Vérifié : fréquence, mémorisation de la fermeture, un seul pop-up par visite, jamais au-dessus du
tiroir ni sur `/panier` et `/commande`, Échap, focus, mobile, intention de sortie désactivée sur
mobile. Activation uniquement par l'admin.

## 7. Marque Rio District

Nom piloté par les réglages : en-tête, pied de page, métadonnées et Open Graph, admin (barre,
connexion, titres), pop-ups. Identifiants internes renommés avant lancement (`rd.cart.v1`,
`rd.checkout.key`, cookie `rd_admin`) ; modèles de déploiement renommés (`rio-district.*`,
`/srv/rio-district`, `/var/lib/rio-district`). **Conservé volontairement** : numéros
historiques `KALT-…` (documents immuables) et provenance des photos/avis. Pas d'e-mails
automatiques dans l'application (aucun modèle à renommer). **Non remplacé** :
`contact@kaltshop.club` reste en base locale et l'export de production le **refuse** (bloquant).

## 8. Plan de migration MongoDB

`npm run migrate:prod` (détails : [DEPLOYMENT.md § 4](DEPLOYMENT.md)) :
`export` sur le poste → bundle avec somme de contrôle → `import` sur le VPS (simulation, puis
`--apply`) → journal `migrations` → `rollback` ciblé.
Répétition locale complète : 6 produits avec **les mêmes identifiants et prix**, réglages avec
campagnes désactivées, 28 avis en attente, 0 commande/admin/session/message/compteur ;
seconde exécution sans effet ; refus sans e-mail de contact, refus sans sauvegarde récente
quand la base contient des données ; retour arrière limité aux éléments insérés.

## 9. Exigences VPS

Ubuntu 22.04/24.04, Node.js 22, MongoDB 8 avec authentification sur `127.0.0.1` (ou Atlas
restreint), nginx + certbot, ufw (22/80/443), utilisateur `riodistrict`, `UPLOAD_DIR` persistant,
sauvegardes quotidiennes copiées hors serveur, sonde `/api/health`. **Aucune information
d'infrastructure n'a été fournie** (IP, domaine, SSH, sauvegarde externe).

## 10. Commandes de déploiement

Voir [DEPLOYMENT.md](DEPLOYMENT.md) : préparation serveur (§ 2), release (§ 3), migration et
admin (§ 4), service, nginx, TLS, supervision (§ 5), sauvegardes (§ 6), recette (§ 7).

## 11. Sauvegarde et retour arrière

`deploy/backup.sh` (base + uploads, contrôle, 14 jours, copie externe à configurer). Avant
chaque migration ou release : `mongodump`. Code : bascule du lien `current`. Données : restauration
dans une base séparée puis bascule. Migration : `migrate:prod rollback`.

## 12. Validations client en attente

| # | Élément | Bloque |
|---|---|---|
| 1 | **E-mail de contact Rio District** (l'export de production refuse sans lui) | Lancement |
| 2 | **Confirmation écrite** : les 28 avis sont réels, réutilisation autorisée, photos autorisées (en particulier les 17 `ziyva-*`) | Publication des avis |
| 3 | **Autorisation écrite** : photos produits et vente d'articles portant des marques tierces (Nike, CBF, Itaú, Vivo). Posséder la boutique ne donne pas de licence sur ces marques. | Lancement |
| 4 | **Mentions légales, CGV, politique de confidentialité** (obligatoires en France) | Lancement |
| 5 | Validation des conditions de livraison et retour (gratuit, 2–4 j, 14 j) et du bandeau | Lancement |
| 6 | Infrastructure : VPS, domaine, DNS, SSH, stockage des sauvegardes | Déploiement |
| 7 | Campagnes réelles (dates, textes) si un compte à rebours ou des pop-ups doivent être actifs | Activation |
| 8 | Prestataire de paiement (phase ultérieure) — aujourd'hui : demandes de commande non payées | Paiement en ligne |

## 13. Résultats des tests (16/10/2026)

| Suite | Résultat |
|---|---|
| TypeScript (`tsc --noEmit`) | ✓ 0 erreur |
| ESLint | ✓ 0 problème |
| Tests unitaires | ✓ 20/20 (prix, pack, stock, tailles, fuseau Paris, campagnes, avis, valeurs de lancement) |
| Tests HTTP de bout en bout (`test:smoke`) | ✓ 9/9 (prix serveur, idempotence, stock concurrent, commandes non payées, avis, compte à rebours, pop-ups) |
| Build de production | ✓ |
| Recette navigateur avis/campagnes (`qa:marketing`, base démo) | ✓ 18/18 |
| Recette mobile (`qa:mobile`, 375/390) | ✓ barre collante, menu, tiroir sans régression |
| **Répétition en mode production** (`qa-production`, build + `APP_ENV=production` sur base migrée) | ✓ 8/8 : santé, en-têtes, aucun texte démo/KALT ni compte à rebours à 4 largeurs, images servies par l'application, veste + pack = 44,94 €, commande « Non payée » RD-xxxxx, avis en attente, contact, admin (cookie Secure/HttpOnly/Lax), 6 produits, publication puis rejet d'un avis, téléversement, activation/fermeture d'un pop-up, compte à rebours expiré seul |
| Persistance | ✓ image téléversée toujours servie après redémarrage du serveur |
| Garde-fous | ✓ mot de passe admin faible refusé en production ; démarrage averti sans authentification MongoDB |

Non testé : Safari et appareils réels, Lighthouse, charge, déploiement sur un vrai VPS.

## Checklist de préparation

| Élément | Implémenté et testé | Configuré production | Attente client | Bloqué | Prêt au lancement |
|---|:-:|:-:|:-:|:-:|:-:|
| Boutique, panier, pack, commande non payée | ✓ | ✓ | | | ✓ |
| Admin (commandes, produits, stocks, messages, réglages) | ✓ | ✓ | | | ✓ |
| Sécurité (sessions, CSRF, débit, en-têtes, noindex admin) | ✓ | ✓ | | | ✓ |
| Migration de production (export/import/rollback) | ✓ | ✓ | | | ✓ |
| Modèles VPS (systemd, nginx, sonde, sauvegarde) | ✓ | ✓ (modèles) | | ✓ infrastructure absente | |
| Dépôt et modération d'avis | ✓ | ✓ | | | ✓ |
| 28 avis de référence | ✓ importés en attente | ✓ | ✓ confirmation écrite | | |
| Photos des avis | ✓ mécanisme | | ✓ autorisation | | |
| Compte à rebours | ✓ | ✓ désactivé | ✓ campagne réelle | | ✓ (désactivé) |
| Pop-ups (3) | ✓ | ✓ textes prêts, désactivés | ✓ accord d'activation | | ✓ (désactivés) |
| Marque Rio District | ✓ | ✓ | | | ✓ |
| E-mail de contact | | | ✓ | ✓ | |
| Photos produits / marques tierces | ✓ | | ✓ autorisation écrite | ✓ | |
| Mentions légales, CGV, confidentialité | | | ✓ | ✓ | |
| Paiement en ligne | architecture prête | | ✓ prestataire | | hors périmètre |

**Ne pas ouvrir au public tant que les lignes « Bloqué » ne sont pas levées.**
