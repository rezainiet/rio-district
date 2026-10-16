# Design concepts — review only

**Not production code.** Five static homepage mockups for the client to choose a visual direction.
They reuse the real product photos from `public/products/reference/` and the live store's prices
and French copy, but nothing here is imported by the app.

| # | Concept | Source |
|---|---|---|
| 1 | Editorial Luxury | `01-editorial-luxury/index.html` |
| 2 | Sport Performance | `02-sport-performance/index.html` |
| 3 | Minimal Scandinavian | `03-minimal-scandinavian/index.html` |
| 4 | Dark Premium | `04-dark-premium/index.html` |
| 5 | Brazilian Energy Premium | `05-brazilian-energy/index.html` |

Render the images (desktop 1440 px full page + mobile 390 px first screen):

```bash
npx tsx design-concepts/render.ts
```

Output: `design-concepts/output/`. The photo rights are still pending written authorization
(see `docs/IMAGES.md`), so these images are for internal client review only.
