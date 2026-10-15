# Audit visuel et affinage UI — 15/10/2026

Méthode : captures pleine page de l'application en cours d'exécution (Chrome local piloté par
`playwright-core`, `npm run screenshots`), avant et après affinage, comparées aux captures pleine
page de kaltshop.club aux mêmes largeurs (1440 px et 390 px). Les captures de la référence sont
dans `docs/screenshots/reference/` (non versionnées : visuels tiers, usage interne).

## 1. Comparaison avec la référence

### Là où la référence est plus forte

| Point | Constat |
|---|---|
| **Photographie produit** | Vraies photos sur mannequin, cohérentes : c'est son atout principal. Nos visuels restent des illustrations provisoires. Aucun travail d'interface ne compense des photos réelles. |
| **Hero** | Une bannière montre les 6 vestes et les deux prix (19,99 € / 24,95 €) en un coup d'œil. Notre hero d'origine ne montrait que 3 vestes dans un collage, et les prix étaient au second plan. |
| **Preuve sociale** | Avis avec photos clients et vidéos « en vrai ». Nous n'en affichons aucun tant que le client n'a pas confirmé qu'ils sont authentiques. Notre page inspire donc moins confiance de ce côté. |
| **Sélecteur de couleur** | Vignettes photo des 6 coloris sur la fiche, plus parlantes que nos pastilles de couleur d'origine. |
| **Bloc pack** | La carte du pack porte une pastille −38 % et un badge d'économie bien visibles. |
| **Densité mobile** | Page d'accueil mobile plus courte (≈ 5 670 px contre ≈ 7 580 px pour la nôtre avant affinage). |

### Là où notre version est plus forte

| Point | Constat |
|---|---|
| **Typographie** | Archivo condensé (axe `wdth`) + Inter, hiérarchie titre / sur-titre / corps nette et constante. La référence mélange Bebas et des corps de texte très petits. |
| **Grille** | Collection en 3 × 2 régulière. La référence a une grille 4 + 2 avec une dernière ligne orpheline sur desktop. |
| **Honnêteté** | Aucun faux compteur d'avis, faux stock ou compte à rebours. Pas de mention « paiement sécurisé » sans prestataire. La référence affiche ces éléments marqués « DÉMO ». |
| **Pied de page et contact** | Navigation par coloris, aide, e-mail. Le pied de page de la référence est quasi vide. |
| **Parcours d'achat** | Panier modifiable (couleur, taille, quantité), récapitulatif recalculé par le serveur, confirmation privée. La référence n'expose pas de panier observable. |
| **Pack** | Composition dans la fiche avec une couleur et une taille indépendantes par veste, résumé « Vert · M + Jaune · L » visible avant l'ajout. |

### À améliorer (avant affinage)

1. Les illustrations faisaient « clip-art » (manches collées au corps, effet cape). Une étiquette en police mono était incrustée dans l'image et devenait illisible en vignette.
2. Le hero ne montrait pas toute la gamme.
3. Les cartes produit répétaient un badge citron vert « 2 POUR 24,95 € » six fois. Sur mobile, le nom passait sur 3 lignes à côté du prix.
4. La fiche produit utilisait des pastilles de couleur. La carte pack n'avait aucun visuel. Le titre devenait « PACK 2 VESTES » en mode pack, ce qui faisait perdre le contexte du produit.
5. Mobile : grille des tailles sur 2 lignes, titre produit de 56 px, total invisible avant la fin du formulaire de commande.
6. Tablette 768 px : boutons du hero tronqués, et le titre de la FAQ chevauchait l'accordéon.
7. Le bloc éditorial affichait un zoom déformé de la capuche.

## 2. Affinages réalisés

| # | Changement | Fichiers |
|---|---|---|
| 1 | **Illustrations redessinées** : manches raglan écartées, col montant, poignets et bas élastiqués, coutures, plis, reflet nylon. Fond studio uni (`#EAE5DA`) qui permet de juxtaposer les vignettes. Étiquette retirée de l'image. | `scripts/placeholders.ts`, `public/products/*` |
| 2 | **Étiquette « Illustration provisoire »** rendue par l'interface sur l'image (galerie) et sous le bandeau du hero. Elle reste lisible à toutes les tailles. | `Gallery.tsx`, `page.tsx` |
| 3 | **Hero** : grand titre, puis prix en deux colonnes (veste / les 2 au choix) et deux CTA pleine largeur. **Bandeau studio des 6 coloris**, chaque veste menant à sa fiche, avec le prix au survol. Sur mobile et tablette, ordre : titre → vestes → texte → prix → CTA. | `(store)/page.tsx` |
| 4 | **Cartes produit** : badge répété supprimé, ligne « ou 2 pour 24,95 € » sous le prix, nom et prix empilés sur mobile, CTA au survol « Choisir ma taille ». | `ProductCard.tsx` |
| 5 | **Fiche produit** : sélecteur de couleur en vignettes image, tailles sur une seule ligne (7 colonnes) à toutes les largeurs, titre produit conservé en mode pack, carte pack avec les deux vestes choisies en miniature et pastille −38 %, frise honnête « Aujourd'hui · Par e-mail · Livraison estimée ». | `ProductPurchase.tsx`, `lib/delivery.ts` |
| 6 | **Commande mobile** : récapitulatif repliable avec total en haut du formulaire. Placeholder téléphone « Ex. … » pour ne pas ressembler à une valeur saisie. | `CheckoutView.tsx` |
| 7 | **Tiroir panier** : mention « aucun paiement aujourd'hui » sous le CTA. | `CartDrawer.tsx` |
| 8 | **Tablette** : les mises en page en 2 colonnes (hero, pack, détails, FAQ, contact) passent en une colonne sous 1024 px. Titres en 7xl → 8xl à partir de `lg`. | `page.tsx`, `Faq.tsx` |
| 9 | Fond studio sur toutes les vignettes (cartes, panier, admin). Badge de développement Next masqué. | divers, `next.config.ts` |

Non modifié volontairement : modèles de données, calcul des prix, logique du pack, stock, API,
authentification et pages d'administration (l'admin était déjà propre et efficace ; seules les
vignettes ont changé).

## 3. Avant / après (captures réelles)

| Page | Avant | Après |
|---|---|---|
| Accueil desktop | `before/desktop-1440-01-accueil.jpg` | `after/desktop-1440-01-accueil.jpg` |
| Fiche produit desktop | `before/desktop-1440-02-fiche-produit.jpg` | `after/desktop-1440-02-fiche-produit.jpg` |
| Fiche en mode pack | `before/desktop-1440-03-fiche-pack.jpg` | `after/desktop-1440-03-fiche-pack.jpg` |
| Accueil mobile | `before/mobile-390-01-accueil.jpg` | `after/mobile-390-01-accueil.jpg` |
| Sélection variante mobile | `before/mobile-390-03-selection-variante.jpg` | `after/mobile-390-03-selection-variante.jpg` |
| Sélection pack mobile | `before/mobile-390-04-selection-pack.jpg` | `after/mobile-390-04-selection-pack.jpg` |
| Commande mobile | `before/mobile-390-06-commande.jpg` | `after/mobile-390-06-commande.jpg` |
| Accueil tablette | `before/tablette-768-01-accueil.jpg` | `after/tablette-768-01-accueil.jpg` |

Jeu complet (21 captures chacun) : `docs/screenshots/before/` et `docs/screenshots/after/`.
Les pages d'administration sont capturées avec 3 commandes de démonstration clairement nommées
« (DÉMO) », créées via l'API (`npm run demo:orders`, suppression : `npm run demo:orders -- --clean`).

## 4. Problèmes restants (accessibilité / ergonomie)

- **Photos réelles et preuve sociale** : toujours le principal écart avec la référence. Il faut des
  photos sous licence et des avis vérifiés (voir `LIMITATIONS.md`).
- Les vignettes de couleur du pack utilisent encore des pastilles. C'est voulu (12 vignettes image
  alourdiraient le bloc), mais c'est moins explicite que dans le mode « veste seule ».
- Le tiroir panier modifie couleur et taille via des `<select>` natifs : accessibles et fiables,
  mais moins élégants que le reste de l'interface.
- La page d'accueil mobile reste plus longue que celle de la référence (≈ 7 270 px, contre 7 580 avant), car elle
  contient en plus le bloc détails, la FAQ et le contact.
- La couleur `muted` (#6B675E) sur fond papier donne un contraste de 4,9:1 (conforme AA pour le
  texte normal). Les mentions en 11 px restent petites : à relire sur un vrai téléphone.
- Non vérifié : Lighthouse, Safari / iOS, Firefox, appareils réels, lecteurs d'écran réels.
  Captures et tests faits uniquement dans Chrome (bureau, émulation mobile).
