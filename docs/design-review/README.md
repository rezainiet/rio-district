# Fiche produit — audit KALT et 3 concepts (revue client)

Date de l'audit : 16 octobre 2026. Rien n'est publié : les prototypes répondent en **404 en production**,
la boutique en ligne, le panier, la commande, l'admin et la base de production ne sont pas modifiés.

| | |
|---|---|
| Page de comparaison (dev) | `/design-review` |
| Concept 01 — Trust-First Commerce | `/design-review/product-01?demo=1` |
| Concept 02 — Premium Fashion Commerce | `/design-review/product-02?demo=1` |
| Concept 03 — Mobile Conversion Pro | `/design-review/product-03?demo=1` |
| Page Retours & remboursements (projet) | `/design-review/retours` |
| Captures des concepts | `docs/design-review/screenshots/` (vrai Chrome, script `scripts/screenshots-design-review.ts`) |
| Captures KALT et page actuelle | `docs/design-review/reference/` (**non versionné** : images d'un site tiers, régénérable avec `npx tsx scripts/audit-reference.ts`), `docs/design-review/current/` |
| Rapport de recette | `docs/design-review/qa.json` |

**Paramètres des prototypes.** Sans paramètre : uniquement les données réelles (ce que verrait un client
aujourd'hui). `?demo=1` : ajoute, **étiquetés « Aperçu »**, ce que la production n'a pas encore (une campagne
fictive avec une échéance fixe, un stock simulé de 7 pièces). `?avis=aucun` : état « aucun avis ». `?offre=pack`,
`?taille=M` : présélections comme sur la fiche en ligne. Chaque coloris a son URL (`/design-review/product-01/veste-bresil-noir`).

---

## 1. Audit de la référence KALT

Pages auditées dans Chrome à 390 px et 1440 px, défilées jusqu'au bas : accueil, veste verte, veste noire,
menu mobile, « Trouver ma taille », sélection du pack, bouton de commande, « Voir les autres avis ».
Aucune commande n'a été passée. Captures : `docs/design-review/reference/`.

### Ce que KALT fait bien (et que la cliente apprécie, à raison)

- **Tout ce qui rassure est au-dessus de l'offre** : titre → stock → note → date de livraison → offre → bouton.
- **Une date concrète** (« Livré entre 18 – 20 octobre ») plutôt qu'un délai abstrait.
- **Le pack est lisible en 1 seconde** : badge −38 %, pastille verte « 15,03 € d'économie », prix barré 39,98 €.
- **Une barre d'achat mobile toujours présente**, qui suit l'offre choisie (« 24,95 € LES 2 »).
- **Frise Commande → Expédition → Livraison** et **3 cartes** Livraison / Paiement / Retours sous le bouton.
- **Avis avec photos** en mosaïque, **vidéos clients**, FAQ courte.

### Ce que KALT fait mal (à ne pas copier)

| Constat (vérifié dans le navigateur) | Risque |
|---|---|
| Le bouton « Passer commande » mène à **google.com** : il n'y a ni panier ni commande. | Boutique non fonctionnelle |
| Le compte à rebours **repart** : 08:14:44 puis 04:09:33 une dizaine de minutes plus tard. Ce n'est pas une vraie échéance. | Fausse urgence (pratique commerciale trompeuse) |
| « 4,92 · +323 avis vérifiés », « Il ne reste que 7 articles » : marqués **DÉMO** dans le code (balises de 8 à 10 px). | Chiffres non réels |
| « Paiement sécurisé et crypté » alors qu'aucun paiement n'existe. | Affirmation infondée |
| La taille **XS est présélectionnée** : un client pressé commande la mauvaise taille. | Retours évitables |
| Le message de stock **disparaît** quand on choisit le pack. | Incohérence |
| Date « 18 – 20 octobre » pour une commande le vendredi 16 : expédition le **samedi**, livraison possible le **dimanche** (jours calendaires). | Promesse intenable |
| Aucun e-mail, aucune mention légale, aucunes CGV, aucune page retours ; le pied de page ne contient que le logo. | Confiance, obligations légales |
| Pas de note moyenne détaillée ni de répartition ; pas de badge « achat vérifié » par avis. | Preuve sociale invérifiable |

### Matrice de référence

Légende « Source » : **V** = vérifié dans la base Rio District · **C** = fourni / à confirmer par la cliente · **D** = démonstration.

| # | Fonction | Emplacement KALT | Contenu visible | Poids | Interaction | Rio District actuel | Correct ? | Amélioration (concepts) | Source |
|---|---|---|---|---|---|---|---|---|---|
| A1 | Photos produit | Haut de fiche, carrée arrondie (mobile 350 px) | 1 photo par coloris | Fort | Aucune (pas de zoom) | Oui, 4:5 pleine largeur | Trop haute sur mobile : prix hors du 1er écran | Photo raccourcie (01 6:5, 03 10:9), ou infos sur la photo (02) ; zoom conservé | V (photos autorisées) |
| A2 | Nom du produit | Sous la photo | « Veste Brésil Vert » | Fort | — | Oui | Oui | Inchangé, taille réduite sur mobile | V |
| A3 | Description | Sous le bouton | 1 phrase | Faible | — | Accroche + accordéon | Oui | Accroche en tête, description en accordéon | V |
| A4 | Prix | Dans l'offre + gros prix au-dessus du bouton | 19,99 € TTC livraison incluse | Fort | Suit le pack | Oui, sous le titre | Oui | Prix suit l'offre partout (titre, total, barre mobile) | V |
| A5 | Coloris | Vignettes photo ×6 | 6 coloris | Moyen | Change de page | Oui (vignettes) | Oui | Conservé ; pastilles rapides en 03 abandonnées (doublon) | V |
| A6 | Taille | Liste déroulante | XS présélectionnée | Fort | Select | 7 boutons, rien de présélectionné | **Mieux que KALT** | Conservé + stock par taille sous le sélecteur | V |
| A7 | Trouver ma taille | Bouton sous les vignettes | Taille/poids → taille + tableau | Moyen | Fenêtre | Oui (même simulateur) | Oui | Lien à côté de chaque sélecteur de taille | V |
| A8 | Veste seule | 1re carte radio | 19,99 € | Fort | Radio | Oui | Oui | Conservé | V |
| A9 | Pack 2 vestes | 2e carte radio | 24,95 € · −38 % · 15,03 € d'économie · 39,98 € barré | Fort | Radio | Oui | Oui, mais pastille d'économie peu visible | Pastille verte (01), tuiles (02), choix 1/2 vestes côte à côte avec « soit 12,48 € la veste » (03) | V (prix serveur) |
| A10 | Couleur + taille par veste du pack | Veste 1 / Veste 2 | Select + vignettes | Fort | — | Oui | Oui | Carte par veste avec vignette, couleur, taille, stock | V |
| B1 | Compte à rebours en-tête | Header fixe | « 2 VESTES · 24,95 € Fin dans 08:14:44 » DÉMO | Fort | Repart | Système admin réel, **aucune campagne active** | Oui (ne montre rien sans campagne) | Barre collante sous l'en-tête (03) — uniquement si campagne réelle | D chez KALT / C pour nous |
| B2 | Compte à rebours de l'offre | Au-dessus du pack | « Offre limitée · encore 08:14:44 » | Moyen | Repart | Bandeau fin si campagne | Oui | Ligne compacte au-dessus de l'offre (01), dans le panneau (02) | C |
| B3 | Stock faible | Sous le titre, orange | « Il ne reste que 7 articles disponibles » DÉMO | Fort | Disparaît avec le pack | ≤ 3 par taille seulement ; stock non suivi → **jamais affiché** | Honnête mais invisible | Ligne de statut sur le stock réel (seuil 10), globale puis par taille ; neutre « Disponible » si non suivi | D chez KALT / V pour nous |
| B4 | Badge promo | Carte pack | −38 % | Moyen | — | Oui | Oui | Conservé | V |
| B5 | Bandeau collant | Header fixe | Offre + chrono | Moyen | Toujours visible | Bandeau non collant | — | 03 : barre collante seulement pendant une campagne | C |
| C1 | Note près du titre | Sous le stock | « ★ 4,92 · +323 avis vérifiés » DÉMO | **Très fort** | Aucun lien | **Absent** (avis en bas de page) | Non | Note + nombre d'avis réels, cliquable → section avis | V : 28 avis publiés, 4,9 |
| C2 | Nombre d'avis | Idem | 323 | Fort | — | En bas | Non | Idem | V |
| C3 | Témoignages | Section « Ils l'ont adoptée » | 6 cartes photo + « Voir les autres avis » | Fort | Charge la suite | 6 cartes texte + « Voir plus » | Oui | Mosaïque photo (01), citation mise en avant + carrousel (02), carrousel au pouce (03) | V |
| C4 | Photos clients | Dans les cartes | Photos | Fort | — | Oui (production) | Oui | Photo en tête de carte, agrandissable | V (autorisation écrite du 16/10) |
| C5 | Badge achat vérifié | Global (« avis vérifiés ») | — | Moyen | — | Par avis, si commande livrée | Oui (aucun aujourd'hui) | Affiché seulement quand vrai | V |
| C6 | Résumé / répartition | — | Absent | Moyen | — | Oui (4,9 · répartition) | **Mieux que KALT** | Conservé | V |
| C7 | Vidéos clients | Section dédiée | 3 vidéos 9:16, son | Moyen | Lecture | Absent | — | Emplacement prêt, **masqué** tant qu'aucune vidéo n'est autorisée | C |
| D1 | Date estimée | Carte sous la note | « Livré entre 18 – 20 octobre » | **Très fort** | — | « Livraison estimée… » en bas de zone d'achat | Faible visibilité | « Commande aujourd'hui, livrée entre le 20 et le 22 octobre » au-dessus de l'offre | C (délais) |
| D2 | Livraison gratuite | Même carte | « Livraison gratuite » | Fort | — | Oui | Oui | Dans la carte de date | V (réglage 0 €) |
| D3 | Frise | Sous le bouton | Commande Aujourd'hui → Expédition 17 oct. → Livraison 18–20 oct. | Moyen | — | Frise abstraite (« par e-mail ») | Faible | Frise datée en jours ouvrés (week-ends, fériés, heure limite), compacte sur mobile | C |
| D4 | Carte livraison | 3 cartes | « Gratuite et suivie, 2-4 jours » | Moyen | — | Ligne de texte | Faible | Carte Livraison détaillée | C |
| D5 | Suivi de commande | — | Absent | Faible | — | E-mail | — | « Suivi envoyé par e-mail » dans la frise | V |
| E1 | Politique de retour | Carte + FAQ | « Sous 14 jours » | Fort | — | « 14 jours » partout | **Non** (cliente : 15 jours) | « Retour possible sous 15 jours après réception » partout | C (15 jours confirmé) |
| E2 | Retour près du bouton | Non (carte plus bas) | — | Fort | — | Ligne grise | Faible | Ligne dédiée **juste sous le bouton** + lien Conditions | C |
| E3 | Remboursement | Absent | — | Moyen | — | Absent | Non | Page Retours & remboursements, FAQ « Quand suis-je remboursé ? » | C (délai à confirmer) |
| E4 | Aide / contact | Menu → /#contact | Aucun e-mail | Moyen | — | E-mail + formulaire (pied de page) | Oui | Carte « Une question ? » à côté de la FAQ | V |
| F1 | Bouton d'achat | Sous le prix | « PASSER COMMANDE » → google.com | **Très fort** | Aucun panier | « Ajouter au panier · 19,99 € » → panier → commande | **Mieux que KALT** | Montant dans le bouton, retour 15 jours sous le bouton | V |
| F2 | Barre mobile collante | Bas d'écran, dès le 1er écran | Nom, prix, bouton | Fort | Suit le pack | Après le bouton seulement | Oui | Visible dès le 1er écran, **cachée sur les options** (ne couvre jamais une taille), « Choisir ma taille » si aucune taille | V |
| F3 | Hiérarchie pack | Veste seule par défaut | — | Fort | — | Idem | Oui | Idem ; 03 met les deux offres côte à côte | V |
| F4 | Retour d'interaction | Aucun (taille présélectionnée) | — | Moyen | — | Message d'erreur + défilement | **Mieux** | Conservé, message par veste du pack | V |
| F5 | Infos avant achat | Note, stock, date au-dessus de l'offre | — | Fort | — | Sous le bouton | Non | Au-dessus de l'offre (01, 02) ou dans la carte d'achat (03) | V/C |
| G1 | Contact | — | Absent | Fort | — | E-mail en pied de page | Oui | Carte service client + liens | V |
| G2 | FAQ | Bas de fiche | 5 questions | Moyen | Accordéon | 5 questions (14 jours) | Partiel | 8 questions : délais, taille, retour 15 j, remboursement, dispo, pack, paiement, contact | C |
| G3 | Service client | — | Absent | Moyen | — | Formulaire | Oui | Délai de réponse à confirmer | C |
| G4 | Engagements livraison | Cartes | « 2-4 jours » | Moyen | — | Texte | Oui | Cartes | C |
| G5 | Identité de l'entreprise | — | Absente | Fort | — | Absente | **Non** | Mentions légales à créer | C |
| G6 | Liens légaux | — | Absents | Fort | — | Livraison & retours uniquement | **Non** | Retours & remboursements créée ; CGV / mentions légales à créer | C |
| G7 | Paiement | Carte | « Sécurisé et crypté » | Fort | — | « Paiement en ligne bientôt disponible » | **Oui (honnête)** | « Rien à payer aujourd'hui » tant qu'aucun prestataire n'est branché | V |
| G8 | Fenêtres | Menu, Trouver ma taille | — | — | — | Idem + pop-ups (désactivés) | Oui | Aucun pop-up sur la fiche des concepts | V |

---

## 2. Pourquoi la fiche actuelle est plus faible

Mesuré sur `/produit/veste-bresil-vert` à 375, 390, 768 et 1440 px, et sur riodistrict.store (390 / 1440 px).
Captures : `docs/design-review/current/`.

| Question | Réponse franche |
|---|---|
| Comprend-on tout de suite ce qu'on vend ? | Sur ordinateur, oui. Sur mobile, le 1er écran n'est **que la photo** (4:5 pleine largeur) et le titre. |
| Le prix est-il clair ? | Oui, mais **sous le pli** sur mobile. |
| Avis et preuve sociale visibles ? | **Non.** 28 avis publiés (4,9/5) en production, mais seulement après toute la zone d'achat. Rien près du titre. |
| Stock visible ? | **Jamais** : message seulement si ≤ 3 par taille, et aucune taille n'est suivie. |
| Sait-on quand ça arrive ? | Une date existe (« 20 – 22 oct. ») mais dans une frise abstraite, **sous** le bouton. |
| Le retour rassure-t-il ? | Une ligne grise « 14 jours » ; la cliente veut 15 jours ; aucune page dédiée. |
| Le pack est-il compréhensible ? | Oui (−38 %, 15,03 €), mais l'économie est un petit texte doré. |
| L'action d'achat est-elle évidente ? | Oui. La barre mobile n'apparaît qu'après le bouton. |
| Mobile professionnel ? | Correct mais trop « vitrine » : beaucoup d'espace, peu d'information au-dessus du pli. |
| Surcharge ou manque ? | **Manque** : note, stock, date, retour 15 jours, garanties près du bouton. |
| Pop-ups / éléments collants gênants ? | Non (pop-ups désactivés). |
| Le thème sombre nuit-il ? | Peu : le contraste est bon ; le défaut vient des **textes gris de 11-12 px** pour les informations importantes. |
| Défaut technique | **Débordement horizontal à 768 px** causé par le pied de page (colonne e-mail), aussi en ligne. |

---

## 3. Les trois concepts

Les trois contiennent **la même information** : note et nombre d'avis réels cliquables, stock réel, date de
livraison calculée, offre seule / pack avec économie et pourcentage, couleur et taille par veste, bouton avec
montant, retour 15 jours sous le bouton, frise Commande → Expédition → Livraison, cartes Livraison / Paiement /
Retours, avis avec photos et répartition, emplacement vidéos, FAQ 8 questions, carte service client, page
Retours & remboursements, barre mobile collante. Ils diffèrent par la mise en page et le parcours.

### 01 — Trust-First Commerce (recommandé)
L'ordre de KALT, en plus clair. Mobile : photo raccourcie → titre → note → prix → stock → « Commande aujourd'hui,
livrée entre le 20 et le 22 octobre · livraison offerte et suivie » → compte à rebours compact (si campagne) →
offre → couleur/taille → total → bouton → retour 15 jours → frise → 3 garanties → avis en mosaïque.
Ordinateur : photo collante à gauche, colonne d'achat à droite.

### 02 — Premium Fashion Commerce
Scène éditoriale (grande photo, vignette des 6 coloris), panneau d'achat encadré façon maison de mode, offre
en tuiles « La veste / Le duo ». Sur mobile, nom, prix et note sont posés sur la photo. Après l'achat : bande
« De chez nous à chez toi » (frise éditoriale 01-02-03 datée + 3 cartes), avis avec citation mise en avant et
carrousel, FAQ en deux colonnes.

### 03 — Mobile Conversion Pro
Pour le visiteur venu d'une publicité : barre de campagne collante sous l'en-tête (si campagne), photo courte
avec pastilles « ★ 4,9 · 28 avis » et « Livraison offerte », titre et prix sur la même ligne, choix **1 veste /
2 vestes** en deux grandes tuiles (« −15,03 € »), sélection compacte, 3 garanties en pastilles sous le bouton,
frise compacte, puis directement les avis en carrousel. Ordinateur : la carte d'achat **reste à l'écran**
pendant le défilement (défilement interne si le pack l'allonge).

### Compte à rebours : où et comment
Système existant (Admin → Promotions) réutilisé tel quel : échéance enregistrée en base, horloge du serveur,
identique après rechargement, disparaît à l'échéance, rien sans campagne active. Placements : ligne au-dessus
de l'offre (01), dans le panneau d'achat (02), barre collante sous l'en-tête (03). L'aperçu utilise une
campagne **fictive étiquetée** finissant dimanche 23:59 (échéance fixe, ne repart pas).

> Le pack à 24,95 € est **permanent** dans les réglages. Un compte à rebours sur une offre permanente serait
> trompeur : à n'activer que pour une offre réellement limitée dans le temps.

---

## 4. Contrôle qualité

Script `scripts/screenshots-design-review.ts`, vrai Chrome, 375 / 390 / 768 / 1440 px, résultats dans `qa.json`.
Vérifié automatiquement pour chaque concept et chaque largeur :

- aucun défilement horizontal dû à la page, aucun titre qui déborde, aucun texte sous 11 px ;
- barre mobile : **cachée tant que les options sont à l'écran**, visible après, une seule barre, collée au bas
  (zone de sécurité respectée), « Choisir ma taille » ramène au sélecteur (aucune taille ajoutée par défaut) ;
- la note défile jusqu'aux avis ; taille M → panier 19,99 € ; pack sans taille refusé avec message, puis
  M + L → panier 24,95 € (prix recalculés par le serveur) ;
- textes du pack : 24,95 € · 39,98 € · 15,03 € · −38 % ;
- compte à rebours identique après rechargement ; **absent** sans campagne réelle ;
- en mode données réelles : aucune quantité inventée, aucune mention « sécurisé / crypté », **15 jours partout**
  (page, bandeau, pied de page) ; aucune erreur JavaScript ;
- page Retours & remboursements lisible à 390 et 1440 px, liée depuis le pied de page (en développement).

Revue visuelle des captures : corrigés en cours de route — « aviss » (pluriel), titres trop larges pour la police
Syne (« FRÉQUENTES. », « REMBOURSEMENTS »), carrousel collé au bord, cartes de garanties trop hautes, emplacement
vidéo trop grand, barre mobile restant cachée derrière l'en-tête.

Reste connu : **le pied de page existant déborde de 7 px à 768 px** (aussi sur la boutique en ligne) — correctif
proposé séparément. Le bandeau d'annonce des aperçus est rendu sous l'en-tête (au lieu de dessus) parce que le
bandeau en ligne dit encore « 14 jours ».

---

## 5. Notation

| Critère (poids) | KALT (réf.) | Actuel | **01** | 02 | 03 |
|---|---:|---:|---:|---:|---:|
| Confiance client (30 %) | 6,0 | 5,0 | **9,0** | 8,0 | 8,5 |
| Clarté de l'information (25 %) | 8,5 | 6,0 | **9,0** | 7,5 | 8,5 |
| Achat sur mobile (20 %) | 8,0 | 6,0 | 8,0 | 7,0 | **9,5** |
| Qualité visuelle premium (15 %) | 7,5 | 8,0 | 7,5 | **9,5** | 7,5 |
| Faisabilité (10 %) | — (10) | 10 | **9,5** | 8,0 | 8,0 |
| **Total / 10** | 7,7 | 6,4 | **8,6** | 7,9 | 8,5 |

- **KALT** : excellente hiérarchie, mais chiffres de démonstration, chrono qui repart, paiement « sécurisé »
  sans paiement, pas de panier, pas d'identité légale. Sa note de confiance réelle est basse.
- **01** améliore tout ce qui manque à la fiche actuelle sans rien inventer, réutilise presque tout l'existant.
  À travailler : un peu long sur mobile ; la photo raccourcie coupe le haut du mannequin.
- **02** est le plus beau, mais sur mobile la date de livraison arrive après la photo et le panneau ; plus de
  code nouveau (scène, tuiles, citation).
- **03** est le plus rapide sur téléphone (offre, taille et garanties en un écran et demi) ; plus dense, et
  sur ordinateur la carte d'achat collante défile en interne quand le pack est choisi.
- Aucun concept n'est « meilleur que KALT » sur tous les points : KALT reste plus aéré au premier écran mobile.

## 6. Recommandation

**Concept 01 — Trust-First Commerce**, avec deux emprunts possibles : le choix « 1 veste / 2 vestes » côte à
côte de 03 (économie plus visible) et la barre de campagne collante de 03 quand une vraie campagne tourne.
C'est la réponse la plus directe à la critique : même ordre d'information que KALT, mais avec des données
réelles, une vraie commande, un retour à 15 jours visible et une date de livraison tenable.

---

## 7. Systèmes existants réutilisés (aucune refonte de la base)

| Besoin | Réutilisé |
|---|---|
| Prix, pack, validation | `lib/pricing.ts` (serveur), `StoreProvider` (panier), `/api/cart/quote`, `/api/orders` — inchangés |
| Avis | Modèle `Testimonial`, `lib/reviews.ts`, modération admin, `ReviewForm`, photos `/uploads/reviews` |
| Note moyenne, répartition | `summarizeRatings`, seuil `MIN_REVIEWS_FOR_DISTRIBUTION` |
| Compte à rebours | `settings.countdown`, `countdownFor`, `useRemaining` (désormais exporté) |
| Stock | Champ `sizes[].stock` du produit (Admin → Produits), décrément à la commande déjà en place |
| Tailles | `SizePicker`, `Swatches`, `SizeGuide` + simulateur |
| Politique de retour | `settings.returnsPolicy` (brouillon structuré, valeurs `null` = « À confirmer ») |
| Nouveau (petit) | `lib/delivery-plan.ts` (jours ouvrés, fériés FR, heure limite, `settings.dispatch`), `lib/stock-status.ts` (messages de stock, seuil 10) |

**Avis dans les aperçus.** La base locale n'a aucun avis publié ; la production en a 28, importés depuis
`scripts/data/reference-reviews.json` après la confirmation écrite de la cliente (16/10/2026). Les aperçus lisent
ce même fichier **en lecture seule** quand la base est vide (étiquette « Aperçu · les 28 avis publiés en
production ») : rien n'est écrit en base. Aucun badge « Achat vérifié » n'est affiché pour ces avis.

## 8. Informations à faire valider par la cliente

| Sujet | Aujourd'hui | Décision attendue |
|---|---|---|
| Délai de retour | 15 jours (demande cliente) dans les concepts ; **14 jours** en ligne (bandeau, réglages, FAQ, accueil, panier) | Valider 15 jours → mise à jour des réglages à l'application |
| Conditions de retour | Non porté, étiquettes : oui | Emballage d'origine exigé ? Frais de retour (client / boutique) ? Délai de remboursement ? Échange de taille ? Colis endommagé ? Erreur d'article ? |
| Droits légaux | Mention « s'ajoute à tes droits légaux » | Formulation juridique, formulaire de rétractation |
| Délais d'expédition | 1 jour ouvré de préparation + 1 à 3 jours de transport (= 2 à 4 jours actuels) | Délai réel de préparation, transporteur, **heure limite** de commande, jours de fermeture |
| Livraison | Offerte et suivie, France métropolitaine | Zones (Corse, DOM, Belgique…) et transporteur |
| Stock | Aucune taille suivie → « Disponible » neutre | Saisir les **quantités réelles** par taille dans Admin → Produits ; valider le seuil d'affichage (10) |
| Campagne / compte à rebours | Aucune campagne active | Uniquement pour une offre réellement limitée : titre, date de fin, offre concernée |
| Paiement | Demande de commande, paiement après confirmation | Prestataire et moyens acceptés (CB, PayPal…) ; d'ici là pas de mention « sécurisé » |
| Service client | Formulaire + e-mail | Délai de réponse, horaires, téléphone éventuel |
| E-mail affiché | Production : sales@riodistrict.store ; la base locale affiche encore l'adresse par défaut | Confirmer l'adresse du service client |
| Identité légale | Absente | Raison sociale, SIRET, adresse, hébergeur → mentions légales ; CGV |
| Vidéos clients | Aucune | Fournir les vidéos avec l'autorisation des personnes filmées |
| Ton | Le site tutoie ; le texte retour fourni vouvoie (adapté au « tu ») | Confirmer tu / vous |

## 9. Technique

- Routes : `src/app/(store)/design-review/` (index, `[concept]/[[...slug]]`, `retours`, `captures/[file]`),
  toutes protégées par `designReviewEnabled()` → 404 quand `NODE_ENV=production` (sauf `DESIGN_REVIEW_ENABLED=1`
  explicite sur un environnement privé), `noindex`.
- Composants : `src/components/design-review/` (blocs partagés, 3 concepts, état d'achat).
- Modifications hors prototypes, sans effet visible en production : `defaults.ts` (réglage `dispatch` par défaut),
  `Countdown.tsx` (export de `useRemaining`), `AnnouncementBar.tsx` (attribut `data-announcement`), lien de pied de page
  vers la page Retours en développement uniquement.
- Contrôles : `npm run typecheck`, `npm test` (25 tests dont dates de livraison et stock), lint des nouveaux fichiers,
  `npx tsx scripts/screenshots-design-review.ts` (dev en cours).
- Ancienne série `/concepts/...` (A Vitrine, B Confiance, C Pack) : remplacée par cette revue, à supprimer après validation.
