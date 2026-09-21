import { create } from 'zustand';
import type { User, UserRole } from '@/types';

export type { UserRole };

export const ROLE_DISPLAY_NAMES: Record<UserRole, string> = {
  ADMIN: 'Administrator',
  AUTHORIZED_APPROVER: 'Authorized Approver',
  HOSPITAL_STAFF: 'Hospital Staff',
  BLOOD_BANK_STAFF: 'Blood Bank Staff',
  LOGISTICS_STAFF: 'Logistics Staff',
};

export const DEMO_USERS: User[] = [
  {
    id: 'USR_APPROVER_01',
    name: 'Dr. Sarah Jenkins',
    email: 'sarah.jenkins@health.gov.in',
    role: 'AUTHORIZED_APPROVER',
    organizationId: 'REGIONAL_ADMIN',
    organizationName: 'Regional Blood Transfusion Council',
  },
  {
    id: 'USR_ADMIN_01',
    name: 'R. Administrator',
    email: 'admin@bloodchain.ai',
    role: 'ADMIN',
    organizationId: 'REGIONAL_ADMIN',
    organizationName: 'Regional System Operations',
  },
  {
    id: 'USR_HOSP_A',
    name: 'Dr. Rajesh Kumar',
    email: 'rajesh.k@manapparai-trauma.tn.gov.in',
    role: 'HOSPITAL_STAFF',
    organizationId: 'SIM_HOSP_MANAPPARAI',
    organizationName: 'Manapparai Highway Trauma Unit (Simulated)',
  },
  {
    id: 'USR_BB_A',
    name: 'Ananya Roy',
    email: 'ananya.roy@trichybloodhub.org',
    role: 'BLOOD_BANK_STAFF',
    organizationId: 'SIM_BB_TRY_CENTRAL',
    organizationName: 'Tiruchirappalli Central Blood Bank Hub (Simulated)',
  },
  {
    id: 'USR_LOG_A',
    name: 'Vikram Sethi',
    email: 'vikram.sethi@kaverilogistics.in',
    role: 'LOGISTICS_STAFF',
    organizationId: 'SIM_LOG_TRY_FLEET',
    organizationName: 'Kaveri Cold-Chain Fleet Depot (Simulated)',
  },
];

interface AuthState {
  currentUser: User;
  setCurrentUser: (user: User) => void;
  switchRole: (role: UserRole) => void;
  // Granular capability checks enforcing strict separation of duties:
  canCreateTransfer: () => boolean;
  canApproveTransfer: () => boolean;
  canRejectTransfer: () => boolean;
  canStartTransport: () => boolean;
  canConfirmReceipt: () => boolean;
  canRecordUsage: () => boolean;
  canManageBatches: () => boolean;
  canDirectlyModifyInventory: () => boolean;
  canRunSimulations: () => boolean;
  canAccessObservability: () => boolean;
  canManageFacilities: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  currentUser: DEMO_USERS[0], // Default to Dr. Sarah Jenkins (AUTHORIZED_APPROVER)

  setCurrentUser: (user: User) => set({ currentUser: user }),

  switchRole: (role: UserRole) => {
    const matched = DEMO_USERS.find(u => u.role === role) || {
      id: `USR_${role}_DEMO`,
      name: `Demo ${role}`,
      email: `${role.toLowerCase()}@bloodchain.ai`,
      role,
      organizationName: 'Regional Network',
    };
    set({ currentUser: matched });
  },

  // Hospital staff and blood bank staff can create transfer requests. Admin/Approver cannot self-request.
  canCreateTransfer: () => {
    const role = get().currentUser.role;
    return role === 'HOSPITAL_STAFF' || role === 'BLOOD_BANK_STAFF';
  },

  // ONLY Authorized Approvers can approve transfers. Admin cannot bypass clinical review.
  canApproveTransfer: () => {
    const role = get().currentUser.role;
    return role === 'AUTHORIZED_APPROVER';
  },

  // ONLY Authorized Approvers can reject transfers (requires mandatory reason).
  canRejectTransfer: () => {
    const role = get().currentUser.role;
    return role === 'AUTHORIZED_APPROVER';
  },

  // ONLY Logistics Staff can initiate courier transit.
  canStartTransport: () => {
    const role = get().currentUser.role;
    return role === 'LOGISTICS_STAFF';
  },

  // Logistics Staff (courier arrival) and Blood Bank Staff (hub intake custody) can confirm receipt.
  // Hospital Staff are strictly forbidden from confirming delivery.
  canConfirmReceipt: () => {
    const role = get().currentUser.role;
    return role === 'LOGISTICS_STAFF' || role === 'BLOOD_BANK_STAFF';
  },

  // Hospital Staff can record local patient blood usage.
  canRecordUsage: () => {
    const role = get().currentUser.role;
    return role === 'HOSPITAL_STAFF';
  },

  // Blood Bank Staff can manage batch lifecycle (intake, testing, separation).
  canManageBatches: () => {
    const role = get().currentUser.role;
    return role === 'BLOOD_BANK_STAFF';
  },

  // NO role is permitted to directly overwrite authoritative inventory totals from UI.
  canDirectlyModifyInventory: () => false,

  // Administrators can run emergency simulation scenarios.
  canRunSimulations: () => {
    const role = get().currentUser.role;
    return role === 'ADMIN';
  },

  // Administrators can access AI & system observability dashboards.
  canAccessObservability: () => {
    const role = get().currentUser.role;
    return role === 'ADMIN';
  },

  // Administrators can manage facility records.
  canManageFacilities: () => {
    const role = get().currentUser.role;
    return role === 'ADMIN';
  },
}));
