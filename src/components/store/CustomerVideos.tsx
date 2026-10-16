"use client";

import { useEffect, useRef, useState } from "react";

// The three clips selected from the client's reference storefront. No embedded player SDK.
const CLIPS = [12, 15, 13];
export function CustomerVideos({ compact = false }: { compact?: boolean }) {
  const rail = useRef<HTMLUListElement>(null);
  const section = useRef<HTMLElement>(null);
  const players = useRef<(HTMLVideoElement | null)[]>([]);
  const [active, setActive] = useState(0);
  const [inView, setInView] = useState(false);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(true);
  const [manual, setManual] = useState(false);
  const [failed, setFailed] = useState<number | null>(null);
  const [pageVisible, setPageVisible] = useState(true);
  const [autoAllowed, setAutoAllowed] = useState(false);
  useEffect(() => {
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    const observer = new IntersectionObserver(([entry]) => {
      setAutoAllowed(!window.matchMedia("(prefers-reduced-motion: reduce)").matches && !connection?.saveData && !["slow-2g", "2g"].includes(connection?.effectiveType ?? ""));
      setInView(entry.isIntersecting);
    }, { threshold: 0.2 });
    if (section.current) observer.observe(section.current);
    const visibility = () => setPageVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", visibility);
    return () => { observer.disconnect(); document.removeEventListener("visibilitychange", visibility); };
  }, []);
  const canLoad = inView && (autoAllowed || manual);
  useEffect(() => {
    let cancelled = false;
    players.current.forEach((video, i) => {
      if (!video) return;
      if (canLoad && pageVisible && playing && i === active) void video.play().catch(() => { if (!cancelled) setPlaying(false); });
      else {
        video.pause();
        // Release the previous clip's network buffer once React removes its source.
        if (!video.getAttribute("src") && video.currentSrc) video.load();
      }
    });
    return () => { cancelled = true; };
  }, [active, canLoad, pageVisible, playing]);
  const select = (i: number) => {
    const next = Math.max(0, Math.min(CLIPS.length - 1, i));
    setActive(next); setFailed(null); setMuted(true); setPlaying(true);
    rail.current?.children[next]?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "nearest", inline: "center" });
  };
  return <section ref={section} id="videos" className={compact ? "pdp-videos" : "container-x section-space"} aria-labelledby="videos-title">
    <div className="section-heading"><div><p className="lab">Le mouvement Rio</p><h2 id="videos-title" className="display t-section mt-3">En vrai, ça donne ça.</h2><p className="mt-3 max-w-md text-sm text-muted">La veste en mouvement. À ta façon.</p></div>
      <div className="flex gap-2"><button className="round-control" disabled={active === 0} onClick={() => select(active - 1)} aria-label="Vidéo précédente">←</button><button className="round-control" disabled={active === CLIPS.length - 1} onClick={() => select(active + 1)} aria-label="Vidéo suivante">→</button></div>
    </div>
    <ul ref={rail} className="video-rail no-scrollbar" aria-label="Vidéos de la communauté" onScroll={() => {
      const el = rail.current; if (!el) return;
      const center = el.getBoundingClientRect().left + el.clientWidth / 2;
      let nearest = 0, distance = Infinity;
      Array.from(el.children).forEach((child,i) => { const r = child.getBoundingClientRect(); const d = Math.abs(r.left + r.width / 2 - center); if (d < distance) { distance = d; nearest = i; } });
      if (el.scrollWidth > el.clientWidth + 2) { setActive(nearest); setMuted(true); }
    }}>
      {CLIPS.map((id,i) => <li key={id} className={`video-card ${active === i ? "is-active" : ""}`}>
        <video ref={el => { players.current[i] = el; }} src={canLoad && active === i ? `https://kaltshop.club/temoignages/avis-${id}.mp4` : undefined} poster={`/videos/reference/avis-${id}.webp`} preload="none" playsInline loop muted={muted || active !== i} aria-label={`Veste Brésil en mouvement, vidéo ${i + 1}`} onError={() => setFailed(i)} onPlaying={() => setFailed(null)} />
        <span className="video-number">RIO IN REAL LIFE / 0{i + 1}</span>
        <div className="video-controls"><button aria-label={active === i && playing && canLoad ? `Mettre la vidéo ${i + 1} en pause` : `Lire la vidéo ${i + 1}`} onClick={() => { setManual(true); setActive(i); setPlaying(active === i && canLoad ? !playing : true); }}>{active === i && playing && canLoad ? "Ⅱ" : "▶"}</button>
          <button aria-label={muted ? `Activer le son de la vidéo ${i + 1}` : `Couper le son de la vidéo ${i + 1}`} onClick={() => { setActive(i); setManual(true); setPlaying(true); setMuted(active === i ? !muted : false); }}>{muted || active !== i ? "Son off" : "Son on"}</button></div>
        {failed === i && <p className="video-error" role="status">Vidéo momentanément indisponible.</p>}
      </li>)}
    </ul>
    <div className="video-progress" aria-hidden="true">{CLIPS.map((id,i) => <span key={id} className={active === i ? "is-active" : ""} />)}</div>
  </section>;
}
