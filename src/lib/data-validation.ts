import type { InventorySummary, InventoryBatch, BloodGroup, ComponentType } from '../types';

export interface DataValidationError {
  field: string;
  message: string;
  severity: 'WARNING' | 'ERROR';
}

export const VALID_BLOOD_GROUPS: BloodGroup[] = [
  'A_POSITIVE', 'A_NEGATIVE',
  'B_POSITIVE', 'B_NEGATIVE',
  'AB_POSITIVE', 'AB_NEGATIVE',
  'O_POSITIVE', 'O_NEGATIVE',
];

export const VALID_COMPONENT_TYPES: ComponentType[] = [
  'RBC', 'PLASMA', 'PLATELETS', 'WHOLE_BLOOD', 'CRYOPRECIPITATE',
];

/**
  Demo Blood Group & Component Compatibility Rules Matrix.
  DISCLAIMER: Demo compatibility rules — requires clinical validation before hospital deployment.
 */
export const COMPATIBILITY_MATRIX: Record<ComponentType, Record<BloodGroup, BloodGroup[]>> = {
  RBC: {
    O_NEGATIVE: ['O_NEGATIVE'],
    O_POSITIVE: ['O_NEGATIVE', 'O_POSITIVE'],
    A_NEGATIVE: ['O_NEGATIVE', 'A_NEGATIVE'],
    A_POSITIVE: ['O_NEGATIVE', 'O_POSITIVE', 'A_NEGATIVE', 'A_POSITIVE'],
    B_NEGATIVE: ['O_NEGATIVE', 'B_NEGATIVE'],
    B_POSITIVE: ['O_NEGATIVE', 'O_POSITIVE', 'B_NEGATIVE', 'B_POSITIVE'],
    AB_NEGATIVE: ['O_NEGATIVE', 'A_NEGATIVE', 'B_NEGATIVE', 'AB_NEGATIVE'],
    AB_POSITIVE: ['O_NEGATIVE', 'O_POSITIVE', 'A_NEGATIVE', 'A_POSITIVE', 'B_NEGATIVE', 'B_POSITIVE', 'AB_NEGATIVE', 'AB_POSITIVE'],
  },
  PLASMA: {
    O_NEGATIVE: ['O_NEGATIVE', 'O_POSITIVE', 'A_NEGATIVE', 'A_POSITIVE', 'B_NEGATIVE', 'B_POSITIVE', 'AB_NEGATIVE', 'AB_POSITIVE'],
    O_POSITIVE: ['O_POSITIVE', 'A_POSITIVE', 'B_POSITIVE', 'AB_POSITIVE'],
    A_NEGATIVE: ['A_NEGATIVE', 'A_POSITIVE', 'AB_NEGATIVE', 'AB_POSITIVE'],
    A_POSITIVE: ['A_POSITIVE', 'AB_POSITIVE'],
    B_NEGATIVE: ['B_NEGATIVE', 'B_POSITIVE', 'AB_NEGATIVE', 'AB_POSITIVE'],
    B_POSITIVE: ['B_POSITIVE', 'AB_POSITIVE'],
    AB_NEGATIVE: ['AB_NEGATIVE', 'AB_POSITIVE'],
    AB_POSITIVE: ['AB_POSITIVE'],
  },
  PLATELETS: {
    O_NEGATIVE: ['O_NEGATIVE'],
    O_POSITIVE: ['O_NEGATIVE', 'O_POSITIVE'],
    A_NEGATIVE: ['O_NEGATIVE', 'A_NEGATIVE'],
    A_POSITIVE: ['O_NEGATIVE', 'O_POSITIVE', 'A_NEGATIVE', 'A_POSITIVE'],
    B_NEGATIVE: ['O_NEGATIVE', 'B_NEGATIVE'],
    B_POSITIVE: ['O_NEGATIVE', 'O_POSITIVE', 'B_NEGATIVE', 'B_POSITIVE'],
    AB_NEGATIVE: ['O_NEGATIVE', 'A_NEGATIVE', 'B_NEGATIVE', 'AB_NEGATIVE'],
    AB_POSITIVE: ['O_NEGATIVE', 'O_POSITIVE', 'A_NEGATIVE', 'A_POSITIVE', 'B_NEGATIVE', 'B_POSITIVE', 'AB_NEGATIVE', 'AB_POSITIVE'],
  },
  WHOLE_BLOOD: {
    O_NEGATIVE: ['O_NEGATIVE'],
    O_POSITIVE: ['O_POSITIVE'],
    A_NEGATIVE: ['A_NEGATIVE'],
    A_POSITIVE: ['A_POSITIVE'],
    B_NEGATIVE: ['B_NEGATIVE'],
    B_POSITIVE: ['B_POSITIVE'],
    AB_NEGATIVE: ['AB_NEGATIVE'],
    AB_POSITIVE: ['AB_POSITIVE'],
  },
  CRYOPRECIPITATE: {
    O_NEGATIVE: ['O_NEGATIVE', 'O_POSITIVE', 'A_NEGATIVE', 'A_POSITIVE', 'B_NEGATIVE', 'B_POSITIVE', 'AB_NEGATIVE', 'AB_POSITIVE'],
    O_POSITIVE: ['O_POSITIVE', 'A_POSITIVE', 'B_POSITIVE', 'AB_POSITIVE'],
    A_NEGATIVE: ['A_NEGATIVE', 'A_POSITIVE', 'AB_NEGATIVE', 'AB_POSITIVE'],
    A_POSITIVE: ['A_POSITIVE', 'AB_POSITIVE'],
    B_NEGATIVE: ['B_NEGATIVE', 'B_POSITIVE', 'AB_NEGATIVE', 'AB_POSITIVE'],
    B_POSITIVE: ['B_POSITIVE', 'AB_POSITIVE'],
    AB_NEGATIVE: ['AB_NEGATIVE', 'AB_POSITIVE'],
    AB_POSITIVE: ['AB_POSITIVE'],
  },
};

export function isBloodCompatible(
  recipientGroup: BloodGroup,
  donorGroup: BloodGroup,
  component: ComponentType
): boolean {
  const allowed = COMPATIBILITY_MATRIX[component]?.[recipientGroup] || [recipientGroup];
  return allowed.includes(donorGroup);
}

export function validateInventory(inventory: InventorySummary[]): DataValidationError[] {
  const errors: DataValidationError[] = [];
  const seenKeys = new Set<string>();

  for (const item of inventory) {
    const key = `${item.organizationId}_${item.bloodGroup}_${item.componentType}`;
    if (seenKeys.has(key)) {
      errors.push({ field: 'organizationId', message: `Duplicate inventory item key: ${key}`, severity: 'ERROR' });
    }
    seenKeys.add(key);

    if (item.availableUnits < 0) {
      errors.push({ field: 'availableUnits', message: `Negative inventory units for ${key}: ${item.availableUnits}`, severity: 'ERROR' });
    }

    if (item.reservedUnits < 0) {
      errors.push({ field: 'reservedUnits', message: `Negative reserved units for ${key}: ${item.reservedUnits}`, severity: 'ERROR' });
    }

    if (item.reservedUnits > item.availableUnits) {
      errors.push({ field: 'reservedUnits', message: `Reserved units (${item.reservedUnits}) exceed available inventory (${item.availableUnits}) for ${key}`, severity: 'WARNING' });
    }

    if (!VALID_BLOOD_GROUPS.includes(item.bloodGroup)) {
      errors.push({ field: 'bloodGroup', message: `Invalid blood group ${item.bloodGroup} in item ${key}`, severity: 'ERROR' });
    }

    if (!VALID_COMPONENT_TYPES.includes(item.componentType)) {
      errors.push({ field: 'componentType', message: `Invalid component type ${item.componentType} in item ${key}`, severity: 'ERROR' });
    }
  }

  return errors;
}

export function validateBatches(batches: InventoryBatch[]): DataValidationError[] {
  const errors: DataValidationError[] = [];
  const seenIds = new Set<string>();

  for (const batch of batches) {
    if (seenIds.has(batch.id)) {
      errors.push({ field: 'id', message: `Duplicate batch ID: ${batch.id}`, severity: 'ERROR' });
    }
    seenIds.add(batch.id);

    if (batch.quantity < 0) {
      errors.push({ field: 'quantity', message: `Negative batch quantity: ${batch.quantity}`, severity: 'ERROR' });
    }

    if (batch.daysToExpiry <= 0 && batch.status !== 'EXPIRED') {
      errors.push({ field: 'status', message: `Batch ${batch.id} has expired days (${batch.daysToExpiry}) but status is ${batch.status}`, severity: 'WARNING' });
    }
  }

  return errors;
}
