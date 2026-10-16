# Passation — intégration du paiement

État par défaut : **paiement hébergé désactivé**. Everflow dispose d’une capacité de
redirection distincte de l’interface de paiement authentifiée. Le simulateur local ne
réalise aucun débit. Aucune donnée bancaire n’est collectée. Lorsque l’intégration est
désactivée, les commandes restent des *demandes* :

| Champ | Valeur à la création |
|---|---|
| `status` (exécution) | `pending_confirmation` |
| `paymentStatus` | `awaiting_payment_setup` |
| `payment.provider` | `null` |

Les statuts de commande et de paiement sont **indépendants** :

- `status` : `pending_confirmation → confirmed → fulfilled`, ou `cancelled` (libère le stock).
- `paymentStatus` : `awaiting_payment_setup | unpaid | pending | paid | failed | refunded`.

Un admin peut, en attendant, marquer « Payée » une commande réglée hors ligne (virement…) :
l'action demande une confirmation et est tracée dans l'historique. Le tableau de bord ne compte
comme « encaissé » que les commandes `paid`.

## Points d'extension déjà en place

| Élément | Fichier |
|---|---|
| Interface `PaymentProvider` (`createSession`, `verifyWebhook`) | `src/lib/payments/index.ts` |
| Sélection du prestataire via `PAYMENT_PROVIDER` | `getPaymentProvider()` (renvoie `null` aujourd'hui) |
| Modèle `PaymentAttempt` (order, provider, providerRef unique, statut, montant, payload) | `src/models/misc.ts` |
| Application idempotente d'un évènement **vérifié**, contrôle montant/devise | `src/lib/payments/apply.ts` |
| Endpoint webhook (répond 501 tant que rien n'est configuré) | `src/app/api/payments/webhook/[provider]/route.ts` |

## Étapes pour brancher un prestataire (ex. Stripe Checkout, Mollie, PayPlug)

1. Créer `src/lib/payments/<prestataire>.ts` implémentant `PaymentProvider` :
   - `createSession({ orderId, orderNumber, amountCents, currency, customerEmail, successUrl, cancelUrl })`
     → crée la session chez le prestataire avec **le montant lu depuis la commande en base**
     (`order.totalCents`), jamais depuis le navigateur.
   - `verifyWebhook(rawBody, headers)` → vérifie la signature (secret webhook en variable
     d'environnement) et renvoie un `PaymentEvent` normalisé ; lève une erreur sinon.
2. L'enregistrer dans `getPaymentProvider()` pour `PAYMENT_PROVIDER=<id>`.
3. Après `createOrderRequest` (dans `src/app/api/orders/route.ts`), si un prestataire est actif :
   créer la session, insérer un `PaymentAttempt`, passer `paymentStatus` à `pending`, renvoyer
   `redirectUrl` au client ; `CheckoutView` redirige alors au lieu d'afficher la confirmation.
4. Déclarer l'URL `https://<domaine>/api/payments/webhook/<id>` chez le prestataire.
5. Gérer retour `successUrl` (page de confirmation existante, qui lit le statut en base — ne
   jamais considérer la redirection comme preuve de paiement) et `cancelUrl` (retour panier,
   commande conservée `unpaid`).
6. Adapter les textes : `Réglages → Mention paiement`, FAQ « Comment se passe le paiement ? »,
   pied de page. N'afficher un badge « paiement sécurisé » qu'une fois le flux testé de bout en
   bout en mode test **puis** en production.
7. Expiration des commandes impayées : uniquement après revue et tests d’une politique
   de rapprochement qui exclut un paiement en cours/déjà reçu avant de libérer le stock.

## Everflow redirect capability

Everflow now has a separate, feature-flagged hosted redirect implementation. It reuses
orders, server pricing, stock and `PaymentAttempt`, without implementing a fictitious
payment session or unsigned webhook. See [EVERFLOW_CHECKOUT.md](EVERFLOW_CHECKOUT.md).
`/api/payments/webhook/everflow` deliberately responds **501**; `applyPaymentEvent`
also refuses Everflow events until a verified authentication/mapping contract exists.
Only an authorized, documented manual reconciliation may change its payment status.

The interface described above remains the extension point for providers that actually
support authenticated payment events. `paymentsEnabled()` controls storefront wording;
it indicates selection of hosted checkout, not proof that a webhook or live payment is available.
Use `checkoutPresentation().available` for configuration readiness.
