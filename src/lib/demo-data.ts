import type {
  Organization, InventorySummary, ForecastResult,
  DemandHistory, ShortageRisk, SafeShareSnapshot, BloodRequest,
  Transfer, TemperatureReading, Donor, DonationCampaign,
  Notification, BloodGroup, ComponentType,
} from '@/types';

export const DEMO_ORGANIZATIONS: Organization[] = [
  { id: 'HOSP_A', name: 'Metro General Hospital', type: 'HOSPITAL', region: 'Central', city: 'Metropolis', latitude: 28.6139, longitude: 77.2090, populationServed: 850000, bedCapacity: 1200, icuBeds: 80, emergencyCapacity: 120, isActive: true, address: '12 Medical Enclave, Metropolis', phone: '+91 11 2345 6789', availableUnits: 238, hasDeficit: true },
  { id: 'HOSP_B', name: 'City Care Hospital', type: 'HOSPITAL', region: 'North', city: 'Northville', latitude: 28.7041, longitude: 77.1025, populationServed: 550000, bedCapacity: 800, icuBeds: 50, emergencyCapacity: 80, isActive: true, address: '45 Health Avenue, Northville', phone: '+91 11 3456 7890', availableUnits: 195, hasDeficit: false },
  { id: 'HOSP_C', name: 'Sunrise Medical Center', type: 'HOSPITAL', region: 'East', city: 'Eastport', latitude: 28.5355, longitude: 77.3910, populationServed: 420000, bedCapacity: 600, icuBeds: 35, emergencyCapacity: 60, isActive: true, address: '88 Sunrise Expressway, Eastport', phone: '+91 11 4567 8901', availableUnits: 180, hasDeficit: true },
  { id: 'HOSP_D', name: 'Heritage Multispecialty Hospital', type: 'HOSPITAL', region: 'South', city: 'Southtown', latitude: 28.4595, longitude: 77.0266, populationServed: 380000, bedCapacity: 500, icuBeds: 30, emergencyCapacity: 50, isActive: true, address: '102 Heritage Ring Road, Southtown', phone: '+91 11 5678 9012', availableUnits: 165, hasDeficit: false },
  { id: 'HOSP_E', name: 'Valley Children\'s Hospital', type: 'HOSPITAL', region: 'West', city: 'Westfield', latitude: 28.6304, longitude: 77.0819, populationServed: 290000, bedCapacity: 350, icuBeds: 25, emergencyCapacity: 40, isActive: true, address: '14 Pediatric Lane, Westfield', phone: '+91 11 6789 0123', availableUnits: 140, hasDeficit: true },
  { id: 'BB_A', name: 'Regional Blood Center Alpha', type: 'BLOOD_BANK', region: 'Central', city: 'Metropolis', latitude: 28.6280, longitude: 77.2200, populationServed: 1500000, bedCapacity: 0, icuBeds: 0, emergencyCapacity: 0, isActive: true, address: '1 Central Donor Complex, Metropolis', phone: '+91 11 7890 1234', availableUnits: 450, storageCapacityUnits: 3000, hasDeficit: false },
  { id: 'BB_B', name: 'Northern Blood Bank', type: 'BLOOD_BANK', region: 'North', city: 'Northville', latitude: 28.7200, longitude: 77.1100, populationServed: 900000, bedCapacity: 0, icuBeds: 0, emergencyCapacity: 0, isActive: true, address: '78 Northern Hub Road, Northville', phone: '+91 11 8901 2345', availableUnits: 360, storageCapacityUnits: 2500, hasDeficit: false },
  { id: 'LOG_A', name: 'BloodRun Logistics', type: 'LOGISTICS', region: 'Central', city: 'Metropolis', latitude: 28.6100, longitude: 77.2300, populationServed: 0, bedCapacity: 0, icuBeds: 0, emergencyCapacity: 0, isActive: true, address: '3 Depot Gate, Metropolis', phone: '+91 11 9012 3456', availableUnits: 0, hasDeficit: false },
];

const BLOOD_GROUPS: BloodGroup[] = ['A_POSITIVE','A_NEGATIVE','B_POSITIVE','B_NEGATIVE','AB_POSITIVE','AB_NEGATIVE','O_POSITIVE','O_NEGATIVE'];
const COMPONENTS: ComponentType[] = ['RBC','PLASMA','PLATELETS','WHOLE_BLOOD'];
const BG_FREQ: Record<BloodGroup, number> = { O_POSITIVE: 0.37, O_NEGATIVE: 0.07, A_POSITIVE: 0.28, A_NEGATIVE: 0.06, B_POSITIVE: 0.13, B_NEGATIVE: 0.03, AB_POSITIVE: 0.04, AB_NEGATIVE: 0.02 };

function generateDemoInventory(): InventorySummary[] {
  const inventory: InventorySummary[] = [];
  const bloodOrgs = DEMO_ORGANIZATIONS.filter(o => o.type === 'HOSPITAL' || o.type === 'BLOOD_BANK');
  const baseDemand: Record<string, number> = { HOSP_A: 32, HOSP_B: 22, HOSP_C: 18, HOSP_D: 15, HOSP_E: 12, BB_A: 45, BB_B: 30 };
  const compFactor: Record<ComponentType, number> = { RBC: 1.0, PLASMA: 0.55, PLATELETS: 0.4, WHOLE_BLOOD: 0.25, CRYOPRECIPITATE: 0.15 };

  for (const org of bloodOrgs) {
    const base = baseDemand[org.id] || 15;
    for (const bg of BLOOD_GROUPS) {
      const bgF = BG_FREQ[bg];
      for (const comp of COMPONENTS) {
        const cF = compFactor[comp];
        const baseInv = Math.round(base * bgF * cF * (3 + Math.random() * 3));
        const available = Math.max(0, baseInv);
        const reserved = Math.max(0, Math.round(available * (0.05 + Math.random() * 0.1)));
        const quarantined = Math.max(0, Math.round(available * Math.random() * 0.03));
        const nearExpiry = Math.max(0, Math.round(available * (0.02 + Math.random() * 0.06)));
        const incoming = Math.max(0, Math.round(base * bgF * cF * (0.3 + Math.random() * 0.4)));
        const expected_expiry = Math.max(0, Math.round(available * Math.random() * 0.03));
        const safety = Math.max(1, Math.round(base * bgF * cF * 2));

        inventory.push({
          organizationId: org.id,
          bloodGroup: bg,
          componentType: comp,
          availableUnits: available,
          reservedUnits: reserved,
          quarantinedUnits: quarantined,
          nearExpiryUnits: nearExpiry,
          incomingUnits: incoming,
          expectedExpiryUnits: expected_expiry,
          safetyStockTarget: safety,
        });
      }
    }
  }

  const hospAOpRbc = inventory.find(i => i.organizationId === 'HOSP_A' && i.bloodGroup === 'O_POSITIVE' && i.componentType === 'RBC');
  if (hospAOpRbc) {
    hospAOpRbc.availableUnits = 10;
    hospAOpRbc.reservedUnits = 2;
    hospAOpRbc.nearExpiryUnits = 1;
    hospAOpRbc.expectedExpiryUnits = 1;
    hospAOpRbc.safetyStockTarget = 3;
  }

  return inventory;
}

export const DEMO_INVENTORY = generateDemoInventory();

export const DEMO_SUMMARY = {
  totalUsableInventory: 1728,
  totalReservedUnits: 149,
  totalNearExpiryUnits: 74,
  criticalShortageCount: 1,
  activeTransferCount: 1,
};

export const DEMO_DEMAND_TREND = [
  { date: '23 Aug', actual: 135, forecast: 130 },
  { date: '24 Aug', actual: 148, forecast: 145 },
  { date: '25 Aug', actual: 172, forecast: 168 },
  { date: '26 Aug', actual: 156, forecast: 160 },
  { date: '27 Aug', actual: 165, forecast: 158 },
  { date: '28 Aug', actual: 162, forecast: 164 },
  { date: '29 Aug', actual: 125, forecast: 118 },
  { date: '30 Aug', actual: 138, forecast: 132 },
  { date: '31 Aug', actual: 170, forecast: 162 },
  { date: '01 Sept', actual: 168, forecast: 160 },
  { date: '02 Sept', actual: 164, forecast: 158 },
  { date: '03 Sept', actual: 175, forecast: 165 },
  { date: '04 Sept', actual: 150, forecast: 155 },
  { date: '05 Sept', actual: 165, forecast: 158 },
];

export const DEMO_BLOOD_GROUP_DISTRIBUTION = [
  { name: 'O+', value: 640 },
  { name: 'A+', value: 480 },
  { name: 'B+', value: 230 },
  { name: 'AB+', value: 70 },
  { name: 'O-', value: 120 },
  { name: 'A-', value: 100 },
  { name: 'B-', value: 50 },
  { name: 'AB-', value: 38 },
];

export function generateDemoForecasts(orgId?: string): ForecastResult[] {
  const forecasts: ForecastResult[] = [];
  const orgs = orgId ? DEMO_ORGANIZATIONS.filter(o => o.id === orgId) : DEMO_ORGANIZATIONS.filter(o => o.type !== 'LOGISTICS' && o.type !== 'REGIONAL_ADMIN');
  const baseDemand: Record<string, number> = { HOSP_A: 32, HOSP_B: 22, HOSP_C: 18, HOSP_D: 15, HOSP_E: 12, BB_A: 45, BB_B: 30 };
  const compFactor: Record<string, number> = { RBC: 1.0, PLASMA: 0.55, PLATELETS: 0.4, WHOLE_BLOOD: 0.25 };

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  for (const org of orgs) {
    const base = baseDemand[org.id] || 15;
    for (const bg of BLOOD_GROUPS) {
      const bgF = BG_FREQ[bg];
      for (const comp of COMPONENTS) {
        const cF = compFactor[comp] || 0.25;
        const predicted = Math.max(0, Math.round((base * bgF * cF) * (0.9 + Math.random() * 0.2) * 10) / 10);
        const spread = predicted * (0.15 + Math.random() * 0.1);

        forecasts.push({
          organizationId: org.id,
          bloodGroup: bg,
          componentType: comp,
          forecastDate: tomorrow.toISOString().split('T')[0],
          predictedUnits: predicted,
          lowerBound: Math.max(0, Math.round((predicted - spread) * 10) / 10),
          upperBound: Math.round((predicted + spread) * 10) / 10,
          modelName: 'XGBoost v1',
          modelVersion: 'v1',
        });
      }
    }
  }

  const hospAFc = forecasts.find(f => f.organizationId === 'HOSP_A' && f.bloodGroup === 'O_POSITIVE' && f.componentType === 'RBC');
  if (hospAFc) {
    hospAFc.predictedUnits = 24.2;
    hospAFc.lowerBound = 19.1;
    hospAFc.upperBound = 29.7;
  }

  return forecasts;
}

export function generateDemoHistory(orgId: string, bloodGroup: string, componentType: string): DemandHistory[] {
  const history: DemandHistory[] = [];
  const baseDemand: Record<string, number> = { HOSP_A: 32, HOSP_B: 22, HOSP_C: 18, HOSP_D: 15, HOSP_E: 12, BB_A: 45, BB_B: 30 };
  const compFactors: Record<string, number> = { RBC: 1, PLASMA: 0.55, PLATELETS: 0.4, WHOLE_BLOOD: 0.25, CRYOPRECIPITATE: 0.15 };
  const base = (baseDemand[orgId] || 15) * (BG_FREQ[bloodGroup as BloodGroup] || 0.1) * (compFactors[componentType] || 0.25);

  const today = new Date();
  for (let i = 14; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dow = date.getDay();
    const weekendFactor = (dow === 0 || dow === 6) ? 0.8 : 1.05;
    const units = Math.max(0, Math.round(base * weekendFactor * (0.8 + Math.random() * 0.4)));

    history.push({
      date: date.toISOString().split('T')[0],
      organizationId: orgId,
      bloodGroup,
      componentType,
      unitsUsed: units,
      emergencyUnits: Math.round(units * (0.1 + Math.random() * 0.15)),
      scheduledUnits: Math.round(units * (0.5 + Math.random() * 0.2)),
    });
  }
  return history;
}

export function generateDemoShortages(): ShortageRisk[] {
  return [
    {
      id: 'SHORT_01',
      organizationId: 'HOSP_A',
      organizationName: 'Metro General Hospital',
      bloodGroup: 'O_POSITIVE',
      componentType: 'RBC',
      projectedAvailable: 7,
      requiredInventory: 27.2,
      projectedDeficit: 20.2,
      severity: 'CRITICAL',
      coverageRatio: 0.257,
      explanation: 'Projected deficit of 20 units. Coverage ratio: 25.7%.',
    },
    {
      id: 'SHORT_02',
      organizationId: 'HOSP_A',
      organizationName: 'Metro General Hospital',
      bloodGroup: 'A_POSITIVE',
      componentType: 'PLATELETS',
      projectedAvailable: 4,
      requiredInventory: 8,
      projectedDeficit: 4,
      severity: 'HIGH',
      coverageRatio: 0.5,
      explanation: 'Projected available: 4 units. Required: 8. Coverage ratio: 50.0%.',
    },
    {
      id: 'SHORT_03',
      organizationId: 'HOSP_C',
      organizationName: 'Sunrise Medical Center',
      bloodGroup: 'B_NEGATIVE',
      componentType: 'RBC',
      projectedAvailable: 3,
      requiredInventory: 5,
      projectedDeficit: 2,
      severity: 'WARNING',
      coverageRatio: 0.6,
      explanation: 'Low inventory of B− RBC. Coverage ratio: 60%.',
    },
    {
      id: 'SHORT_04',
      organizationId: 'HOSP_E',
      organizationName: 'Valley Children\'s Hospital',
      bloodGroup: 'O_NEGATIVE',
      componentType: 'RBC',
      projectedAvailable: 2,
      requiredInventory: 4,
      projectedDeficit: 2,
      severity: 'WARNING',
      coverageRatio: 0.5,
      explanation: 'Universal donor O− running low. Coverage ratio: 50%.',
    },
  ];
}

export const DEMO_SHORTAGES = generateDemoShortages();

export const DEMO_SAFE_SHARE: SafeShareSnapshot[] = [
  { organizationId: 'BB_A', bloodGroup: 'O_POSITIVE', componentType: 'RBC', usableInventory: 145, predictedLocalDemand: 35, safetyReserve: 30, reservedUnits: 10, safeShareUnits: 70 },
  { organizationId: 'BB_A', bloodGroup: 'A_POSITIVE', componentType: 'RBC', usableInventory: 110, predictedLocalDemand: 28, safetyReserve: 20, reservedUnits: 8, safeShareUnits: 54 },
  { organizationId: 'BB_B', bloodGroup: 'O_POSITIVE', componentType: 'RBC', usableInventory: 98, predictedLocalDemand: 25, safetyReserve: 20, reservedUnits: 5, safeShareUnits: 48 },
  { organizationId: 'BB_B', bloodGroup: 'B_POSITIVE', componentType: 'RBC', usableInventory: 65, predictedLocalDemand: 15, safetyReserve: 12, reservedUnits: 3, safeShareUnits: 35 },
];

export const DEMO_ALLOCATION = {
  requestId: 'REQ_DEMO_001',
  status: 'OPTIMAL',
  totalAllocated: 14,
  totalNeeded: 14,
  unfulfilled: 0,
  allocations: [
    { sourceId: 'BB_B', sourceName: 'Northern Blood Bank', unitsAllocated: 6, rank: 1, distanceKm: 12.3, etaMinutes: 18, sourceRisk: 'LOW', safeShareRemaining: 42, explanation: 'Northern Blood Bank: 6 units allocated' },
    { sourceId: 'HOSP_C', sourceName: 'Sunrise Medical Center', unitsAllocated: 5, rank: 2, distanceKm: 18.7, etaMinutes: 24, sourceRisk: 'LOW', safeShareRemaining: 15, explanation: 'Sunrise Medical Center: 5 units allocated' },
    { sourceId: 'HOSP_D', sourceName: 'Heritage Multispecialty Hospital', unitsAllocated: 3, rank: 3, distanceKm: 24.1, etaMinutes: 31, sourceRisk: 'MEDIUM', safeShareRemaining: 8, explanation: 'Heritage Multispecialty Hospital: 3 units allocated' },
  ],
  solverRuntimeMs: 12.4,
  objectiveValue: 847.2,
  explanation: 'Allocated 14/14 units from 3 source locations optimal in 12.4ms.',
};

export const DEMO_TRANSFERS: Transfer[] = [
  { id: 'TR-101', requestId: 'REQ_DEMO_001', sourceOrganizationId: 'BB_B', sourceOrganizationName: 'Northern Blood Bank', sourceName: 'Northern Blood Bank', destinationOrganizationId: 'HOSP_A', destinationOrganizationName: 'Metro General Hospital', destinationName: 'Metro General Hospital', status: 'IN_TRANSIT', priority: 'EMERGENCY', pickupTime: '14:25', dispatchTime: '14:35', expectedArrival: '15:05', routeDistanceKm: 12.3, routeDurationMinutes: 18, unitCount: 6, units: 6, etaMinutes: 18, courierName: 'Rapid Express Medical', bloodGroups: ['O+'] },
  { id: 'TR-102', requestId: 'REQ_DEMO_001', sourceOrganizationId: 'HOSP_C', sourceOrganizationName: 'Sunrise Medical Center', sourceName: 'Sunrise Medical Center', destinationOrganizationId: 'HOSP_A', destinationOrganizationName: 'Metro General Hospital', destinationName: 'Metro General Hospital', status: 'PREPARING', priority: 'EMERGENCY', pickupTime: '', dispatchTime: '', expectedArrival: '15:25', routeDistanceKm: 18.7, routeDurationMinutes: 24, unitCount: 5, units: 5, etaMinutes: 24, courierName: 'MedDispatch Logistics', bloodGroups: ['O+'] },
  { id: 'TR-103', requestId: 'REQ_00042', sourceOrganizationId: 'BB_A', sourceOrganizationName: 'Regional Blood Center Alpha', sourceName: 'Regional Blood Center Alpha', destinationOrganizationId: 'HOSP_B', destinationOrganizationName: 'City Care Hospital', destinationName: 'City Care Hospital', status: 'DELIVERED', priority: 'ROUTINE', pickupTime: '11:00', dispatchTime: '11:15', expectedArrival: '11:30', actualArrival: '11:28', routeDistanceKm: 8.4, routeDurationMinutes: 15, unitCount: 10, units: 10, etaMinutes: 0, courierName: 'Direct Health Cargo', bloodGroups: ['A+', 'O+'] },
];

export const DEMO_REQUESTS: BloodRequest[] = [
  { id: 'REQ_DEMO_001', organizationId: 'HOSP_A', organizationName: 'Metro General Hospital', bloodGroup: 'O_POSITIVE', componentType: 'RBC', unitsNeeded: 14, unitsFulfilled: 6, priority: 'EMERGENCY', status: 'IN_TRANSIT', createdAt: '14:10', notes: 'Critical O+ RBC shortage' },
  { id: 'REQ_00042', organizationId: 'HOSP_B', organizationName: 'City Care Hospital', bloodGroup: 'A_POSITIVE', componentType: 'PLASMA', unitsNeeded: 10, unitsFulfilled: 10, priority: 'ROUTINE', status: 'COMPLETED', createdAt: '11:00' },
  { id: 'REQ_00043', organizationId: 'HOSP_E', organizationName: 'Valley Children\'s Hospital', bloodGroup: 'B_POSITIVE', componentType: 'PLATELETS', unitsNeeded: 8, unitsFulfilled: 8, priority: 'URGENT', status: 'COMPLETED', createdAt: '09:30' },
];

export const DEMO_TEMPERATURE_LOGS: TemperatureReading[] = [
  { transferId: 'TR-101', deviceId: 'SENSOR_01', recordedAt: '14:35', timestamp: '14:35', temperatureC: 4.1, temperature: 4.1, latitude: 28.72, longitude: 77.11, excursionFlag: false },
  { transferId: 'TR-101', deviceId: 'SENSOR_01', recordedAt: '14:40', timestamp: '14:40', temperatureC: 4.3, temperature: 4.3, latitude: 28.69, longitude: 77.14, excursionFlag: false },
  { transferId: 'TR-101', deviceId: 'SENSOR_01', recordedAt: '14:45', timestamp: '14:45', temperatureC: 4.2, temperature: 4.2, latitude: 28.66, longitude: 77.17, excursionFlag: false },
  { transferId: 'TR-101', deviceId: 'SENSOR_01', recordedAt: '14:50', timestamp: '14:50', temperatureC: 4.5, temperature: 4.5, latitude: 28.64, longitude: 77.19, excursionFlag: false },
  { transferId: 'TR-101', deviceId: 'SENSOR_01', recordedAt: '14:55', timestamp: '14:55', temperatureC: 4.4, temperature: 4.4, latitude: 28.62, longitude: 77.21, excursionFlag: false },
];

export const DEMO_DONORS: Donor[] = [
  { id: 'DONOR_0001', name: 'Aarav Sharma', fullName: 'Aarav Sharma', bloodGroup: 'O_POSITIVE', city: 'Metropolis', phone: '+91 98765 43210', lastDonationDate: '15 Nov 2024', eligibilityStatus: 'ELIGIBLE', consentGiven: true, totalDonations: 12 },
  { id: 'DONOR_0002', name: 'Diya Patel', fullName: 'Diya Patel', bloodGroup: 'A_POSITIVE', city: 'Northville', phone: '+91 98765 43211', lastDonationDate: '28 Oct 2024', eligibilityStatus: 'ELIGIBLE', consentGiven: true, totalDonations: 8 },
  { id: 'DONOR_0003', name: 'Vivaan Kumar', fullName: 'Vivaan Kumar', bloodGroup: 'B_POSITIVE', city: 'Eastport', phone: '+91 98765 43212', lastDonationDate: '01 Dec 2024', eligibilityStatus: 'ELIGIBLE', consentGiven: true, totalDonations: 5 },
  { id: 'DONOR_0004', name: 'Ananya Singh', fullName: 'Ananya Singh', bloodGroup: 'AB_POSITIVE', city: 'Southtown', phone: '+91 98765 43213', lastDonationDate: '20 Sep 2024', eligibilityStatus: 'ELIGIBLE', consentGiven: true, totalDonations: 15 },
  { id: 'DONOR_0005', name: 'Arjun Gupta', fullName: 'Arjun Gupta', bloodGroup: 'O_NEGATIVE', city: 'Westfield', phone: '+91 98765 43214', lastDonationDate: '30 Nov 2024', eligibilityStatus: 'DEFERRED', consentGiven: true, totalDonations: 3 },
];

export const DEMO_CAMPAIGNS: DonationCampaign[] = [
  { id: 'CAMP_001', title: 'O-Negative Emergency Drive', name: 'O-Negative Emergency Drive', location: 'Metro General Hospital', targetOrganizationName: 'Metro General Hospital', targetBloodGroup: 'O_NEGATIVE', targetBloodGroups: ['O_NEGATIVE'], unitsPledged: 28, unitsNeeded: 40, startDate: '2026-09-01', endDate: '2026-09-10', status: 'ACTIVE', urgencyLevel: 'EMERGENCY', registeredDonors: 45, completedDonations: 12 },
  { id: 'CAMP_002', title: 'Monthly Regional Blood Drive', name: 'Monthly Regional Blood Drive', location: 'Regional Blood Center Alpha', targetOrganizationName: 'Regional Blood Center Alpha', targetBloodGroup: 'O_POSITIVE', targetBloodGroups: ['O_POSITIVE', 'A_POSITIVE'], unitsPledged: 85, unitsNeeded: 150, startDate: '2026-09-05', endDate: '2026-09-15', status: 'ACTIVE', urgencyLevel: 'ROUTINE', registeredDonors: 120, completedDonations: 35 },
];

export const DEMO_NOTIFICATIONS: Notification[] = [
  { id: 'N_001', type: 'CRITICAL_SHORTAGE', title: 'Critical Shortage Alert', message: 'O+ RBC at Metro General Hospital critically low (10 units). Immediate action required.', severity: 'CRITICAL', isRead: false, createdAt: new Date(Date.now() - 30 * 60000).toISOString(), organizationId: 'HOSP_A', referenceId: 'REQ_DEMO_001' },
  { id: 'N_002', type: 'ALLOCATION_RECOMMENDED', title: 'Allocation Recommendation', message: 'OR-Tools optimizer recommends 14-unit multi-source allocation for REQ_DEMO_001.', severity: 'HIGH', isRead: false, createdAt: new Date(Date.now() - 25 * 60000).toISOString(), organizationId: 'HOSP_A', referenceId: 'REQ_DEMO_001' },
  { id: 'N_003', type: 'DISPATCH', title: 'Transfer Dispatched', message: '6 units O+ RBC dispatched from Northern Blood Bank. ETA: 18 minutes.', severity: 'INFO', isRead: false, createdAt: new Date(Date.now() - 20 * 60000).toISOString(), organizationId: 'BB_B', referenceId: 'TRF_00001' },
];

export const DEMO_MODEL_STATUS = {
  modelName: 'XGBoost v1',
  modelVersion: 'v1',
  datasetRows: 245504,
  dateRange: '2022-01-01 → 2024-12-31',
  globalWinner: 'xgboost',
  trainingDate: new Date().toISOString(),
  metrics: {
    seasonal_naive: { val: { mae: 1.89, rmse: 3.21, wape: 0.312, bias: 0.05 }, test: { mae: 1.95, rmse: 3.34, wape: 0.321, bias: 0.08 } },
    holt_winters: { val: { mae: 1.62, rmse: 2.87, wape: 0.271, bias: -0.12 }, test: { mae: 1.71, rmse: 2.98, wape: 0.282, bias: -0.09 } },
    xgboost: { val: { mae: 1.12, rmse: 2.15, wape: 0.185, bias: 0.02 }, test: { mae: 1.18, rmse: 2.24, wape: 0.192, bias: 0.03 } },
  },
  predictionIntervals: { method: 'empirical_residuals', residual_q05: -3.21, residual_q95: 3.45, note: 'Empirical prediction intervals' },
};
