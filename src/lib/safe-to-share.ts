import type { BloodGroup, ComponentType, SafeToShareCalculation } from '../types';

export interface SafeToShareInput {
  organizationId: string;
  organizationName: string;
  bloodGroup: BloodGroup;
  componentType: ComponentType;
  currentInventory: number;
  reservedStock: number;
  p50Demand: number;
  p90Demand: number;
  safetyBuffer?: number; // Default: 5
}

/**
 * Calculates the exact SAFE-TO-SHARE quantity for a facility and blood product.
 * 
 * Formula:
 * PROTECTION_LEVEL = P90_DEMAND + SAFETY_BUFFER
 * SAFE_TO_SHARE = MAX(0, CURRENT_INVENTORY - RESERVED_STOCK - PROTECTION_LEVEL)
 */
export function calculateSafeToShare(input: SafeToShareInput): SafeToShareCalculation {
  // Validate and sanitize numerical inputs
  const currentInventory = Math.max(0, isNaN(input.currentInventory) ? 0 : input.currentInventory);
  const reservedStock = Math.max(0, isNaN(input.reservedStock) ? 0 : input.reservedStock);
  const p50Demand = Math.max(0, isNaN(input.p50Demand) ? 0 : input.p50Demand);
  const p90Demand = Math.max(p50Demand, isNaN(input.p90Demand) ? 0 : input.p90Demand); // Enforce P90 >= P50
  const safetyBuffer = Math.max(0, input.safetyBuffer ?? 5);

  const {
    organizationId,
    organizationName,
    bloodGroup,
    componentType,
  } = input;

  // 1. Calculate Protection Level based on P90 forecast uncertainty + safety buffer
  const protectionLevel = Math.round((p90Demand + safetyBuffer) * 10) / 10;

  // 2. Usable inventory after accounting for patient reservations
  const netUsableAfterReservations = currentInventory - reservedStock;

  // 3. Compute Safe-to-Share (MAX(0, Usable - Protection))
  const rawSafeToShare = netUsableAfterReservations - protectionLevel;
  const safeToShareUnits = Math.max(0, Math.floor(rawSafeToShare));

  const isSafeToShare = safeToShareUnits > 0;

  // 4. Generate transparent explainable AI rationale
  let explanation = '';
  if (input.currentInventory < 0 || input.reservedStock < 0) {
    explanation = `Validation Warning: Invalid negative input detected (Current: ${input.currentInventory}, Reserved: ${input.reservedStock}). Clamped to 0. Safe-to-Share is 0.`;
  } else if (reservedStock >= currentInventory) {
    explanation = `${organizationName} has ${currentInventory} total units, but ${reservedStock} units are committed to active patient reservations. Net usable stock is 0. Safe-to-Share is 0.`;
  } else if (isSafeToShare) {
    explanation = `${organizationName} has ${currentInventory} total units of ${bloodGroup.replace('_', ' ')} ${componentType}. ` +
      `Subtracting ${reservedStock} reserved patient units leaves ${netUsableAfterReservations} usable. ` +
      `With a P90 upper demand forecast of ${p90Demand} plus ${safetyBuffer} buffer (Protection Level: ${protectionLevel}), ` +
      `a surplus of ${safeToShareUnits} units is safely shareable without risking local deficit.`;
  } else {
    explanation = `${organizationName} net usable inventory (${netUsableAfterReservations}) is below its Protection Level (${protectionLevel} = P90 demand ${p90Demand} + buffer ${safetyBuffer}). Safe-to-Share is 0 to preserve local safety.`;
  }

  return {
    organizationId,
    organizationName,
    bloodGroup,
    componentType,
    currentInventory,
    reservedStock,
    p50Demand,
    p90Demand,
    safetyBuffer,
    protectionLevel,
    safeToShareUnits,
    isSafeToShare,
    explanation,
  };
}
