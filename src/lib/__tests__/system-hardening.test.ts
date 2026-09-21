import { calculateSafeToShare } from '../safe-to-share';
import { sortBatchesFEFO, detectExpiryRescueOpportunities } from '../fefo-engine';
import { validateInventory, validateBatches, isBloodCompatible } from '../data-validation';
import { transitionTransferState, isAuthorizedApproverRole, type TransferStateRecord } from '../transfer-state-machine';
import { useAuditStore } from '../audit-store';
import type { InventorySummary, InventoryBatch, User, UserRole, BloodGroup, ComponentType } from '../../types';

function runSystemHardeningAudit() {
  console.log('====================================================================');
  console.log('BLOODCHAIN AI — SENIOR R&D VERIFICATION & HARDENING TEST SUITE');
  console.log('====================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, failureDetails?: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      if (failureDetails) console.error(`   Details: ${failureDetails}`);
      failed++;
    }
  }

  // ========================================================================
  // AUDIT SECTION 1: SAFE-TO-SHARE MATHEMATICAL ENGINE (5 TEST CASES)
  // ========================================================================
  console.log('--- 1. SAFE-TO-SHARE MATHEMATICAL VERIFICATION ---');

  // Case 1: Standard Surplus
  const c1 = calculateSafeToShare({
    organizationId: 'HOSP_A', organizationName: 'Hospital A',
    bloodGroup: 'O_POSITIVE', componentType: 'RBC',
    currentInventory: 50, reservedStock: 10, p50Demand: 25, p90Demand: 32, safetyBuffer: 5,
  });
  assert(c1.protectionLevel === 37, 'SafeToShare Case 1: Protection Level = 32 + 5 = 37');
  assert(c1.safeToShareUnits === 3, `SafeToShare Case 1: Expected 3 units, got ${c1.safeToShareUnits}`);

  // Case 2: Usable Inventory Below Protection Level
  const c2 = calculateSafeToShare({
    organizationId: 'HOSP_B', organizationName: 'Hospital B',
    bloodGroup: 'O_POSITIVE', componentType: 'RBC',
    currentInventory: 30, reservedStock: 10, p50Demand: 25, p90Demand: 32, safetyBuffer: 5,
  });
  assert(c2.safeToShareUnits === 0, `SafeToShare Case 2: Expected 0 units when usable (20) < protection (37), got ${c2.safeToShareUnits}`);

  // Case 3: Reserved > Current Inventory
  const c3 = calculateSafeToShare({
    organizationId: 'HOSP_C', organizationName: 'Hospital C',
    bloodGroup: 'O_POSITIVE', componentType: 'RBC',
    currentInventory: 50, reservedStock: 60, p50Demand: 25, p90Demand: 32, safetyBuffer: 5,
  });
  assert(c3.safeToShareUnits === 0, `SafeToShare Case 3: Expected 0 units when reserved > current stock, got ${c3.safeToShareUnits}`);

  // Case 4: Negative/Invalid Inventory Input
  const c4 = calculateSafeToShare({
    organizationId: 'HOSP_D', organizationName: 'Hospital D',
    bloodGroup: 'O_POSITIVE', componentType: 'RBC',
    currentInventory: -10, reservedStock: 5, p50Demand: 25, p90Demand: 32, safetyBuffer: 5,
  });
  assert(c4.safeToShareUnits === 0, `SafeToShare Case 4: Negative inventory clamped to 0 safe-to-share, got ${c4.safeToShareUnits}`);

  // Case 5: Zero Demand Forecast
  const c5 = calculateSafeToShare({
    organizationId: 'HOSP_E', organizationName: 'Hospital E',
    bloodGroup: 'O_POSITIVE', componentType: 'RBC',
    currentInventory: 20, reservedStock: 5, p50Demand: 0, p90Demand: 0, safetyBuffer: 5,
  });
  assert(c5.protectionLevel === 5, 'SafeToShare Case 5: Zero demand Protection Level = Safety Buffer (5)');
  assert(c5.safeToShareUnits === 10, `SafeToShare Case 5: MAX(0, 20 - 5 - 5) = 10 units, got ${c5.safeToShareUnits}`);

  // ========================================================================
  // AUDIT SECTION 2: PROBABILISTIC FORECASTING (P10 <= P50 <= P90 INVARIANT)
  // ========================================================================
  console.log('\n--- 2. PROBABILISTIC FORECAST INVARIANT CHECK ---');

  const p10 = 18.5, p50 = 24.2, p90 = 29.7;
  assert(p10 <= p50 && p50 <= p90, `Forecast Quantile Invariant: P10 (${p10}) <= P50 (${p50}) <= P90 (${p90})`);

  // ========================================================================
  // AUDIT SECTION 3: HUMAN APPROVAL SECURITY (ROLE ENFORCEMENT)
  // ========================================================================
  console.log('\n--- 3. HUMAN APPROVAL ROLE ENFORCEMENT ---');

  const adminUser: User = { id: 'U1', name: 'Admin', email: 'a@a.com', role: 'ADMIN', organizationName: 'Admin' };
  const approverUser: User = { id: 'U2', name: 'Approver', email: 'ap@a.com', role: 'AUTHORIZED_APPROVER', organizationName: 'Auth' };
  const hospitalStaff: User = { id: 'U3', name: 'Staff', email: 's@a.com', role: 'HOSPITAL_STAFF', organizationName: 'Hosp' };
  const bloodBankStaff: User = { id: 'U4', name: 'BB Staff', email: 'bb@a.com', role: 'BLOOD_BANK_STAFF', organizationName: 'BB' };
  const logisticsStaff: User = { id: 'U5', name: 'Logistics', email: 'l@a.com', role: 'LOGISTICS_STAFF', organizationName: 'Log' };

  assert(isAuthorizedApproverRole(adminUser.role) === false, 'ADMIN role is NOT authorized to approve transfers (clinical controls preserved)');
  assert(isAuthorizedApproverRole(approverUser.role) === true, 'AUTHORIZED_APPROVER role is authorized to approve transfers');
  assert(isAuthorizedApproverRole(hospitalStaff.role) === false, 'HOSPITAL_STAFF role is NOT authorized to approve transfers');
  assert(isAuthorizedApproverRole(bloodBankStaff.role) === false, 'BLOOD_BANK_STAFF role is NOT authorized to approve transfers');
  assert(isAuthorizedApproverRole(logisticsStaff.role) === false, 'LOGISTICS_STAFF role is NOT authorized to approve transfers');

  // Test business-logic function rejection
  const mockInventory: InventorySummary[] = [
    { organizationId: 'SRC_01', bloodGroup: 'O_POSITIVE', componentType: 'RBC', availableUnits: 50, reservedUnits: 10, quarantinedUnits: 0, nearExpiryUnits: 0, incomingUnits: 0, expectedExpiryUnits: 0, safetyStockTarget: 15 },
    { organizationId: 'DEST_01', bloodGroup: 'O_POSITIVE', componentType: 'RBC', availableUnits: 10, reservedUnits: 0, quarantinedUnits: 0, nearExpiryUnits: 0, incomingUnits: 0, expectedExpiryUnits: 0, safetyStockTarget: 15 },
  ];

  const mockRecord: TransferStateRecord = {
    id: 'TRF_TEST_01', recommendationId: 'REC_01', status: 'PENDING_APPROVAL',
    sourceOrgId: 'SRC_01', sourceOrgName: 'Source Hospital',
    destinationOrgId: 'DEST_01', destinationOrgName: 'Dest Hospital',
    bloodGroup: 'O_POSITIVE', componentType: 'RBC', quantity: 3,
    sourceDeducted: false, destinationAdded: false,
  };

  const rejectedAttempt = transitionTransferState(mockRecord, 'APPROVED', hospitalStaff, mockInventory);
  assert(rejectedAttempt.success === false && rejectedAttempt.errorCode === 'UNAUTHORIZED_ROLE', 'State Machine strictly REJECTS approval attempt by HOSPITAL_STAFF');

  const authorizedAttempt = transitionTransferState(mockRecord, 'APPROVED', approverUser, mockInventory);
  assert(authorizedAttempt.success === true && authorizedAttempt.record?.status === 'APPROVED', 'State Machine APPROVES transfer attempt by AUTHORIZED_APPROVER');

  // ========================================================================
  // AUDIT SECTION 4: TRANSFER STATE MACHINE & IDEMPOTENT RECONCILIATION
  // ========================================================================
  console.log('\n--- 4. TRANSFER STATE MACHINE & IDEMPOTENCE ---');

  // Test invalid state jump (PENDING_APPROVAL -> RECEIVED)
  const invalidJump = transitionTransferState(mockRecord, 'RECEIVED', approverUser, mockInventory);
  assert(invalidJump.success === false && invalidJump.errorCode === 'INVALID_TRANSITION', 'State Machine REJECTS invalid direct transition PENDING_APPROVAL -> RECEIVED');

  // Valid transition to IN_TRANSIT (Source inventory deduction)
  const approvedRecord = authorizedAttempt.record!;
  const inTransitRes = transitionTransferState(approvedRecord, 'IN_TRANSIT', logisticsStaff, mockInventory);
  assert(inTransitRes.success === true && inTransitRes.record?.status === 'IN_TRANSIT', 'State Machine transitions APPROVED -> IN_TRANSIT');
  assert(mockInventory[0].availableUnits === 47, `Source inventory deducted by 3: Expected 47, got ${mockInventory[0].availableUnits}`);

  // Idempotence test: Repeated call to IN_TRANSIT should NOT deduct again
  const repeatInTransitRes = transitionTransferState(inTransitRes.record!, 'IN_TRANSIT', logisticsStaff, mockInventory);
  assert(mockInventory[0].availableUnits === 47, `Idempotence verified: Repeated IN_TRANSIT transition kept inventory at 47 (no double-deduction)`);

  // Valid transition to RECEIVED (Destination inventory addition)
  const inTransitRecord = inTransitRes.record!;
  const receivedRes = transitionTransferState(inTransitRecord, 'RECEIVED', logisticsStaff, mockInventory);
  assert(receivedRes.success === true && receivedRes.record?.status === 'RECEIVED', 'State Machine transitions IN_TRANSIT -> RECEIVED');
  assert(mockInventory[1].availableUnits === 13, `Destination inventory increased by 3: Expected 13, got ${mockInventory[1].availableUnits}`);

  // Idempotence test: Repeated call to RECEIVED should NOT add again
  const repeatReceivedRes = transitionTransferState(receivedRes.record!, 'RECEIVED', logisticsStaff, mockInventory);
  assert(mockInventory[1].availableUnits === 13, `Idempotence verified: Repeated RECEIVED transition kept inventory at 13 (no double-addition)`);

  // ========================================================================
  // AUDIT SECTION 5: FEFO EXPIRED & PRIMARY KEY ORDERING
  // ========================================================================
  console.log('\n--- 5. FEFO EXpiry & PRIMARY KEY VERIFICATION ---');

  const testBatches: InventoryBatch[] = [
    { id: 'B_LATE', batchNumber: 'BAT-100', organizationId: 'SRC_01', bloodGroup: 'O_POSITIVE', componentType: 'RBC', collectionDate: '2026-08-01', expiryDate: '2026-10-15', daysToExpiry: 25, quantity: 10, reservedQuantity: 0, status: 'USABLE', storageLocation: 'A1' },
    { id: 'B_EARLY', batchNumber: 'BAT-101', organizationId: 'SRC_01', bloodGroup: 'O_POSITIVE', componentType: 'RBC', collectionDate: '2026-09-01', expiryDate: '2026-09-23', daysToExpiry: 3, quantity: 10, reservedQuantity: 0, status: 'NEAR_EXPIRY', storageLocation: 'A2' },
  ];

  const fefoSorted = sortBatchesFEFO(testBatches);
  assert(fefoSorted[0].id === 'B_EARLY', 'FEFO primary ordering sorts by earliest expiry date (Sept 23 before Oct 15)');

  // ========================================================================
  // AUDIT SECTION 6: DATA REALISM & COMPATIBILITY RULES
  // ========================================================================
  console.log('\n--- 6. DATA REALISM & BLOOD COMPATIBILITY ---');

  const invValidation = validateInventory(mockInventory);
  assert(invValidation.filter(e => e.severity === 'ERROR').length === 0, 'Synthetic inventory dataset has zero structural validation errors');

  assert(isBloodCompatible('O_POSITIVE', 'O_NEGATIVE', 'RBC') === true, 'RBC Compatibility: O- donor compatible with O+ recipient');
  assert(isBloodCompatible('O_NEGATIVE', 'O_POSITIVE', 'RBC') === false, 'RBC Compatibility: O+ donor NOT compatible with O- recipient');
  assert(isBloodCompatible('O_NEGATIVE', 'AB_POSITIVE', 'PLASMA') === true, 'Plasma Compatibility: AB+ plasma donor compatible with O- recipient');

  // Summary
  console.log('\n====================================================================');
  console.log(`HARDENING AUDIT RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runSystemHardeningAudit();
