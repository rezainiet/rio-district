"use client";

import { useEffect, useRef, type ReactNode } from "react";

export function Reveal({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Content remains visible when JS is unavailable; only below-fold sections are staged.
    if (el.getBoundingClientRect().top < window.innerHeight) return;
    el.classList.add("reveal-pending");
    const observer = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) { el.classList.remove("reveal-pending"); observer.disconnect(); }
    }, { rootMargin: "0px 0px -35px 0px" });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return <div ref={ref} className={`section-reveal ${className}`}>{children}</div>;
}
