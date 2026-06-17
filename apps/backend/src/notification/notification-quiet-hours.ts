export const hasValidQuietHoursWindow = (
  quietHoursStart: number,
  quietHoursEnd: number,
): boolean =>
  !Number.isNaN(quietHoursStart) &&
  !Number.isNaN(quietHoursEnd) &&
  quietHoursStart !== quietHoursEnd;

export const isWithinQuietHoursWindow = (
  hour: number,
  quietHoursStart: number,
  quietHoursEnd: number,
): boolean => {
  if (quietHoursStart < quietHoursEnd) {
    return hour >= quietHoursStart && hour < quietHoursEnd;
  }

  // Overnight window, e.g. 22 -> 7.
  return hour >= quietHoursStart || hour < quietHoursEnd;
};
