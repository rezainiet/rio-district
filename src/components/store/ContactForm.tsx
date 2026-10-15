"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { contactSchema } from "@/lib/validation";
import { Button } from "@/components/ui/Button";

type Values = z.input<typeof contactSchema>;

export function ContactForm() {
  const [status, setStatus] = useState<"idle" | "sent" | "error">("idle");
  const [serverError, setServerError] = useState("");
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(contactSchema), defaultValues: { email: "", message: "", website: "" } });

  const onSubmit = handleSubmit(async (values) => {
    setServerError("");
    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    }).catch(() => null);
    if (res?.ok) {
      setStatus("sent");
      reset();
    } else {
      const data = await res?.json().catch(() => null);
      setServerError(data?.error ?? "Impossible d'envoyer le message. Réessaie dans un instant.");
      setStatus("error");
    }
  });

  if (status === "sent") {
    return (
      <div className="rounded-[var(--radius-md)] border border-paper/20 p-6" role="status">
        <p className="display text-4xl text-lime">Message reçu.</p>
        <p className="mt-2 text-sm text-paper/75">On te répond par e-mail au plus vite.</p>
        <button type="button" onClick={() => setStatus("idle")} className="mt-4 text-sm underline underline-offset-4">
          Envoyer un autre message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      <div>
        <label htmlFor="contact-email" className="eyebrow mb-2 block text-paper/70">
          Ton e-mail
        </label>
        <input
          id="contact-email"
          type="email"
          autoComplete="email"
          inputMode="email"
          className="field border-paper/25 bg-white/5 text-paper placeholder:text-paper/40 hover:border-paper/50 focus:border-lime"
          placeholder="toi@exemple.fr"
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? "contact-email-error" : undefined}
          {...register("email")}
        />
        {errors.email && <p id="contact-email-error" className="mt-1.5 text-xs text-[#ffb4a8]">{errors.email.message}</p>}
      </div>
      <div>
        <label htmlFor="contact-message" className="eyebrow mb-2 block text-paper/70">
          Ton message
        </label>
        <textarea
          id="contact-message"
          rows={5}
          className="field resize-y border-paper/25 bg-white/5 text-paper placeholder:text-paper/40 hover:border-paper/50 focus:border-lime"
          placeholder="Une question sur une taille, une commande, un échange…"
          aria-invalid={!!errors.message}
          aria-describedby={errors.message ? "contact-message-error" : undefined}
          {...register("message")}
        />
        {errors.message && <p id="contact-message-error" className="mt-1.5 text-xs text-[#ffb4a8]">{errors.message.message}</p>}
      </div>
      {/* Honeypot for bots */}
      <div aria-hidden className="absolute -left-[9999px] h-0 overflow-hidden">
        <label>
          Site web
          <input tabIndex={-1} autoComplete="off" {...register("website")} />
        </label>
      </div>
      {serverError && <p role="alert" className="text-sm text-[#ffb4a8]">{serverError}</p>}
      <Button type="submit" variant="lime" size="lg" disabled={isSubmitting} className="w-full sm:w-auto sm:justify-self-start">
        {isSubmitting ? "Envoi…" : "Envoyer"}
      </Button>
    </form>
  );
}
