// BloodChain AI — Core Type Definitions

export type BloodGroup =
  | 'A_POSITIVE' | 'A_NEGATIVE'
  | 'B_POSITIVE' | 'B_NEGATIVE'
  | 'AB_POSITIVE' | 'AB_NEGATIVE'
  | 'O_POSITIVE' | 'O_NEGATIVE';

export type ComponentType = 'WHOLE_BLOOD' | 'RBC' | 'PLASMA' | 'PLATELETS' | 'CRYOPRECIPITATE';

export type BloodUnitStatus =
  | 'COLLECTED' | 'TESTING' | 'PROCESSING' | 'AVAILABLE'
  | 'RESERVED' | 'DISPATCHED' | 'RECEIVED' | 'USED'
  | 'EXPIRED' | 'DISCARDED' | 'RETURNED' | 'QUARANTINED';

export type QualityStatus = 'PENDING' | 'PASSED' | 'FAILED' | 'REVIEW_REQUIRED';

export type RequestStatus =
  | 'OPEN' | 'SEARCHING' | 'PARTIALLY_ALLOCATED'
  | 'ALLOCATED' | 'IN_TRANSIT' | 'COMPLETED' | 'CANCELLED';

export type ReservationStatus = 'PENDING' | 'RESERVED' | 'CONFIRMED' | 'RELEASED' | 'EXPIRED' | 'CANCELLED';

export type TransferStatus =
  | 'PREPARING' | 'READY_FOR_PICKUP' | 'IN_TRANSIT'
  | 'DELIVERED' | 'VERIFIED' | 'REJECTED' | 'CANCELLED';

export type Severity = 'INFO' | 'WARNING' | 'HIGH' | 'CRITICAL';

export type Priority = 'ROUTINE' | 'URGENT' | 'EMERGENCY';

export type OrganizationType = 'HOSPITAL' | 'BLOOD_BANK' | 'LOGISTICS' | 'REGIONAL_ADMIN';

export interface Organization {
  id: string;
  name: string;
  type: OrganizationType;
  region: string;
  city: string;
  latitude: number;
  longitude: number;
  populationServed: number;
  bedCapacity: number;
  icuBeds: number;
  emergencyCapacity: number;
  isActive: boolean;
  address?: string;
  phone?: string;
  availableUnits?: number;
  hasDeficit?: boolean;
  storageCapacityUnits?: number;
}

export interface InventorySummary {
  organizationId: string;
  bloodGroup: BloodGroup;
  componentType: ComponentType;
  availableUnits: number;
  reservedUnits: number;
  quarantinedUnits: number;
  nearExpiryUnits: number;
  incomingUnits: number;
  expectedExpiryUnits: number;
  safetyStockTarget: number;
}

export interface BloodUnit {
  unitCode: string;
  organizationId: string;
  bloodGroup: BloodGroup;
  componentType: ComponentType;
  collectionDate: string;
  expiryDate: string;
  status: BloodUnitStatus;
  qualityTestingStatus: QualityStatus;
  storageLocation: string;
  sourceDonationId: string;
}

export interface ForecastResult {
  organizationId: string;
  bloodGroup: string;
  componentType: string;
  forecastDate: string;
  predictedUnits: number;
  lowerBound: number;
  upperBound: number;
  modelName: string;
  modelVersion: string;
}

export interface DemandHistory {
  date: string;
  organizationId: string;
  bloodGroup: string;
  componentType: string;
  unitsUsed: number;
  emergencyUnits: number;
  scheduledUnits: number;
}

export interface ShortageRisk {
  id?: string;
  organizationId: string;
  organizationName?: string;
  bloodGroup: string;
  componentType: string;
  projectedAvailable: number;
  requiredInventory: number;
  projectedDeficit: number;
  severity: Severity;
  coverageRatio: number;
  explanation: string;
}

export interface SafeShareSnapshot {
  organizationId: string;
  bloodGroup: string;
  componentType: string;
  safeShareUnits: number;
  usableInventory: number;
  predictedLocalDemand: number;
  safetyReserve: number;
  reservedUnits: number;
}

export interface BloodRequest {
  id: string;
  organizationId: string;
  organizationName: string;
  bloodGroup: BloodGroup;
  componentType: ComponentType;
  unitsNeeded: number;
  unitsFulfilled: number;
  priority: Priority;
  status: RequestStatus;
  createdAt: string;
  notes?: string;
}

export interface AllocationSource {
  sourceId: string;
  sourceName: string;
  unitsAllocated: number;
  rank: number;
  distanceKm: number;
  etaMinutes: number;
  sourceRisk: string;
  safeShareRemaining: number;
  explanation: string;
}

export interface OptimizationResult {
  requestId: string;
  status: string;
  totalAllocated: number;
  totalNeeded: number;
  unfulfilled: number;
  allocations: AllocationSource[];
  solverRuntimeMs: number;
  objectiveValue: number;
  explanation: string;
}

export interface Transfer {
  id: string;
  requestId: string;
  sourceOrganizationId: string;
  sourceOrganizationName: string;
  sourceName?: string;
  destinationOrganizationId: string;
  destinationOrganizationName: string;
  destinationName?: string;
  status: TransferStatus;
  priority: Priority;
  pickupTime: string;
  dispatchTime: string;
  expectedArrival: string;
  actualArrival?: string;
  routeDistanceKm: number;
  routeDurationMinutes: number;
  unitCount: number;
  units?: number;
  etaMinutes?: number;
  courierName?: string;
  bloodGroups: string[];
}

export interface TemperatureReading {
  transferId: string;
  deviceId: string;
  recordedAt: string;
  temperatureC: number;
  latitude: number;
  longitude: number;
  excursionFlag: boolean;
  timestamp?: string;
  temperature?: number;
}

export interface Donor {
  id: string;
  name: string;
  fullName?: string;
  bloodGroup: BloodGroup;
  city: string;
  phone?: string;
  lastDonationDate: string;
  eligibilityStatus: string;
  consentGiven: boolean;
  totalDonations: number;
}

export interface DonationCampaign {
  id: string;
  title?: string;
  name?: string;
  location: string;
  targetBloodGroups: BloodGroup[];
  targetBloodGroup?: BloodGroup;
  targetOrganizationName?: string;
  unitsPledged?: number;
  unitsNeeded?: number;
  startDate: string;
  endDate: string;
  status: string;
  urgencyLevel: Priority;
  registeredDonors: number;
  completedDonations: number;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  severity: Severity;
  isRead: boolean;
  createdAt: string;
  organizationId?: string;
  referenceId?: string;
}

export interface ModelMetrics {
  modelName: string;
  modelVersion: string;
  mae: number;
  rmse: number;
  wape: number;
  bias: number;
  trainedAt: string;
}
