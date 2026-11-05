export const ALLOCATION_CURRENCY = 'USD' as const;
export const ALLOCATION_MINOR_UNIT = 'CENT' as const;

export function assertUsdCurrency(currency: unknown): 'USD' {
  if (currency !== ALLOCATION_CURRENCY) {
    throw new Error(`Unsupported allocation currency: ${String(currency)}; USD is required`);
  }

  return ALLOCATION_CURRENCY;
}

export function assertUsdCents(amount: unknown, field = 'amountCents'): number {
  if (
    typeof amount !== 'number' ||
    !Number.isSafeInteger(amount) ||
    amount < 0
  ) {
    throw new Error(`${field} must be a non-negative safe integer number of USD cents`);
  }

  return amount;
}
