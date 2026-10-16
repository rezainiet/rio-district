"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

const ContactForm = dynamic(() => import("./ContactForm").then((m) => m.ContactForm), {
  loading: () => <div className="h-[340px]" aria-busy="true" />,
});

/**
 * The contact form (and its validation library) loads shortly before it
 * scrolls into view, so it never weighs on the first screen of the homepage.
 */
export function ContactFormLazy() {
  const ref = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setShow(true), { rootMargin: "600px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return <div ref={ref}>{show ? <ContactForm /> : <div className="h-[340px]" aria-hidden />}</div>;
}
