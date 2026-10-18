# Everflow hosted checkout

## Architecture decision (before implementation)

The existing `PaymentProvider` interface requires `createSession` and an authenticated
`verifyWebhook`. The supplied Everflow URLs are tracking redirects, not payment sessions,
and no authentication, callback, status API, return contract, or transaction mapping has
been supplied. A fake implementation of that interface would misrepresent payment evidence.

The implementation therefore adds a separate hosted-redirect capability, reusing `Order`,
`PaymentAttempt`, server-side pricing, stock reservation and order idempotency. The existing
verified event interface remains separate. Everflow webhooks stay unavailable (501).
Redirect issuance only records an unconfirmed, pending payment. It never confirms a charge.

Live mode stays off. Local verification uses an isolated database and a local mock destination;
no test customer details are sent to the tracking domain.

## Provider questions blocking production

- Verify ownership/authorization of `www.molipy8trk.com` and the ultimate hosted-payment domain.
- Confirm lawful sharing/disclosures and whether POST-based prefill is available.
- Confirm fixed offer amounts, currencies, shipping countries, variants and bundle metadata/image rules.
- Confirm whether `sub1` can carry our opaque attempt reference; it is omitted until approved.
- Supply signed payment/refund/failure evidence, replay rules and an exact order-to-transaction mapping.
- Confirm one-platform `sub5` encoding, consent and attribution responsibilities.
- Agree a reviewed expiry/reconciliation procedure before releasing any abandoned reservation.

## 1. Architecture

`everflow.ts` holds the pure supplied contract (no network calls). `hosted.ts` is
server-only and binds a redirect attempt to the existing immutable order. `/api/orders`
validates fields, recomputes the cart from active MongoDB products, checks eligibility
and photo metadata, claims the order idempotency key, then reserves stock. A unique
`PaymentAttempt` of kind `redirect` records the backend reference, amount, offer and mode.
The complete personal redirect URL is constructed on demand and never stored.

## 2. Exact offers

| Structure | Final EUR amount, zero shipping | Destination |
|---|---|---|
| One single line, quantity 1, one item | 1999 cents | `https://www.molipy8trk.com/2J23GL9/TTF23GH/` |
| One bundle line, quantity 1, two items | 2495 cents | `https://www.molipy8trk.com/2J23GL9/TRSKRX3/` |

`TRPS2FT` is an example and is always rejected. Quantity >1, multiple lines, mixed
orders, extra bundles, non-EUR products, different prices and shipping charges are
refused before stock/order creation. Browser-supplied amounts are ignored.

## 3–4. Prefill mapping and generation

| Validated immutable order value | Parameter |
|---|---|
| customer.firstName | sub10 |
| customer.lastName | adv3 |
| shipping.postalCode | sub3 |
| customer.email | sub4 |
| shipping.city | sub6 |
| shipping.address + optional address2, joined with comma | sub7 |
| customer.phone | sub8 |
| MongoDB product name / approved bundle label | adv1 |
| Approved first-party public HTTPS photo | adv2 |

The form collects accessible Prénom/Nom fields (`given-name`/`family-name`). Multi-word
names are retained in full. The combined `customer.fullName` remains available to the
admin/fulfillment system. Legacy API requests with fullName still work in request mode;
hosted checkout requires explicit first/last names and never guesses a split.

`URL` and `URLSearchParams` encode accents, apostrophes, plus signs, phone numbers,
apartment addresses and special characters. Country and notes have no supplied mapping
and remain local. The country allowlist must match partner-confirmed offer coverage;
FR is the conservative initial setting, not a claim of confirmed live coverage.

Images must be photos in the catalog, on the explicitly configured public HTTPS origin,
with a raster image extension and no credentials/query/fragment. Relative catalog paths
are resolved against that public origin. Localhost, IP origins and third-party images
are refused. This does not verify licensing or current public accessibility: verify
the selected asset before live activation. No server fetch of arbitrary image URLs occurs.

Bundle adv1 describes both selected names/colors/sizes. The mock may use the first
product photo as a representative image. Live bundles additionally require an approved
public bundle image and `EVERFLOW_BUNDLE_METADATA_APPROVED=true`. Sending that label
does NOT establish that the provider understands or fulfills variants. Every exact item
and size is always stored locally; the partner must confirm the fulfillment handoff.

## 5. Advertising pixels

Only one explicitly selected platform can occupy sub5:

| Platform | Exact encoding |
|---|---|
| facebook | ID |
| tiktok | `"_".repeat(3) + ID` |
| google | `"_".repeat(6) + ID + "_".repeat(3) + LABEL` |
| snapchat | `"_".repeat(21) + ID` |

IDs and platform are optional and blank by default. Missing/conflicting IDs fail
configuration. A configured pixel requires explicit business/privacy approval AND
an unchecked-by-default customer advertising opt-in for this attempt. Refusal does not
block checkout. No site-side Purchase or advertising script is fired on submit,
redirect, pending status or return. The consent text and policy must receive legal/privacy
review before activation; a checkbox alone is not a claim of regulatory compliance.

## 6. Attribution and correlation

source_id is omitted unless a genuine affiliate ID is configured. sub1 defaults to
disabled. `provider` mode preserves an explicitly supplied provider click ID; do not
configure a static campaign-wide click ID for unrelated visitors. The current application
does not capture arbitrary incoming tracking query parameters. Per-visitor provider-issued
attribution requires an agreed acquisition, validation and retention contract before rollout.
`correlation` mode sends the random backend attempt reference only after the provider
confirms sub1 is suitable and the corresponding approval flag is set. Ambiguous modes
and simultaneous provider/correlation IDs fail closed. Never use an email, order token,
MongoDB ID, customer address or secret as an attribution identifier.

The backend always maps an opaque, 192-bit random reference to the exact local order.
It is not transmitted by default. Without an agreed echoed identifier, automated
transaction matching remains unavailable; manually verify the provider transaction,
amount/currency and exact order. Never rely solely on a customer's return or name.

## 7. Environment variables

All are server-side; none require NEXT_PUBLIC exposure. `.env.local` is untracked.

| Variable | Purpose / safe default |
|---|---|
| PAYMENT_PROVIDER | Blank with EVERFLOW_ENABLED=false disables selection; `everflow` required when enabled (mismatch fails closed) |
| EVERFLOW_ENABLED | `false`; must be exactly `true` to enable |
| EVERFLOW_MODE | Explicit `mock` or `live`; example uses mock |
| EVERFLOW_SINGLE_CHECKOUT_URL / EVERFLOW_BUNDLE_CHECKOUT_URL | Exact supplied offer URL; missing/changed destinations fail closed |
| EVERFLOW_PUBLIC_ASSET_BASE_URL | Approved public HTTPS origin, initially `https://riodistrict.store` |
| EVERFLOW_COUNTRIES | Comma-separated confirmed country codes; initial `FR` |
| EVERFLOW_LIVE_APPROVED | `false`; partner/domain/privacy/business approval gate |
| EVERFLOW_VARIANTS_APPROVED | `false`; order/variant handoff approval gate for live orders |
| EVERFLOW_BUNDLE_METADATA_APPROVED | `false`; additional bundle label/image contract gate |
| EVERFLOW_BUNDLE_IMAGE_URL | Blank; approved raster photo on the configured asset origin, required for live bundles |
| EVERFLOW_SOURCE_ID | Blank; genuine affiliate sub ID only |
| EVERFLOW_SUB1_MODE | `disabled`, `provider`, or approved `correlation` |
| EVERFLOW_PROVIDER_CLICK_ID | Blank; actual provider-issued value, only with provider mode |
| EVERFLOW_SUB1_CORRELATION_APPROVED | `false`; provider must confirm semantics before true |
| EVERFLOW_PIXEL_PLATFORM | Blank, or one of facebook/tiktok/google/snapchat |
| EVERFLOW_PIXEL_APPROVED | `false`; provider, privacy and attribution approvals required |
| EVERFLOW_FACEBOOK_PIXEL_ID / EVERFLOW_TIKTOK_PIXEL_ID / EVERFLOW_GOOGLE_PIXEL_ID / EVERFLOW_SNAPCHAT_PIXEL_ID | Blank; exactly one matching configured mode |
| EVERFLOW_GOOGLE_PIXEL_LABEL | Blank; required only for Google |
| RIO_EVERFLOW_TEST | `false`; true selects separate `.next-everflow` build output |

The owner can pause or allow redirect forwarding in **Admin → Réglages → Commandes & paiement**.
The control writes `EVERFLOW_ENABLED=true|false` to the server's private
`/var/lib/rio-district/payment-control/everflow-enabled.env` (or an isolated `.data` file
in local development). Runtime requests read this file immediately; the production
systemd service also loads it on every restart. It overrides the initial value in
`.env.local`. The admin action cannot enable a missing or invalid live provider
configuration; it returns the specific validation error. The two offer URLs remain
server-owned and must match the exact destinations above. Turning forwarding off blocks
new order redirects and payment retries; it does not alter an already issued link or
prove whether an earlier redirect led to a charge. The admin page shows the configured
domain, destination URLs, and the checkout fields added to the redirect query.

Mock additionally requires `APP_ENV=development` and a loopback MongoDB URI whose DB
name starts with `rio_everflow_test_`. `dev:everflow` sets these itself. It cannot use
the normal `kalt` or production databases. It never returns or visits the PII-bearing
tracking URL; the destination is a same-origin local simulation page.

## 8–9. Supported workflow

Product selection → existing cart → existing coordinate form → backend quote/preflight →
pending local order/reservation → one backend attempt → external redirect (local mock
in development). No card/CVV/bank fields are collected here. The external-payment CTA,
data-sharing disclosure, totals, variants, delivery and 15-day returns remain visible.
When disabled, the original unpaid order-request flow clears its cart and shows its
existing confirmation. Enabled but invalid configuration is an actionable error, not
a silent unpaid fallback or a successful-payment screen.

## 10. State and retries

Orders use existing fulfillment states independently of payment. Hosted orders start
`pending_confirmation` / payment `pending`; request-mode orders retain
`awaiting_payment_setup`. Attempts record only redirects **prepared**, not reached.
No automatic success, failure, refund or cancellation inference is implemented.
The webhook responds 501; event application explicitly rejects Everflow until a real
authenticated adapter is implemented. Return query parameters cannot mark payment paid.

The unique order idempotency key is claimed before stock decrement. Concurrent requests
wait for the winner to reach `creationState=ready`; the request fingerprint prevents
different coordinates/cart/consent from silently reusing a previous order. Stock failures
roll back partial reservations and remove only that newly claimed preparing order.
Attempt uniqueness is enforced by a partial unique MongoDB index (order/provider/redirect).
Repeated submissions and `/api/payments/checkout` reuse the same order/attempt and never
reserve again. Customer retries require the opaque confirmation token, same origin and
rate limiting. Paid, failed, refunded, fulfilled and cancelled orders cannot retry.

The browser retains its cart and session idempotency key through hosted redirects.
It stores only the opaque pending-order token for recovery, never a personal checkout URL.
A changed request is rejected with a recovery instruction. Network failure after commit
is safe to retry with the same payload/key. These local guarantees do NOT make a partner
charge idempotent: after a possible external payment, contact the boutique and reconcile
before following another payment link.

Admin shows exact variants, attempt mode/reference, prepared redirect count, correlation
state and history. Manual payment changes require a recorded explanation/reference
(at least 10 characters) attributed to the authenticated admin. A typed explanation is
an audit record, not automated verification: the admin must inspect actual evidence.

No reservation expiry runs automatically. Pending orders are reviewed in the admin;
cancel only after confirming no charge is in progress/received. Cancellation releases
tracked inventory once. A process crash during `preparing` requires reconciliation of
the affected stock and order before editing/cancelling; no timer guesses whether units
were reserved. Agree and test a transactional/expiry policy before production scale.

## 11. Privacy and residual exposure

The partner requests names, contact and street address in a GET query. HTTPS does not
remove them from browser history, partner/proxy logs or monitoring. Server-side construction
does not remove browser exposure. See [OWASP query-string exposure guidance](https://owasp.org/www-community/vulnerabilities/Information_exposure_through_query_strings_in_url).
The app stores order data already needed for fulfillment, not a copy of the full external
URL. Application checkout logs contain order numbers/status/amount only; unexpected errors
are not serialized. No personal parameters are sent to analytics. Checkout/API responses
are no-store/private and use no-referrer, including confirmation/simulator pages.

Before activation verify domain ownership and the eventual payment domain, a data-sharing
agreement/lawful basis, privacy policy/consent, retention/redaction across every partner,
and a less-exposing POST/token method if available. Do not claim PCI certification or
payment methods not documented by the partner. The disclosure is not legal approval.

## 12. Testing

1. Run `npm test` (contract, encoding, pixels, fixed offers, names and existing tests).
2. With local MongoDB running, run `npm run test:everflow`. It uses a unique
   `rio_everflow_test_<random>` DB, exercises actual API/business code and deletes ONLY
   that test DB, guarded by exact loopback/name checks. The Node-only test preloader
   neutralizes the Next import-boundary marker; real Next/browser tests cover bundling.
3. Run `npm run dev:everflow` and `npm run qa:everflow`. Chrome tests 390px/1440px,
   cart/form/redirect, lost-response retry, loading guard, retained cart, pending recovery,
   unsupported carts and authenticated admin visibility. Tracking-domain requests are
   blocked and counted. Fictional records stay in the isolated preview DB; screenshots
   and private fixture credentials stay under ignored `.data/`.
4. Run `npm run typecheck`, `npm run lint` and an isolated-output `npm run build`
   with `RIO_EVERFLOW_TEST=true`. Stop the simulator while building its output; the
   regular development server can keep running. Restart the simulator after build.

No charges, card information, external tracking requests or real customer data are needed.
Do not run demo scripts against production. Local fixture setup does not clear a database.

## 13–14. Limitations and partner questions

Obtain signed payment/refund/failure notifications or an authenticated transaction API;
signature/key rotation and replay/event identifiers; exact amount/currency validation;
an order/click/transaction correlation contract; final payment domain and approved return
URLs; provider-side charge idempotency/expiry; supported countries and variant handoff;
bundle image/label semantics; dynamic amounts/additional offers for broader carts;
and one-platform/combined pixel rules, consent and conversion ownership.

Everflow's generic [parameter guide](https://helpdesk.everflow.io/customer/your-guide-to-parameters-macros)
does not verify this partner's payment or fulfillment contract. Supplied client mappings
are implemented exactly; no undocumented country, callback, amount or variant parameters
are invented. A provider return/Thank You page is not a payment receipt.

## 15. Production activation checklist

- Obtain all partner/payment/domain/variant/privacy details above and explicit owner approval.
- Implement/test authenticated payment evidence, matching, replay protection and refunds.
- Review all live offer and asset URLs, amounts, countries and fulfillment reconciliation.
- Apply/verify unique MongoDB indexes and plan safe handling of legacy/preparing orders.
- Review abandoned stock/expiry and possible already-paid retry handling.
- Update privacy disclosure/policy and configure any advertising consent/attribution.
- Test a partner-approved sandbox end to end; this local mock is not provider certification.
- Only then configure the server feature/approval flags through a separately approved deployment.

## 16. Rollback

Set `EVERFLOW_ENABLED=false` (or clear PAYMENT_PROVIDER) and restart the application.
New checkouts deliberately use the original unpaid request mode. Existing hosted orders,
attempts and reservations remain available to admin for reconciliation; do not relabel them
unpaid or delete them. Resuming hosted payment is blocked while disabled. Do not release
stock or retry a charge simply because the feature was disabled. No rollback needs a schema
drop, destructive migration, credential exposure, Git push or production DB change.
