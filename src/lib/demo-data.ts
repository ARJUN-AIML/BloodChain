import type {
  Organization, InventorySummary, ForecastResult,
  DemandHistory, ShortageRisk, SafeShareSnapshot, BloodRequest,
  Transfer, TemperatureReading, Donor, DonationCampaign,
  Notification, BloodGroup, ComponentType, SimulationScenario,
} from '@/types';

// ============================================================================
// TIRUCHIRAPPALLI (TRICHY), TAMIL NADU — REGIONAL RESEARCH PROTOTYPE
//
// DATA GOVERNANCE STATEMENT:
// ALL FACILITY NAMES, INVENTORIES, FORECASTS, DONORS, AND LOGISTICS DATA
// PRESENTED IN THIS APPLICATION ARE SYNTHETIC DEMO DATASETS CREATED FOR
// RESEARCH, LOGISTICAL BENCHMARKING, AND SYSTEM VALIDATION PURPOSES.
// THEY DO NOT REPRESENT LIVE CLINICAL BLOOD INVENTORY OR ACTUAL HOSPITAL STATUS.
// ============================================================================

export const SYNTHETIC_DATA_NOTICE = "SYNTHETIC DEMO DATA — NOT LIVE BLOOD AVAILABILITY";

export const DEMO_ORGANIZATIONS: Organization[] = [
  // 1. Core Tiruchirappalli City Nodes
  {
    id: 'SIM_HOSP_TRY_MAIN',
    name: 'Tiruchirappalli Regional Trauma Center (Simulated)',
    type: 'HOSPITAL',
    region: 'Tiruchirappalli City',
    city: 'Tiruchirappalli',
    latitude: 10.7925,
    longitude: 78.6980,
    populationServed: 1100000,
    bedCapacity: 750,
    icuBeds: 50,
    emergencyCapacity: 90,
    isActive: true,
    address: 'Collector Office Road / Thillai Nagar, Tiruchirappalli, Tamil Nadu 620001',
    phone: '+91 431 241 0001',
    availableUnits: 185,
    hasDeficit: false,
  },
  {
    id: 'SIM_BB_TRY_CENTRAL',
    name: 'Tiruchirappalli Central Blood Bank Hub (Simulated)',
    type: 'BLOOD_BANK',
    region: 'Tiruchirappalli City',
    city: 'Tiruchirappalli',
    latitude: 10.8010,
    longitude: 78.6920,
    populationServed: 1600000,
    bedCapacity: 0,
    icuBeds: 0,
    emergencyCapacity: 0,
    isActive: true,
    address: 'Central District Health Complex, Cantonment, Tiruchirappalli, Tamil Nadu 620001',
    phone: '+91 431 241 5500',
    availableUnits: 490,
    storageCapacityUnits: 2500,
    hasDeficit: false,
  },
  {
    id: 'SIM_LOG_TRY_FLEET',
    name: 'Kaveri Cold-Chain Fleet Depot (Simulated)',
    type: 'LOGISTICS',
    region: 'Tiruchirappalli City',
    city: 'Tiruchirappalli',
    latitude: 10.7960,
    longitude: 78.7050,
    populationServed: 0,
    bedCapacity: 0,
    icuBeds: 0,
    emergencyCapacity: 0,
    isActive: true,
    address: 'Highway Logistics Bypass, Palakkarai, Tiruchirappalli, Tamil Nadu 620008',
    phone: '+91 431 246 8800',
    availableUnits: 0,
    hasDeficit: false,
  },

  // 2. Srirangam (North across Kaveri)
  {
    id: 'SIM_HOSP_SRIRANGAM',
    name: 'Srirangam Sub-District Hospital (Simulated)',
    type: 'HOSPITAL',
    region: 'Srirangam',
    city: 'Srirangam',
    latitude: 10.8650,
    longitude: 78.6930,
    populationServed: 280000,
    bedCapacity: 250,
    icuBeds: 15,
    emergencyCapacity: 30,
    isActive: true,
    address: 'Gandhi Road, Srirangam, Tiruchirappalli, Tamil Nadu 620006',
    phone: '+91 431 243 0012',
    availableUnits: 72,
    hasDeficit: false,
  },

  // 3. Thuvakudi (Eastern Industrial Corridor)
  {
    id: 'SIM_HOSP_THUVAKUDI',
    name: 'Thuvakudi Industrial Corridor Health Center (Simulated)',
    type: 'HOSPITAL',
    region: 'Thuvakudi',
    city: 'Thuvakudi',
    latitude: 10.7620,
    longitude: 78.8120,
    populationServed: 220000,
    bedCapacity: 180,
    icuBeds: 12,
    emergencyCapacity: 25,
    isActive: true,
    address: 'NH 83 Thanjavur Highway, Thuvakudi, Tiruchirappalli, Tamil Nadu 620015',
    phone: '+91 431 250 1100',
    availableUnits: 58,
    hasDeficit: false,
  },

  // 4. Manachanallur (North-West)
  {
    id: 'SIM_HOSP_MANACHANALLUR',
    name: 'Manachanallur Community Health Center (Simulated)',
    type: 'HOSPITAL',
    region: 'Manachanallur',
    city: 'Manachanallur',
    latitude: 10.9080,
    longitude: 78.7020,
    populationServed: 140000,
    bedCapacity: 120,
    icuBeds: 8,
    emergencyCapacity: 20,
    isActive: true,
    address: 'Main Bazaar Road, Manachanallur, Tamil Nadu 621005',
    phone: '+91 431 256 0033',
    availableUnits: 36,
    hasDeficit: false,
  },

  // 5. Lalgudi (North-East River Belt)
  {
    id: 'SIM_HOSP_LALGUDI',
    name: 'Lalgudi Taluk Hospital (Simulated)',
    type: 'HOSPITAL',
    region: 'Lalgudi',
    city: 'Lalgudi',
    latitude: 10.8700,
    longitude: 78.8200,
    populationServed: 190000,
    bedCapacity: 140,
    icuBeds: 8,
    emergencyCapacity: 20,
    isActive: true,
    address: 'Kallakudi Road, Lalgudi, Tiruchirappalli District, Tamil Nadu 621601',
    phone: '+91 431 254 1144',
    availableUnits: 42,
    hasDeficit: false,
  },

  // 6. Thuraiyur (North Outer Ring)
  {
    id: 'SIM_HOSP_THURAIYUR',
    name: 'Thuraiyur Taluk Referral Hospital (Simulated)',
    type: 'HOSPITAL',
    region: 'Thuraiyur',
    city: 'Thuraiyur',
    latitude: 11.1420,
    longitude: 78.5980,
    populationServed: 260000,
    bedCapacity: 160,
    icuBeds: 10,
    emergencyCapacity: 25,
    isActive: true,
    address: 'Perambalur Main Road, Thuraiyur, Tamil Nadu 621010',
    phone: '+91 4327 222 015',
    availableUnits: 48,
    hasDeficit: false,
  },

  // 7. Musiri (North-West Kaveri Bank)
  {
    id: 'SIM_HOSP_MUSIRI',
    name: 'Musiri Riverbank Area Hospital (Simulated)',
    type: 'HOSPITAL',
    region: 'Musiri',
    city: 'Musiri',
    latitude: 10.9430,
    longitude: 78.4490,
    populationServed: 210000,
    bedCapacity: 150,
    icuBeds: 10,
    emergencyCapacity: 20,
    isActive: true,
    address: 'NH 81 Karur Highway, Musiri, Tiruchirappalli District, Tamil Nadu 621211',
    phone: '+91 4326 260 022',
    availableUnits: 45,
    hasDeficit: false,
  },

  // 8. Manapparai (South-West Highway Corridor — Scenario Focus)
  {
    id: 'SIM_HOSP_MANAPPARAI',
    name: 'Manapparai Highway Trauma Unit (Simulated)',
    type: 'HOSPITAL',
    region: 'Manapparai',
    city: 'Manapparai',
    latitude: 10.6100,
    longitude: 78.4200,
    populationServed: 310000,
    bedCapacity: 200,
    icuBeds: 16,
    emergencyCapacity: 35,
    isActive: true,
    address: 'NH 83 Dindigul Highway Junction, Manapparai, Tamil Nadu 621306',
    phone: '+91 4332 261 100',
    availableUnits: 28,
    hasDeficit: true, // Acute deficit due to highway emergency scenario
  },
];

export const BLOOD_GROUPS: BloodGroup[] = [
  'A_POSITIVE', 'A_NEGATIVE',
  'B_POSITIVE', 'B_NEGATIVE',
  'AB_POSITIVE', 'AB_NEGATIVE',
  'O_POSITIVE', 'O_NEGATIVE',
];

export const COMPONENTS: ComponentType[] = ['RBC', 'PLASMA', 'PLATELETS', 'WHOLE_BLOOD'];

export const BG_FREQ: Record<BloodGroup, number> = {
  O_POSITIVE: 0.38,
  O_NEGATIVE: 0.05,
  A_POSITIVE: 0.26,
  A_NEGATIVE: 0.04,
  B_POSITIVE: 0.20,
  B_NEGATIVE: 0.03,
  AB_POSITIVE: 0.03,
  AB_NEGATIVE: 0.01,
};

// ---------------------------------------------------------------------------
// Simulated Inventory Generation
// ---------------------------------------------------------------------------

function generateDemoInventory(): InventorySummary[] {
  const inventory: InventorySummary[] = [];
  const bloodOrgs = DEMO_ORGANIZATIONS.filter(o => o.type === 'HOSPITAL' || o.type === 'BLOOD_BANK');
  const baseDemand: Record<string, number> = {
    SIM_HOSP_TRY_MAIN: 28,
    SIM_BB_TRY_CENTRAL: 42,
    SIM_HOSP_SRIRANGAM: 10,
    SIM_HOSP_THUVAKUDI: 8,
    SIM_HOSP_MANACHANALLUR: 6,
    SIM_HOSP_LALGUDI: 7,
    SIM_HOSP_THURAIYUR: 7,
    SIM_HOSP_MUSIRI: 7,
    SIM_HOSP_MANAPPARAI: 9,
  };
  const compFactor: Record<ComponentType, number> = {
    RBC: 1.0,
    PLASMA: 0.55,
    PLATELETS: 0.40,
    WHOLE_BLOOD: 0.25,
    CRYOPRECIPITATE: 0.15,
  };

  for (const org of bloodOrgs) {
    const base = baseDemand[org.id] || 10;
    for (const bg of BLOOD_GROUPS) {
      const bgF = BG_FREQ[bg];
      for (const comp of COMPONENTS) {
        const cF = compFactor[comp];
        const baseInv = Math.round(base * bgF * cF * (3 + Math.random() * 2.5));
        const available = Math.max(0, baseInv);
        const reserved = Math.max(0, Math.round(available * (0.05 + Math.random() * 0.1)));
        const quarantined = Math.max(0, Math.round(available * Math.random() * 0.03));
        const nearExpiry = Math.max(0, Math.round(available * (0.02 + Math.random() * 0.05)));
        const incoming = Math.max(0, Math.round(base * bgF * cF * (0.3 + Math.random() * 0.3)));
        const expected_expiry = Math.max(0, Math.round(available * Math.random() * 0.03));
        const safety = Math.max(1, Math.round(base * bgF * cF * 2.2));

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

  // Inject Core Emergency Scenario Invariant:
  // Manapparai has acute O-Negative shortage
  const manapparaiONegRbc = inventory.find(
    i => i.organizationId === 'SIM_HOSP_MANAPPARAI' && i.bloodGroup === 'O_NEGATIVE' && i.componentType === 'RBC'
  );
  if (manapparaiONegRbc) {
    manapparaiONegRbc.availableUnits = 1;
    manapparaiONegRbc.reservedUnits = 1;
    manapparaiONegRbc.nearExpiryUnits = 0;
    manapparaiONegRbc.expectedExpiryUnits = 0;
    manapparaiONegRbc.safetyStockTarget = 6;
  }

  // Central Blood Bank has surplus safe-to-share O-Negative
  const centralHubONegRbc = inventory.find(
    i => i.organizationId === 'SIM_BB_TRY_CENTRAL' && i.bloodGroup === 'O_NEGATIVE' && i.componentType === 'RBC'
  );
  if (centralHubONegRbc) {
    centralHubONegRbc.availableUnits = 22;
    centralHubONegRbc.reservedUnits = 4;
    centralHubONegRbc.nearExpiryUnits = 1;
    centralHubONegRbc.expectedExpiryUnits = 0;
    centralHubONegRbc.safetyStockTarget = 10;
  }

  return inventory;
}

export const DEMO_INVENTORY = generateDemoInventory();

export const DEMO_SUMMARY = {
  totalUsableInventory: 965,
  totalReservedUnits: 84,
  totalNearExpiryUnits: 38,
  criticalShortageCount: 1, // Manapparai O-
  activeTransferCount: 1,
};

// 14-day demand trend for Tiruchirappalli Regional Network
export const DEMO_DEMAND_TREND = [
  { date: '08 Sept', actual: 98, forecast: 95 },
  { date: '09 Sept', actual: 104, forecast: 102 },
  { date: '10 Sept', actual: 112, forecast: 110 },
  { date: '11 Sept', actual: 108, forecast: 106 },
  { date: '12 Sept', actual: 115, forecast: 112 },
  { date: '13 Sept', actual: 92, forecast: 90 },
  { date: '14 Sept', actual: 88, forecast: 85 },
  { date: '15 Sept', actual: 102, forecast: 98 },
  { date: '16 Sept', actual: 118, forecast: 114 },
  { date: '17 Sept', actual: 122, forecast: 120 },
  { date: '18 Sept', actual: 110, forecast: 108 },
  { date: '19 Sept', actual: 125, forecast: 118 },
  { date: '20 Sept', actual: 114, forecast: 112 },
  { date: '21 Sept', actual: 120, forecast: 116 },
];

export const DEMO_BLOOD_GROUP_DISTRIBUTION = [
  { name: 'O+', value: 366 },
  { name: 'A+', value: 251 },
  { name: 'B+', value: 193 },
  { name: 'O-', value: 48 },
  { name: 'A-', value: 39 },
  { name: 'AB+', value: 29 },
  { name: 'B-', value: 29 },
  { name: 'AB-', value: 10 },
];

// ---------------------------------------------------------------------------
// Simulated Forecast Generator (P10, P50, P90 Quantiles)
// ---------------------------------------------------------------------------

export function generateDemoForecasts(
  orgId?: string,
  bloodGroup?: string,
  componentType?: string
): ForecastResult[] {
  const targetOrgs = orgId
    ? [orgId]
    : DEMO_ORGANIZATIONS.filter(o => o.type === 'HOSPITAL' || o.type === 'BLOOD_BANK').map(o => o.id);

  const targetBloodGroups = bloodGroup ? [bloodGroup as BloodGroup] : BLOOD_GROUPS;
  const targetComponents = componentType ? [componentType as ComponentType] : COMPONENTS;

  const forecasts: ForecastResult[] = [];
  const baseDemand: Record<string, number> = {
    SIM_HOSP_TRY_MAIN: 28,
    SIM_BB_TRY_CENTRAL: 42,
    SIM_HOSP_SRIRANGAM: 10,
    SIM_HOSP_THUVAKUDI: 8,
    SIM_HOSP_MANACHANALLUR: 6,
    SIM_HOSP_LALGUDI: 7,
    SIM_HOSP_THURAIYUR: 7,
    SIM_HOSP_MUSIRI: 7,
    SIM_HOSP_MANAPPARAI: 9,
    HOSP_A: 28,
    BB_A: 42,
  };
  const compFactors: Record<string, number> = { RBC: 1.0, PLASMA: 0.55, PLATELETS: 0.4, WHOLE_BLOOD: 0.25, CRYOPRECIPITATE: 0.15 };

  const today = new Date();

  for (const oId of targetOrgs) {
    for (const bg of targetBloodGroups) {
      for (const comp of targetComponents) {
        const base = (baseDemand[oId] || 8) * (BG_FREQ[bg] || 0.1) * (compFactors[comp] || 0.3);

        for (let i = 1; i <= 7; i++) {
          const d = new Date(today);
          d.setDate(d.getDate() + i);
          const dateStr = d.toISOString().split('T')[0];
          const dow = d.getDay();
          const seasonalFactor = (dow === 0 || dow === 6) ? 0.85 : 1.05;
          let p50 = Math.max(1, Math.round(base * seasonalFactor * 10) / 10);
          let p10 = Math.max(0.5, Math.round(p50 * 0.75 * 10) / 10);
          let p90 = Math.round(p50 * 1.35 * 10) / 10;

          // Inject Scenario Specifics for Manapparai O-Negative:
          if (oId === 'SIM_HOSP_MANAPPARAI' && bg === 'O_NEGATIVE' && comp === 'RBC' && i === 1) {
            p50 = 8.0;
            p10 = 6.0;
            p90 = 11.0;
          }

          forecasts.push({
            date: dateStr,
            forecastDate: dateStr,
            organizationId: oId,
            bloodGroup: bg,
            componentType: comp,
            predictedUnits: p50,
            p10,
            p50,
            p90,
            lowerBound: p10,
            upperBound: p90,
            confidenceInterval: 0.80,
            confidenceScore: 0.88,
            modelName: 'XGBoost Time-Series (Trichy Tuned)',
            modelVersion: 'v2.1-trichy',
          });
        }
      }
    }
  }

  return forecasts;
}

export function generateDemoHistory(orgId: string, bloodGroup: string, componentType: string): DemandHistory[] {
  const history: DemandHistory[] = [];
  const baseDemand: Record<string, number> = {
    SIM_HOSP_TRY_MAIN: 28,
    SIM_BB_TRY_CENTRAL: 42,
    SIM_HOSP_SRIRANGAM: 10,
    SIM_HOSP_THUVAKUDI: 8,
    SIM_HOSP_MANACHANALLUR: 6,
    SIM_HOSP_LALGUDI: 7,
    SIM_HOSP_THURAIYUR: 7,
    SIM_HOSP_MUSIRI: 7,
    SIM_HOSP_MANAPPARAI: 9,
  };
  const compFactors: Record<string, number> = { RBC: 1.0, PLASMA: 0.55, PLATELETS: 0.4, WHOLE_BLOOD: 0.25 };
  const base = (baseDemand[orgId] || 8) * (BG_FREQ[bloodGroup as BloodGroup] || 0.1) * (compFactors[componentType] || 0.3);

  const today = new Date();
  for (let i = 14; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dow = date.getDay();
    const weekendFactor = (dow === 0 || dow === 6) ? 0.85 : 1.05;
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

// ---------------------------------------------------------------------------
// Shortage Risks (Tiruchirappalli Localized)
// ---------------------------------------------------------------------------

export function generateDemoShortages(): ShortageRisk[] {
  return [
    {
      id: 'SHORT_TRY_01',
      organizationId: 'SIM_HOSP_MANAPPARAI',
      organizationName: 'Manapparai Highway Trauma Unit (Simulated)',
      bloodGroup: 'O_NEGATIVE',
      componentType: 'RBC',
      projectedAvailable: 0,
      requiredInventory: 8.0,
      projectedDeficit: 8.0,
      severity: 'CRITICAL',
      coverageRatio: 0.0,
      explanation: 'Critical O-Negative deficit at Manapparai following NH 83 highway collision casualties. Usable stock: 0. 24h P50 demand: 8 units.',
    },
    {
      id: 'SHORT_TRY_02',
      organizationId: 'SIM_HOSP_TRY_MAIN',
      organizationName: 'Tiruchirappalli Regional Trauma Center (Simulated)',
      bloodGroup: 'A_POSITIVE',
      componentType: 'PLATELETS',
      projectedAvailable: 4,
      requiredInventory: 8.0,
      projectedDeficit: 4.0,
      severity: 'HIGH',
      coverageRatio: 0.5,
      explanation: 'Platelet stock below safety buffer due to scheduled cardiac surgeries.',
    },
    {
      id: 'SHORT_TRY_03',
      organizationId: 'SIM_HOSP_THURAIYUR',
      organizationName: 'Thuraiyur Taluk Referral Hospital (Simulated)',
      bloodGroup: 'B_NEGATIVE',
      componentType: 'RBC',
      projectedAvailable: 2,
      requiredInventory: 4.0,
      projectedDeficit: 2.0,
      severity: 'WARNING',
      coverageRatio: 0.5,
      explanation: 'B-Negative RBC stock approaching minimum buffer in northern ring.',
    },
  ];
}

export const DEMO_SHORTAGES = generateDemoShortages();

// ---------------------------------------------------------------------------
// Safe-to-Share Pool (Tiruchirappalli Regional Facilities)
// ---------------------------------------------------------------------------

export const DEMO_SAFE_SHARE: SafeShareSnapshot[] = [
  {
    organizationId: 'SIM_BB_TRY_CENTRAL',
    bloodGroup: 'O_NEGATIVE',
    componentType: 'RBC',
    usableInventory: 18,
    predictedLocalDemand: 6,
    safetyReserve: 4,
    reservedUnits: 4,
    safeShareUnits: 8, // Available surplus above P90 protection
  },
  {
    organizationId: 'SIM_BB_TRY_CENTRAL',
    bloodGroup: 'O_POSITIVE',
    componentType: 'RBC',
    usableInventory: 140,
    predictedLocalDemand: 35,
    safetyReserve: 30,
    reservedUnits: 15,
    safeShareUnits: 60,
  },
  {
    organizationId: 'SIM_HOSP_TRY_MAIN',
    bloodGroup: 'O_POSITIVE',
    componentType: 'RBC',
    usableInventory: 65,
    predictedLocalDemand: 22,
    safetyReserve: 25,
    reservedUnits: 8,
    safeShareUnits: 10,
  },
  {
    organizationId: 'SIM_HOSP_SRIRANGAM',
    bloodGroup: 'O_NEGATIVE',
    componentType: 'RBC',
    usableInventory: 3,
    predictedLocalDemand: 2,
    safetyReserve: 2,
    reservedUnits: 1,
    safeShareUnits: 0, // Protected: cannot share
  },
  {
    organizationId: 'SIM_HOSP_THUVAKUDI',
    bloodGroup: 'O_NEGATIVE',
    componentType: 'RBC',
    usableInventory: 4,
    predictedLocalDemand: 1,
    safetyReserve: 2,
    reservedUnits: 1,
    safeShareUnits: 1,
  },
];

// ---------------------------------------------------------------------------
// Core Demonstration Scenario Allocation (Manapparai Emergency)
// ---------------------------------------------------------------------------

export const DEMO_ALLOCATION = {
  requestId: 'REQ_TRY_MANAPPARAI_001',
  status: 'OPTIMAL',
  totalAllocated: 6,
  totalNeeded: 6,
  unfulfilled: 0,
  allocations: [
    {
      sourceId: 'SIM_BB_TRY_CENTRAL',
      sourceName: 'Tiruchirappalli Central Blood Bank Hub (Simulated)',
      unitsAllocated: 6,
      rank: 1,
      distanceKm: 40.2,
      etaMinutes: 48,
      sourceRisk: 'LOW',
      safeShareRemaining: 2,
      explanation: 'Optimal multi-criteria match: Tiruchirappalli Central Hub has 8 units safe-to-share O-Negative. Direct highway route via NH 83 ensures 48 min transit time, well within the 120-minute cold-chain limit.',
    },
  ],
  solverRuntimeMs: 9.8,
  objectiveValue: 412.5,
  explanation: 'Linear optimization satisfied 100% of Manapparai emergency demand (6 units O- RBC) from Central Hub without inducing secondary stockouts.',
};

export const DEMO_TRANSFERS: Transfer[] = [
  {
    id: 'TR-TRY-8821',
    requestId: 'REQ_TRY_MANAPPARAI_001',
    sourceOrganizationId: 'SIM_BB_TRY_CENTRAL',
    sourceOrganizationName: 'Tiruchirappalli Central Blood Bank Hub (Simulated)',
    sourceName: 'Tiruchirappalli Central Blood Bank Hub (Simulated)',
    destinationOrganizationId: 'SIM_HOSP_MANAPPARAI',
    destinationOrganizationName: 'Manapparai Highway Trauma Unit (Simulated)',
    destinationName: 'Manapparai Highway Trauma Unit (Simulated)',
    status: 'IN_TRANSIT',
    priority: 'EMERGENCY',
    pickupTime: '14:20',
    dispatchTime: '14:30',
    expectedArrival: '15:18',
    routeDistanceKm: 40.2,
    routeDurationMinutes: 48,
    unitCount: 6,
    units: 6,
    etaMinutes: 28,
    courierName: 'Kaveri Cold-Chain Express (Vehicle TN-45-BC-109)',
    bloodGroups: ['O-'],
  },
  {
    id: 'TR-TRY-8820',
    requestId: 'REQ_TRY_SRIRANGAM_004',
    sourceOrganizationId: 'SIM_BB_TRY_CENTRAL',
    sourceOrganizationName: 'Tiruchirappalli Central Blood Bank Hub (Simulated)',
    sourceName: 'Tiruchirappalli Central Blood Bank Hub (Simulated)',
    destinationOrganizationId: 'SIM_HOSP_SRIRANGAM',
    destinationOrganizationName: 'Srirangam Sub-District Hospital (Simulated)',
    destinationName: 'Srirangam Sub-District Hospital (Simulated)',
    status: 'DELIVERED',
    priority: 'ROUTINE',
    pickupTime: '10:00',
    dispatchTime: '10:15',
    expectedArrival: '10:35',
    actualArrival: '10:32',
    routeDistanceKm: 9.2,
    routeDurationMinutes: 20,
    unitCount: 4,
    units: 4,
    etaMinutes: 0,
    courierName: 'Kaveri Local Courier #2',
    bloodGroups: ['A+'],
  },
];

export const DEMO_REQUESTS: BloodRequest[] = [
  {
    id: 'REQ_TRY_MANAPPARAI_001',
    organizationId: 'SIM_HOSP_MANAPPARAI',
    organizationName: 'Manapparai Highway Trauma Unit (Simulated)',
    bloodGroup: 'O_NEGATIVE',
    componentType: 'RBC',
    unitsNeeded: 6,
    unitsFulfilled: 6,
    priority: 'EMERGENCY',
    status: 'IN_TRANSIT',
    createdAt: '14:15',
    notes: 'NH 83 Multi-vehicle collision emergency trauma surgery intake.',
  },
  {
    id: 'REQ_TRY_SRIRANGAM_004',
    organizationId: 'SIM_HOSP_SRIRANGAM',
    organizationName: 'Srirangam Sub-District Hospital (Simulated)',
    bloodGroup: 'A_POSITIVE',
    componentType: 'RBC',
    unitsNeeded: 4,
    unitsFulfilled: 4,
    priority: 'ROUTINE',
    status: 'COMPLETED',
    createdAt: '09:45',
    notes: 'Elective orthopedic surgery preparation.',
  },
];

export const DEMO_TEMPERATURE_LOGS: TemperatureReading[] = [
  { transferId: 'TR-TRY-8821', deviceId: 'SENSOR_TRY_01', recordedAt: '14:30', timestamp: '14:30', temperatureC: 3.6, temperature: 3.6, latitude: 10.8010, longitude: 78.6920, excursionFlag: false },
  { transferId: 'TR-TRY-8821', deviceId: 'SENSOR_TRY_01', recordedAt: '14:35', timestamp: '14:35', temperatureC: 3.7, temperature: 3.7, latitude: 10.7600, longitude: 78.6300, excursionFlag: false },
  { transferId: 'TR-TRY-8821', deviceId: 'SENSOR_TRY_01', recordedAt: '14:40', timestamp: '14:40', temperatureC: 3.8, temperature: 3.8, latitude: 10.7200, longitude: 78.5800, excursionFlag: false },
  { transferId: 'TR-TRY-8821', deviceId: 'SENSOR_TRY_01', recordedAt: '14:45', timestamp: '14:45', temperatureC: 3.9, temperature: 3.9, latitude: 10.6700, longitude: 78.5200, excursionFlag: false },
  { transferId: 'TR-TRY-8821', deviceId: 'SENSOR_TRY_01', recordedAt: '14:50', timestamp: '14:50', temperatureC: 3.8, temperature: 3.8, latitude: 10.6300, longitude: 78.4600, excursionFlag: false },
];

export const DEMO_DONORS: Donor[] = [
  { id: 'DONOR_TRY_001', name: 'Karthik Subramanian', fullName: 'Karthik Subramanian', bloodGroup: 'O_NEGATIVE', city: 'Tiruchirappalli', phone: '+91 98424 12345', lastDonationDate: '15 Aug 2024', eligibilityStatus: 'ELIGIBLE', consentGiven: true, totalDonations: 8 },
  { id: 'DONOR_TRY_002', name: 'Priya Sundaram', fullName: 'Priya Sundaram', bloodGroup: 'O_POSITIVE', city: 'Srirangam', phone: '+91 98424 23456', lastDonationDate: '10 Jul 2024', eligibilityStatus: 'ELIGIBLE', consentGiven: true, totalDonations: 6 },
  { id: 'DONOR_TRY_003', name: 'Murugan Thangavel', fullName: 'Murugan Thangavel', bloodGroup: 'A_POSITIVE', city: 'Thuvakudi', phone: '+91 98424 34567', lastDonationDate: '01 Jun 2024', eligibilityStatus: 'ELIGIBLE', consentGiven: true, totalDonations: 12 },
  { id: 'DONOR_TRY_004', name: 'Meenakshi Raman', fullName: 'Meenakshi Raman', bloodGroup: 'B_POSITIVE', city: 'Manapparai', phone: '+91 98424 45678', lastDonationDate: '20 Sep 2024', eligibilityStatus: 'ELIGIBLE', consentGiven: true, totalDonations: 4 },
  { id: 'DONOR_TRY_005', name: 'Saravanan Balaji', fullName: 'Saravanan Balaji', bloodGroup: 'AB_POSITIVE', city: 'Lalgudi', phone: '+91 98424 56789', lastDonationDate: '12 Sep 2024', eligibilityStatus: 'ELIGIBLE', consentGiven: true, totalDonations: 5 },
];

export const DEMO_CAMPAIGNS: DonationCampaign[] = [
  { id: 'CAMP_TRY_001', title: 'Tiruchirappalli Central O- Emergency Drive', name: 'Tiruchirappalli Central O- Emergency Drive', location: 'Central Blood Bank Hub', targetOrganizationName: 'Tiruchirappalli Central Blood Bank Hub (Simulated)', targetBloodGroup: 'O_NEGATIVE', targetBloodGroups: ['O_NEGATIVE'], unitsPledged: 18, unitsNeeded: 30, startDate: '2026-09-15', endDate: '2026-09-25', status: 'ACTIVE', urgencyLevel: 'EMERGENCY', registeredDonors: 28, completedDonations: 8 },
  { id: 'CAMP_TRY_002', title: 'Thuvakudi Industrial Corridor Campus Drive', name: 'Thuvakudi Industrial Corridor Campus Drive', location: 'Thuvakudi Health Center', targetOrganizationName: 'Thuvakudi Industrial Corridor Health Center (Simulated)', targetBloodGroup: 'O_POSITIVE', targetBloodGroups: ['O_POSITIVE', 'A_POSITIVE'], unitsPledged: 65, unitsNeeded: 100, startDate: '2026-09-20', endDate: '2026-09-30', status: 'ACTIVE', urgencyLevel: 'ROUTINE', registeredDonors: 92, completedDonations: 24 },
];

export const DEMO_NOTIFICATIONS: Notification[] = [
  {
    id: 'N_TRY_001',
    type: 'CRITICAL_SHORTAGE',
    title: 'Manapparai Highway Emergency (O- Deficit)',
    message: 'NH 83 collision victims admitted to Manapparai Highway Trauma Unit. 0 usable O- PRBC units remaining. Action required.',
    severity: 'CRITICAL',
    isRead: false,
    createdAt: new Date(Date.now() - 25 * 60000).toISOString(),
    organizationId: 'SIM_HOSP_MANAPPARAI',
    referenceId: 'REQ_TRY_MANAPPARAI_001',
  },
  {
    id: 'N_TRY_002',
    type: 'ALLOCATION_RECOMMENDED',
    title: 'Allocation Ready for Approval',
    message: 'Optimization recommends 6 units O- RBC from Tiruchirappalli Central Hub to Manapparai (ETA 48 mins). Requires authorized human approval.',
    severity: 'HIGH',
    isRead: false,
    createdAt: new Date(Date.now() - 20 * 60000).toISOString(),
    organizationId: 'SIM_HOSP_MANAPPARAI',
    referenceId: 'REQ_TRY_MANAPPARAI_001',
  },
  {
    id: 'N_TRY_003',
    type: 'DISPATCH',
    title: 'Courier Dispatched via NH 83',
    message: 'Transfer TR-TRY-8821 dispatched from Central Hub to Manapparai. IoT sensor active at 3.6°C.',
    severity: 'INFO',
    isRead: false,
    createdAt: new Date(Date.now() - 15 * 60000).toISOString(),
    organizationId: 'SIM_BB_TRY_CENTRAL',
    referenceId: 'TR-TRY-8821',
  },
];

// ---------------------------------------------------------------------------
// Research-Grade Evaluation & Baseline Benchmarks
// ---------------------------------------------------------------------------

export const DEMO_MODEL_STATUS = {
  modelName: 'XGBoost Time-Series (Trichy Tuned)',
  modelVersion: 'v2.1-trichy',
  datasetRows: 184320,
  dateRange: '2022-01-01 → 2024-12-31 (Synthetic Trichy Series)',
  validationStrategy: 'Walk-Forward Temporal (No Random Shuffling)',
  globalWinner: 'xgboost',
  trainingDate: '2026-09-21T12:00:00Z',

  // Benchmarks against standard statistical baselines:
  benchmarks: [
    {
      model: 'XGBoost (Trichy Tuned)',
      type: 'Gradient Boosted Trees (Lags 1-14 + Seasonality)',
      mae: 1.82,
      rmse: 2.41,
      wape: 0.114,
      mase: 0.78,
      bias: 0.02,
      inferenceTimeMs: 1.4,
    },
    {
      model: 'Holt-Winters Exponential Smoothing',
      type: 'Additive Trend + 7-Day Multiplicative Seasonality',
      mae: 2.15,
      rmse: 2.89,
      wape: 0.135,
      mase: 0.86,
      bias: -0.06,
      inferenceTimeMs: 4.8,
    },
    {
      model: 'Seasonal Naive (Lag 7)',
      type: 'Prior Week Observed Value Baseline',
      mae: 2.74,
      rmse: 3.65,
      wape: 0.172,
      mase: 1.00,
      bias: 0.08,
      inferenceTimeMs: 0.1,
    },
    {
      model: 'Moving Average (14-Day)',
      type: 'Rolling Mean Window Baseline',
      mae: 3.10,
      rmse: 4.02,
      wape: 0.195,
      mase: 1.13,
      bias: -0.14,
      inferenceTimeMs: 0.1,
    },
  ],

  // Prediction Interval Calibration (P10 / P50 / P90):
  predictionIntervals: {
    method: 'Conformal Empirical Residuals on Walk-Forward Splits',
    targetCoverage90: 0.90,
    empiricalCoverage90: 0.892,
    targetCoverage80: 0.80,
    empiricalCoverage80: 0.814,
    meanIntervalWidthUnits: 5.2,
    calibrationStatus: 'WELL_CALIBRATED',
    reliabilityNote: 'Empirical coverage aligns within ±1.5% of theoretical intervals on out-of-time test set.',
  },

  // Shortage Risk Recall & Safety Analysis:
  shortageRiskEvaluation: {
    evaluationHorizon: '3-Day Ahead Lookahead',
    totalEvaluationEvents: 142,
    truePositives: 42,
    falseNegatives: 2, // Only 2 missed critical shortages in 12-month synthetic test
    falsePositives: 6,
    trueNegatives: 92,
    recall: 0.955, // 95.5% Recall (Prioritizes zero patient harm)
    precision: 0.875,
    f2Score: 0.937,
    safetyNote: 'Optimized for high recall to prevent catastrophic unexpected hospital stockouts.',
  },

  // Expiry & Wastage Reduction (FEFO vs FIFO):
  wastageEvaluation: {
    standardFifoDiscardRate: 0.128, // 12.8% discard rate under siloed FIFO
    fefoRescueDiscardRate: 0.041, // 4.1% discard rate under cross-facility FEFO rescue
    relativeDiscardReduction: 0.68, // -68% wastage reduction
    plateletLifespanDays: 5,
    rbcLifespanDays: 42,
  },

  // Multi-Hospital Optimization Benchmark:
  optimizationComparison: [
    {
      algorithm: 'Linear Program (OR-Tools Multi-Criteria)',
      demandSatisfactionPct: 100.0,
      secondaryShortagesCreated: 0,
      meanTravelTimeMinutes: 38.4,
      solverRuntimeMs: 14.2,
      explanation: 'Optimizes distance, inventory balance, and preserves source P90 safety buffers.',
    },
    {
      algorithm: 'Greedy Nearest-Neighbor',
      demandSatisfactionPct: 100.0,
      secondaryShortagesCreated: 1, // Drained donor hospital below its own safe threshold
      meanTravelTimeMinutes: 31.2,
      solverRuntimeMs: 1.1,
      explanation: 'Selects closest facility blindly, creating a secondary deficit at Srirangam.',
    },
    {
      algorithm: 'Uncoordinated / Local Only',
      demandSatisfactionPct: 42.0,
      secondaryShortagesCreated: 0,
      meanTravelTimeMinutes: 0.0,
      solverRuntimeMs: 0.0,
      explanation: 'Hospital relies solely on local stocks, leading to emergency surgery deferral.',
    },
  ],
};

// ---------------------------------------------------------------------------
// Physical Batch Inventory (ISBT-128 Mock Standard)
// ---------------------------------------------------------------------------

export const DEMO_INVENTORY_BATCHES = [
  {
    id: 'BATCH_TRY_001',
    batchNumber: 'W1234-26-00984-O-',
    organizationId: 'SIM_BB_TRY_CENTRAL',
    organizationName: 'Tiruchirappalli Central Blood Bank Hub (Simulated)',
    bloodGroup: 'O_NEGATIVE' as const,
    componentType: 'RBC' as const,
    collectionDate: '2026-09-02',
    expiryDate: '2026-10-14',
    daysToExpiry: 23,
    quantity: 12,
    reservedQuantity: 2,
    status: 'USABLE' as const,
    storageLocation: 'Cold Chamber Alpha (Shelf 3)',
  },
  {
    id: 'BATCH_TRY_002',
    batchNumber: 'W1234-26-00985-O-',
    organizationId: 'SIM_BB_TRY_CENTRAL',
    organizationName: 'Tiruchirappalli Central Blood Bank Hub (Simulated)',
    bloodGroup: 'O_NEGATIVE' as const,
    componentType: 'RBC' as const,
    collectionDate: '2026-08-28',
    expiryDate: '2026-10-09',
    daysToExpiry: 18,
    quantity: 10,
    reservedQuantity: 2,
    status: 'USABLE' as const,
    storageLocation: 'Cold Chamber Alpha (Shelf 2)',
  },
  {
    id: 'BATCH_TRY_003',
    batchNumber: 'W1234-26-01102-O+',
    organizationId: 'SIM_HOSP_TRY_MAIN',
    organizationName: 'Tiruchirappalli Regional Trauma Center (Simulated)',
    bloodGroup: 'O_POSITIVE' as const,
    componentType: 'RBC' as const,
    collectionDate: '2026-09-10',
    expiryDate: '2026-10-22',
    daysToExpiry: 31,
    quantity: 35,
    reservedQuantity: 5,
    status: 'USABLE' as const,
    storageLocation: 'Trauma Blood Bank Vault 1',
  },
  {
    id: 'BATCH_TRY_004',
    batchNumber: 'W1234-26-00441-A+PLT',
    organizationId: 'SIM_HOSP_TRY_MAIN',
    organizationName: 'Tiruchirappalli Regional Trauma Center (Simulated)',
    bloodGroup: 'A_POSITIVE' as const,
    componentType: 'PLATELETS' as const,
    collectionDate: '2026-09-18',
    expiryDate: '2026-09-23',
    daysToExpiry: 2,
    quantity: 4,
    reservedQuantity: 1,
    status: 'NEAR_EXPIRY' as const,
    storageLocation: 'Agitator Unit 2',
  },
  {
    id: 'BATCH_TRY_005',
    batchNumber: 'W1234-26-00301-O-',
    organizationId: 'SIM_HOSP_MANAPPARAI',
    organizationName: 'Manapparai Highway Trauma Unit (Simulated)',
    bloodGroup: 'O_NEGATIVE' as const,
    componentType: 'RBC' as const,
    collectionDate: '2026-08-20',
    expiryDate: '2026-10-01',
    daysToExpiry: 10,
    quantity: 1,
    reservedQuantity: 1,
    status: 'NEAR_EXPIRY' as const,
    storageLocation: 'Emergency OT Refrigerator',
  },
];

// ---------------------------------------------------------------------------
// Transfer Recommendations (Tiruchirappalli Region)
// ---------------------------------------------------------------------------

export const DEMO_RECOMMENDATIONS = [
  {
    id: 'REC_TRY_101',
    requestId: 'REQ_TRY_MANAPPARAI_001',
    sourceOrganizationId: 'SIM_BB_TRY_CENTRAL',
    sourceOrganizationName: 'Tiruchirappalli Central Blood Bank Hub (Simulated)',
    destinationOrganizationId: 'SIM_HOSP_MANAPPARAI',
    destinationOrganizationName: 'Manapparai Highway Trauma Unit (Simulated)',
    bloodGroup: 'O_NEGATIVE' as const,
    componentType: 'RBC' as const,
    quantityNeeded: 6,
    quantityRecommended: 6,
    reason: 'Manapparai O- RBC deficit of 8 units following NH 83 highway collision. Central Blood Bank Hub has 8 safe-to-share units above local P90 protection level (10 units). Direct highway transit time: 48 mins.',
    sourceSafeToShare: 8,
    destinationShortageSeverity: 'CRITICAL' as const,
    expiryUrgency: 'NONE' as const,
    estimatedTravelMinutes: 48,
    priority: 'EMERGENCY' as const,
  },
];

// ---------------------------------------------------------------------------
// Simulation Scenarios (Tiruchirappalli Regional Context)
// ---------------------------------------------------------------------------

export const DEMO_SCENARIOS: SimulationScenario[] = [
  {
    id: 'SCEN_TRICHY_HIGHWAY_EMERGENCY',
    name: 'NH 83 Highway Collision Emergency (Manapparai O- Surge)',
    description: 'Multi-vehicle collision on NH 83 (Dindigul-Trichy corridor) creates an immediate surge in O-Negative and O-Positive blood demand at Manapparai Highway Trauma Unit.',
    demandMultiplier: 2.2,
    donationChangePercent: 0,
    outageFacilityIds: [],
    massCasualtyEvent: true,
    durationDays: 3,
  },
  {
    id: 'SCEN_TRICHY_FESTIVAL_SURGE',
    name: 'Srirangam Festival Regional Surge (+50% Regional Demand)',
    description: 'Large pilgrimage gathering in Srirangam increases regional footfall and elective surgical reserve requirements across the Kaveri river cluster.',
    demandMultiplier: 1.5,
    donationChangePercent: 15,
    outageFacilityIds: [],
    massCasualtyEvent: false,
    durationDays: 7,
  },
  {
    id: 'SCEN_KAVERI_MONSOON_FLOOD',
    name: 'Kaveri River Monsoon Inundation (-40% Mobile Collections)',
    description: 'Severe seasonal flooding along Musiri and Lalgudi riverbanks disrupts mobile blood donation camps and delays transit along rural roads.',
    demandMultiplier: 1.1,
    donationChangePercent: -40,
    outageFacilityIds: [],
    massCasualtyEvent: false,
    durationDays: 14,
  },
  {
    id: 'SCEN_HUB_POWER_FAIL',
    name: 'Central Blood Bank Hub Chiller Outage (Quarantine Risk)',
    description: 'Cold-chain refrigeration failure at Tiruchirappalli Central Blood Bank Hub forces immediate emergency transfer of stored units to Srirangam and Thuvakudi.',
    demandMultiplier: 1.0,
    donationChangePercent: 0,
    outageFacilityIds: ['SIM_BB_TRY_CENTRAL'],
    massCasualtyEvent: false,
    durationDays: 2,
  },
];
