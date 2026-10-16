import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_DISPATCH, deliveryPlan, frenchHolidays, rangeLong, rangeShort } from "../src/lib/delivery-plan";
import { stockInfo, stockMessage } from "../src/lib/stock-status";

const paris = (local: string) => new Date(`${local}+02:00`); // October 2026 is CEST

test("French public holidays (2026)", () => {
  const h = frenchHolidays(2026);
  assert.equal(h.length, 11);
  for (const d of ["2026-04-06", "2026-05-14", "2026-05-25", "2026-11-01", "2026-11-11"]) assert.ok(h.includes(d), d);
});

test("default plan: Friday order → dispatch Monday → delivered Tue–Thu (same promise as 2–4 business days)", () => {
  const p = deliveryPlan(DEFAULT_DISPATCH, paris("2026-10-16T10:00:00"));
  assert.deepEqual([p.orderDay, p.dispatchDay, p.deliveryFrom, p.deliveryTo], ["2026-10-16", "2026-10-19", "2026-10-20", "2026-10-22"]);
  assert.equal(p.minDays, 2);
  assert.equal(p.maxDays, 4);
  assert.equal(rangeLong(p.deliveryFrom, p.deliveryTo), "entre le 20 et le 22 octobre");
  assert.equal(rangeShort(p.deliveryFrom, p.deliveryTo), "20 – 22 oct.");
});

test("weekends and holidays are skipped, months are spelled out when they differ", () => {
  // Tue 10 Nov 2026: dispatch skips Wed 11 Nov (Armistice) → Thu 12; delivery Fri 13 – Tue 17.
  const p = deliveryPlan(DEFAULT_DISPATCH, paris("2026-11-10T09:00:00"));
  assert.deepEqual([p.dispatchDay, p.deliveryFrom, p.deliveryTo], ["2026-11-12", "2026-11-13", "2026-11-17"]);
  const q = deliveryPlan(DEFAULT_DISPATCH, paris("2026-10-27T09:00:00"));
  assert.equal(rangeLong(q.deliveryFrom, q.deliveryTo), "entre le 29 octobre et le 2 novembre");
});

test("cutoff hour and closed days push the start to the next business day", () => {
  const s = { ...DEFAULT_DISPATCH, cutoffHour: 14 };
  assert.equal(deliveryPlan(s, paris("2026-10-15T13:59:00")).dispatchDay, "2026-10-16");
  const late = deliveryPlan(s, paris("2026-10-15T14:00:00"));
  assert.equal(late.countsFromNextBusinessDay, true);
  assert.equal(late.dispatchDay, "2026-10-19");
  assert.equal(deliveryPlan({ ...DEFAULT_DISPATCH, closedDates: ["2026-10-19"] }, paris("2026-10-16T10:00:00")).dispatchDay, "2026-10-20");
});

test("stock: quantities only for tracked stock at or under the threshold", () => {
  const untracked = stockInfo([{ label: "S", enabled: true, stock: null }, { label: "M", enabled: true, stock: null }]);
  assert.deepEqual(stockMessage(untracked, null), { tone: "neutral", text: "Disponible du S au M" });
  assert.deepEqual(stockMessage(untracked, "M"), { tone: "neutral", text: "Disponible en M" });
  assert.equal(untracked.total, null);

  const low = stockInfo([{ label: "S", enabled: true, stock: 3 }, { label: "M", enabled: true, stock: 4 }, { label: "L", enabled: true, stock: 0 }]);
  assert.equal(stockMessage(low, null).text, "Plus que 7 articles disponibles");
  assert.equal(stockMessage(low, "S").text, "Plus que 3 articles en S");
  assert.deepEqual(stockMessage(low, "L"), { tone: "out", text: "Taille L épuisée" });

  const plenty = stockInfo([{ label: "S", enabled: true, stock: 40 }, { label: "M", enabled: true, stock: 2 }]);
  assert.equal(plenty.total, null, "no total above the threshold");
  assert.equal(stockMessage(plenty, null).text, "Stock limité sur la taille M");
  assert.deepEqual(stockMessage(plenty, "S"), { tone: "ok", text: "En stock en S" });

  const mixed = stockInfo([{ label: "S", enabled: true, stock: 2 }, { label: "M", enabled: true, stock: null }]);
  assert.equal(mixed.total, null, "no total when some sizes are untracked");
  assert.deepEqual(stockMessage(stockInfo([{ label: "S", enabled: false, stock: null }]), null), { tone: "out", text: "Épuisé pour le moment" });
});
