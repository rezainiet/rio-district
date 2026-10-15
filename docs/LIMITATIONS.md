# Limites connues et éléments à fournir par le client

## Contenus à fournir / valider (bloquants pour une mise en ligne réelle)

1. **Photos produits sous licence.** Les visuels actuels sont des illustrations SVG originales,
   marquées « Visuel provisoire » sur l'image et sous la galerie. Les photos du site de référence
   n'ont pas été reprises : elles montrent des **marques tierces (écusson CBF, Nike, Itaú)**.
   Le client doit confirmer qu'il dispose des droits de commercialisation de ces articles et de
   leurs visuels. Remplacement : Admin → Produits → Images (décocher « Visuel provisoire »).
2. **Avis clients.** Les 6 avis du site de référence sont importés **non publiés** et non
   « vérifiés ». Ne les publier qu'avec la confirmation qu'ils proviennent de vrais clients.
   Aucune note moyenne ni nombre d'avis n'est inventé.
3. **Vidéos clients.** Section non affichée : aucune vidéo sous licence fournie.
4. **Guide des tailles.** Tableau de mesures repris de la référence ; le simulateur utilise un
   barème **provisoire** (calibré pour reproduire les 11 réponses observées sur la référence),
   affiché comme « estimation indicative ». À remplacer par la règle du fabricant
   (Admin → Réglages → Guide des tailles).
5. **Composition / entretien** des vestes : inconnus, champs vides (masqués sur la boutique).
6. **Stock réel** : non suivi (disponibilité illimitée) tant que le client ne saisit pas de
   quantités par taille.
7. **Promesses de livraison et de retour** (gratuite, 2–4 jours, 14 jours) reprises de la
   référence : à confirmer, modifiables dans les Réglages.
8. **Mentions légales, CGV, politique de confidentialité** : non rédigées (informations
   juridiques de l'entreprise nécessaires). À ajouter avant toute vente.

## Techniques

- **Paiement** non intégré (volontaire) — voir `docs/PAYMENTS.md`.
- **E-mails transactionnels** (confirmation client, alerte admin) non envoyés : aucun service
  d'e-mail fourni. Point d'accroche naturel : après `createOrderRequest` dans
  `src/app/api/orders/route.ts`.
- **Téléversement d'images** sur disque local (`public/uploads`) : à remplacer par un stockage
  objet sur un hébergement serverless.
- **Limiteur de fréquence** en mémoire (par instance).
- **Un seul rôle admin** effectif (`owner`) ; le champ `role` est prêt pour des rôles restreints.
- **Lighthouse** non exécuté dans cet environnement ; optimisations appliquées : `next/image`
  (AVIF/WebP, `sizes`), polices auto-hébergées `next/font`, images hors écran en lazy-load,
  pas de librairie UI lourde, animations limitées et désactivées avec `prefers-reduced-motion`.
- Pages rendues dynamiquement à chaque requête (données toujours fraîches) ; une mise en cache
  par tags pourra être ajoutée si le trafic l'exige.
- Pas d'interface de gestion des **catégories** (une catégorie « Vestes » est créée au seed ;
  le modèle et le champ produit existent).
- Le pack est fixé à **2 vestes** (comme la référence) ; le prix et le libellé sont réglables.
