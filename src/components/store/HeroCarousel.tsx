"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import type { PublicProduct } from "@/lib/types";

export function HeroCarousel({ products }: { products: PublicProduct[] }) {
  const [active, setActive] = useState(0);
  const start = useRef<{ x: number; y: number } | null>(null);
  const dragged = useRef(false);
  const list = products.slice(0, 6);
  if (!list.length) return null;
  const move = (delta: number) => setActive(i => (i + delta + list.length) % list.length);
  return <div className="hero-carousel lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-center" role="region" aria-roledescription="carrousel" aria-label="Les six coloris"
    tabIndex={0} onKeyDown={e => { if (e.key === "ArrowRight") { e.preventDefault(); move(1); } if (e.key === "ArrowLeft") { e.preventDefault(); move(-1); } }}
    onDragStart={e => e.preventDefault()}
    onPointerDown={e => { if (e.button !== 0) return; dragged.current = false; start.current = { x: e.clientX, y: e.clientY }; }}
    onPointerCancel={() => { start.current = null; }}
    onPointerUp={e => { if (!start.current) return; const dx = e.clientX - start.current.x; const dy = e.clientY - start.current.y; if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) { move(dx < 0 ? 1 : -1); dragged.current = true; } start.current = null; }}
    onClickCapture={e => { if (dragged.current) { e.preventDefault(); e.stopPropagation(); dragged.current = false; } }}>
    <div className="hero-carousel-stage">
      {list.map((p, i) => {
        let offset = (i - active + list.length) % list.length;
        if (offset > list.length / 2) offset -= list.length;
        const current = i === active;
        return <Link key={p.id} href={`/produit/${p.slug}`} className={`hero-slide ${current ? "is-active" : ""}`} tabIndex={current ? 0 : -1} aria-hidden={!current} aria-label={`Découvrir ${p.name}`}
          style={{ transform: `translateX(calc(-50% + ${offset * 72}%)) scale(${current ? 1 : 0.86}) rotate(${offset === 0 ? 0 : offset > 0 ? 3 : -3}deg)`, opacity: Math.abs(offset) > 1 ? 0 : current ? 1 : 0.46, zIndex: current ? 3 : 1, pointerEvents: current ? "auto" : "none" }}>
          {p.images[0] && <Image src={p.images[0].url} alt={p.images[0].alt} fill sizes="(min-width: 1024px) 32vw, 66vw" loading={i === 0 ? "eager" : "lazy"} className="object-cover" />}
        </Link>;
      })}
      <span className="hero-edition" aria-hidden="true">RIO / COLLECTION BRÉSIL</span>
      <button className="carousel-arrow left-3" aria-label="Coloris précédent" onClick={() => move(-1)}>←</button>
      <button className="carousel-arrow right-3" aria-label="Coloris suivant" onClick={() => move(1)}>→</button>
    </div>
    <div className="hero-carousel-caption">
      <span aria-live="polite"><span className="text-muted">Le coloris</span> <strong>{list[active].color.name}</strong></span>
      <div className="flex" aria-label="Choisir un coloris">{list.map((p,i) => <button key={p.id} className="hero-dot" aria-label={`Afficher le coloris ${p.color.name}`} aria-pressed={i === active} onClick={() => setActive(i)}><span style={{background:p.color.hex}} /></button>)}</div>
      <span className="text-xs tabular-nums text-muted">0{active + 1} / 0{list.length}</span>
    </div>
  </div>;
}
