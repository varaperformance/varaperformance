/**
 * Unit conversion utilities for imperial/metric systems
 *
 * Database stores all values in metric:
 * - Weight: kilograms (kg)
 * - Distance: meters (m)
 * - Height: centimeters (cm)
 *
 * Frontend displays based on user preference
 */

export type UnitSystem = 'imperial' | 'metric';

// Conversion constants
const KG_TO_LB = 2.20462;
const LB_TO_KG = 1 / KG_TO_LB;
const M_TO_FT = 3.28084;
const FT_TO_M = 1 / M_TO_FT;
const M_TO_MI = 0.000621371;
const MI_TO_M = 1609.344;
const CM_TO_IN = 0.393701;
const IN_TO_CM = 2.54;

// ============================================
// Weight Conversions (kg <-> lb)
// ============================================

/**
 * Convert weight from storage (kg) to display unit
 */
export function convertWeightFromStorage(
  kg: number | null | undefined,
  unit: UnitSystem,
): number | null {
  if (kg == null) return null;
  if (unit === 'imperial') {
    return Math.round(kg * KG_TO_LB * 10) / 10; // 1 decimal place
  }
  return Math.round(kg * 10) / 10;
}

/**
 * Convert weight from user input to storage (kg)
 */
export function convertWeightToStorage(
  value: number | null | undefined,
  unit: UnitSystem,
): number | null {
  if (value == null) return null;
  if (unit === 'imperial') {
    return Math.round(value * LB_TO_KG * 100) / 100; // Store with more precision
  }
  return value;
}

/**
 * Get weight unit label
 */
export function getWeightUnit(unit: UnitSystem): string {
  return unit === 'imperial' ? 'lb' : 'kg';
}

// ============================================
// Distance Conversions (meters <-> miles/feet)
// ============================================

/**
 * Convert distance from storage (meters) to display unit
 * For longer distances (>= 400m), converts to miles for imperial
 * For shorter distances, converts to feet
 */
export function convertDistanceFromStorage(
  meters: number | null | undefined,
  unit: UnitSystem,
): number | null {
  if (meters == null) return null;
  if (unit === 'imperial') {
    // Use miles for longer distances
    if (meters >= 400) {
      return Math.round(meters * M_TO_MI * 100) / 100; // 2 decimal places for miles
    }
    // Use feet for shorter distances
    return Math.round(meters * M_TO_FT);
  }
  return Math.round(meters);
}

/**
 * Convert distance from user input to storage (meters)
 * @param isMiles - for imperial, whether input is miles (true) or feet (false)
 */
export function convertDistanceToStorage(
  value: number | null | undefined,
  unit: UnitSystem,
  isMiles: boolean = true,
): number | null {
  if (value == null) return null;
  if (unit === 'imperial') {
    return isMiles ? value * MI_TO_M : value * FT_TO_M;
  }
  return value;
}

/**
 * Get distance unit label
 * @param forLongDistance - true for miles/km, false for feet/meters
 */
export function getDistanceUnit(
  unit: UnitSystem,
  forLongDistance: boolean = true,
): string {
  if (unit === 'imperial') {
    return forLongDistance ? 'mi' : 'ft';
  }
  return forLongDistance ? 'km' : 'm';
}

// ============================================
// Height Conversions (cm <-> feet/inches)
// ============================================

/**
 * Convert height from storage (cm) to feet and inches
 */
export function convertHeightFromStorage(
  cm: number | null | undefined,
  unit: UnitSystem,
): { feet?: number; inches?: number; cm?: number } | null {
  if (cm == null) return null;
  if (unit === 'imperial') {
    const totalInches = cm * CM_TO_IN;
    const feet = Math.floor(totalInches / 12);
    const inches = Math.round(totalInches % 12);
    return { feet, inches };
  }
  return { cm: Math.round(cm) };
}

/**
 * Convert height from user input to storage (cm)
 */
export function convertHeightToStorage(
  value: { feet?: number; inches?: number; cm?: number },
  unit: UnitSystem,
): number | null {
  if (unit === 'imperial') {
    const feet = value.feet || 0;
    const inches = value.inches || 0;
    return Math.round((feet * 12 + inches) * IN_TO_CM);
  }
  return value.cm ?? null;
}

// ============================================
// Formatting Helpers
// ============================================

/**
 * Format weight for display with unit
 */
export function formatWeight(
  kg: number | null | undefined,
  unit: UnitSystem,
  includeUnit: boolean = true,
): string {
  const converted = convertWeightFromStorage(kg, unit);
  if (converted == null) return '-';
  const unitLabel = includeUnit ? ` ${getWeightUnit(unit)}` : '';
  return `${converted}${unitLabel}`;
}

/**
 * Format distance for display with unit
 */
export function formatDistance(
  meters: number | null | undefined,
  unit: UnitSystem,
  includeUnit: boolean = true,
): string {
  if (meters == null) return '-';

  if (unit === 'imperial') {
    // Use miles for >= 400m, feet otherwise
    if (meters >= 400) {
      const miles = Math.round(meters * M_TO_MI * 100) / 100;
      return includeUnit ? `${miles} mi` : `${miles}`;
    }
    const feet = Math.round(meters * M_TO_FT);
    return includeUnit ? `${feet} ft` : `${feet}`;
  }

  // Metric: use km for >= 1000m, meters otherwise
  if (meters >= 1000) {
    const km = Math.round((meters / 1000) * 100) / 100;
    return includeUnit ? `${km} km` : `${km}`;
  }
  return includeUnit ? `${Math.round(meters)} m` : `${Math.round(meters)}`;
}

/**
 * Format height for display
 */
export function formatHeight(
  cm: number | null | undefined,
  unit: UnitSystem,
): string {
  const converted = convertHeightFromStorage(cm, unit);
  if (!converted) return '-';

  if (unit === 'imperial' && 'feet' in converted) {
    return `${converted.feet}'${converted.inches}"`;
  }
  return `${converted.cm} cm`;
}

// ============================================
// Input placeholder helpers
// ============================================

/**
 * Get placeholder text for weight input
 */
export function getWeightPlaceholder(unit: UnitSystem): string {
  return unit === 'imperial' ? 'e.g., 135' : 'e.g., 60';
}

/**
 * Get placeholder text for distance input
 */
export function getDistancePlaceholder(
  unit: UnitSystem,
  forLongDistance: boolean = true,
): string {
  if (unit === 'imperial') {
    return forLongDistance ? 'e.g., 3.1' : 'e.g., 100';
  }
  return forLongDistance ? 'e.g., 5000' : 'e.g., 100';
}
