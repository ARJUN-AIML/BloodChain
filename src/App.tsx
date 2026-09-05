import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { LandingPage } from '@/features/landing/LandingPage';
import { RegionalCommandCenter } from '@/features/dashboard/RegionalCommandCenter';
import { FacilitiesPage } from '@/features/facilities/FacilitiesPage';
import { HospitalDashboard } from '@/features/dashboard/HospitalDashboard';
import { BloodBankDashboard } from '@/features/dashboard/BloodBankDashboard';
import { LogisticsDashboard } from '@/features/logistics/LogisticsDashboard';
import { DonorDashboard } from '@/features/donors/DonorDashboard';
import { ForecastingPage } from '@/features/forecasting/ForecastingPage';
import { InventoryPage } from '@/features/inventory/InventoryPage';
import { RequestsPage } from '@/features/requests/RequestsPage';
import { AIObservability } from '@/features/admin/AIObservability';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route element={<AppLayout />}>
        <Route path="/command-center" element={<RegionalCommandCenter />} />
        <Route path="/facilities" element={<FacilitiesPage />} />
        <Route path="/hospital" element={<HospitalDashboard />} />
        <Route path="/blood-bank" element={<BloodBankDashboard />} />
        <Route path="/logistics" element={<LogisticsDashboard />} />
        <Route path="/donors" element={<DonorDashboard />} />
        <Route path="/forecasting" element={<ForecastingPage />} />
        <Route path="/inventory" element={<InventoryPage />} />
        <Route path="/requests" element={<RequestsPage />} />
        <Route path="/ai-observability" element={<AIObservability />} />
        <Route path="*" element={<Navigate to="/command-center" replace />} />
      </Route>
    </Routes>
  );
}
