import { create } from 'zustand';
import type { User, UserRole } from '@/types';
import { apiClient } from './api-client';

export type { UserRole };

export const ROLE_DISPLAY_NAMES: Record<UserRole, string> = {
  ADMIN: 'Administrator',
  AUTHORIZED_APPROVER: 'Authorized Approver',
  HOSPITAL_STAFF: 'Hospital Staff',
  BLOOD_BANK_STAFF: 'Blood Bank Staff',
  LOGISTICS_STAFF: 'Logistics Staff',
};

export const JURY_USERS: User[] = [
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
    email: 'hospital@bloodchain.ai',
    role: 'HOSPITAL_STAFF',
    organizationId: 'SIM_HOSP_MANAPPARAI',
    organizationName: 'Manapparai Highway Trauma Unit',
  },
  {
    id: 'USR_BB_A',
    name: 'Ananya Roy',
    email: 'bloodbank@bloodchain.ai',
    role: 'BLOOD_BANK_STAFF',
    organizationId: 'SIM_BB_TRY_CENTRAL',
    organizationName: 'Tiruchirappalli Central Blood Bank Hub',
  },
  {
    id: 'USR_LOG_A',
    name: 'Vikram Sethi',
    email: 'logistics@bloodchain.ai',
    role: 'LOGISTICS_STAFF',
    organizationId: 'SIM_LOG_TRY_FLEET',
    organizationName: 'Kaveri Cold-Chain Fleet Depot',
  },
];

export const DEMO_USERS = JURY_USERS;

interface AuthState {
  currentUser: User;
  setCurrentUser: (user: User) => void;
  switchRole: (role: UserRole) => Promise<void>;
  loginWithBackend: (username?: string, password?: string, role?: UserRole) => Promise<User>;
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

const initialUser = (() => {
  const saved = localStorage.getItem('bloodchain_user');
  if (saved) {
    try { return JSON.parse(saved); } catch {}
  }
  return JURY_USERS[0];
})();

export const useAuthStore = create<AuthState>((set, get) => ({
  currentUser: initialUser,

  setCurrentUser: (user: User) => {
    localStorage.setItem('bloodchain_user', JSON.stringify(user));
    set({ currentUser: user });
  },

  switchRole: async (role: UserRole) => {
    try {
      const res = await apiClient.login({ role });
      if (res && res.user) {
        const u: User = {
          id: String(res.user.id),
          name: res.user.first_name ? `${res.user.first_name} ${res.user.last_name || ''}`.trim() : res.user.username,
          email: res.user.email,
          role: res.user.role as UserRole,
          organizationId: res.user.organization_id || 'REGIONAL_ADMIN',
          organizationName: res.user.organization_name || 'Regional System Operations',
        };
        localStorage.setItem('bloodchain_user', JSON.stringify(u));
        set({ currentUser: u });
        return;
      }
    } catch (e) {
      console.warn('Backend login fallback:', e);
    }

    const matched = JURY_USERS.find(u => u.role === role) || {
      id: `USR_${role}_ACTIVE`,
      name: `${ROLE_DISPLAY_NAMES[role]} User`,
      email: `${role.toLowerCase()}@bloodchain.ai`,
      role,
      organizationName: 'Regional Network',
    };
    localStorage.setItem('bloodchain_user', JSON.stringify(matched));
    set({ currentUser: matched });
  },

  loginWithBackend: async (username, password, role) => {
    const res = await apiClient.login({ username, password, role });
    const u: User = {
      id: String(res.user.id),
      name: res.user.first_name ? `${res.user.first_name} ${res.user.last_name || ''}`.trim() : res.user.username,
      email: res.user.email,
      role: res.user.role as UserRole,
      organizationId: res.user.organization_id || 'REGIONAL_ADMIN',
      organizationName: res.user.organization_name || 'Regional System Operations',
    };
    localStorage.setItem('bloodchain_user', JSON.stringify(u));
    set({ currentUser: u });
    return u;
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
