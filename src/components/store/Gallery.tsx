"use client";

import Image from "next/image";
import { useRef, useState, type PointerEvent } from "react";
import clsx from "clsx";
import { Modal } from "@/components/ui/Modal";
import { ZoomIcon } from "@/components/ui/icons";
import type { PublicProduct } from "@/lib/types";

/** Visible on the image itself so it can never be mistaken for a product photo. */
function PlaceholderTag() {
  return (
    <span className="eyebrow pointer-events-none absolute left-3 top-3 z-10 rounded-full bg-paper/90 px-2.5 py-1 text-[9.5px] text-ink-2 backdrop-blur">
      Illustration provisoire
    </span>
  );
}

export function Gallery({ images, name }: { images: PublicProduct["images"]; name: string }) {
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const [lightbox, setLightbox] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
  };

  // Mobile: keep the active dot in sync with the swipe position.
  const onScroll = () => {
    const el = trackRef.current;
    if (!el) return;
    setActive(Math.round(el.scrollLeft / el.clientWidth));
  };

  const goTo = (i: number) => {
    setActive(i);
    const el = trackRef.current;
    if (el && getComputedStyle(el).overflowX !== "visible") el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  };

  if (images.length === 0) {
    return <div className="aspect-[4/5] rounded-[var(--radius-md)] bg-studio" aria-label="Pas d'image" />;
  }

  const current = images[Math.min(active, images.length - 1)];
  const isPlaceholder = images.some((i) => i.kind === "placeholder");

  return (
    <div className="md:grid md:grid-cols-[72px_1fr] md:gap-4">
      {/* Thumbnails (desktop) */}
      <ul className="hidden flex-col gap-3 md:flex" aria-label="Miniatures">
        {images.map((img, i) => (
          <li key={img.url}>
            <button
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Voir l'image ${i + 1} : ${img.alt}`}
              aria-current={i === active}
              className={clsx(
                "relative block aspect-[4/5] w-full overflow-hidden rounded-[var(--radius-sm)] bg-studio ring-offset-2 ring-offset-paper transition",
                i === active ? "ring-2 ring-ink" : "ring-1 ring-line hover:ring-ink/50",
              )}
            >
              <Image src={img.url} alt="" fill sizes="72px" className="object-cover" />
            </button>
          </li>
        ))}
      </ul>

      <div>
        {/* Desktop: single stage with hover zoom */}
        <div
          className="group relative hidden aspect-[4/5] cursor-zoom-in overflow-hidden rounded-[var(--radius-md)] bg-studio md:block"
          onPointerMove={onMove}
          onPointerLeave={() => setZoom(null)}
          onClick={() => setLightbox(true)}
          role="button"
          tabIndex={0}
          aria-label="Agrandir l'image"
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setLightbox(true);
            }
            if (e.key === "ArrowRight") goTo((active + 1) % images.length);
            if (e.key === "ArrowLeft") goTo((active - 1 + images.length) % images.length);
          }}
        >
          <Image
            src={current.url}
            alt={current.alt || name}
            fill
            priority
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="object-cover transition-transform duration-200 ease-out"
            style={zoom ? { transform: "scale(2)", transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}
          />
          {isPlaceholder && <PlaceholderTag />}
          <span className="pointer-events-none absolute bottom-4 right-4 grid size-10 place-items-center rounded-full bg-paper/90 opacity-0 transition-opacity group-hover:opacity-100">
            <ZoomIcon width={18} height={18} />
          </span>
        </div>

        {/* Mobile: swipeable track */}
        <div
          ref={trackRef}
          onScroll={onScroll}
          className="no-scrollbar relative -mx-4 flex snap-x snap-mandatory overflow-x-auto sm:-mx-6 md:hidden"
          aria-label="Images du produit"
        >
          {images.map((img, i) => (
            <button
              type="button"
              key={img.url}
              onClick={() => {
                setActive(i);
                setLightbox(true);
              }}
              className="relative aspect-[4/5] w-full shrink-0 snap-center bg-studio"
              aria-label={`Agrandir l'image ${i + 1}`}
            >
              {isPlaceholder && <PlaceholderTag />}
              <Image src={img.url} alt={img.alt || name} fill loading={i === 0 ? "eager" : "lazy"} sizes="(min-width: 768px) 1px, 100vw" className="object-cover" />
            </button>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between md:hidden">
          <div className="flex gap-1.5" role="tablist" aria-label="Choisir une image">
            {images.map((img, i) => (
              <button
                key={img.url}
                type="button"
                role="tab"
                aria-selected={i === active}
                aria-label={`Image ${i + 1}`}
                onClick={() => goTo(i)}
                className={clsx("h-1.5 rounded-full transition-all", i === active ? "w-6 bg-ink" : "w-1.5 bg-line-strong")}
              />
            ))}
          </div>
          <span className="eyebrow text-muted">
            {active + 1} / {images.length}
          </span>
        </div>

      </div>

      <Modal open={lightbox} onClose={() => setLightbox(false)} title={name} className="max-w-3xl">
        <div className="relative aspect-[4/5] max-h-[70dvh] w-full overflow-hidden rounded-[var(--radius-md)] bg-studio">
          <Image src={current.url} alt={current.alt || name} fill sizes="(min-width: 768px) 720px, 100vw" className="object-contain" />
        </div>
        <div className="mt-3 flex justify-center gap-2">
          {images.map((img, i) => (
            <button
              key={img.url}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Image ${i + 1}`}
              className={clsx("relative size-14 overflow-hidden rounded-[var(--radius-sm)] bg-studio", i === active && "ring-2 ring-ink")}
            >
              <Image src={img.url} alt="" fill sizes="56px" className="object-cover" />
            </button>
          ))}
        </div>
      </Modal>
    </div>
  );
}
