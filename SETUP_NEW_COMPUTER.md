# Rio District — Setting up a new computer (Windows)

This guide takes a brand-new Windows 10/11 computer to a fully working local copy of the Rio District
store: storefront, admin, MongoDB, tests and production build. Every command was checked against the
repository (`package.json`, `package-lock.json`, `.env.example`, `scripts/`, `src/`). Steps that could not
be verified on a clean machine are marked **(not verified)**.

> **Golden rules**
> - Never point a local copy at the **production** database or reuse production passwords.
> - Never commit `.env.local`, database dumps, `.data/`, or customer data. The GitHub repository is **public**.
> - Never run test scripts that write data (marked ✍️ below) against production.

---

## Quick start (if you already know the tools)

```powershell
git clone https://github.com/rezainiet/rio-district.git
cd rio-district
git switch main
git pull --ff-only origin main
npm ci                                   # exact versions from package-lock.json (also downloads a dev MongoDB binary)
Copy-Item .env.example .env.local        # then edit .env.local: set SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD
npm run db:local                         # terminal 1 — local MongoDB on 127.0.0.1:27017 (data in .data/mongo)
npm run seed                             # terminal 2 — 6 products, store settings, admin account (safe to re-run)
npm run reviews:import -- --apply --publish-approved --with-photos   # optional: the 28 reviews shown in production
npm run dev                              # http://localhost:3000  ·  admin: http://localhost:3000/admin/login
```

---

## 1. Project overview

**Rio District** is a French-language e-commerce store selling one product model — the *Veste Brésil*
windbreaker — in six colours (vert, rose, noir, blanc, bleu, jaune), sizes XS → 3XL, at **19,99 €** each or
**24,95 €** for a two-jacket pack with mixed colours. Live site: https://riodistrict.store.

| Area | How it works |
|---|---|
| **Frontend** | Next.js 16.4 App Router + React 19.3, TypeScript, Tailwind CSS 4. Storefront under `src/app/(store)/`, mobile-first "Dark Premium" design (near-black, ivory, brass). Fonts via `next/font/google`: Archivo (titles, prices), Manrope (text), Syne (logo only); Inter for the admin. |
| **Backend** | Next.js Route Handlers under `src/app/api/` (cart quote, orders, reviews, contact, health, admin APIs). Server components read MongoDB directly through `src/lib/*`. No separate server. |
| **Database** | MongoDB via Mongoose 9 (`src/models/`): `Product`, `Category`, `Order`, and in `misc.ts` `Settings` (one `store` document holding all shop settings), `AdminUser`, `AdminSession`, `Testimonial` (reviews), `ContactMessage`, `Counter` (order numbers). |
| **Prices** | Always recomputed on the server (`src/lib/pricing.ts`); the browser cart (localStorage) is never trusted. Stock is reserved atomically when an order is created. |
| **Orders** | "Order requests" without online payment: `status = pending_confirmation`, `paymentStatus = awaiting_payment_setup`. The shop confirms by e-mail. Payment integration seam: `src/lib/payments/` (see `docs/PAYMENTS.md`). |
| **Authentication** | Admin only (no customer accounts). E-mail + password (bcrypt), sessions stored in MongoDB, `rd_admin` HttpOnly cookie (Secure in production), rate-limited login. `src/proxy.ts` redirects `/admin/*` to the login page without a cookie; every admin page/API re-checks the session. No public sign-up: accounts are created with `npm run seed` or `npm run admin:create`. |
| **Admin dashboard** | `/admin`: orders (status, export), products (prices, images, per-size stock), reviews moderation, contact messages, promotions (countdown + pop-ups), settings (texts, shipping, FAQ, size guide). |
| **Reviews** | Customers submit reviews (with optional photos) → stored as pending → published by an admin. "Achat vérifié" only when linked to a delivered order. Reference reviews can be imported from `scripts/data/reference-reviews.json`. |
| **Promotions** | Countdown and three pop-ups (welcome, exit intent, cart reminder), all **off** by default, configured in Admin → Promotions. A countdown only shows with a real end date. |
| **Uploads** | Admin images and review photos are written to `UPLOAD_DIR` (default `.data/uploads`) and served by `src/app/uploads/…`. Not stored in Git. |
| **Local development** | `npm run dev` (port 3000) + MongoDB (installed service, or `npm run db:local`). |
| **Production** | Ubuntu VPS: Node 22, MongoDB 8 with authentication, `next start` under systemd behind nginx (HTTPS), uploads in `/var/lib/rio-district/uploads`, backups via `deploy/backup.sh`. Full procedure: `docs/DEPLOYMENT.md`. **This guide never touches production.** |

---

## 2. System requirements

| Tool | Version | Why / source |
|---|---|---|
| Windows | 10 (22H2) or 11, 64-bit | `npm run db:local` downloads a 64-bit `mongod` for Windows |
| **Node.js** | **22 LTS (≥ 22.12)** recommended; minimum **20.19.0** | `mongoose@9.11.2`, `mongodb@7.7.0` and `mongodb-memory-server@11.3.0` require `node >= 20.19.0`; Next 16.4.1 requires `>= 20.9.0`. Tested with Node **22.13.1**. https://nodejs.org/en/download (LTS, Windows Installer .msi) |
| **npm** | comes with Node (tested 10.9.2) | The project uses **npm** (`package-lock.json`, lockfile v3). Do not use yarn/pnpm. |
| **Git** | 2.40+ (tested 2.47) | https://git-scm.com/download/win |
| **MongoDB** | **8.x** (Community Server 8.0 or later) — *or* nothing, if you use `npm run db:local` | Production runs MongoDB 8 (`docs/DEPLOYMENT.md`); `db:local` downloads MongoDB **8.2.6**. https://www.mongodb.com/try/download/community |
| mongosh (optional) | latest | Shell to inspect the database. https://www.mongodb.com/try/download/shell |
| MongoDB Compass (optional) | latest | GUI to browse data. https://www.mongodb.com/try/download/compass |
| **Google Chrome** | current stable | Browser testing and every screenshot/QA script (they launch the installed Chrome through `playwright-core` with `channel: "chrome"` — no Playwright browser download needed). https://www.google.com/chrome/ |
| VS Code (recommended) | current | https://code.visualstudio.com/ — extensions: ESLint, Tailwind CSS IntelliSense, (optional) MongoDB for VS Code |
| Internet access | — | `npm ci`, Google Fonts at build/dev time, the one-time MongoDB download, review-photo import |

**Hardware**: 8 GB RAM minimum (16 GB recommended: dev server + MongoDB + Chrome + editor).
**Disk**: ≈ 3 GB free (`node_modules` ≈ 1 GB, cached `mongod` ≈ 0.6 GB, `.next` build cache, screenshots).

Check what is installed (PowerShell):

```powershell
node -v      # must print v20.19.0 or higher (v22.x recommended)
npm -v
git --version
```

> If PowerShell refuses to run `npm`/`npx` with "running scripts is disabled", run once:
> `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` (or use **Command Prompt** / **Git Bash**).

---

## 3. Clone from GitHub

```powershell
cd $HOME\Documents                      # or any folder NOT synced by OneDrive (see note)
git clone https://github.com/rezainiet/rio-district.git
cd rio-district
git switch main
git pull --ff-only origin main
git branch --show-current               # → main
git log --oneline -5                    # latest commits
git status                              # → "nothing to commit, working tree clean"
```

**Clone vs. ZIP download**: `git clone` gives you the full history and lets you `pull`/`push`. "Download ZIP"
on GitHub gives a snapshot without `.git`: you cannot pull updates or push changes. Always clone.

> **Avoid OneDrive/Dropbox folders.** File-sync tools lock files and can make the dev server miss file
> changes (hot reload not updating). If a change does not appear, re-save the file or restart `npm run dev`.

**Repository layout (top level)**

| Path | Content |
|---|---|
| `src/` | The application (see §10) |
| `scripts/` | Seed, admin creation, local MongoDB, data imports, migrations, QA and screenshot scripts |
| `scripts/data/` | Versioned manifests: product photo sources/authorisation, reference reviews (with the client's written authorisation) |
| `tests/` | Unit tests (`node:test` via `tsx`) |
| `public/products/reference/` | The six authorised product photos (used by the seed) |
| `docs/` | Deployment, payments, QA, audits, design reviews, redesign documentation and screenshots |
| `deploy/` | Production templates: systemd units, nginx config, backup script |
| `design-concepts/` | Early static design explorations (reference only) |
| `.env.example` | Environment template (copy to `.env.local`) |

---

## 4. Install dependencies

```powershell
npm ci
```

`npm ci` installs the **exact** versions of `package-lock.json` (reproducible), and fails if `package.json`
and the lockfile disagree. Use `npm install` only when you intentionally add/upgrade a package (then commit
the updated lockfile).

During installation, `mongodb-memory-server` downloads a `mongod` 8.2.6 binary once into
`node_modules\.cache\mongodb-memory-server\` (≈ 600 MB disk, needs internet). It is used only by
`npm run db:local`. If you installed MongoDB yourself and want to skip it:

```powershell
$env:MONGOMS_DISABLE_POSTINSTALL = "1"; npm ci; Remove-Item Env:MONGOMS_DISABLE_POSTINSTALL
```

**Verify**

```powershell
npm ls next react mongoose      # next@16.4.1, react@19.3.0, mongoose@9.11.2
npm run typecheck               # no output = OK
npm test                        # "# pass 25  # fail 0"
```

**Common problems**

| Symptom | Fix |
|---|---|
| `EBADENGINE` / mongoose errors about Node | Upgrade Node to ≥ 20.19 (22 LTS recommended), delete `node_modules`, `npm ci` again |
| `npm ci` says lockfile out of sync | Someone changed `package.json` without the lockfile: run `npm install`, commit `package-lock.json` |
| `sharp` install error | Make sure Node is 64-bit; delete `node_modules` and retry; corporate proxies may block the prebuilt binary download |
| MongoDB binary download fails (proxy/firewall) | Install MongoDB Community Server (§5, option A) and use `MONGOMS_DISABLE_POSTINSTALL=1` as above |
| `EPERM` / file locked | Close VS Code terminals running `next dev`, pause OneDrive, retry |

---

## 5. MongoDB on Windows

Pick **one** option. Both give a database at `mongodb://127.0.0.1:27017`.

### Option A — Install MongoDB Community Server

1. Download **MongoDB Community Server 8.x**, Windows x64, `.msi`: https://www.mongodb.com/try/download/community
2. Run the installer → *Complete* → keep **"Install MongoD as a Service"** (Run service as Network Service),
   data directory `C:\Program Files\MongoDB\Server\8.x\data\`. Optionally install **Compass**.
3. Check the service:

   ```powershell
   Get-Service MongoDB                   # Status: Running
   Start-Service MongoDB                 # if stopped (an elevated PowerShell may be required)
   Stop-Service MongoDB                  # to stop it
   ```
4. Optional check with mongosh (installed separately): `mongosh "mongodb://127.0.0.1:27017" --eval "db.runCommand({ ping: 1 })"` → `{ ok: 1 }`.

Verify the installed service's bind address and authentication settings in its `mongod.cfg` before use.
Keep it bound to localhost for development and do **not** open port 27017 in the firewall.

*Optional local authentication* (closer to production): create a user, then use it in the URI.

```powershell
mongosh "mongodb://127.0.0.1:27017/admin" --eval "db.createUser({ user: 'rio_dev', pwd: passwordPrompt(), roles: [{ role: 'readWrite', db: 'kalt' }] })"
# then in .env.local: MONGODB_URI=mongodb://rio_dev:<your-password>@127.0.0.1:27017/kalt?authSource=admin
# (authentication is only enforced once you set security.authorization: enabled in mongod.cfg and restart the service)
```

### Option B — Project launcher, no installation (`npm run db:local`)

```powershell
npm run db:local
# [db:local] MongoDB prête sur mongodb://127.0.0.1:27017/ (données : …\.data\mongo)
```

What it does (`scripts/local-mongo.ts`): starts the official `mongod` binary downloaded by
`mongodb-memory-server`, on `127.0.0.1:27017`, with **persistent** data in `.data\mongo` (git-ignored).
Keep that terminal open; **Ctrl+C** stops it cleanly (data is kept). It refuses to run when
`APP_ENV`/`NODE_ENV` is `production`. Another port: `$env:LOCAL_MONGO_PORT = "27018"; npm run db:local`
(then use that port in `MONGODB_URI`). Do not run it while the Windows MongoDB service also uses 27017.

### The application's connection string

Set in `.env.local` (§6): `MONGODB_URI=mongodb://127.0.0.1:27017/kalt` — the database name (`kalt`, a
historical name kept by all scripts) is created automatically on first write. You may choose another name,
e.g. `rio_dev`; `scripts/demo-marketing.ts` derives `<name>_demo` from it.

**Never** put the production URI in a development `.env.local`.

Database initialisation (products, settings, admin) is §7.

---

## 6. Environment variables

Create your local file from the template — it is git-ignored (`.gitignore` ignores `.env*` except
`.env.example`):

```powershell
Copy-Item .env.example .env.local
notepad .env.local        # or: code .env.local
```

Next.js loads `.env.local` automatically; the scripts (`seed`, `admin:create`, imports, `smoke`…) load it
with `dotenv`.

| Variable | Purpose | Required | Example (placeholder) | Scope |
|---|---|---|---|---|
| `MONGODB_URI` | MongoDB connection string | **Yes** | `mongodb://127.0.0.1:27017/kalt` | Dev & prod (prod uses a dedicated user + password) |
| `NEXT_PUBLIC_SITE_URL` | Public base URL (absolute links, SEO, metadata). **Frozen at build time.** | Yes in prod (must be `https://`) | `http://localhost:3000` | Dev: localhost; prod: `https://www.<domain>` |
| `APP_ENV` | `development` / `staging` / `production`. With `production`, dev/demo scripts and `seed --reset` refuse to run | Recommended | `development` | Both |
| `UPLOAD_DIR` | Folder for admin images + review photos | Dev: optional (default `.data/uploads`); **prod: required** (outside the release folder) | *(empty)* | Both |
| `SEED_ADMIN_EMAIL` | Admin account created by `npm run seed` | Optional (dev) | `admin@rio-district.test` | **Dev only** — leave empty in production |
| `SEED_ADMIN_PASSWORD` | Its password (≥ 10 characters) | Optional (dev) | `<generate-a-local-password>` | **Dev only** |
| `IMAGE_REMOTE_HOSTS` | Extra hosts allowed for product images (comma-separated) | Optional | `cdn.example.com` | Both |
| `PAYMENT_PROVIDER` | Reserved: no provider is implemented; leave empty (webhook answers 501) | No | *(empty)* | Both |
| `DESIGN_REVIEW_ENABLED` | `1` = enable the `/design-review/*` previews in a production build (private staging only) | No | *(unset)* | Staging only |
| `CONCEPTS_ENABLED` | Same for the older `/concepts/*` previews | No | *(unset)* | Staging only |
| `LOCAL_MONGO_PORT` | Port for `npm run db:local` | No | `27017` | Dev only |
| `ADMIN_PASSWORD` | Password read by `npm run admin:create` when `--password` is omitted (keeps it out of shell history) | No | — | Both (shell variable, not in the file) |
| `SMOKE_BASE_URL` | Server URL for `test:smoke` / `demo:orders` | No | `http://localhost:3000` | Tests |
| `QA_BASE_URL` | Server URL for the browser QA/screenshot scripts | No | `http://localhost:3000` | Tests |
| `QA_ADMIN_EMAIL` / `QA_ADMIN_PASSWORD` | Admin login for `scripts/qa-production.ts` | Only for that script | — | Tests (shell variables) |

Minimal development `.env.local`:

```ini
APP_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/kalt
NEXT_PUBLIC_SITE_URL=http://localhost:3000
UPLOAD_DIR=
SEED_ADMIN_EMAIL=admin@rio-district.test
SEED_ADMIN_PASSWORD=<paste a generated password>
IMAGE_REMOTE_HOSTS=
PAYMENT_PROVIDER=
```

There is **no session secret** to configure: session tokens are random per login and stored hashed in
MongoDB. To generate a strong local password:

```powershell
node -e "console.log(require('crypto').randomBytes(18).toString('base64url'))"
```

Keep `.env.local` out of Git, chat messages and screenshots. Use a password manager to move it between
your computers (§15).

---

## 7. Initial database seeding

With MongoDB running (§5) and `.env.local` ready:

```powershell
npm run seed
```

What `scripts/seed.ts` does (idempotent — **safe to run again**, it inserts only what is missing):

- creates indexes (never drops any);
- category `vestes`;
- the **6 products** `veste-bresil-{vert,rose,noir,blanc,bleu,jaune}` — 19,99 €, sizes XS–3XL enabled with
  **stock tracking off** (`stock: null`, set real quantities in Admin → Produits), pack-eligible, using the
  authorised photos from `public/products/reference/` (listed in `scripts/data/reference-images.json`);
- the store **settings** document (`DEFAULT_SETTINGS` from `src/lib/defaults.ts`: texts, 24,95 € pack,
  free shipping, 15-day returns policy, delivery assumptions, FAQ, size guide; countdown and pop-ups **off**);
- the **admin account** from `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` (if both are set; password ≥ 10 chars).

Running it twice prints `= … (déjà présent)` and changes nothing.

> ⚠️ `npm run seed -- --reset` **overwrites** the 6 products and the settings with the defaults (admin edits
> are lost). It refuses to run in production **and** whenever any order exists. Use it only on a throw-away
> local database.

**Reviews (optional).** The seed adds no reviews. To reproduce the 28 reviews published on the live site:

```powershell
npm run reviews:import                                             # dry run: shows what would change
npm run reviews:import -- --apply --publish-approved --with-photos # writes to YOUR local database
```

This reads `scripts/data/reference-reviews.json` (which records the client's written authorisation),
publishes the approved reviews and downloads their photos (from kaltshop.club) into `UPLOAD_DIR\reviews`.
It is idempotent (no duplicates, never unpublishes). Without `--publish-approved` they stay pending in
Admin → Avis. In development only, if no review is published, the product page and home page display these
same records read-only with an "Aperçu" tag; production always reads the database.

**Promotions**: nothing to seed — countdown and pop-ups are off until configured in Admin → Promotions.
For a demo database with sample campaigns, see `scripts/demo-marketing.ts` (§12).

**Images**: product photos are in Git (`public/products/reference/`). Admin uploads and review photos live in
`UPLOAD_DIR` and are **not** in Git; a fresh database has none, which is expected.

**Migrations**: none are needed for local development. `npm run images:migrate` and `npm run migrate:prod`
are one-off tools for existing/production databases (see `docs/DEPLOYMENT.md`); you do not need them.

Nothing in this setup depends on files that only exist on the original computer.

---

## 8. Start the development server

```powershell
# Terminal 1 — only if you use option B (otherwise the Windows service is already running)
npm run db:local

# Terminal 2
npm run dev
```

| Page | URL |
|---|---|
| Home | http://localhost:3000 |
| Product page | http://localhost:3000/produit/veste-bresil-vert |
| Pack pre-selected | http://localhost:3000/produit/veste-bresil-vert?offre=pack |
| Cart / checkout | http://localhost:3000/panier · http://localhost:3000/commande |
| Returns & refunds | http://localhost:3000/retours-remboursements |
| Admin login | http://localhost:3000/admin/login |
| Health check | http://localhost:3000/api/health → `{"status":"ok","db":"up",…}` |
| Design-review previews (dev only) | http://localhost:3000/design-review |

Stop the server with **Ctrl+C** in its terminal (answer `Y` if Windows asks to terminate the batch job).
Stop `db:local` the same way. Another port: `npx next dev -p 3001`.

---

## 9. Admin login

- Route: `/admin/login`, then `/admin`.
- Account: created by `npm run seed` (from `SEED_ADMIN_*`) or explicitly:

  ```powershell
  npm run admin:create -- --email admin@rio-district.test --password "<a local password of 10+ characters>"
  ```

  To keep the password out of the shell history:

  ```powershell
  $env:ADMIN_PASSWORD = Read-Host "Password"; npm run admin:create -- --email admin@rio-district.test; Remove-Item Env:ADMIN_PASSWORD
  ```

- **Reset a local password**: run the same `admin:create` command with a new password — it updates the
  existing account (and re-activates it). It also works for adding a second admin.
- Sessions last 7 days; logging out deletes the session.
- Use local-only e-mails/passwords. **Never** reuse the production admin credentials locally.

**Login problems**

| Symptom | Check |
|---|---|
| "E-mail ou mot de passe incorrect." | Account exists in *this* database? Re-run `admin:create`. Check `MONGODB_URI` points to the database you seeded |
| Redirected to login after logging in | Cookies blocked for localhost? Use `http://localhost:3000` (not an IP) in dev; in a local production build use `localhost` too |
| "Trop de tentatives. Réessaie dans 15 minutes." | Login allows 8 attempts per IP per 15 minutes (in-memory counter): wait, or restart the dev server |
| Admin page 500 | MongoDB down — see the terminal running `npm run dev` |

---

## 10. Development workflow

Open the project: `code .` (or File → Open Folder in VS Code). Use the integrated terminal (PowerShell).

```
src/
├─ app/
│  ├─ layout.tsx                 # root: <html>, Archivo font, global CSS
│  ├─ globals.css                # Tailwind 4 + design tokens (.store-dark theme, type scale, animations)
│  ├─ (store)/                   # storefront (route group, URL has no "(store)")
│  │  ├─ layout.tsx              # header, announcement, footer, cart drawer, pop-ups, StoreProvider
│  │  ├─ page.tsx                # home
│  │  ├─ produit/[slug]/         # product page (server: data + SEO) → components/store/pdp/ProductView
│  │  ├─ panier/ · commande/     # cart, checkout, confirmation/[token]
│  │  ├─ livraison-retours/ · retours-remboursements/
│  │  ├─ design-review/ · concepts/   # dev-only design previews (404 in production)
│  ├─ admin/                     # admin: login/ and (panel)/ (orders, products, reviews, promotions, settings…)
│  ├─ api/                       # route handlers: cart/quote, orders, reviews, contact, health, admin/*
│  └─ uploads/                   # serves files from UPLOAD_DIR
├─ components/
│  ├─ store/                     # Header, Footer, CartDrawer, CheckoutView, ProductCard, Faq, …
│  │  └─ pdp/                    # product page: ProductView, blocks (rating, stock, delivery, offer, reviews…), usePurchase
│  ├─ admin/                     # admin forms and tables
│  ├─ design-review/             # the three product-page concepts (previews)
│  └─ ui/                        # Button, Modal, icons
├─ lib/                          # server & shared logic
│  ├─ catalog.ts                 # products + settings from MongoDB
│  ├─ storefront.ts              # product-page/home data, FAQ, delivery plan, review fallback (dev)
│  ├─ pricing.ts · orders.ts     # server-side pricing, order creation, stock reservation
│  ├─ reviews.ts · marketing.ts  # reviews, ratings, countdown & pop-up rules
│  ├─ delivery-plan.ts           # business-day delivery estimate (holidays, cutoff)
│  ├─ stock-status.ts            # stock messages from tracked stock only
│  ├─ policies.ts                # structured returns policy (15 days; undecided terms = null)
│  ├─ defaults.ts                # default store settings (also used by the seed)
│  ├─ validation.ts              # zod schemas (checkout, admin, contact)
│  └─ auth.ts · http.ts · db.ts  # sessions, CSRF/rate limit helpers, Mongo connection
├─ models/                       # Mongoose schemas
├─ proxy.ts                      # (Next 16 "middleware") admin redirect
└─ instrumentation*.ts           # production start-up configuration checks
```

**Where to change what**

| Task | Files |
|---|---|
| Product page layout / purchase flow | `src/components/store/pdp/ProductView.tsx`, `pdp/blocks.tsx`, `pdp/usePurchase.ts` |
| Home page | `src/app/(store)/page.tsx`, `src/components/store/ProductCard.tsx`, `HomeReviews.tsx` |
| Header / menu / footer / cart drawer | `src/components/store/Header.tsx`, `Footer.tsx`, `CartDrawer.tsx`, `CartLineView.tsx` |
| Checkout form | `src/components/store/CheckoutView.tsx` (+ schema in `src/lib/validation.ts`) |
| Colours, fonts, type scale, animations | `src/app/globals.css` (`.store-dark` block), `src/lib/store-fonts.ts` |
| Admin pages | `src/app/admin/(panel)/…`, `src/components/admin/…` |
| API routes | `src/app/api/…/route.ts` |
| Data model | `src/models/…` (add fields with defaults; existing documents keep working) |
| Default texts/settings | `src/lib/defaults.ts` (applies to new databases; existing ones are edited in Admin → Réglages) |

**Design system (storefront)**: Tailwind utility classes + tokens defined on `.store-dark` in
`globals.css` (`bg-paper`, `text-ink`, `text-muted`, `border-line`, `text-brand`…), helper classes
`.display` (condensed Archivo titles), `.price`, `.lab` (labels), `.t-hero/.t-title/.t-section/.t-sub`
(responsive sizes), `.tap` (press feedback). Minimum text size 12 px, touch targets ≥ 44 px. See
`docs/storefront-redesign/README.md`.

**Next.js 16 note**: this version differs from older tutorials (e.g. `proxy.ts` replaces `middleware.ts`,
`params`/`searchParams` are Promises). The matching documentation ships in `node_modules/next/dist/docs/` —
read it before changing framework-level code (see `AGENTS.md`).

**Adding an environment variable**: add it to `.env.example` (placeholder only) and to the table in §6, read
it in code via `process.env.X` (client code can only read `NEXT_PUBLIC_*`), restart `npm run dev`.

---

## 11. Debugging guide

**Where to look first**: the terminal running `npm run dev` (server errors, logs as JSON lines), then Chrome
DevTools (F12): *Console* (client errors, hydration warnings), *Network* (API calls: status, response
body), *Application → Local Storage* (`rd.cart.v1` = cart), *Elements → Computed* (styles), device toolbar
(Ctrl+Shift+M) for 375/390 px.

```powershell
npm run typecheck          # TypeScript errors
npm run lint               # ESLint
curl.exe http://localhost:3000/api/health     # server + DB reachable? ({"status":"ok","db":"up",…}; 503 + "db":"down" if MongoDB is unreachable)
```

| Problem | Likely cause → fix |
|---|---|
| `MongooseServerSelectionError` / pages 500 | MongoDB not running → `Get-Service MongoDB` / start `npm run db:local`; wrong `MONGODB_URI`; port clash (service and db:local both on 27017) |
| `MONGODB_URI manquant` | `.env.local` missing or not in the project root |
| Product page 404 | Database not seeded or product `status` not `active` → `npm run seed`; check slug |
| Images missing | Product photos: check `public/products/reference/*.webp` exist (they are in Git). Review/admin photos: they live in `UPLOAD_DIR`, absent on a fresh machine (expected) |
| Hydration error in console | Server and client rendered different HTML: avoid `Date.now()`, `Math.random()`, `window`/`localStorage` during render — read them in `useEffect` |
| Admin login fails | §9 |
| Checkout says a field is invalid | Rules in `checkoutCustomerSchema` (`src/lib/validation.ts`); Network tab → `/api/orders` response contains the French error |
| Cart total looks wrong | The server is the source of truth: Network → `/api/cart/quote`; pricing in `src/lib/pricing.ts`; pack price in Admin → Réglages |
| No reviews shown | None published in this database → Admin → Avis, or `npm run reviews:import …` (§7) |
| Countdown not visible | Needs: enabled + title + **future** end date + placement (home/product) in Admin → Promotions; rules in `src/lib/marketing.ts` (`isCountdownLive`) |
| Pop-up not showing | Enabled + title + text + inside its dates; never on cart/checkout; shown once per `frequencyDays` per browser — clear `rd.popup.*` in Local Storage |
| Change not visible in dev | OneDrive/file-sync folder → re-save or restart `npm run dev`; delete `.next` if the cache is stuck (safe) |
| Port 3000 in use | Another dev server is running: `npx next dev -p 3001`, or stop it (`Get-NetTCPConnection -LocalPort 3000` → owning process) |

---

## 12. Testing

| Command | What | Needs | Writes to DB? |
|---|---|---|---|
| `npm run typecheck` | TypeScript | — | No |
| `npm run lint` | ESLint | — | No |
| `npm test` | Unit tests (pricing, marketing rules, delivery dates, stock messages) | — | No |
| `npm run build` | Production build | Internet (Google Fonts) | No |
| `npx tsx scripts/qa-storefront.ts` | Browser interaction QA: first screens, sticky bar, add to cart, pack, server quote, checkout validation (not submitted), menu, 15-day wording | `npm run dev` + seeded DB + Chrome | No |
| `npx tsx scripts/screenshots-storefront.ts --out=after` | Screenshots + overflow/text-size audit, 320→1440 px → `docs/storefront-redesign/after/` | dev server + Chrome | No |
| `npx tsx scripts/screenshots-design-review.ts` | Design-review concepts QA + screenshots | dev server + Chrome | No |
| `npm run qa:mobile` | Mobile audit of the **previous** product page (checks may not match the redesigned page) | dev server + Chrome | No |
| `npm run screenshots -- --set after` | Older full-page capture set (`docs/screenshots/after/`) | dev server + Chrome | No |
| ✍️ `npm run test:smoke` | End-to-end API test: pricing, idempotency, concurrent stock, reviews, campaigns | dev server + **test** DB | **Yes** — creates then deletes test orders/reviews, temporarily changes a product/settings; refuses production |
| ✍️ `npm run demo:orders` (`-- --clean`) | 3 labelled demo orders through the real API | dev server | **Yes**; refuses production |
| ✍️ `npx tsx scripts/demo-marketing.ts` (`--clean`) | Builds a separate `<db>_demo` database with sample reviews/campaigns; then `$env:MONGODB_URI="mongodb://127.0.0.1:27017/kalt_demo"; npm run dev` and `npm run qa:marketing` | MongoDB | **Yes** (only the `_demo` database); refuses production |
| ✍️ `npx tsx scripts/qa-production.ts` | Rehearsal against a local **production build** on a migrated copy: places an order, a review, a message, edits a product | `next start` + `QA_ADMIN_*` | **Yes**; never point it at the live site |
| Lighthouse (optional) | `npx -y lighthouse@12.8.2 http://localhost:3005/ --form-factor=mobile --only-categories=performance,accessibility` | a local production build (§13) | No |

For ✍️ scripts, use a dedicated database, e.g. start a second `db:local` and point the scripts at it:

```powershell
$env:LOCAL_MONGO_PORT = "27018"; npm run db:local                     # terminal A, from a separate checkout (its .data/mongo is isolated)
$env:MONGODB_URI = "mongodb://127.0.0.1:27018/rio_test"; npm run seed; npx next dev -p 3002   # terminal B, same separate checkout
$env:MONGODB_URI = "mongodb://127.0.0.1:27018/rio_test"; $env:SMOKE_BASE_URL = "http://localhost:3002"; npm run test:smoke  # terminal C, same separate checkout
```

(Simplest alternative with the Windows MongoDB service: just use another database name, e.g.
`mongodb://127.0.0.1:27017/rio_test`, in the commands above.) **Never** run ✍️ scripts against production.

---

## 13. Local production build

Production mode has safety checks (`src/instrumentation-node.ts`): the server **refuses to start** if
`NEXT_PUBLIC_SITE_URL` is not `https://…` at build time or `UPLOAD_DIR` is missing/not writable. Do not
remove these checks; give the build a temporary local configuration instead:

```powershell
$env:NEXT_PUBLIC_SITE_URL = "https://rio-district.local.test"   # any https URL, used only for links/metadata
npm run build
$env:UPLOAD_DIR = "$env:TEMP\rio-uploads-test"                  # writable scratch folder
npx next start -p 3005                                          # http://localhost:3005
# afterwards (same terminal):
Remove-Item Env:NEXT_PUBLIC_SITE_URL, Env:UPLOAD_DIR
```

Expected log line: `"event":"startup.ok"`. In production mode `/design-review` and `/concepts` return
**404**, and preview-only labels ("Aperçu", "À confirmer") are not rendered. A warning
`startup.mongo_without_credentials` is normal locally. The admin cookie is `Secure`, which browsers accept
on `http://localhost`. Stop the dev server before building or starting a production-mode server from the
same checkout; both commands use `.next` by default.

Real production deployment (VPS, nginx, HTTPS, MongoDB with auth, backups) is documented in
`docs/DEPLOYMENT.md` and is **out of scope** for a development computer.

---

## 14. Git workflow

```powershell
git status                                   # what changed
git switch main; git pull --ff-only origin main # start from the latest main
git switch -c feat/short-description         # one branch per change
# … edit, test …
git add <files>                              # or: git add -A (check `git status` first!)
git commit -m "Explain what and why"
git push -u origin feat/short-description    # publish the branch
```

Then open a **pull request** on GitHub (`feat/…` → `main`), review the diff, merge it, and update locally:

```powershell
git switch main; git pull --ff-only origin main
git branch -d feat/short-description         # delete the merged local branch
```

**Avoid overwriting `main`**
- Do not commit directly on `main`; never use `git push --force` on `main`.
- Optional but recommended: GitHub → Settings → Branches → protect `main` (require pull requests).
- Before pushing, run `npm run typecheck`, `npm run lint`, `npm test`.
- Check `git status` before `git add -A` so `.env.local`, dumps or large files never get staged (they are
  ignored, but double-check new file types).

**Merge conflicts** (`git pull` or merging reports `CONFLICT`):
1. `git status` lists the conflicted files.
2. Open each in VS Code: choose *Accept Current / Incoming / Both*, or edit between `<<<<<<<` and `>>>>>>>`.
3. `npm run typecheck` and `npm test`, then `git add <file>` and `git commit` (or `git rebase --continue`).
4. To abandon: `git merge --abort`.
`package-lock.json` conflicts: take one side, then run `npm install` and commit the regenerated lockfile.

---

## 15. Switching between computers

Git synchronises **source code only**. It does **not** carry: your local MongoDB data, `.env.local`,
uploaded files in `.data/uploads`, `node_modules`, or `.next`.

1. **Computer A** — save work: `git add …; git commit -m "…"; git push` (on your feature branch).
2. **Computer B** — first time: §2–§7. Afterwards: `git fetch; git switch <branch>; git pull`.
3. Restore `.env.local` securely (password manager / encrypted note — not e-mail, chat or Git), or recreate
   it from `.env.example` with new local passwords.
4. Start MongoDB (service or `npm run db:local`).
5. If `package-lock.json` changed: `npm ci`.
6. `npm run seed` (safe to re-run) — a fresh local database is usually all you need.
7. `npm run dev`, continue coding, then commit and push.
8. Back on **Computer A**: `git pull` (and `npm ci` if dependencies changed).

**Moving local test data (only if really needed)** — with MongoDB Database Tools
(https://www.mongodb.com/try/download/database-tools):

```powershell
mongodump --uri="mongodb://127.0.0.1:27017/kalt" --archive=rio-dev.archive.gz --gzip     # Computer A
mongorestore --uri="mongodb://127.0.0.1:27017" --archive=rio-dev.archive.gz --gzip --nsFrom='kalt.*' --nsTo='rio_imported.*'  # Computer B: use a new, empty database
```

Only do this with **development/test** data. Never copy a dump containing real customer orders or
personal data, never commit dumps to Git (the repository is public), and delete the archive after use.

---

## 16. Handover checklist

- [ ] Node ≥ 20.19 (22 LTS), npm, Git, Chrome installed (`node -v`, `npm -v`, `git --version`)
- [ ] Repository cloned, on `main`, `git status` clean
- [ ] `npm ci` completed; `npm run typecheck` silent; `npm test` → 25 pass
- [ ] `.env.local` created from `.env.example` with local values (not committed)
- [ ] MongoDB running (service or `npm run db:local`); `curl.exe http://localhost:3000/api/health` → `"db":"up"` once the server runs
- [ ] `npm run seed` → 6 products, settings, admin account
- [ ] Home page opens at http://localhost:3000
- [ ] Product page http://localhost:3000/produit/veste-bresil-vert shows price, sizes, delivery date
- [ ] Add to cart works (drawer opens with "Ajouté au panier"); cart and checkout pages load
- [ ] Admin login at http://localhost:3000/admin/login works; products listed in Admin → Produits
- [ ] `npm run lint` and `npm run build` succeed
- [ ] Feature branch created, committed and pushed: `git switch -c feat/test-setup` → `git push -u origin feat/test-setup`

---

### Validation of this guide

Validated on 17 Oct 2026 on Windows with Node 22.13.1 and npm 10.9.2 in a fresh local clone and
an isolated MongoDB database on port 27018: `npm ci`, `npm run db:local`, `npm run seed` twice,
`npx next dev -p 3002`, nine HTTP smoke checks, 15 storefront browser checks, screenshot/overflow
audit, local admin login, TypeScript, ESLint, 25 unit tests, and `npm run build`. The cloned server
returned HTTP 200 for health, Returns & Refunds, and the authenticated admin dashboard.
The production server and clean installation of Node, Git, Chrome, or MongoDB Community Server were
not tested on this computer. Run the checklist above after cloning from GitHub.
