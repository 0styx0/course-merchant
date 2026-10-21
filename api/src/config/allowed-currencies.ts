import 'dotenv/config.js';

const DEFAULT_ALLOWED_CURRENCIES = "USD";

/**
 * Parses a comma-separated list of ISO 4217 codes, such as "USD" or "USD,CAD".
 * Throws on startup for a typo rather than silently rejecting every price.
 */
export function parseAllowedCurrencies(value: string): ReadonlySet<string> {
  const supported = new Set(Intl.supportedValuesOf("currency"));
  const currencies = value
    .split(",")
    .map((currency) => currency.trim())
    .filter((currency) => currency.length > 0);

  if (currencies.length === 0) {
    throw new Error("ALLOWED_CURRENCIES must list at least one currency.");
  }

  const unknown = currencies.filter(
    (currency) => !/^[A-Z]{3}$/.test(currency) || !supported.has(currency),
  );

  if (unknown.length > 0) {
    throw new Error(
      `ALLOWED_CURRENCIES contains unknown currency codes: ${unknown.join(", ")}.`,
    );
  }

  return new Set(currencies);
}

// The Stripe account's payout currency. Charging in any other currency adds a
// conversion fee to every sale, so new prices may only use these.
export const ALLOWED_CURRENCIES = parseAllowedCurrencies(
  process.env["ALLOWED_CURRENCIES"] ?? DEFAULT_ALLOWED_CURRENCIES,
);
