import { useAuthStore } from '@/lib/auth-store';
import { RegionalCommandCenter } from './RegionalCommandCenter';
import { HospitalDashboard } from './HospitalDashboard';
import { BloodBankDashboard } from './BloodBankDashboard';
import { LogisticsDashboard } from '@/features/logistics/LogisticsDashboard';
import { ApproverDashboard } from './ApproverDashboard';

export function RoleDashboardRouter() {
  const { currentUser } = useAuthStore();

  switch (currentUser.role) {
    case 'ADMIN':
      return <RegionalCommandCenter />;

    case 'AUTHORIZED_APPROVER':
      return <ApproverDashboard />;

    case 'HOSPITAL_STAFF':
      return <HospitalDashboard />;

    case 'BLOOD_BANK_STAFF':
      return <BloodBankDashboard />;

    case 'LOGISTICS_STAFF':
      return <LogisticsDashboard />;

    default:
      return <RegionalCommandCenter />;
  }
}
