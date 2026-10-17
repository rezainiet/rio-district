# Rio District production deployment — 17 October 2026

This record describes the initial installation. The subsequent authorized retry-fix
rollout and current Everflow readiness are recorded in
[EVERFLOW_ACTIVATION_READINESS.md](EVERFLOW_ACTIVATION_READINESS.md).

The storefront is deployed at **https://rio-district.store**. The live site was opened and
tested in the integrated browser. Everflow redirects and pixels remain disabled.

## Source and target

- Application source: `7a0fb5cf01ba10d8d5b9b416d6571821dc024762`, merged from
  `feat/everflow-checkout` into `main` and pushed without rewriting history.
- The subsequent documentation-only commit is synchronized with the active release and
  recorded in `REVISION`; `APPLICATION_REVISION` identifies the unchanged application build.
- Source archive SHA256: `ee843685b7c8227fb2d4eef5dccc03baea505f0a53a21a69fe311a85047c2482`.
- New target: Spaceship, Ubuntu 24.04.5, 1 vCPU, 2 GiB RAM, approximately 25 GiB disk.
- The provider console independently verified the SSH server key before authentication.
- Initial inventory confirmed a fresh server without an existing storefront/database/web server.
- Node.js 22.23.3 was installed from the official archive and its SHA256 verified.
  MongoDB 8.0.34 was installed through its signed official Ubuntu repository. Project
  dependencies were installed using the existing lockfile; framework dependencies were unchanged.
- Production was rebuilt on Linux with the new HTTPS canonical domain. The build passed.

## Running architecture

| Component | Location / binding |
| --- | --- |
| Release | `/srv/rio-district/releases/20261017-7a0fb5c` |
| Active symlink | `/srv/rio-district/current` |
| Private environment | `/srv/rio-district/shared/.env.local` |
| Storefront service | `rio-district.service`, loopback port 3000 |
| Database service | `rio-district-mongod.service`, authenticated, loopback port 27018 |
| Persistent uploads | `/var/lib/rio-district/uploads` |
| nginx site | `/etc/nginx/sites-available/rio-district` |
| TLS | Let's Encrypt certificate for the canonical domain; HTTP redirects to HTTPS |

The existing SSH port and provider agent configuration were retained. There was no server
reboot. The previous VPS remains available; its unrelated application/database were unaffected.
Temporary candidate services and restore-test database processes were stopped after validation.

## Data preservation and backups

The existing production database and uploads were transferred over SSH, not seeded from a
development database. Verification compared every collection's count, complete document hash,
and indexes against the source export. The transfer preserved:

- Six active products, all seven sizes and the existing inventory.
- 28 published client-approved reviews and their uploaded photographs.
- One existing admin account and its original identity.
- Store settings, categories, counters, migration records and existing session records.
- Zero customer orders and zero payment attempts at deployment time.

The existing 15-day return-request policy and disabled countdown were retained. The owner
subsequently approved the customer-service email `sales@rio-district.store`; only that setting
was updated. Return shipping costs and refund deadlines were not invented.

The owner subsequently authorized resetting the existing admin password to the value in a
private credential file. The account ID, email, name, role and active state were preserved;
its one old session was invalidated. Live browser sign-in and the protected product, order,
review and promotion pages then passed. No credential values were logged or committed.

Private launch backup: `/var/backups/rio-district/20261017-launch` contains code, environment,
database, uploads and recovery configuration. Archives passed checksum/readability checks. A
separate temporary MongoDB restored the backup; every document hash and count matched. An
SSH-transferred private copy of the full backup is also held outside the local Git repository.
These files contain private data and credentials and must never be committed or served publicly.
The final backup at `/var/backups/rio-district/20261017-final` includes the approved contact
email. The subsequent `/var/backups/rio-district/20261017-admin-recovery` checkpoint captures
the authorized password reset and updated documentation, with a private off-server copy.

## Verification results

| Check | Result |
| --- | --- |
| TypeScript, ESLint | Passed before application commit |
| Unit tests | 32 passed |
| Isolated Everflow integration and browser tests | Passed before application commit |
| Production build with new domain | Passed on the new VPS |
| Homepage, product, cart, checkout, returns, admin login, health | HTTP 200, inspected in the live browser |
| Database health | `ok`, database `up` |
| Server price quotes | Single 1999 cents; two-jacket bundle 2495 cents |
| Cart interaction | Single Green/M and bundle Green/M + Black/L verified |
| Checkout validation | Seven required-field errors on an empty form; no production order submitted |
| Responsive homepage and product | 375 / 390 / 414 / 768 / 1440 px; no horizontal overflow or visible broken images |
| Community videos | One muted clip playing, other two clips unloaded |
| Browser / application errors | No captured browser console errors or critical server error events |
| Admin authentication | Authorized password reset completed; live sign-in and protected products, orders, reviews and promotions verified |

Lighthouse 12.8.2, mobile simulation, actual public HTTPS homepage:

| Performance | Accessibility | Best practices | SEO |
| --- | --- | --- | --- |
| 79 | 93 | 100 | 100 |

The audit completed without a runtime error or reported run warnings. Scores describe this
single measured run, not a guarantee for every device or connection. Desktop/mobile screenshots
and the full Lighthouse HTML/JSON report were saved as local review artifacts, outside Git.

## Payment and marketing state

The single and bundle offer configurations are available privately for future activation.
Everflow is disabled, live approval is disabled, variant/bundle approvals are disabled, and
pixels are disabled. Checkout keeps the existing unpaid order-request flow. No customer data
was transmitted to the payment provider and no order was marked paid during deployment tests.
Provider confirmation, transaction correlation, supported variants and privacy approvals remain
necessary before a separately authorized payment activation.

## Renewal and rollback

`certbot.timer` is active. Its webroot challenge remains available on HTTP. An app-specific
deployment hook validates nginx and gracefully reloads it after this domain's certificate renews.

This is the first installation on this VPS, so there is no older release on this machine.
For a critical initial-launch regression, run the private, prepared maintenance rollback:

```bash
sudo /root/rio-deployment-20261017/rollback-to-maintenance.sh
```

It stops only the new storefront and restores the prepared HTTPS maintenance routing. Database,
uploads, and newly received orders are retained. Recover/rebuild the verified source separately;
never restore an old database over newer orders without explicit owner authorization. Future
application updates should retain the previous built release and use the normal symlink rollback.
