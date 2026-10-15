import clsx from "clsx";
import type { ReactNode } from "react";
import { ORDER_STATUS_LABEL, PAYMENT_STATUS_LABEL, PRODUCT_STATUS_LABEL, TONE } from "@/lib/labels";

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="display text-4xl md:text-5xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ title, children, className, actions }: { title?: string; children: ReactNode; className?: string; actions?: ReactNode }) {
  return (
    <section className={clsx("rounded-[var(--radius-md)] border border-line bg-white/70", className)}>
      {title && (
        <div className="flex items-center justify-between border-b border-line px-4 py-3 md:px-5">
          <h2 className="eyebrow text-muted">{title}</h2>
          {actions}
        </div>
      )}
      <div className="p-4 md:p-5">{children}</div>
    </section>
  );
}

export function Badge({ value, kind }: { value: string; kind: "order" | "payment" | "product" }) {
  const label = (kind === "order" ? ORDER_STATUS_LABEL : kind === "payment" ? PAYMENT_STATUS_LABEL : PRODUCT_STATUS_LABEL)[value] ?? value;
  return (
    <span className={clsx("inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset", TONE[value] ?? "bg-stone-100 ring-stone-300")}>
      {label}
    </span>
  );
}

export function Stat({ label, value, hint, href }: { label: string; value: ReactNode; hint?: string; href?: string }) {
  const body = (
    <>
      <p className="eyebrow text-muted">{label}</p>
      <p className="price mt-2 text-4xl">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </>
  );
  const cls = "block rounded-[var(--radius-md)] border border-line bg-white/70 p-4 md:p-5";
  return href ? (
    <a href={href} className={clsx(cls, "transition-colors hover:border-ink")}>{body}</a>
  ) : (
    <div className={cls}>{body}</div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-[var(--radius-md)] border border-dashed border-line-strong px-4 py-10 text-center text-sm text-muted">{children}</p>;
}

export const inputCls = "field min-h-10 py-2 text-sm";
export const labelCls = "mb-1 block text-xs font-semibold text-ink-2";
