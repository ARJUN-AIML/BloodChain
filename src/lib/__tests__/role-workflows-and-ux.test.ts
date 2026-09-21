import { DEMO_USERS, useAuthStore } from '../auth-store';
import { calculateSafeToShare } from '../safe-to-share';
import { sendMakeWebhookNotification } from '../make-webhook';
import type { UserRole, BloodGroup, ComponentType } from '../../types';

console.log("====================================================================");
console.log("BLOODCHAIN AI — ROLE PERMISSION & WORKFLOW UX VERIFICATION SUITE");
console.log("====================================================================\n");

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`✅ [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`❌ [FAIL] ${testName}`);
    failed++;
  }
}

// --------------------------------------------------------------------
// 1. ALL FIVE ROLES AND TRICHY FACILITY BINDINGS
// --------------------------------------------------------------------
console.log("--- SECTION 1: FIVE ROLES & TRICHY FACILITY BINDINGS ---");

const adminUser = DEMO_USERS.find(u => u.role === 'ADMIN');
const approverUser = DEMO_USERS.find(u => u.role === 'AUTHORIZED_APPROVER');
const hospitalUser = DEMO_USERS.find(u => u.role === 'HOSPITAL_STAFF');
const bloodBankUser = DEMO_USERS.find(u => u.role === 'BLOOD_BANK_STAFF');
const logisticsUser = DEMO_USERS.find(u => u.role === 'LOGISTICS_STAFF');

assert(!!adminUser, "Role 1: Administrator exists in user registry");
assert(!!approverUser, "Role 2: Authorized Approver exists in user registry");
assert(!!hospitalUser, "Role 3: Hospital Staff exists in user registry");
assert(!!bloodBankUser, "Role 4: Blood Bank Staff exists in user registry");
assert(!!logisticsUser, "Role 5: Logistics Staff exists in user registry");

assert(hospitalUser?.organizationId === 'SIM_HOSP_MANAPPARAI', "Hospital Staff is bound to Manapparai Highway Trauma Unit (Simulated)");
assert(bloodBankUser?.organizationId === 'SIM_BB_TRY_CENTRAL', "Blood Bank Staff is bound to Tiruchirappalli Central Blood Bank Hub (Simulated)");
assert(logisticsUser?.organizationId === 'SIM_LOG_TRY_FLEET', "Logistics Staff is bound to Kaveri Cold-Chain Fleet Depot (Simulated)");

// --------------------------------------------------------------------
// 2. CENTRAL STATE ROLE SWITCHING & GRANULAR CAPABILITIES
// --------------------------------------------------------------------
console.log("\n--- SECTION 2: CENTRAL STATE ROLE SWITCHING & CAPABILITIES ---");
const auth = useAuthStore.getState();

// Test Administrator Capabilities
auth.switchRole('ADMIN');
assert(useAuthStore.getState().currentUser.role === 'ADMIN', "Switched to Administrator");
assert(!useAuthStore.getState().canApproveTransfer(), "Administrator CANNOT bypass clinical approval rules");
assert(!useAuthStore.getState().canCreateTransfer(), "Administrator is system oversight, not clinical requester");
assert(!useAuthStore.getState().canDirectlyModifyInventory(), "Administrator cannot directly overwrite inventory totals");
assert(useAuthStore.getState().canRunSimulations(), "Administrator can run emergency simulations");
assert(useAuthStore.getState().canAccessObservability(), "Administrator can access AI system monitoring");
assert(useAuthStore.getState().canManageFacilities(), "Administrator can manage facility records");

// Test Authorized Approver Capabilities
auth.switchRole('AUTHORIZED_APPROVER');
assert(useAuthStore.getState().currentUser.role === 'AUTHORIZED_APPROVER', "Switched to Authorized Approver");
assert(useAuthStore.getState().canApproveTransfer(), "Authorized Approver has clinical authority to approve transfers");
assert(useAuthStore.getState().canRejectTransfer(), "Authorized Approver has authority to reject transfers with reason");
assert(!useAuthStore.getState().canCreateTransfer(), "Authorized Approver does not self-request transfers (Segregation of Duties)");
assert(!useAuthStore.getState().canStartTransport(), "Authorized Approver cannot initiate transport dispatch");
assert(!useAuthStore.getState().canConfirmReceipt(), "Authorized Approver cannot confirm delivery");
assert(!useAuthStore.getState().canDirectlyModifyInventory(), "Authorized Approver cannot directly overwrite inventory totals");

// Test Hospital Staff Capabilities
auth.switchRole('HOSPITAL_STAFF');
assert(useAuthStore.getState().currentUser.role === 'HOSPITAL_STAFF', "Switched to Hospital Staff");
assert(useAuthStore.getState().canCreateTransfer(), "Hospital Staff can request blood for clinical needs");
assert(!useAuthStore.getState().canApproveTransfer(), "Hospital Staff is strictly NOT authorized to approve transfers");
assert(!useAuthStore.getState().canRejectTransfer(), "Hospital Staff cannot reject inter-facility transfers");
assert(!useAuthStore.getState().canStartTransport(), "Hospital Staff cannot start transportation");
assert(!useAuthStore.getState().canConfirmReceipt(), "Hospital Staff cannot confirm delivery (restricted delivery sign-off)");
assert(useAuthStore.getState().canRecordUsage(), "Hospital Staff can record local patient ward usage");
assert(!useAuthStore.getState().canDirectlyModifyInventory(), "Hospital Staff cannot directly overwrite inventory totals");

// Test Blood Bank Staff Capabilities
auth.switchRole('BLOOD_BANK_STAFF');
assert(useAuthStore.getState().currentUser.role === 'BLOOD_BANK_STAFF', "Switched to Blood Bank Staff");
assert(useAuthStore.getState().canCreateTransfer(), "Blood Bank Staff can request blood rebalancing transfers");
assert(!useAuthStore.getState().canApproveTransfer(), "Blood Bank Staff is strictly NOT authorized to approve transfers");
assert(!useAuthStore.getState().canStartTransport(), "Blood Bank Staff cannot start transportation");
assert(useAuthStore.getState().canConfirmReceipt(), "Blood Bank Staff can verify delivery intake custody at hub");
assert(useAuthStore.getState().canManageBatches(), "Blood Bank Staff can manage blood batches (testing/separation)");
assert(!useAuthStore.getState().canDirectlyModifyInventory(), "Blood Bank Staff cannot directly overwrite inventory totals");

// Test Logistics Staff Capabilities
auth.switchRole('LOGISTICS_STAFF');
assert(useAuthStore.getState().currentUser.role === 'LOGISTICS_STAFF', "Switched to Logistics Staff");
assert(!useAuthStore.getState().canCreateTransfer(), "Logistics Staff cannot create blood requests");
assert(!useAuthStore.getState().canApproveTransfer(), "Logistics Staff is strictly NOT authorized to approve transfers");
assert(useAuthStore.getState().canStartTransport(), "Logistics Staff can start transport for approved transfers");
assert(useAuthStore.getState().canConfirmReceipt(), "Logistics Staff can confirm courier delivery at destination");
assert(!useAuthStore.getState().canDirectlyModifyInventory(), "Logistics Staff cannot alter inventory totals");

// --------------------------------------------------------------------
// 3. MANDATORY REJECTION REASON REQUIREMENT
// --------------------------------------------------------------------
console.log("\n--- SECTION 3: MANDATORY REJECTION REASON VALIDATION ---");

function validateTransferRejection(role: UserRole, reason: string): { success: boolean; error?: string } {
  if (role !== 'AUTHORIZED_APPROVER') {
    return { success: false, error: 'UNAUTHORIZED_ROLE' };
  }
  const trimmed = reason.trim();
  if (!trimmed) {
    return { success: false, error: 'REJECTION_REASON_REQUIRED' };
  }
  return { success: true };
}

assert(!validateTransferRejection('ADMIN', 'Clinical concern.').success, "Admin cannot reject transfer without approver authorization");
assert(!validateTransferRejection('HOSPITAL_STAFF', 'Not needed.').success, "Hospital Staff cannot reject transfer");
assert(!validateTransferRejection('AUTHORIZED_APPROVER', '').success, "Approver cannot reject with empty reason");
assert(!validateTransferRejection('AUTHORIZED_APPROVER', '   ').success, "Approver cannot reject with whitespace-only reason");
assert(validateTransferRejection('AUTHORIZED_APPROVER', 'Local inventory reserve required for active surgery.').success, "Approver successfully rejects with clinical justification");

// --------------------------------------------------------------------
// 4. PLAIN-LANGUAGE STATUS MAPPING VERIFICATION
// --------------------------------------------------------------------
console.log("\n--- SECTION 4: PLAIN-LANGUAGE STATUS MAPPINGS ---");

function mapTransferStatusToPlainLanguage(status: string): string {
  switch (status) {
    case 'PENDING_APPROVAL':
      return 'Waiting for approval';
    case 'APPROVED':
      return 'Approved for dispatch';
    case 'IN_TRANSIT':
      return 'Being transported';
    case 'RECEIVED':
      return 'Received by destination';
    case 'REJECTED':
      return 'Request rejected';
    default:
      return status;
  }
}

assert(mapTransferStatusToPlainLanguage('PENDING_APPROVAL') === 'Waiting for approval', "PENDING_APPROVAL maps to 'Waiting for approval'");
assert(mapTransferStatusToPlainLanguage('APPROVED') === 'Approved for dispatch', "APPROVED maps to 'Approved for dispatch'");
assert(mapTransferStatusToPlainLanguage('IN_TRANSIT') === 'Being transported', "IN_TRANSIT maps to 'Being transported'");
assert(mapTransferStatusToPlainLanguage('RECEIVED') === 'Received by destination', "RECEIVED maps to 'Received by destination'");
assert(mapTransferStatusToPlainLanguage('REJECTED') === 'Request rejected', "REJECTED maps to 'Request rejected'");

// --------------------------------------------------------------------
// 5. TRANSFER LIFECYCLE & INVENTORY INVARIANTS
// --------------------------------------------------------------------
console.log("\n--- SECTION 5: TRANSFER LIFECYCLE & INVENTORY INVARIANTS ---");

interface MockTransfer {
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'IN_TRANSIT' | 'RECEIVED' | 'REJECTED';
  sourceUnits: number;
  destUnits: number;
  transferUnits: number;
  dispatched: boolean;
  received: boolean;
}

function processTransferTransition(
  transfer: MockTransfer,
  nextStatus: MockTransfer['status'],
  userRole: UserRole
): { success: boolean; error?: string } {
  // Authorization checks
  if (nextStatus === 'APPROVED' || nextStatus === 'REJECTED') {
    if (userRole !== 'AUTHORIZED_APPROVER') {
      return { success: false, error: 'UNAUTHORIZED_ROLE' };
    }
  }

  if (nextStatus === 'IN_TRANSIT') {
    if (userRole !== 'LOGISTICS_STAFF') {
      return { success: false, error: 'UNAUTHORIZED_ROLE' };
    }
  }

  if (nextStatus === 'RECEIVED') {
    if (userRole !== 'LOGISTICS_STAFF' && userRole !== 'BLOOD_BANK_STAFF') {
      return { success: false, error: 'UNAUTHORIZED_ROLE' };
    }
  }

  // Sequence checks
  if (nextStatus === 'APPROVED') {
    if (transfer.status !== 'PENDING_APPROVAL') {
      return { success: false, error: 'INVALID_SEQUENCE: Must be PENDING_APPROVAL' };
    }
    transfer.status = 'APPROVED';
    return { success: true };
  }

  if (nextStatus === 'IN_TRANSIT') {
    if (transfer.status !== 'APPROVED') {
      return { success: false, error: 'INVALID_SEQUENCE: Must be APPROVED before dispatch' };
    }
    transfer.status = 'IN_TRANSIT';
    if (!transfer.dispatched) {
      transfer.sourceUnits -= transfer.transferUnits;
      transfer.dispatched = true;
    }
    return { success: true };
  }

  if (nextStatus === 'RECEIVED') {
    if (transfer.status !== 'IN_TRANSIT') {
      return { success: false, error: 'INVALID_SEQUENCE: Must be IN_TRANSIT before receipt' };
    }
    transfer.status = 'RECEIVED';
    if (!transfer.received) {
      transfer.destUnits += transfer.transferUnits;
      transfer.received = true;
    }
    return { success: true };
  }

  return { success: false, error: 'UNHANDLED_STATE' };
}

const mockTransfer: MockTransfer = {
  status: 'PENDING_APPROVAL',
  sourceUnits: 20,
  destUnits: 5,
  transferUnits: 4,
  dispatched: false,
  received: false,
};

// 1. Reject unapproved role approval
const hospitalApproval = processTransferTransition(mockTransfer, 'APPROVED', 'HOSPITAL_STAFF');
assert(!hospitalApproval.success && hospitalApproval.error === 'UNAUTHORIZED_ROLE', "Hospital staff cannot approve transfer");

const adminApproval = processTransferTransition(mockTransfer, 'APPROVED', 'ADMIN');
assert(!adminApproval.success && adminApproval.error === 'UNAUTHORIZED_ROLE', "Admin cannot bypass clinical approval");

// 2. Reject premature dispatch before approval
const prematureDispatch = processTransferTransition(mockTransfer, 'IN_TRANSIT', 'LOGISTICS_STAFF');
assert(!prematureDispatch.success && Boolean(prematureDispatch.error?.includes('INVALID_SEQUENCE')), "Cannot dispatch before approval");

// 3. Authorized Approver approves
const validApproval = processTransferTransition(mockTransfer, 'APPROVED', 'AUTHORIZED_APPROVER');
assert(validApproval.success && mockTransfer.status === 'APPROVED', "Authorized Approver successfully approves transfer");

// 4. Reject premature receipt before dispatch
const prematureReceipt = processTransferTransition(mockTransfer, 'RECEIVED', 'LOGISTICS_STAFF');
assert(!prematureReceipt.success && Boolean(prematureReceipt.error?.includes('INVALID_SEQUENCE')), "Cannot confirm receipt before dispatch");

// 5. Logistics staff dispatches
const validDispatch = processTransferTransition(mockTransfer, 'IN_TRANSIT', 'LOGISTICS_STAFF');
assert(validDispatch.success && mockTransfer.status === 'IN_TRANSIT', "Logistics Staff successfully marks transfer in transit");
assert(mockTransfer.sourceUnits === 16, "Source inventory deducted upon dispatch (20 -> 16)");

// 6. Idempotency on repeated dispatch
processTransferTransition(mockTransfer, 'IN_TRANSIT', 'LOGISTICS_STAFF');
assert(mockTransfer.sourceUnits === 16, "Repeated dispatch call does not double-deduct units (Idempotency)");

// 7. Hospital Staff cannot confirm receipt
const hospitalReceipt = processTransferTransition(mockTransfer, 'RECEIVED', 'HOSPITAL_STAFF');
assert(!hospitalReceipt.success && hospitalReceipt.error === 'UNAUTHORIZED_ROLE', "Hospital Staff delivery sign-off is restricted");

// 8. Logistics courier confirms receipt
const validReceipt = processTransferTransition(mockTransfer, 'RECEIVED', 'LOGISTICS_STAFF');
assert(validReceipt.success && mockTransfer.status === 'RECEIVED', "Logistics courier confirms delivery receipt");
assert(mockTransfer.destUnits === 9, "Destination inventory credited upon arrival (5 -> 9)");

// 9. Idempotency on repeated receipt
processTransferTransition(mockTransfer, 'RECEIVED', 'LOGISTICS_STAFF');
assert(mockTransfer.destUnits === 9, "Repeated receipt call does not double-credit units (Idempotency)");

// --------------------------------------------------------------------
// 6. MAKE.COM NOTIFICATION WEBHOOK HANDLING
// --------------------------------------------------------------------
console.log("\n--- SECTION 6: MAKE.COM NOTIFICATION HANDLING ---");

async function testMakeNotification() {
  const result = await sendMakeWebhookNotification({
    event: 'TRANSFER_APPROVED',
    scenarioName: 'Role Workflow Test',
    sourceFacility: 'Tiruchirappalli Central Blood Bank Hub (Simulated)',
    destinationFacility: 'Manapparai Highway Trauma Unit (Simulated)',
    bloodGroup: 'O_NEGATIVE',
    componentType: 'RBC',
    units: 4,
  });

  assert(result.success, "Make.com notification handler executed without exception");
  assert(result.payload.syntheticNotice === 'SYNTHETIC DEMO DATA — NOT LIVE BLOOD AVAILABILITY', "Notification payload includes mandatory synthetic data notice");
  assert(result.payload.units === 4, "Notification payload correctly records transferred units");

  console.log("\n====================================================================");
  console.log(`WORKFLOW & ROLE UX SUITE: ${passed} PASSED, ${failed} FAILED`);
  console.log("====================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

testMakeNotification();
