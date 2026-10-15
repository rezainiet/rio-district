# Audit du site de référence — kaltshop.club

Inspecté le 15/10/2026 avec un navigateur réel (desktop + mobile 375 px).
Pages visitées : `/`, `/produit/veste-bresil-vert`, `/produit/veste-bresil-noir`.
Aucun achat, aucune donnée client soumise.

## Fonctionnalités confirmées (observées)

| Zone | Constat |
|---|---|
| Header | Logo « KALT », pastille promo « 2 VESTES · 24,95 € » + compte à rebours **étiqueté DÉMO**, lien SHOP, menu burger mobile |
| Hero | Bannière image unique (« Vestes Brésil »), lien « Voir les avis » |
| Bandeau défilant | « Livraison gratuite 2-4 jours · Retours sous 14 jours · Paiement sécurisé » |
| Collection | « 6 coloris disponibles — Trouve la tienne. » 6 cartes : nom, prix 19,99 €, « ou 2 pour 24,95 € », CTA « Je la veux », note/avis **étiquetés DÉMO** |
| Promo pack | « Une seule couleur, c'est dur de choisir. Prends-en 2 pour 24,95 € et mélange les couleurs » → `/produit/veste-bresil-vert#pack` |
| Vidéos clients | 3 vidéos MP4 (`/temoignages/avis-1x.mp4`) |
| Avis | 6 avis texte (Imen D., Carla G., Shaima A., Hicham Q., Ayoub K., Julien) + 6 photos ; compteurs « 323 avis » **étiquetés DÉMO** |
| FAQ | 5 questions (délais, taille, retours, paiement, coloris) — textes repris dans `src/lib/defaults.ts` |
| Contact | Formulaire e-mail + message |
| Fiche produit | 1 image principale par coloris, vignettes = autres coloris (navigation entre fiches) |
| Choix d'offre | « La veste seule 19,99 € » / « Pack 2 vestes 24,95 € (39,98 € barré, -38 %, 15,03 € d'économie) » |
| Pack | Veste 1 / Veste 2 avec coloris indépendants (sélecteur de couleur) + taille indépendante (select XS→3XL) |
| Guide des tailles | Modale « Trouver ma taille » : taille (cm) + poids (kg) → taille conseillée ; tableau de mesures du vêtement (poitrine, tour de taille, dos, manche) |
| Livraison | Estimation « Livré entre 17 – 19 octobre », frise Commande → Expédition → Livraison |
| Mobile | Barre d'achat collante (nom, prix, « Passer commande ») |
| Badges | « Il ne reste que 7 articles » **DÉMO**, « Offre limitée · encore 02:39 » **DÉMO** |

Tableau de mesures relevé (cm) :

| Taille | Poitrine | Tour de taille | Dos | Manche |
|---|---|---|---|---|
| XS | 90–96 | 76–82 | 66 | 62 |
| S | 96–100 | 82–86 | 68 | 63 |
| M | 100–104 | 86–90 | 70 | 64 |
| L | 104–110 | 90–96 | 72 | 65 |
| XL | 110–116 | 96–102 | 74 | 66 |
| XXL | 116–122 | 102–108 | 76 | 67 |
| 3XL | 122–128 | 108–114 | 78 | 68 |

Réponses du simulateur observées (taille cm / poids kg → taille) : 155/45 XS · 160/55 S · 170/60 S · 175/70 M ·
178/75 L · 180/80 L · 185/90 XL · 190/100 3XL · 175/110 XXL · 165/85 L · 195/120 3XL.
Notre algorithme provisoire (`score = poids + (taille − 170)`, seuils configurables) reproduit ces 11 points ;
il reste **indicatif** tant que le client n'a pas fourni sa règle exacte.

## Non inspectable

- Panier / checkout / paiement : le bouton « Passer commande » ne mène nulle part sans aller plus loin dans un achat réel. Non testé volontairement.
- Contenu complet des « autres avis » et des vidéos (non réutilisables sans autorisation).

## Points juridiques et éthiques relevés

- Les **photos produits et la bannière portent des marques tierces** (écusson CBF, virgule Nike, logo Itaú). Elles ne sont pas réutilisées. Le client doit confirmer qu'il détient les droits de vente/visuels avant toute mise en ligne de ces articles.
- Compteurs d'avis, stock faible et compte à rebours sont **marqués DÉMO** sur la référence : ils ne sont pas recréés comme vrais signaux.
- « Paiement sécurisé et crypté » : non affiché tant qu'aucun prestataire de paiement n'est branché.
- Les 6 avis texte sont importés en base **non publiés** (`verified: false`) en attente de confirmation du client.

## Direction visuelle retenue

Streetwear éditorial français : fond papier chaud `#F3EFE6`, encre `#121212`, vert Brésil profond `#0E5C3A`,
accent citron vert `#D6F24B` utilisé avec parcimonie. Titres en Archivo condensé/étendu (axe `wdth`),
texte en Inter. Grilles aérées, bordures fines 1 px, rayons faibles (4–6 px), mouvements courts (≤ 300 ms),
`prefers-reduced-motion` respecté.

## Ordre de développement

1. Socle : modèles Mongo, logique de prix serveur, seed.
2. Système de design + page d'accueil.
3. Fiche produit (galerie, zoom, coloris, tailles, pack, guide), panier.
4. Checkout « demande de commande » sans paiement, API commande (recalcul serveur, stock atomique, idempotence).
5. Admin : auth, tableau de bord, commandes, produits, réglages, messages, avis.
6. QA navigateur mobile/desktop, documentation.
