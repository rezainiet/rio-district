import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_COUNTDOWN,
  DEFAULT_POPUPS,
  countdownFor,
  countdownParts,
  displayName,
  isCountdownLive,
  isSafeHref,
  livePopups,
  parisLocalToUtc,
  popupsAllowedOn,
  summarizeRatings,
  utcToParisLocal,
} from "../src/lib/marketing";
import { promotionsSchema, reviewSubmissionSchema } from "../src/lib/validation";

const NOW = Date.parse("2026-10-16T10:00:00Z");
const live = { ...DEFAULT_COUNTDOWN, enabled: true, title: "Offre", endsAt: "2026-10-20T21:59:00.000Z" };

test("Paris wall-clock times convert to UTC across daylight saving time", () => {
  assert.equal(parisLocalToUtc("2026-07-14T20:00"), "2026-07-14T18:00:00.000Z"); // summer, UTC+2
  assert.equal(parisLocalToUtc("2026-12-24T23:59"), "2026-12-24T22:59:00.000Z"); // winter, UTC+1
  assert.equal(utcToParisLocal("2026-12-24T22:59:00.000Z"), "2026-12-24T23:59");
  assert.equal(utcToParisLocal(parisLocalToUtc("2026-10-25T12:30")), "2026-10-25T12:30"); // DST change day
  assert.equal(parisLocalToUtc("not a date"), null);
});

test("countdown needs to be enabled, titled, with a real future end date", () => {
  assert.equal(isCountdownLive(DEFAULT_COUNTDOWN, NOW), false, "off by default");
  assert.equal(isCountdownLive(live, NOW), true);
  assert.equal(isCountdownLive({ ...live, endsAt: null }, NOW), false, "no deadline, no countdown");
  assert.equal(isCountdownLive({ ...live, title: " " }, NOW), false);
  assert.equal(isCountdownLive({ ...live, enabled: false }, NOW), false);
  assert.equal(isCountdownLive(live, Date.parse(live.endsAt)), false, "expires exactly at the deadline");
  assert.equal(isCountdownLive({ ...live, startsAt: "2026-10-17T00:00:00.000Z" }, NOW), false, "not started yet");
});

test("countdown placement and payload", () => {
  assert.equal(countdownFor(live, "product", NOW), null, "product placement off by default");
  const home = countdownFor(live, "home", NOW);
  assert.equal(home?.endsAt, live.endsAt);
  assert.equal(home?.serverNow, NOW);
});

test("countdown parts", () => {
  assert.deepEqual(countdownParts(((2 * 24 + 3) * 3600 + 4 * 60 + 5) * 1000), { days: 2, hours: 3, minutes: 4, seconds: 5, done: false });
  assert.equal(countdownParts(-5000).done, true);
  assert.equal(countdownParts(999).done, true);
});

test("pop-ups stay off until enabled AND filled in, and respect their dates", () => {
  const none = livePopups(DEFAULT_POPUPS, NOW);
  assert.deepEqual(none, { welcome: null, exitIntent: null, cartReminder: null });
  const p = structuredClone(DEFAULT_POPUPS);
  p.welcome = { ...p.welcome, enabled: true, title: "Bienvenue", text: "" };
  assert.equal(livePopups(p, NOW).welcome, null, "no message → not shown");
  p.welcome.text = "Découvre la collection.";
  p.welcome.ctaHref = "javascript:alert(1)";
  const w = livePopups(p, NOW).welcome;
  assert.equal(w?.title, "Bienvenue");
  assert.equal(w?.ctaHref, "", "unsafe links are dropped");
  p.welcome.endsAt = "2026-10-01T00:00:00.000Z";
  assert.equal(livePopups(p, NOW).welcome, null, "ended campaign");
});

test("pop-ups never run on the cart or checkout", () => {
  assert.equal(popupsAllowedOn("/"), true);
  assert.equal(popupsAllowedOn("/produit/veste-bresil-vert"), true);
  assert.equal(popupsAllowedOn("/panier"), false);
  assert.equal(popupsAllowedOn("/commande"), false);
  assert.equal(popupsAllowedOn("/commande/confirmation/abc"), false);
});

test("safe CTA links", () => {
  assert.equal(isSafeHref("/produit/veste-bresil-noir?offre=pack"), true);
  assert.equal(isSafeHref("https://example.com"), true);
  assert.equal(isSafeHref("//evil.com"), false);
  assert.equal(isSafeHref("javascript:alert(1)"), false);
});

test("ratings come only from the given reviews", () => {
  assert.deepEqual(summarizeRatings([]), { count: 0, average: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } });
  const s = summarizeRatings([5, 4, 4, 3]);
  assert.equal(s.count, 4);
  assert.equal(s.average, 4);
  assert.deepEqual(s.distribution, { 1: 0, 2: 0, 3: 1, 4: 2, 5: 1 });
  assert.equal(summarizeRatings([5, 4]).average, 4.5);
});

test("reviewer names are shortened to first name + initial", () => {
  assert.equal(displayName("jean dupont"), "Jean D.");
  assert.equal(displayName("Julien"), "Julien");
  assert.equal(displayName("  Imen  D. "), "Imen D.");
  assert.equal(displayName(""), "Client");
});

test("review submissions are validated", () => {
  const ok = {
    productId: "a".repeat(24),
    name: "Lina R",
    email: "LINA@example.com",
    rating: "5",
    title: "Très bonne veste",
    text: "Coupe ample comme annoncé, je fais du M et le M est parfait.",
    consent: true,
  };
  const r = reviewSubmissionSchema.safeParse(ok);
  assert.ok(r.success);
  assert.equal(r.data.email, "lina@example.com");
  assert.equal(r.data.rating, 5);
  assert.equal(reviewSubmissionSchema.safeParse({ ...ok, rating: "6" }).success, false);
  assert.equal(reviewSubmissionSchema.safeParse({ ...ok, text: "Super, voir www.promo.xyz pour plus" }).success, false, "links refused");
  assert.equal(reviewSubmissionSchema.safeParse({ ...ok, consent: false }).success, false);
  assert.equal(reviewSubmissionSchema.safeParse({ ...ok, orderNumber: "rd-10012" }).success, true);
  assert.equal(reviewSubmissionSchema.safeParse({ ...ok, orderNumber: "123" }).success, false);
});

test("an enabled countdown requires a real end date and content", () => {
  const base = { countdown: { ...DEFAULT_COUNTDOWN }, popups: DEFAULT_POPUPS };
  assert.ok(promotionsSchema.safeParse(base).success, "everything off is valid");
  const noEnd = promotionsSchema.safeParse({ ...base, countdown: { ...DEFAULT_COUNTDOWN, enabled: true, title: "Offre" } });
  assert.equal(noEnd.success, false);
  assert.ok(!noEnd.success && noEnd.error.issues.some((i) => i.path.join(".") === "countdown.endsAt"));
  const reversed = promotionsSchema.safeParse({
    ...base,
    countdown: { ...live, startsAt: "2026-10-21T00:00:00.000Z" },
  });
  assert.equal(reversed.success, false, "start after end");
  const popupNoCta = promotionsSchema.safeParse({
    ...base,
    popups: { ...DEFAULT_POPUPS, welcome: { ...DEFAULT_POPUPS.welcome, enabled: true, ctaLabel: "", ctaHref: "" } },
  });
  assert.equal(popupNoCta.success, false, "enabled welcome pop-up needs a CTA");
});

test("launch defaults: approved copy prepared, every campaign switched off", () => {
  assert.equal(DEFAULT_COUNTDOWN.enabled, false);
  assert.equal(DEFAULT_COUNTDOWN.endsAt, null, "no invented deadline");
  for (const p of Object.values(DEFAULT_POPUPS)) {
    assert.equal(p.enabled, false);
    assert.ok(p.title && p.text, "copy is ready for activation");
    assert.ok(!/d[ée]mo/i.test(`${p.title} ${p.text}`));
  }
  assert.deepEqual(livePopups(DEFAULT_POPUPS, NOW), { welcome: null, exitIntent: null, cartReminder: null });
  assert.ok(promotionsSchema.safeParse({ countdown: DEFAULT_COUNTDOWN, popups: DEFAULT_POPUPS }).success);
  // Switching the welcome pop-up on is enough: its approved content is already valid.
  const on = { ...DEFAULT_POPUPS, welcome: { ...DEFAULT_POPUPS.welcome, enabled: true } };
  assert.ok(promotionsSchema.safeParse({ countdown: DEFAULT_COUNTDOWN, popups: on }).success);
});
