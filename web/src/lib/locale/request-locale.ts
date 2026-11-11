const FALLBACK_LOCALE = "en-US";

/** The visitor's preferred language as a locale such as "en-GB", read from an `Accept-Language` header, or "en-US" when the header names no usable language. Browsers list their favourite first, so the first usable tag wins and `q` weights are ignored. */
export function readRequestLocale(acceptLanguage: string | null): string {
  const localeNames = (acceptLanguage ?? "")
    .split(",")
    .map((entry) => entry.split(";")[0].trim())
    .map(readLocaleName);
  return localeNames.find((localeName) => localeName) ?? FALLBACK_LOCALE;
}

/** The language tag without its `-u-` extensions ("th-TH-u-ca-buddhist" becomes "th-TH", because a calendar choice in the header would change how the date reads), or undefined for `*` and any tag Intl refuses. */
function readLocaleName(languageTag: string): string | undefined {
  try {
    return new Intl.Locale(languageTag).baseName;
  } catch {
    return undefined;
  }
}
