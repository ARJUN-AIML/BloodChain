import { calculateSafeToShare } from '../safe-to-share';
import { sortBatchesFEFO, detectExpiryRescueOpportunities } from '../fefo-engine';
import type { InventoryBatch, BloodGroup, ComponentType } from '../../types';

function runTests() {
  console.log('====================================================');
  console.log('BLOODCHAIN AI — SAFE-TO-SHARE & FEFO TEST SUITE (TRICHY)');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, failureDetails?: string) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName}`);
      if (failureDetails) console.error(`   Details: ${failureDetails}`);
      failed++;
    }
  }

  // ----------------------------------------------------
  // TEST CASE 1: Standard Safe-to-Share Calculation
  // ----------------------------------------------------
  const calc1 = calculateSafeToShare({
    organizationId: 'SIM_HOSP_TRY_MAIN',
    organizationName: 'Tiruchirappalli Regional Trauma Center (Simulated)',
    bloodGroup: 'O_POSITIVE',
    componentType: 'RBC',
    currentInventory: 50,
    reservedStock: 10,
    p50Demand: 25,
    p90Demand: 32,
    safetyBuffer: 5,
  });

  assert(calc1.protectionLevel === 37, 'Protection Level = P90 (32) + Buffer (5) = 37');
  assert(calc1.safeToShareUnits === 3, `Safe-to-Share = MAX(0, 50 - 10 - 37) = 3 units (Got: ${calc1.safeToShareUnits})`);
  assert(calc1.isSafeToShare === true, 'isSafeToShare flag is true when surplus > 0');

  // ----------------------------------------------------
  // TEST CASE 2: Deficit Protection (Safe-to-Share = 0)
  // ----------------------------------------------------
  const calc2 = calculateSafeToShare({
    organizationId: 'SIM_HOSP_SRIRANGAM',
    organizationName: 'Srirangam Sub-District Hospital (Simulated)',
    bloodGroup: 'O_POSITIVE',
    componentType: 'RBC',
    currentInventory: 20,
    reservedStock: 5,
    p50Demand: 25,
    p90Demand: 32,
    safetyBuffer: 5,
  });

  assert(calc2.protectionLevel === 37, 'Protection Level = 37');
  assert(calc2.safeToShareUnits === 0, `Safe-to-Share = 0 when usable (15) < protection level (37) (Got: ${calc2.safeToShareUnits})`);
  assert(calc2.isSafeToShare === false, 'isSafeToShare flag is false');

  // ----------------------------------------------------
  // TEST CASE 3: FEFO (First Expiry First Out) Sorting
  // ----------------------------------------------------
  const mockBatches: InventoryBatch[] = [
    {
      id: 'B3',
      batchNumber: 'BATCH-TRY-30',
      organizationId: 'SIM_HOSP_TRY_MAIN',
      bloodGroup: 'O_POSITIVE',
      componentType: 'RBC',
      collectionDate: '2026-09-01',
      expiryDate: '2026-10-30',
      daysToExpiry: 30,
      quantity: 20,
      reservedQuantity: 0,
      status: 'USABLE',
      storageLocation: 'Vault Alpha',
    },
    {
      id: 'B1',
      batchNumber: 'BATCH-TRY-2',
      organizationId: 'SIM_HOSP_TRY_MAIN',
      bloodGroup: 'O_POSITIVE',
      componentType: 'RBC',
      collectionDate: '2026-08-20',
      expiryDate: '2026-09-22',
      daysToExpiry: 2,
      quantity: 5,
      reservedQuantity: 0,
      status: 'NEAR_EXPIRY',
      storageLocation: 'OT Refrigerator',
    },
    {
      id: 'B2',
      batchNumber: 'BATCH-TRY-10',
      organizationId: 'SIM_HOSP_TRY_MAIN',
      bloodGroup: 'O_POSITIVE',
      componentType: 'RBC',
      collectionDate: '2026-08-25',
      expiryDate: '2026-09-30',
      daysToExpiry: 10,
      quantity: 15,
      reservedQuantity: 0,
      status: 'USABLE',
      storageLocation: 'Shelf Beta',
    },
  ];

  const sorted = sortBatchesFEFO(mockBatches);
  assert(sorted[0].id === 'B1' && sorted[1].id === 'B2' && sorted[2].id === 'B3', 'FEFO sorts earliest expiry date first (2d -> 10d -> 30d)');

  // ----------------------------------------------------
  // TEST CASE 4: Expiry Rescue Opportunity Detection
  // ----------------------------------------------------
  const rescueMatches = detectExpiryRescueOpportunities(mockBatches, [
    {
      organizationId: 'SIM_HOSP_MANAPPARAI',
      organizationName: 'Manapparai Highway Trauma Unit (Simulated)',
      bloodGroup: 'O_POSITIVE',
      componentType: 'RBC',
      projectedDeficit: 8,
      daysToShortage: 3,
    },
  ]);

  assert(rescueMatches.length === 1, 'Expiry Rescue engine identified 1 matching rescue opportunity');
  assert(rescueMatches[0]?.unitsExpiring === 5, 'Rescues 5 units of expiring stock to satisfy hospital deficit');

  // Summary
  console.log('\n====================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
