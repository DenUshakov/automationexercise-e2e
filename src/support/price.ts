/**
 * Parses a price as the site displays it, e.g. "Rs. 1500". The minus sign is accepted
 * because the cart shows negative totals for quantities below 1 (defect D1).
 */
export function parsePrice(text: string): number {
  const amount = /^Rs\.\s*(-?\d+)$/.exec(text.trim())?.[1];
  if (amount === undefined) {
    throw new Error(`Unexpected price format: "${text}"`);
  }
  return Number(amount);
}
