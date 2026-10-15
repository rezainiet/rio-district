# Résultats QA — 15/10/2026

Environnement : Windows 11, Node 22.13, Next.js 16.4.1 (Turbopack), MongoDB 8 local
(`npm run db:local`). Navigateur : panneau navigateur Chromium de l'app Claude (desktop 1440×900,
tablette 768×1024, mobiles 375×812 et 390×844). Safari/iOS et Firefox **non testés**.

## Automatisé

| Suite | Commande | Résultat |
|---|---|---|
| Types | `npm run typecheck` | ✅ 0 erreur |
| Lint | `npm run lint` | ✅ 0 erreur |
| Unitaires (prix, pack, stock, tailles) | `npm test` | ✅ 8/8 |
| Bout en bout HTTP | `npm run test:smoke` | ✅ 5/5 |
| Build production | `npm run build` | ✅ |

Couverture des tests unitaires : veste seule 19,99 € · pack mixte 24,95 € (sous-total 39,98 €,
remise 15,03 €) · quantités et frais de port · pack jamais plus cher que les articles · lignes
invalides (taille épuisée, produit inconnu, produit non éligible au pack, pack incomplet,
quantité > 10) · offre pack désactivée · agrégation du stock · simulateur de tailles = 11/11
réponses observées sur la référence.

Smoke test (serveur réel + base) : prix falsifiés ignorés · données client invalides → 422 ·
deux envois simultanés avec la même clé → une seule commande, statut `pending_confirmation` /
`awaiting_payment_setup` · **5 commandes simultanées pour le dernier article → 1 acceptée, 4
refusées (409), stock final 0** · commandes fermées → 403.

## Manuel (navigateur)

| Parcours | Résultat |
|---|---|
| Accueil : sections, ancres du menu, liens coloris, CTA pack | ✅ |
| 6 fiches produit (`/produit/veste-bresil-{vert,rose,noir,blanc,bleu,jaune}`) → 200 | ✅ |
| Slug inexistant → 404 réel ; jeton de confirmation inconnu → 404 | ✅ |
| Changement de coloris (navigation), taille conservée via `?taille=` | ✅ |
| Validation : ajout sans taille → message + défilement vers le champ | ✅ |
| Pack : Vert M + Jaune XL → panier 24,95 € (39,98 € barré, « Tu économises 15,03 € ») | ✅ |
| Simulateur de taille → suggestion appliquée à la sélection | ✅ |
| Panier : quantité ±, changement couleur/taille, retrait, persistance après rechargement | ✅ |
| Commande : erreurs de validation en français sur les 6 champs requis | ✅ |
| Commande valide → page « Merci, c'est noté », n° KALT-10001, « Non payée — aucun montant prélevé » | ✅ |
| Commande en base avec totaux recalculés serveur | ✅ |
| Formulaire de contact → 201, message visible dans Admin → Messages ; invalide → 422 | ✅ |
| Réglages : prix du pack 25,95 € enregistré → visible sur l'accueil et appliqué par le serveur (puis restauré) | ✅ |
| Téléversement image PNG → 201 et servie ; faux PNG (contenu SVG) → 415 | ✅ |
| `/admin` sans session → redirection login ; API admin sans session → 401 | ✅ |
| Mauvais mot de passe → 401 ; cookie de session non lisible en JS (HttpOnly) | ✅ |
| Transition interdite (à confirmer → expédiée) → 409 ; confirmer → OK + historique | ✅ |
| Note interne, recherche + filtre statut, export CSV | ✅ |
| Édition produit (stock M = 1) via le formulaire admin → « Produit enregistré. » | ✅ |
| Commande du dernier article → taille affichée épuisée sur la boutique | ✅ |
| Annulation admin → stock restitué (0 → 1) | ✅ |
| Aucun débordement horizontal à 375 px (accueil, fiche, pack, panier, commande, livraison) | ✅ |
| Menu mobile, barre d'achat collante (masquée au-dessus du pied de page) | ✅ |
| Console navigateur : aucune erreur applicative | ✅ |
| En-têtes `nosniff`, `Referrer-Policy`, `X-Frame-Options`, `X-Robots-Tag` sur /admin | ✅ |

Corrections faites pendant la QA : axe de largeur de police (`font-stretch` → `wdth`), menu
mobile invisible (le `backdrop-filter` de l'en-tête capturait le `position: fixed`), navigation
qui passait sur 2 lignes à 768 px (bascule menu mobile < 1024 px), grille des tailles trop serrée
en tablette, contenu du hero dépendant d'une animation d'entrée (supprimée), 404 renvoyé en 200 à
cause d'un `loading.tsx` en streaming (supprimé), `sizes` de la galerie mobile.

Toutes les commandes de test ont été supprimées de la base après la QA.

## Captures

Captures pleine page réelles : `docs/screenshots/before/` et `docs/screenshots/after/` (21 chacune :
desktop 1440, mobile 390, 375, tablette 768, admin). Voir `docs/VISUAL-AUDIT.md`.

## Revérification après l'affinage UI

Types ✅ · lint ✅ · unitaires 8/8 ✅ · smoke 5/5 ✅ · build ✅ · changement de coloris par vignette
conserve la taille et ajoute au panier ✅ · ajout du pack → tiroir ✅ (captures) · pages admin
chargées avec des commandes de démonstration ✅.

## Non vérifié

- Score Lighthouse (outil non disponible ici).
- Safari iOS / Firefox, lecteurs d'écran réels (structure ARIA vérifiée par l'arbre
  d'accessibilité uniquement).
