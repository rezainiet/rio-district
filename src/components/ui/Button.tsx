import Link from "next/link";
import clsx from "clsx";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "brand" | "lime" | "outline" | "ghost" | "light" | "danger";
type Size = "sm" | "md" | "lg";

const base =
  "ui-btn inline-flex items-center justify-center gap-2 font-display font-semibold uppercase tracking-[0.12em] [font-variation-settings:'wdth'_110] rounded-[var(--btn-radius,var(--radius-sm))] transition-[background-color,color,border-color,transform,box-shadow] duration-200 ease-[var(--ease-out-soft)] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 select-none whitespace-nowrap";

const variants: Record<Variant, string> = {
  primary: "bg-ink text-paper hover:bg-brand",
  brand: "bg-brand text-white hover:bg-brand-ink",
  lime: "bg-lime text-[#121212] hover:brightness-95",
  outline: "border border-ink text-ink hover:bg-ink hover:text-paper",
  ghost: "text-ink hover:bg-paper-2",
  light: "bg-paper text-ink hover:bg-white",
  danger: "bg-danger text-white hover:bg-[#912018]",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3.5 text-[11px]",
  md: "h-12 px-5 text-xs",
  lg: "h-14 px-7 text-[13px]",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", extra?: string) {
  return clsx(base, variants[variant], sizes[size], extra);
}

type Common = { variant?: Variant; size?: Size; className?: string; children: ReactNode };

export function Button({ variant, size, className, ...props }: Common & ComponentProps<"button">) {
  return <button type="button" className={buttonClass(variant, size, className)} {...props} />;
}

export function ButtonLink({ variant, size, className, ...props }: Common & ComponentProps<typeof Link>) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}
