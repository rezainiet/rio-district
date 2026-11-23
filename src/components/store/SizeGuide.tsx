"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { recommendSize, type Size, type SizeChartRow, type SizeRule } from "@/lib/sizes";
import { useT } from "@/i18n/client";

export function SizeGuide({
  open,
  onClose,
  rules,
  chart,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  rules: SizeRule[];
  chart: SizeChartRow[];
  /** Called when the customer applies the suggested size. */
  onPick?: (size: Size) => void;
}) {
  const { t } = useT();
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [result, setResult] = useState<Size | null | "invalid">(null);

  const compute = () => {
    const r = recommendSize(Number(height), Number(weight), rules);
    setResult(r ?? "invalid");
  };

  return (
    <Modal open={open} onClose={onClose} title={t("Trouver ma taille")} description={t("Indique ta taille et ton poids, on te donne une estimation.")} className="max-w-xl">
      <form
        className="rounded-[var(--radius-md)] border border-line bg-paper-2/60 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          compute();
        }}
      >
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="sg-height" className="eyebrow mb-1.5 block text-muted">{t("Taille (cm)")}</label>
            <input
              id="sg-height"
              type="number"
              inputMode="numeric"
              min={130}
              max={230}
              placeholder="175"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              className="field"
              required
            />
          </div>
          <div>
            <label htmlFor="sg-weight" className="eyebrow mb-1.5 block text-muted">{t("Poids (kg)")}</label>
            <input
              id="sg-weight"
              type="number"
              inputMode="numeric"
              min={30}
              max={200}
              placeholder="70"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="field"
              required
            />
          </div>
        </div>
        <Button type="submit" className="mt-3 w-full">{t("Estimer ma taille")}</Button>

        <div aria-live="polite" className="mt-3 min-h-6">
          {result === "invalid" && (
            <p className="text-sm text-danger">{t("Entre une taille entre 130 et 230 cm et un poids entre 30 et 200 kg.")}</p>
          )}
          {result && result !== "invalid" && (
            <div className="flex items-center justify-between gap-3 rounded-[var(--radius-sm)] bg-ink px-4 py-3 text-paper">
              <p>
                <span className="eyebrow block text-paper/60">{t("Taille suggérée")}</span>
                <span className="price text-3xl">{result}</span>
              </p>
              {onPick && (
                <Button
                  variant="lime"
                  size="sm"
                  onClick={() => {
                    onPick(result);
                    onClose();
                  }}
                >
                  {t("Choisir {size}", { size: result })}
                </Button>
              )}
            </div>
          )}
        </div>
        <p className="mt-2 text-xs leading-relaxed text-muted">
          {t("Estimation indicative, basée sur un barème provisoire : elle ne garantit pas l'ajustement. Entre deux tailles, prends la plus grande pour une coupe ample. En cas de doute, écris-nous avant de commander.")}
        </p>
      </form>

      <h3 className="eyebrow mb-2 mt-6 text-muted">{t("Mesures du vêtement (cm)")}</h3>
      <div className="overflow-x-auto rounded-[var(--radius-md)] border border-line">
        <table className="w-full min-w-[420px] text-left text-sm">
          <thead className="bg-paper-2 text-xs text-muted">
            <tr>
              <th scope="col" className="px-3 py-2 font-medium">{t("Taille")}</th>
              <th scope="col" className="px-3 py-2 font-medium">{t("Poitrine")}</th>
              <th scope="col" className="px-3 py-2 font-medium">{t("Tour de taille")}</th>
              <th scope="col" className="px-3 py-2 font-medium">{t("Dos")}</th>
              <th scope="col" className="px-3 py-2 font-medium">{t("Manche")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line tabular-nums">
            {chart.map((row) => (
              <tr key={row.size} className={result === row.size ? "bg-lime/40" : undefined}>
                <th scope="row" className="px-3 py-2 font-semibold">{row.size}</th>
                <td className="px-3 py-2">{row.chest}</td>
                <td className="px-3 py-2">{row.waist}</td>
                <td className="px-3 py-2">{row.back}</td>
                <td className="px-3 py-2">{row.sleeve}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}
