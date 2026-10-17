# Everflow local implementation report

Historical snapshot: results at completion of local implementation, before the later
production-rollout authorization. Git/deployment status below describes that snapshot.
For the existing-server update procedure see [DEPLOYMENT.md](DEPLOYMENT.md), §10.
The subsequent production deployment to the new canonical domain is recorded in
[DEPLOYMENT_2026-10-17.md](DEPLOYMENT_2026-10-17.md); live Everflow remains disabled.

Branch: `feat/everflow-checkout`, based on latest fetched main
`4b020abbf09bab6606509297ec473d0472685874`. Existing local storefront work was carried
forward intact. Changes are local and uncommitted; no push, deployment or production
database change was performed. Node: `v22.11.0`.

The normal store remains at `http://localhost:3000`. The isolated, explicitly labeled
payment simulator runs at `http://localhost:3001/commande`; add a single jacket or one
pack from that preview's product page if its cart is empty. The integrated browser has
the actual local simulation open after a Green/M + Black/L pack submission.

## A. Files changed for this integration

New:

- `docs/EVERFLOW_CHECKOUT.md`
- `docs/EVERFLOW_IMPLEMENTATION_REPORT.md`
- `src/lib/payments/everflow.ts`
- `src/lib/payments/hosted.ts`
- `src/app/api/payments/checkout/route.ts`
- `src/app/(store)/commande/paiement-test/[token]/page.tsx`
- `src/components/store/ResumeCheckout.tsx`
- `scripts/dev-everflow.ts`
- `scripts/lib/everflow-fixture.ts`
- `scripts/qa-everflow.ts`
- `tests/everflow.test.ts`
- `tests/integration/everflow.test.ts`
- `tests/server-only.cjs`

Modified (including existing local files):

- `.env.example`
- `.gitignore`
- `README.md`
- `docs/PAYMENTS.md`
- `eslint.config.mjs`
- `next.config.ts`
- `package.json` (scripts only; no dependency upgrades)
- `tsconfig.json` (Next's generated type paths for the isolated output)
- `src/instrumentation-node.ts`
- `src/lib/catalog.ts`
- `src/lib/types.ts`
- `src/lib/validation.ts`
- `src/lib/orders.ts`
- `src/lib/storefront.ts`
- `src/lib/payments/index.ts`
- `src/lib/payments/apply.ts`
- `src/models/Order.ts`
- `src/models/misc.ts`
- `src/app/api/orders/route.ts`
- `src/app/(store)/layout.tsx`
- `src/app/(store)/page.tsx`
- `src/app/(store)/commande/confirmation/[token]/page.tsx`
- `src/app/admin/(panel)/page.tsx`
- `src/app/admin/(panel)/reglages/page.tsx`
- `src/app/admin/(panel)/commandes/[id]/page.tsx`
- `src/components/admin/OrderActions.tsx`
- `src/components/admin/SettingsForm.tsx`
- `src/components/store/CheckoutView.tsx`
- `src/components/store/StoreProvider.tsx`
- `src/components/store/CartDrawer.tsx`
- `src/components/store/CartPageView.tsx`
- `src/components/store/pdp/CompactPurchase.tsx`

Other pre-existing local UI edits/assets remain in the working tree. `.env.local`,
the ordinary store data and the user's pasted reference image were not overwritten.
Ignored `.data/everflow-preview.json` holds only isolated fixture access details; it
and QA screenshots are not committed, and no password is printed in this report/logs.

## B. Checkout behavior

One single jacket, quantity 1, exactly EUR 1999 cents, free shipping → `TTF23GH`.
One bundle, quantity 1, exactly two items, EUR 2495 cents, free shipping → `TRSKRX3`.
`TRPS2FT` is rejected. Mixed carts, multiple lines/bundles, higher quantities, other
amounts/currencies, unavailable products/sizes, unsupported countries and invalid
destinations fail clearly. Nothing is silently removed from the cart. Amounts are
calculated from MongoDB; browser price/currency injection cannot change them.

The existing form now collects explicit Prénom/Nom. Hosted mode explains the external
handoff and uses “Continuer vers le paiement ↗”. Disabled mode keeps the unpaid request
flow. Enabled-but-invalid settings produce an error instead of falling back silently.

## C. Generated prefill example — fictional, never visited

Produced locally by `buildEverflowUrl` with fictional test data:

```text
https://www.molipy8trk.com/2J23GL9/TTF23GH/?sub10=Camille&adv3=de+la+Fiction&sub3=75001&sub4=camille%2Btest%40example.com&sub6=Paris&sub7=12+rue+de+la+Fiction%2C+B%C3%A2timent+Test&sub8=%2B33+6+00+00+00+00&adv1=Veste+Br%C3%A9sil+Vert&adv2=https%3A%2F%2Friodistrict.store%2Fproducts%2Freference%2Fveste-bresil-vert-face.webp
```

Names, contact, combined street/apartment and product metadata use the exact supplied
mapping. Optional attribution and pixels are absent here. Country/notes remain local
because no provider mapping was supplied. No card data is collected.

## D. Existing orders, attempts and retries

Existing `Order` and `PaymentAttempt` are reused. A backend unique key is claimed before
stock reservation; five concurrent identical submissions produced one order, one
attempt and one decrement. Partial stock failures roll back; distinct buyers cannot
oversell the last tracked unit. Request fingerprints reject changed customer/cart data
under an old key. Exact selected names/colors/sizes remain in MongoDB and admin.

Each attempt has a random opaque backend reference and immutable configuration hash.
Retries reuse it without reserving again. Cart and checkout key survive a hosted
handoff; a memory fallback retains the key for retries on the same page if session
storage is blocked. The pending order token supports recovery on the local confirmation
page. Changed tracking settings require reconciliation rather than silent substitution.

Hosted payment stays `pending`; redirect count means a link was prepared, not that the
customer arrived or paid. Returns and query parameters cannot prove payment. The
Everflow webhook returns 501 and its events are refused by payment application code.
Admin manual changes require an attributed transaction/evidence explanation; the
operator must actually verify the evidence. No charge was marked successful in tests.

No automatic stock expiry was added. The documented manual review/cancellation process
must be followed until an expiry/reconciliation policy is separately reviewed and tested.
A crash during `preparing` needs stock reconciliation. Local request idempotency cannot
guarantee that an unknown external partner will not charge twice; a customer who may
already have paid must contact the boutique before following another payment link.

## E. Pixels and click attribution

Facebook, TikTok (3 underscores), Google (6 + ID + 3 + label), Snapchat (21) have tested
encoders. Exactly one configured platform may use sub5. Defaults are blank/disabled;
approval and optional customer advertising consent are required. Rio District fires
no Purchase on submission, redirect or pending confirmation.

source_id is omitted unless genuinely supplied. sub1 is omitted by default; provider
mode preserves a supplied click ID, and opaque correlation mode requires explicit
partner approval. Per-visitor attribution capture is not invented. No email, order
token or MongoDB ID is used as a click ID.

## F. Security and privacy

Server-only construction validates exact HTTPS offer URLs and the exact allowed host.
Unexpected hosts, generic examples, query overrides, fragments and credentials are
refused. Images must be approved catalog photos on the configured public HTTPS origin.
API responses are no-store/private; checkout pages and APIs send no-referrer. Live mode
is gated by explicit approvals. Mock mode additionally requires a loopback isolated
`rio_everflow_test_*` database and never returns or visits an external personal URL.

The provider-required URL query still exposes personal information to the browser and
partner infrastructure. Server-side encoding does not remove that risk. See
[OWASP's query-string exposure guidance](https://owasp.org/www-community/vulnerabilities/Information_exposure_through_query_strings_in_url).
No complete external URL or submitted customer fields are logged or stored in attempts;
checkout failures avoid serializing PII-bearing database errors. The partner's ownership,
lawful data sharing, retention/redaction, final destination and a POST/token alternative
must be verified before live activation. No PCI/payment-method claim was added.

## G. Actual verification

| Check | Result |
|---|---|
| TypeScript, `npm run typecheck` | Passed |
| ESLint, `npm run lint` | Passed |
| Unit suite, `npm test` | 32 passed, including 7 Everflow contract groups |
| Isolated API/inventory integration, `npm run test:everflow` | Passed; one workflow with concurrent requests, six variant configurations, retries, cancellation, price/currency/stock/photo/config refusals, disabled fallback and webhook refusal |
| Chrome browser, `npm run qa:everflow` | Passed at 390px and 1440px; single and mixed-color bundle, form/summary, loading, lost-response retry, retained cart, pending recovery, unsupported quantities and authenticated admin visibility |
| Tracking-domain calls in browser QA | 0 |
| Browser runtime errors in QA | 0 |
| Horizontal overflow at tested checkout widths | None |
| Integrated browser | Actual local pack submission reached the same-origin mock, amount EUR 24.95, Green/M + Black/L, payment pending |
| Production build, `npm run build`, separate output/local DB | Passed; no deployment |
| Normal and isolated `/api/health` | Both HTTP 200 |
| Checkout/API response headers | no-referrer; no-store (API also private) |

Cold development compilation caused initial browser navigation waits; increasing the
QA navigation allowance and waiting for hydration resolved those test timing issues.
A clean server restart after Mongoose schema edits was necessary. Re-run the local
commands documented in EVERFLOW_CHECKOUT.md to reproduce the checks. Existing Next
image sizing/LCP and smooth-scroll development warnings remain; no critical runtime
errors were observed. Preview credentials are kept out of screenshots/logs.

## H. Missing provider information

Obtain: authorized tracking and final payment domains; signed success/failure/refund
events or authenticated status API; signature/key rotation/replay rules; exact
order/click/transaction mapping; provider-side charge idempotency/expiry and returns;
variant/fulfillment and bundle label/image contract; supported countries/amounts/shipping;
privacy/data-sharing and POST-based prefill; pixel/consent/conversion attribution rules.
Broader carts require additional offer links or a dynamic-amount/session API.

The local mock proves Rio District's handling, not the partner's charging or fulfillment.
Do not activate real customers until those gaps, operating procedures and owner approval
are resolved. See the activation checklist and rollback procedure in EVERFLOW_CHECKOUT.md.

## I. Live deployment

Production website, VPS and database were not modified. Nothing was pushed to GitHub.
Live payment processing and advertising remain disabled. Both local development
servers and local MongoDB are left running for review.
