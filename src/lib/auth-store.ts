import { create } from 'zustand';
import type { User, UserRole } from '@/types';

export const DEMO_USERS: User[] = [
  {
    id: 'USR_APPROVER_01',
    name: 'Dr. Sarah Jenkins',
    email: 'sarah.jenkins@health.gov.in',
    role: 'AUTHORIZED_APPROVER',
    organizationId: 'REGIONAL_ADMIN',
    organizationName: 'Regional Blood Authority',
  },
  {
    id: 'USR_ADMIN_01',
    name: 'R. Administrator',
    email: 'admin@bloodchain.ai',
    role: 'ADMIN',
    organizationId: 'REGIONAL_ADMIN',
    organizationName: 'Central Control Center',
  },
  {
    id: 'USR_HOSP_A',
    name: 'Dr. Rajesh Kumar',
    email: 'rajesh.k@metrogeneral.org',
    role: 'HOSPITAL_STAFF',
    organizationId: 'HOSP_A',
    organizationName: 'Metro General Hospital',
  },
  {
    id: 'USR_BB_A',
    name: 'Ananya Roy',
    email: 'ananya.roy@bloodcenterala.org',
    role: 'BLOOD_BANK_STAFF',
    organizationId: 'BB_A',
    organizationName: 'Regional Blood Center Alpha',
  },
  {
    id: 'USR_LOG_A',
    name: 'Vikram Sethi',
    email: 'vikram@bloodrunlogistics.com',
    role: 'LOGISTICS_STAFF',
    organizationId: 'LOG_A',
    organizationName: 'BloodRun Logistics',
  },
];

interface AuthState {
  currentUser: User;
  setCurrentUser: (user: User) => void;
  switchRole: (role: UserRole) => void;
  canApproveTransfer: () => boolean;
  canModifyInventory: () => boolean;
  canRunSimulations: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  currentUser: DEMO_USERS[0], // Default to AUTHORIZED_APPROVER so judge can approve transfers!

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

  canApproveTransfer: () => {
    const role = get().currentUser.role;
    return role === 'AUTHORIZED_APPROVER' || role === 'ADMIN';
  },

  canModifyInventory: () => {
    const role = get().currentUser.role;
    return role === 'ADMIN' || role === 'HOSPITAL_STAFF' || role === 'BLOOD_BANK_STAFF';
  },

  canRunSimulations: () => {
    const role = get().currentUser.role;
    return role === 'ADMIN' || role === 'AUTHORIZED_APPROVER';
  },
}));
