import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { LandingPage } from '@/features/landing/LandingPage';
import { RegionalCommandCenter } from '@/features/dashboard/RegionalCommandCenter';
import { RoleDashboardRouter } from '@/features/dashboard/RoleDashboardRouter';
import { FacilitiesPage } from '@/features/facilities/FacilitiesPage';
import { HospitalDashboard } from '@/features/dashboard/HospitalDashboard';
import { BloodBankDashboard } from '@/features/dashboard/BloodBankDashboard';
import { LogisticsDashboard } from '@/features/logistics/LogisticsDashboard';
import { DonorDashboard } from '@/features/donors/DonorDashboard';
import { ForecastingPage } from '@/features/forecasting/ForecastingPage';
import { InventoryPage } from '@/features/inventory/InventoryPage';
import { SafeToShareDashboard } from '@/features/inventory/SafeToShareDashboard';
import { ExpiryRescuePage } from '@/features/inventory/ExpiryRescuePage';
import { RequestsPage } from '@/features/requests/RequestsPage';
import { EmergencySimulationCenter } from '@/features/simulation/EmergencySimulationCenter';
import { LiveDemoPage } from '@/features/live-demo/LiveDemoPage';
import { AuditLogsPage } from '@/features/admin/AuditLogsPage';
import { AIObservability } from '@/features/admin/AIObservability';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route element={<AppLayout />}>
        <Route path="/command-center" element={<RoleDashboardRouter />} />
        <Route path="/live-demo" element={<LiveDemoPage />} />
        <Route path="/facilities" element={<FacilitiesPage />} />
        <Route path="/hospital" element={<HospitalDashboard />} />
        <Route path="/blood-bank" element={<BloodBankDashboard />} />
        <Route path="/logistics" element={<LogisticsDashboard />} />
        <Route path="/donors" element={<DonorDashboard />} />
        <Route path="/forecasting" element={<ForecastingPage />} />
        <Route path="/inventory" element={<InventoryPage />} />
        <Route path="/safe-to-share" element={<SafeToShareDashboard />} />
        <Route path="/expiry-rescue" element={<ExpiryRescuePage />} />
        <Route path="/requests" element={<RequestsPage />} />
        <Route path="/emergency-simulation" element={<EmergencySimulationCenter />} />
        <Route path="/audit-logs" element={<AuditLogsPage />} />
        <Route path="/ai-observability" element={<AIObservability />} />
        <Route path="*" element={<Navigate to="/command-center" replace />} />
      </Route>
    </Routes>
  );
}

