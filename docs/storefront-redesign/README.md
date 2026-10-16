# Rio District — refonte mobile-first de la boutique

Branche : `feat/mobile-first-storefront` (depuis `main`). **Rien n'est fusionné dans `main`, rien n'est déployé.**
La base de production n'est pas touchée. Captures : `before/` (avant) et `after/` (après), prises dans Chrome
(script `scripts/screenshots-storefront.ts`), rapport d'audit par page dans `*/audit.json`.

## 1. Pourquoi KALT paraissait plus fiable (constats mesurés)

| Constat | KALT | Rio District avant |
|---|---|---|
| 1er écran mobile de l'accueil | Les 6 vestes, les 2 prix, « Voir les avis », bandeau de garanties | Une seule veste noire et un titre sur 4 lignes ; ni prix, ni couleurs, ni bouton |
| Titres | Police condensée : 2–3 mots par ligne | Syne très large : « LA / VESTE / DE LA / SAISON. », « PACK 2 / VESTES », le « € » seul sur sa ligne |
| Fiche produit, 1er écran | Note, stock, date de livraison au-dessus de l'offre | Photo plein écran ; note, stock et date sous le pli |
| Menu mobile | Liens + offre | 5 mots géants numérotés 01–05, aucun produit |
| Lisibilité | Corps 14–16 px | 12 à 18 textes < 12 px par page ; bordures de champs invisibles |
| Débordement | — | Défilement horizontal à 320 px (accueil, fiche) |

Ce qui reste **meilleur chez nous** (et que KALT n'a pas) : un vrai panier et une vraie commande, une taille jamais
présélectionnée, des chiffres réels (KALT : avis/stock « démo », compte à rebours qui repart, « paiement sécurisé »
sans paiement, aucune mention légale).

## 2. Système de design (affiné, identité Dark Premium conservée)

**Typographie** — comparaison à 390 px dans `typographie/` (A Syne actuel, B Archivo condensé, C Archivo standard).
Retenu : **B**. Titres et prix en Archivo condensé 800 (déjà chargé par le site, aucun poids ajouté) ; Manrope pour la
lecture ; **Syne réservé au logo** (reconnaissance de marque). Échelle : héros 54–96 px, titre produit 30–46 px,
sections 30–56 px, corps 16 px, texte secondaire 13–15 px, étiquettes 12–13 px (plus rien sous 12 px hors balises
d'aperçu de développement).

**Couleurs** — fond #0b0b0c, 3 niveaux de surface (#141416, #1d1d20), ivoire #f4f0e8, laiton #c8a96a ; bordures
de contrôles #5f5d64 (≥ 3:1, WCAG 1.4.11) ; statuts : vert #7fcb9c (disponible, économie), ambre #eaa74a (stock
limité), rouge #f08a7e (erreur). Surfaces « offre » légèrement chaudes (#17140f) pour le pack.

**Espacement** — échelle 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 ; en-tête 56 px mobile / 72 px bureau ; cibles ≥ 44 px.

**Composants** — boutons pilule 56–58 px pour l'achat, choix d'offre en 2 tuiles, tailles 48 px (4 colonnes sous
360 px), pastilles couleur 44 px, accordéons, cartes de garanties, frise de livraison, carrousel d'avis.

**Animations** (CSS, 120–260 ms, transform/opacity, coupées si « réduire les animations ») — pression sur les choix,
tiroir panier qui glisse, confirmation « Ajouté au panier », pastille du panier, ouverture des accordéons, menu.
La bibliothèque `motion` a été **retirée** (48 Ko de JavaScript en moins).

## 3. Ce qui a changé

- **Fiche produit** (`components/store/pdp/`) : photo raccourcie avec pastilles de couleur, titre, note réelle
  cliquable, prix + « ou 2 pour 24,95 € », stock réel, **date de livraison** (jours ouvrés, fériés), offre 1 / 2 vestes
  (−38 %, −15,03 €), couleur, taille, guide, bouton avec montant, **retour 15 jours sous le bouton**, contact, frise
  Commande → Expédition → Livraison, garanties dépliables, avis (carrousel mobile, grille bureau), FAQ, autres coloris,
  barre d'achat collante (« Choisir ma taille » tant qu'aucune taille n'est choisie, jamais au-dessus des options).
- **Accueil** : titre + line-up des 6 coloris + note + prix 19,99 € / 24,95 € + 2 boutons au 1er écran ; bandeau de
  garanties ; collection en cartes avec bouton visible ; pack expliqué (39,98 € → 24,95 €) ; la veste ; avis ; FAQ et
  contact (champs avec étiquettes visibles).
- **En-tête / menu** : en-tête compact, icône panier avec compteur ; menu = les 6 vestes en vignettes, le pack, l'aide.
- **Tiroir panier** : confirmation de l'ajout (articles choisis), suggestion honnête du pack (+4,96 €), date de
  livraison, retour 15 jours, « Commander · total », « Continuer mes achats ».
- **Panier / commande** : total dans le bouton, rappels livraison/retour/paiement ; formulaire avec claviers mobiles
  adaptés (e-mail, téléphone, code postal), autocomplétion, capitalisation, messages d'erreur lisibles, bloc « Après
  l'envoi ». Le traitement de commande n'a pas changé.
- **Retours & remboursements** (`/retours-remboursements`) : nouvelle page publique, liée depuis la fiche, la FAQ, le menu
  et le pied de page. Les points non confirmés ne sont **pas affichés en production** (marqués « À confirmer » en
  développement). **Livraison** (`/livraison-retours`) reconstruite sur les mêmes données.
- **Cohérence** : tous les textes « retour » viennent de la politique (15 jours) ; le bandeau d'annonce est aligné
  automatiquement ; plus aucune promesse « retour gratuit » non confirmée.

## 4. Mesures

**Lighthouse 12.8** (build de production local, base locale ; mobile = 4G lente et CPU ×4 simulés) :

| Page | Perf. mobile | Perf. bureau | Accessibilité | Bonnes pratiques | SEO | LCP mobile | CLS |
|---|---:|---:|---:|---:|---:|---:|---:|
| Accueil | 86–90 | 100 | 100 | 100 | 100 | 3,6–4,0 s | 0 |
| Fiche produit | 91 | 100 | 100 | 100 | 100 | 3,5 s | 0 |
| Retours | 95 | 100 | 100 | 100 | 100 | 2,9 s | 0 |

Site en ligne (même outil, réseau réel, version actuelle) : accueil 93 (LCP 2,7 s, CLS 0,072), fiche 90 (LCP 3,3 s).
Lecture honnête : la fiche est au même niveau, l'accueil a 3 à 7 points de moins (plus de photos et une police de
titre de 89 Ko au premier écran) ; le CLS passe de 0,072 à 0. **Le LCP < 2,5 s n'est pas atteint sur mobile simulé.**
Piste suivante : sous-ensemble de la police Archivo (titre) ou `font-display: optional`.

Optimisations faites : `motion` retiré (tiroir en CSS), Inter chargé seulement dans l'admin, Syne non préchargé et
réduit à 1 graisse, formulaires (et leur bibliothèque de validation) chargés à la demande, photos du héros préchargées.

**Recette** — `scripts/qa-storefront.ts` : 15/15 (1er écran à 320/375/390/414, barre collante, note → avis, pastilles
couleur, ajout + confirmation, pack + tailles obligatoires, prix serveur identique, formulaire de commande validé sans
envoi, menu + Échap, 15 jours partout, aucune mention « paiement sécurisé », clavier). `screenshots-storefront.ts` :
aucun défilement horizontal sur 31 combinaisons page × largeur (320 → 1440). TypeScript, ESLint, 25 tests unitaires,
build de production : OK. En production : `/design-review/*` et `/concepts/*` répondent 404, aucun marqueur
« À confirmer » ni « Aperçu ».

## 5. Limites et points à valider

- **Commande non soumise** pendant la recette (aucune écriture en base) ; page de confirmation inchangée et non
  capturée (il faut une vraie commande).
- **Avis** : la base locale n'en a pas ; les aperçus de développement affichent les 28 avis publiés en production
  (étiquetés). En production, la fiche lira la base comme aujourd'hui.
- **Pop-ups marketing** : désactivés dans les réglages ; ils héritent du nouveau style mais n'ont pas été recapturés.
- **Réglages à mettre à jour au déploiement** (admin) : texte du bandeau, résumé et détails « retours », FAQ admin
  (14 jours, « gratuit ») — l'interface ne les affiche plus, mais l'admin les contient encore.
- **À confirmer par la cliente** : conditions de retour (frais, emballage, remboursement, échange, colis abîmé, erreur),
  délai d'expédition et heure limite, quantités en stock, prestataire de paiement, délai de réponse du service client,
  adresse e-mail (la base locale affiche encore l'adresse par défaut ; la production utilise sales@riodistrict.store),
  mentions légales et CGV.
