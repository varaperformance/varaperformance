export function formatCentsToCyclePrice(
  cents: number,
  billingCycle: string,
): string {
  const dollars = (cents / 100).toFixed(2);
  const normalized = billingCycle.toLowerCase();
  const cycle =
    normalized === 'monthly'
      ? '/month'
      : normalized === 'quarterly'
        ? '/quarter'
        : '/year';

  return `$${dollars}${cycle}`;
}

export function formatMoneyCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
