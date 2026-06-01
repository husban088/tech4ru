// lib/panelCurrency.ts
import { Currency } from "./currency";

// Store prices in PKR (base currency) in database
// When showing in panel, convert from PKR to selected currency
// When saving, convert from selected currency to PKR

export function convertPriceToPKR(
  priceInForeign: number,
  currency: Currency,
): number {
  // If currency is PKR, return as is
  if (currency.code === "PKR") return priceInForeign;

  // Convert foreign price to PKR by dividing by rate
  // rate = foreign / PKR, so PKR = foreign / rate
  return priceInForeign / currency.rate;
}

export function convertPriceFromPKR(
  priceInPKR: number,
  currency: Currency,
): number {
  // If currency is PKR, return as is
  if (currency.code === "PKR") return priceInPKR;

  // Convert PKR to foreign currency
  return priceInPKR * currency.rate;
}

export function formatPanelPrice(
  priceInPKR: number,
  currency: Currency,
): string {
  const converted = convertPriceFromPKR(priceInPKR, currency);
  const formatted = converted.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${currency.symbol}${formatted}`;
}
