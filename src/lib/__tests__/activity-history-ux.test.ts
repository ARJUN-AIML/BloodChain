import { useAuditStore } from '../audit-store';
import type { AuditLogEntry } from '@/types';

function runActivityHistoryAudit() {
  console.log('====================================================================');
  console.log('BLOODCHAIN AI — ACTIVITY HISTORY TRUST & SIMPLICITY VERIFICATION');
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

  const logs = useAuditStore.getState().logs;

  console.log('--- 1. VERIFY INITIAL EVENT TITLES & PERFORMERS ---');

  // Event 1: Demand Estimate
  const ev1 = logs.find(l => l.id === 'LOG_001');
  assert(!!ev1, 'Event 1 (LOG_001) exists in audit logs');
  assert(ev1?.displayTitle === 'Blood Demand Estimate Created', 'Event 1 Title is "Blood Demand Estimate Created"');
  assert(ev1?.displayPerformer === 'Automated Demand Estimation System', 'Event 1 Performer is "Automated Demand Estimation System"');
  assert(ev1?.displayCategory === 'Demand Estimate', 'Event 1 Category is "Demand Estimate"');
  assert(!ev1?.userName.includes('XGBoost'), 'Event 1 userName does not display "XGBoost"');
  assert(ev1?.displayNote?.includes('Demonstration estimate') === true, 'Event 1 displays visible demonstration estimate notice');

  // Event 2: Shortage Warning
  const ev2 = logs.find(l => l.id === 'LOG_002');
  assert(!!ev2, 'Event 2 (LOG_002) exists in audit logs');
  assert(ev2?.displayTitle === 'Blood Stock May Be Low', 'Event 2 Title is "Blood Stock May Be Low"');
  assert(ev2?.displayPerformer === 'Automated Stock Monitoring System', 'Event 2 Performer is "Automated Stock Monitoring System"');
  assert(ev2?.displayCategory === 'Stock Warning', 'Event 2 Category is "Stock Warning"');
  assert(!ev2?.userName.includes('Uncertainty Risk Engine'), 'Event 2 userName does not display "Uncertainty Risk Engine"');
  assert(!ev2?.reason?.includes('P90 protection level'), 'Event 2 reason does not use "P90 protection level"');
  assert(ev2?.displayNote?.includes('Estimated requirement: 37 units') === true, 'Event 2 clearly labels requirement as an estimate');

  // Event 3: Sharing Recommendation
  const ev3 = logs.find(l => l.id === 'LOG_003');
  assert(!!ev3, 'Event 3 (LOG_003) exists in audit logs');
  assert(ev3?.displayTitle === 'Blood Sharing Recommendation Created', 'Event 3 Title is "Blood Sharing Recommendation Created"');
  assert(ev3?.displayPerformer === 'Automated Delivery Planning System', 'Event 3 Performer is "Automated Delivery Planning System"');
  assert(ev3?.displayCategory === 'Sharing Recommendation', 'Event 3 Category is "Sharing Recommendation"');
  assert(!ev3?.userName.includes('OR-Tools'), 'Event 3 userName does not display "OR-Tools"');
  assert(ev3?.displayNote?.includes('An authorized person must review and approve') === true, 'Event 3 notes human review is required before moving blood');

  // Event 4: Transfer Approval
  const ev4 = logs.find(l => l.id === 'LOG_004');
  assert(!!ev4, 'Event 4 (LOG_004) exists in audit logs');
  assert(ev4?.displayTitle === 'Blood Transfer Approved', 'Event 4 Title is "Blood Transfer Approved"');
  assert(ev4?.displayPerformer === 'Dr. Sarah Jenkins — Authorized Approver', 'Event 4 Performer displays real approver name with friendly role');
  assert(ev4?.displayCategory === 'Transfer Approval', 'Event 4 Category is "Transfer Approval"');
  assert(ev4?.reason?.includes("authorized reviewer checked the recipient's urgent blood requirement") === true, 'Event 4 explanation accurately describes clinical review');

  console.log('\n--- 2. INTERNAL REFERENCE INTEGRITY ---');
  // Confirm internal references remain stored for audit integrity
  assert(ev1?.entityId === 'HOSP_A_O_POS_RBC', 'Event 1 retains internal entity ID (HOSP_A_O_POS_RBC) for technical auditing');
  assert(ev2?.entityId === 'SHORT_01', 'Event 2 retains internal entity ID (SHORT_01) for technical auditing');
  assert(ev3?.entityId === 'REC_TRF_101', 'Event 3 retains internal entity ID (REC_TRF_101) for technical auditing');
  assert(ev4?.entityId === 'TR-101', 'Event 4 retains internal entity ID (TR-101) for technical auditing');
  assert(ev1?.userId === 'SYS_ML_ENGINE', 'Event 1 retains system user ID (SYS_ML_ENGINE)');
  assert(ev2?.userId === 'SYS_SHORTAGE_ENGINE', 'Event 2 retains system user ID (SYS_SHORTAGE_ENGINE)');
  assert(ev3?.userId === 'SYS_OPTIMIZER', 'Event 3 retains system user ID (SYS_OPTIMIZER)');
  assert(ev4?.userId === 'USR_APPROVER_01', 'Event 4 retains approver user ID (USR_APPROVER_01)');

  console.log('\n--- 3. TRUST & TRANSPARENCY DISTINCTION ---');
  // Simulated data disclosure
  assert(logs.every(l => l.isDemonstration === true), 'All demonstration events have isDemonstration flag set to true');

  // Recommendation vs Completed Transfer distinction
  assert(ev3?.action === 'RECOMMENDATION_CREATED', 'Event 3 action is recommendation, not completed action');
  assert(ev4?.action === 'TRANSFER_APPROVED', 'Event 4 action is human clinical approval');

  console.log('\n====================================================================');
  console.log(`ACTIVITY HISTORY SUITE: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runActivityHistoryAudit();
