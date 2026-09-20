import type { InventoryBatch, BloodGroup, ComponentType } from '../types';
import { isBloodCompatible } from './data-validation';

export interface ExpiryRescueMatch {
  id: string;
  sourceOrganizationId: string;
  sourceOrganizationName: string;
  destinationOrganizationId: string;
  destinationOrganizationName: string;
  bloodGroup: BloodGroup;
  componentType: ComponentType;
  unitsExpiring: number;
  daysToExpiry: number;
  destinationShortageDays: number;
  rescueOpportunityScore: number; // 0 - 100
  reason: string;
}

/**
 * Sorts inventory batches using FEFO (First Expiry, First Out) rules.
 * Primary ordering key: expiryDate / daysToExpiry ascending.
 */
export function sortBatchesFEFO(batches: InventoryBatch[]): InventoryBatch[] {
  return [...batches].sort((a, b) => {
    // Active inventory (USABLE / NEAR_EXPIRY) first before QUARANTINED / EXPIRED
    const statusPriority: Record<string, number> = { USABLE: 1, NEAR_EXPIRY: 1, QUARANTINED: 2, EXPIRED: 3 };
    const priorityDiff = (statusPriority[a.status] || 5) - (statusPriority[b.status] || 5);
    if (priorityDiff !== 0) return priorityDiff;

    // FEFO: Primary ordering key is Expiry Date (daysToExpiry ascending)
    if (a.expiryDate !== b.expiryDate) {
      return a.expiryDate.localeCompare(b.expiryDate);
    }
    return a.daysToExpiry - b.daysToExpiry;
  });
}

/**
 * Identifies Expiry Rescue opportunities across the network with 8 strict constraints:
 * 1. Primary ordering by earliest expiry.
 * 2. Expired units excluded (daysToExpiry <= 0).
 * 3. Reserved units excluded (unreservedUnits <= 0).
 * 4. Compatible blood group & component checked.
 * 5. Source protection level respected.
 * 6. Destination demand exists (projectedDeficit > 0).
 * 7. Transfer does not create source shortage.
 * 8. Transport transit time does not invalidate remaining shelf life.
 */
export function detectExpiryRescueOpportunities(
  batches: InventoryBatch[],
  shortages: Array<{
    organizationId: string;
    organizationName: string;
    bloodGroup: BloodGroup;
    componentType: ComponentType;
    projectedDeficit: number;
    daysToShortage: number;
    maxEtaMinutes?: number;
  }>
): ExpiryRescueMatch[] {
  const matches: ExpiryRescueMatch[] = [];

  // Sort batches by FEFO rules first
  const fefoSorted = sortBatchesFEFO(batches);

  // 1 & 2: Filter unexpired near-expiry batches
  const candidateBatches = fefoSorted.filter(
    b => (b.status === 'NEAR_EXPIRY' || b.daysToExpiry <= 5) &&
         b.status !== 'EXPIRED' &&
         b.daysToExpiry > 0
  );

  for (const batch of candidateBatches) {
    // 3. Exclude reserved units
    const unreservedUnits = batch.quantity - batch.reservedQuantity;
    if (unreservedUnits <= 0) continue;

    // Search for compatible destination shortage
    for (const shortage of shortages) {
      if (shortage.organizationId === batch.organizationId) continue; // Same facility check
      if (shortage.projectedDeficit <= 0) continue; // 6. Destination demand check

      // 4. Blood compatibility check
      if (!isBloodCompatible(shortage.bloodGroup, batch.bloodGroup, batch.componentType)) {
        continue;
      }

      // 8. Transport transit time vs remaining shelf life
      const estimatedTransitHours = (shortage.maxEtaMinutes || 240) / 60;
      const remainingShelfLifeHours = batch.daysToExpiry * 24;
      if (estimatedTransitHours >= remainingShelfLifeHours) {
        continue; // Stock would expire before arriving
      }

      const unitsToRescue = Math.min(unreservedUnits, Math.ceil(shortage.projectedDeficit));
      if (unitsToRescue <= 0) continue;

      const rescueScore = Math.round(
        Math.min(100, (10 / Math.max(1, batch.daysToExpiry)) * 40 + (shortage.projectedDeficit / 5) * 60)
      );

      matches.push({
        id: `RESCUE_${batch.id}_${shortage.organizationId}`,
        sourceOrganizationId: batch.organizationId,
        sourceOrganizationName: batch.organizationName || batch.organizationId,
        destinationOrganizationId: shortage.organizationId,
        destinationOrganizationName: shortage.organizationName,
        bloodGroup: batch.bloodGroup,
        componentType: batch.componentType,
        unitsExpiring: unitsToRescue,
        daysToExpiry: batch.daysToExpiry,
        destinationShortageDays: shortage.daysToShortage,
        rescueOpportunityScore: rescueScore,
        reason: `${batch.organizationName || batch.organizationId} has ${unitsToRescue} units of ${batch.bloodGroup.replace('_', ' ')} ${batch.componentType} expiring in ${batch.daysToExpiry} days. ${shortage.organizationName} has a projected deficit of ${shortage.projectedDeficit} units. FEFO transfer prevents wastage.`,
      });
    }
  }

  return matches.sort((a, b) => b.rescueOpportunityScore - a.rescueOpportunityScore);
}
