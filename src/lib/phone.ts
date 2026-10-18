import { AsYouType, getCountries, getCountryCallingCode, getExampleNumber, parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js/max";
import examples from "libphonenumber-js/mobile/examples";

export const DEFAULT_PHONE_COUNTRY: CountryCode = "FR";
const supported = new Set<string>(getCountries());

export function supportedPhoneCountry(value: unknown): value is CountryCode {
  return typeof value === "string" && supported.has(value);
}

export function phoneDialCode(country: CountryCode) {
  return `+${getCountryCallingCode(country)}`;
}

export function phonePlaceholder(country: CountryCode) {
  return getExampleNumber(country, examples)?.formatNational() ?? phoneDialCode(country);
}

export function formatPhoneInput(value: string, country: CountryCode) {
  return new AsYouType(country).input(value);
}

export function normalizedPhone(value: string, country: CountryCode) {
  const parsed = parsePhoneNumberFromString(value, country);
  return parsed?.isValid() ? parsed.number : null;
}
