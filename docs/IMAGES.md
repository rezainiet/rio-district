# Photos produits

## État actuel (16/10/2026)

Les illustrations SVG provisoires ont été remplacées par les photos de kaltshop.club.
**Autorisation** : confirmée le 16/10/2026 par le prestataire, au nom du client. Elle couvre la
réutilisation des photos et le droit de vendre les articles avec les marques tierces visibles
dessus (Nike, CBF, Itaú, Vivo). Elle est enregistrée dans
`scripts/data/reference-images.json` et `public/products/reference/SOURCES.json` (source,
dimensions, poids, SHA-256, date de récupération de chaque fichier).

| Produit | Fichier servi par l'app | Source d'origine | Taille | Vues |
|---|---|---|---|---|
| Veste Brésil Vert | `/products/reference/veste-bresil-vert-face.webp` | `kaltshop.club/products/sanziro-3.webp` | 1200×1200 · 52 Ko | 1 (face) |
| Veste Brésil Rose | `/products/reference/veste-bresil-rose-face.webp` | `kaltshop.club/products/sanziro-5.webp` | 1200×1200 · 51 Ko | 1 (face) |
| Veste Brésil Noir | `/products/reference/veste-bresil-noir-face.webp` | `kaltshop.club/products/sanziro-1.webp` | 1200×1200 · 44 Ko | 1 (face) |
| Veste Brésil Blanc | `/products/reference/veste-bresil-blanc-face.webp` | `kaltshop.club/products/sanziro-2.webp` | 1200×1200 · 43 Ko | 1 (face) |
| Veste Brésil Bleu | `/products/reference/veste-bresil-bleu-face.webp` | `kaltshop.club/products/sanziro-4.webp` | 1200×1200 · 55 Ko | 1 (face) |
| Veste Brésil Jaune | `/products/reference/veste-bresil-jaune-face.webp` | `kaltshop.club/products/sanziro-6.webp` | 1200×1200 · 52 Ko | 1 (face) |

Les fichiers sont conservés à l'identique (WebP d'origine, sans réencodage ni agrandissement).
`next/image` en sert des versions AVIF/WebP adaptées à chaque écran. Rien n'est chargé depuis
kaltshop.club.

**Vues manquantes** : la référence ne publie qu'**une photo par coloris**, de face, sur mannequin.
Il n'existe ni dos, ni détail, ni vue portée. La galerie s'adapte : sans miniatures ni points de
défilement quand il n'y a qu'une seule photo. À fournir par le client pour chaque coloris :
`dos`, `détail` (col, zip, logo), idéalement `porté`.

**Pastilles de couleur** : trois pastilles ont été recalées sur les photos (le nom des couleurs
n'a pas changé) : Vert `#1E6B45 → #9DD0CA` (la veste « Vert » est vert menthe), Bleu
`#27479A → #0B4A9E`, Jaune `#F2C824 → #E9E21A`.

## Migration (sûre et rejouable)

```bash
npm run images:fetch -- --confirm      # télécharge selon le manifeste (refuse sans autorisation enregistrée)
npm run images:migrate                 # simulation : affiche ce qui changerait
npm run images:migrate -- --apply      # met à jour uniquement images (+ pastille) des 6 produits
npm run images:migrate -- --revert     # restaure l'état précédent (sauvegardé dans imagemigrations)
```

- Les produits sont retrouvés par slug. Identifiants, prix, tailles, stock, statut et commandes
  ne sont pas touchés : comparaison avant/après identique.
- Un produit dont les photos ont été remplacées depuis l'admin est ignoré (sauf `--force`). Relancer
  la migration n'écrase donc jamais vos propres photos.
- `npm run seed` (y compris `--reset`) utilise ces photos quand elles sont présentes et autorisées.
  Les illustrations ne reviennent plus.
- Les commandes passées gardent l'instantané d'image enregistré au moment de la commande.

## Remplacer par vos propres photos

Admin → Produits → un produit → Images : « Téléverser des images » (JPG, PNG, WebP ou AVIF,
5 Mo maximum ; format portrait 4:5 conseillé), réordonner, retirer l'ancienne photo, puis
Enregistrer. Aucune modification de code n'est nécessaire.
