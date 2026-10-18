"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getCountries, type CountryCode } from "libphonenumber-js/max";
import { formatPhoneInput, phoneDialCode, phonePlaceholder } from "@/lib/phone";

const names = new Intl.DisplayNames(["fr"], { type: "region" });
const countries = getCountries().map(code => ({ code, name: names.of(code) ?? code, dial: phoneDialCode(code) }))
  .sort((a, b) => a.name.localeCompare(b.name, "fr"));

function flag(code: string) {
  return String.fromCodePoint(...[...code].map(char => 0x1f1e6 + char.charCodeAt(0) - 65));
}

function searchable(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

export function PhoneInput({ country, onCountryChange, value, onChange, onBlur, inputRef, invalid }: {
  country: CountryCode;
  onCountryChange: (country: CountryCode) => void;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  inputRef: (element: HTMLInputElement | null) => void;
  invalid?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const matches = useMemo(() => {
    const query = searchable(search);
    return query ? countries.filter(item => searchable(`${item.name} ${item.code} ${item.dial}`).includes(query)) : countries;
  }, [search]);

  useEffect(() => {
    if (!open) return;
    searchInput.current?.focus();
    const closeOutside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [open]);

  return (
    <div className="checkout-phone" ref={root} onKeyDown={event => { if (event.key === "Escape") setOpen(false); }}>
      <div className="checkout-phone-control" data-invalid={invalid || undefined}>
        <button type="button" className="checkout-phone-country-button" aria-label={`Indicatif téléphonique : ${names.of(country)} ${phoneDialCode(country)}. Changer le pays`}
          aria-expanded={open} aria-haspopup="listbox" onClick={() => { setSearch(""); setOpen(current => !current); }}>
          <span className="checkout-phone-flag" aria-hidden>{flag(country)}</span>
          <span>{phoneDialCode(country)}</span>
          <span className="checkout-phone-chevron" aria-hidden>⌄</span>
        </button>
        <input id="co-phone" className="checkout-phone-number" type="tel" inputMode="tel" autoComplete="tel-national" enterKeyHint="next"
          value={value ?? ""} onChange={event => onChange(formatPhoneInput(event.target.value, country))} onBlur={onBlur} ref={inputRef}
          placeholder={phonePlaceholder(country)} aria-invalid={invalid || undefined} aria-describedby={invalid ? "co-phone-error" : undefined} />
      </div>
      {open && <div className="checkout-phone-menu">
        <input ref={searchInput} className="checkout-phone-search" type="search" autoComplete="off" aria-label="Rechercher un pays ou un indicatif"
          placeholder="Rechercher un pays…" value={search} onChange={event => setSearch(event.target.value)} />
        <div className="checkout-phone-options" role="listbox" aria-label="Pays du numéro de téléphone">
          {matches.map(item => <button key={item.code} type="button" role="option" aria-selected={country === item.code}
            className="checkout-phone-option" onClick={() => { onCountryChange(item.code); setOpen(false); }}>
            <span aria-hidden>{flag(item.code)}</span><span className="checkout-phone-option-name">{item.name}</span><span>{item.dial}</span>
          </button>)}
          {matches.length === 0 && <p className="checkout-phone-no-results">Aucun pays trouvé.</p>}
        </div>
      </div>}
    </div>
  );
}
