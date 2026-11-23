"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { contactSchema } from "@/lib/validation";
import { Button } from "@/components/ui/Button";
import { useT } from "@/i18n/client";

type Values = z.input<typeof contactSchema>;

export function ContactForm() {
  const { t, tx } = useT();
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
      setServerError(data?.error ? tx(data.error) : t("Impossible d'envoyer le message. Réessaie dans un instant."));
      setStatus("error");
    }
  });

  if (status === "sent") {
    return (
      <div className="rounded-xl border border-line bg-paper-3 p-6" role="status">
        <p className="display text-3xl uppercase text-brand">{t("Message reçu.")}</p>
        <p className="mt-2 text-sm text-ink-2">{t("On te répond par e-mail au plus vite.")}</p>
        <button type="button" onClick={() => setStatus("idle")} className="mt-4 text-sm underline underline-offset-4">
          {t("Envoyer un autre message")}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      <div>
        <label htmlFor="contact-email" className="mb-1.5 block text-[15px] font-medium">
          {t("Ton e-mail")}
        </label>
        <input
          id="contact-email"
          type="email"
          autoComplete="email"
          inputMode="email"
          className="field rounded-xl bg-paper-3"
          placeholder={t("prenom@exemple.fr")}
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? "contact-email-error" : undefined}
          {...register("email")}
        />
        {errors.email?.message && <p id="contact-email-error" className="mt-1.5 text-sm text-danger">{tx(errors.email.message)}</p>}
      </div>
      <div>
        <label htmlFor="contact-message" className="mb-1.5 block text-[15px] font-medium">
          {t("Ton message")}
        </label>
        <textarea
          id="contact-message"
          rows={5}
          className="field resize-y rounded-xl bg-paper-3"
          placeholder={t("Ta question (taille, commande, retour…)")}
          aria-invalid={!!errors.message}
          aria-describedby={errors.message ? "contact-message-error" : undefined}
          {...register("message")}
        />
        {errors.message?.message && <p id="contact-message-error" className="mt-1.5 text-sm text-danger">{tx(errors.message.message)}</p>}
      </div>
      {/* Honeypot for bots */}
      <div aria-hidden className="absolute -left-[9999px] h-0 overflow-hidden">
        <label>
          Site web
          <input tabIndex={-1} autoComplete="off" {...register("website")} />
        </label>
      </div>
      {serverError && <p role="alert" className="text-sm text-danger">{serverError}</p>}
      <Button type="submit" size="lg" disabled={isSubmitting} className="h-14 w-full">
        {isSubmitting ? t("Envoi…") : t("Envoyer mon message")}
      </Button>
    </form>
  );
}
