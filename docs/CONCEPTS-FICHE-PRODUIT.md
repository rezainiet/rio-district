# Fiche produit — 3 concepts à valider

Maquettes fonctionnelles dans le projet (développement uniquement, **404 en production**, non
indexées). Mêmes produits, photos, prix et panier que la boutique.

- Index : `/concepts` · Concept A : `/concepts/vitrine/veste-bresil-vert` · B : `/concepts/confiance/…` · C : `/concepts/pack/…`
- `?stock=3` prévisualise l'état « stock limité » (affiché « Aperçu · stock simulé » sur la page).
- Projet de page Retours & remboursements : `/concepts/retours` (lien ajouté au pied de page en développement).
- Captures : `docs/screenshots/concepts-fiche/` (1440 px et 390 px). Les avis visibles sur les captures
  viennent de la base de démonstration et sont étiquetés « [Démo] ».

## Audit de la fiche actuelle

1. **Confiance trop basse dans la page** : aucune note ni nombre d'avis près du titre ; les avis
   n'apparaissent qu'après la fiche.
2. **Aucun signal de stock** : le message n'existe que si le stock est suivi et ≤ 3 ; les 6
   produits sont en « stock non suivi », donc rien ne s'affiche jamais.
3. **Livraison abstraite** : frise « Aujourd'hui / Par e-mail / dates » sans formulation claire
   « offerte et suivie, reçue entre le … et le … ».
4. **Retours réduits à une ligne** (« 14 jours ») sans explication de la démarche ni page dédiée.
5. **Zone d'achat en pile uniforme** : offre, couleur, taille et bouton ont le même poids ; la seule
   réassurance sous le bouton est une mention grise sur le paiement.

La référence KALT est meilleure sur la proximité des signaux de confiance (note, stock, livraison
sous le bouton). Les concepts reprennent ces idées en thème sombre, sans fausse urgence ni notes
« démo ».

## Les concepts

### A — Vitrine
*Intention* : garder la mise en page actuelle (galerie + colonne d'achat) en la recomposant
autour de la confiance.
*Premium* : prix en grand dans une bande dédiée, « ou 2 pour 24,95 € » en raccourci, cartes
d'offre plus aérées, accordéons épurés.
*Confiance / conversion* : note + nombre d'avis + achats vérifiés sous le titre ; ligne de stock
honnête ; sous le bouton : 3 coches (livraison offerte, retour 15 jours, rien à payer aujourd'hui),
carte livraison avec dates, carte retours avec la démarche ; bloc « Nos engagements » en 4 cartes.
*Risque* : le moins de changement pour les habitués, mais la page reste longue sur mobile.

### B — Confiance (recommandé)
*Intention* : la preuve sociale d'abord, puis **une seule carte d'achat** qui contient tout.
*Premium* : carte surélevée avec liseré laiton, sélecteur d'offre segmenté « 1 veste · 19,99 € |
Pack de 2 · 24,95 € », badge d'économie, pastilles de couleur, garanties intégrées.
*Confiance / conversion* : panneau note moyenne + avis mis en avant près du titre (état honnête
« Les premiers avis arrivent » s'il n'y en a pas) ; stock, bouton et les 4 garanties (livraison,
retour 15 jours, paiement après confirmation, service client) dans la même carte ; barre mobile
avec « Retour 15 jours · livraison offerte ».

### C — Pack Studio
*Intention* : mettre en avant l'offre la plus rentable, le pack.
*Premium* : configurateur deux vestes côte à côte avec grande photo par veste, récapitulatif
« Veste 1 + Veste 2 − remise = Total » façon ticket.
*Confiance / conversion* : calcul du prix transparent (39,98 € → 24,95 €, −15,03 €), stock et
coches sous le total, livraison + retours en pleine largeur ; la veste seule reste à un clic.
*Risque* : moins direct pour qui veut une seule veste ; idéal en page de destination « pack ».

## Recommandation

**B — Confiance** : c'est la seule qui place note, stock, bouton et garanties dans le même
champ de vision, sur ordinateur comme sur mobile, sans allonger la page. On peut lui ajouter le
récapitulatif chiffré du pack de C quand l'offre pack est choisie.

## Contenus à valider avant production

| Sujet | État | Décision attendue |
|---|---|---|
| Délai de retour | 15 jours (demande du client) | Le site actuel indique **14 jours** (bandeau, réglages, FAQ) : à aligner après validation |
| Politique de retour | Brouillon `settings.returnsPolicy` | Emballage d'origine exigé ? Frais de retour (client ou boutique) ? Délai de remboursement ? Échange de taille ? Colis endommagé ? Erreur d'article ? |
| « Paiement sécurisé » | Non utilisé | Aucun paiement n'est encaissé en ligne : formule utilisable seulement quand un prestataire sera branché. Remplacée par « Rien à payer aujourd'hui » |
| « Commande expédiée rapidement » | Remplacée par le délai réel (2 à 4 jours ouvrés après confirmation) | Fournir un engagement d'expédition (ex. 24/48 h) si souhaité |
| Message de stock | Fonctionne sur données réelles | Renseigner les **quantités réelles** par taille (aujourd'hui non suivies) ; seuil d'alerte actuel : 3 |
| Avis | 28 avis de référence en attente | Confirmation écrite d'authenticité et d'autorisation avant publication ; « Achat vérifié » seulement avec commande livrée |
| Ton | Le site tutoie | Textes fournis au vouvoiement adaptés au « tu » ; confirmer le choix |
| E-mail de contact | Manquant | Nécessaire pour la page Retours et le pied de page |

## Technique

- Contenu de la politique : `src/lib/policies.ts` (valeurs `null` = « À confirmer » affiché).
- Blocs partagés : `src/components/concepts/` (logique d'achat identique à la fiche actuelle).
- Aucun changement sur la fiche en ligne, le panier, la commande ou l'admin.
- Contrôles : typecheck, lint, 20 tests unitaires, 9 tests HTTP, recette mobile de la fiche actuelle
  inchangée, captures + ajout au panier réel sur chaque concept (19,99 € / pack 24,95 €), aucun
  débordement ni erreur JavaScript, routes en 404 dans un build de production.
