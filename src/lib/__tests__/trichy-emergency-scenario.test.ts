import {
  DEMO_ORGANIZATIONS, DEMO_INVENTORY, DEMO_SHORTAGES,
  DEMO_SAFE_SHARE, DEMO_ALLOCATION, DEMO_RECOMMENDATIONS,
  SYNTHETIC_DATA_NOTICE
} from '../demo-data';
import { calculateSafeToShare } from '../safe-to-share';
import { isAuthorizedApproverRole, transitionTransferState, type TransferStateRecord } from '../transfer-state-machine';
import { sendTransactionalNotification } from '../brevo-notification';
import { isBloodCompatible } from '../data-validation';
import type { User, InventorySummary } from '../../types';

async function runTrichyEmergencyScenarioSuite() {
  console.log('====================================================================');
  console.log('TIRUCHIRAPPALLI (TRICHY) EMERGENCY SCENARIO 9-STEP VERIFICATION');
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

  // ------------------------------------------------------------------------
  // STEP 0: Synthetic Data Governance & Regional Geographic Invariants
  // ------------------------------------------------------------------------
  console.log('--- STEP 0: DATA GOVERNANCE & TRICHY GEOGRAPHY ---');
  assert(SYNTHETIC_DATA_NOTICE.includes('SYNTHETIC DEMO DATA'), 'Synthetic data warning label strictly defined');

  const trichyFacilities = DEMO_ORGANIZATIONS.map(f => f.name);
  assert(trichyFacilities.some(n => n.includes('Manapparai')), 'Manapparai Trauma Unit localized in registry');
  assert(trichyFacilities.some(n => n.includes('Srirangam')), 'Srirangam Hospital localized in registry');
  assert(trichyFacilities.some(n => n.includes('Thuvakudi')), 'Thuvakudi Health Center localized in registry');
  assert(trichyFacilities.some(n => n.includes('Central Blood Bank Hub')), 'Tiruchirappalli Central Blood Bank Hub localized in registry');

  // Verify coordinates are in Tiruchirappalli District (approx Lat: 10.5 - 11.3, Long: 78.3 - 78.9)
  const allInTrichyDistrict = DEMO_ORGANIZATIONS.every(
    f => f.latitude >= 10.5 && f.latitude <= 11.3 && f.longitude >= 78.3 && f.longitude <= 78.9
  );
  assert(allInTrichyDistrict, 'All 10 simulated facilities verify within Tiruchirappalli District coordinates');

  // ------------------------------------------------------------------------
  // STEP 1: Simulated O-Negative Shortage at Manapparai
  // ------------------------------------------------------------------------
  console.log('\n--- STEP 1: MANAPPARAI O-NEGATIVE SHORTAGE INFLUX ---');
  const manapparaiInv = DEMO_INVENTORY.find(
    i => i.organizationId === 'SIM_HOSP_MANAPPARAI' && i.bloodGroup === 'O_NEGATIVE' && i.componentType === 'RBC'
  );
  assert(manapparaiInv !== undefined, 'Manapparai O-Negative PRBC record exists');
  assert(manapparaiInv!.availableUnits === 1, 'Manapparai total O- stock is 1 unit');
  assert(manapparaiInv!.reservedUnits === 1, 'Manapparai reserved O- stock is 1 unit (Net usable: 0)');

  // ------------------------------------------------------------------------
  // STEP 2 & 3: Demand Forecasting & Risk Engine
  // ------------------------------------------------------------------------
  console.log('\n--- STEP 2 & 3: DEMAND FORECAST & SHORTAGE RISK ENGINE ---');
  const manapparaiShortage = DEMO_SHORTAGES.find(s => s.organizationId === 'SIM_HOSP_MANAPPARAI');
  assert(manapparaiShortage !== undefined, 'Risk engine identified shortage at Manapparai');
  assert(manapparaiShortage!.severity === 'CRITICAL', 'Shortage severity flagged as CRITICAL');
  assert(manapparaiShortage!.projectedDeficit === 8.0, 'Projected deficit is 8.0 units O- RBC');
  assert(manapparaiShortage!.coverageRatio === 0.0, 'Coverage ratio is 0.0% (exhausted usable stock)');

  // ------------------------------------------------------------------------
  // STEP 4: Safe-to-Share Pool Assessment
  // ------------------------------------------------------------------------
  console.log('\n--- STEP 4: SAFE-TO-SHARE ASSESSMENT ACROSS NEARBY NODES ---');
  const centralHubShare = DEMO_SAFE_SHARE.find(
    s => s.organizationId === 'SIM_BB_TRY_CENTRAL' && s.bloodGroup === 'O_NEGATIVE'
  );
  assert(centralHubShare !== undefined && centralHubShare.safeShareUnits === 8, 'Tiruchirappalli Central Hub has 8 units safe-to-share (Surplus)');

  const srirangamShare = DEMO_SAFE_SHARE.find(
    s => s.organizationId === 'SIM_HOSP_SRIRANGAM' && s.bloodGroup === 'O_NEGATIVE'
  );
  assert(srirangamShare !== undefined && srirangamShare.safeShareUnits === 0, 'Srirangam Hospital has 0 units safe-to-share (Deficit Protection Enforced)');

  // ------------------------------------------------------------------------
  // STEP 5: Multi-Source Transfer Optimization
  // ------------------------------------------------------------------------
  console.log('\n--- STEP 5: OR-TOOLS OPTIMIZATION DECISION ---');
  assert(DEMO_ALLOCATION.status === 'OPTIMAL', 'OR-Tools solver status is OPTIMAL');
  assert(DEMO_ALLOCATION.totalAllocated === 6, 'Solver allocates 6 units needed for emergency triage');
  assert(DEMO_ALLOCATION.allocations[0].sourceId === 'SIM_BB_TRY_CENTRAL', 'Optimal source selected: Tiruchirappalli Central Hub');
  assert(DEMO_ALLOCATION.allocations[0].distanceKm === 40.2, 'Route distance via NH 83 is 40.2 km');
  assert(DEMO_ALLOCATION.allocations[0].etaMinutes === 48, 'Transit ETA is 48 mins (within 120-min cold-chain window)');

  // ------------------------------------------------------------------------
  // STEP 6: Explainable Recommendation Rationale
  // ------------------------------------------------------------------------
  console.log('\n--- STEP 6: EXPLAINABLE RECOMMENDATION ---');
  const rec = DEMO_RECOMMENDATIONS[0];
  assert(rec !== undefined, 'Recommendation generated for Manapparai');
  assert(rec.reason.includes('deficit of 8 units') && rec.reason.includes('safe-to-share'), 'Explanation details deficit and safe-to-share surplus');
  assert(isBloodCompatible('O_NEGATIVE', 'O_NEGATIVE', 'RBC') === true, 'Compatibility verified: O- donor compatible with O- recipient');

  // ------------------------------------------------------------------------
  // STEP 7: Manual Human Authorization & Role Checks
  // ------------------------------------------------------------------------
  console.log('\n--- STEP 7: ROLE-BASED HUMAN AUTHORIZATION ---');
  const nurseUser: User = { id: 'U_STAFF', name: 'Nurse K. Meena', email: 'meena@bloodchain.local', role: 'HOSPITAL_STAFF', organizationName: 'Manapparai Unit' };
  const approverUser: User = { id: 'U_APPROVER', name: 'Dr. Sarah Jenkins', email: 'jenkins@bloodchain.local', role: 'AUTHORIZED_APPROVER', organizationName: 'Trichy Regional Administration' };
  const courierUser: User = { id: 'U_COURIER', name: 'Vikram Sethi', email: 'vikram@kaverilogistics.in', role: 'LOGISTICS_STAFF', organizationName: 'Kaveri Cold-Chain Fleet' };

  assert(isAuthorizedApproverRole(nurseUser.role) === false, 'HOSPITAL_STAFF is strictly NOT authorized to approve transfers');
  assert(isAuthorizedApproverRole(approverUser.role) === true, 'AUTHORIZED_APPROVER is authorized to approve transfers');

  const mockInventory: InventorySummary[] = [
    { organizationId: 'SIM_BB_TRY_CENTRAL', bloodGroup: 'O_NEGATIVE', componentType: 'RBC', availableUnits: 22, reservedUnits: 4, quarantinedUnits: 0, nearExpiryUnits: 0, incomingUnits: 0, expectedExpiryUnits: 0, safetyStockTarget: 10 },
    { organizationId: 'SIM_HOSP_MANAPPARAI', bloodGroup: 'O_NEGATIVE', componentType: 'RBC', availableUnits: 1, reservedUnits: 1, quarantinedUnits: 0, nearExpiryUnits: 0, incomingUnits: 0, expectedExpiryUnits: 0, safetyStockTarget: 6 },
  ];

  const transferRecord: TransferStateRecord = {
    id: 'TR-TRY-8821',
    recommendationId: 'REC_TRY_101',
    status: 'PENDING_APPROVAL',
    sourceOrgId: 'SIM_BB_TRY_CENTRAL',
    sourceOrgName: 'Tiruchirappalli Central Blood Bank Hub (Simulated)',
    destinationOrgId: 'SIM_HOSP_MANAPPARAI',
    destinationOrgName: 'Manapparai Highway Trauma Unit (Simulated)',
    bloodGroup: 'O_NEGATIVE',
    componentType: 'RBC',
    quantity: 6,
    sourceDeducted: false,
    destinationAdded: false,
  };

  // Unauthorized attempt
  const rejected = transitionTransferState(transferRecord, 'APPROVED', nurseUser, mockInventory);
  assert(rejected.success === false && rejected.errorCode === 'UNAUTHORIZED_ROLE', 'State machine rejects unapproved role attempt');

  // Authorized attempt
  const approved = transitionTransferState(transferRecord, 'APPROVED', approverUser, mockInventory);
  assert(approved.success === true && approved.record?.status === 'APPROVED', 'Transfer successfully APPROVED by authorized clinical reviewer');

  // ------------------------------------------------------------------------
  // STEP 8: Decoupled Dispatch and Receipt Actions
  // ------------------------------------------------------------------------
  console.log('\n--- STEP 8: DECOUPLED DISPATCH AND RECEIPT ---');
  // Dispatch
  const dispatched = transitionTransferState(approved.record!, 'IN_TRANSIT', courierUser, mockInventory);
  assert(dispatched.success === true && dispatched.record?.status === 'IN_TRANSIT', 'Action 8a: Courier DISPATCHED');
  assert(mockInventory[0].availableUnits === 16, `Source inventory deducted by 6 units: Expected 16, got ${mockInventory[0].availableUnits}`);

  // Destination Receipt
  const received = transitionTransferState(dispatched.record!, 'RECEIVED', courierUser, mockInventory);
  assert(received.success === true && received.record?.status === 'RECEIVED', 'Action 8b: Cold-chain destination RECEIPT confirmed');
  assert(mockInventory[1].availableUnits === 7, `Destination inventory increased by 6 units: Expected 7, got ${mockInventory[1].availableUnits}`);

  // Idempotence check
  const repeatReceived = transitionTransferState(received.record!, 'RECEIVED', courierUser, mockInventory);
  assert(mockInventory[1].availableUnits === 7, 'Idempotence verified: Duplicate receipt call does not double-count units');

  // ------------------------------------------------------------------------
  // STEP 9: Brevo Transactional Email Notification Outbox
  // ------------------------------------------------------------------------
  console.log('\n--- STEP 9: BREVO TRANSACTIONAL EMAIL NOTIFICATION ---');
  const webhookResult = await sendTransactionalNotification({
    event: 'TRANSFER_RECEIVED',
    scenarioName: 'NH 83 Highway Collision Emergency (Tiruchirappalli)',
    transferId: 'TR-TRY-8821',
    sourceFacility: 'Tiruchirappalli Central Blood Bank Hub (Simulated)',
    destinationFacility: 'Manapparai Highway Trauma Unit (Simulated)',
    bloodGroup: 'O_NEGATIVE',
    componentType: 'RBC',
    units: 6,
  });

  assert(webhookResult.success === true, 'Brevo notification successfully dispatched/logged');
  assert(webhookResult.payload.syntheticNotice.includes('SYNTHETIC DEMO DATA'), 'Payload includes mandatory synthetic data disclosure');
  assert(webhookResult.payload.units === 6 && webhookResult.payload.bloodGroup === 'O_NEGATIVE', 'Payload fields correctly mapped');

  // Summary
  console.log('\n====================================================================');
  console.log(`TRICHY EMERGENCY SUITE: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTrichyEmergencyScenarioSuite();
