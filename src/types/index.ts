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

export type UserRole = 
  | 'ADMIN'
  | 'HOSPITAL_STAFF'
  | 'BLOOD_BANK_STAFF'
  | 'LOGISTICS_STAFF'
  | 'AUTHORIZED_APPROVER';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  organizationId?: string;
  organizationName?: string;
}

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

export interface InventoryBatch {
  id: string;
  batchNumber: string;
  organizationId: string;
  organizationName?: string;
  bloodGroup: BloodGroup;
  componentType: ComponentType;
  collectionDate: string;
  expiryDate: string;
  daysToExpiry: number;
  quantity: number;
  reservedQuantity: number;
  status: 'USABLE' | 'NEAR_EXPIRY' | 'EXPIRED' | 'QUARANTINED';
  storageLocation: string;
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
  predictedUnits: number; // P50
  lowerBound: number;    // P10
  upperBound: number;    // P90
  p10: number;
  p50: number;
  p90: number;
  confidenceInterval: number; // e.g. 0.80
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

export interface SafeToShareCalculation {
  organizationId: string;
  organizationName: string;
  bloodGroup: BloodGroup;
  componentType: ComponentType;
  currentInventory: number;
  reservedStock: number;
  p50Demand: number;
  p90Demand: number;
  safetyBuffer: number;
  protectionLevel: number;
  safeToShareUnits: number;
  isSafeToShare: boolean;
  explanation: string;
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

export interface TransferRecommendation {
  id: string;
  requestId: string;
  sourceOrganizationId: string;
  sourceOrganizationName: string;
  destinationOrganizationId: string;
  destinationOrganizationName: string;
  bloodGroup: BloodGroup;
  componentType: ComponentType;
  quantityNeeded: number;
  quantityRecommended: number;
  reason: string;
  sourceSafeToShare: number;
  destinationShortageSeverity: Severity;
  expiryUrgency: 'NONE' | 'LOW' | 'HIGH';
  estimatedTravelMinutes: number;
  priority: Priority;
  status: 'PROPOSED' | 'PENDING_APPROVAL' | 'APPROVED' | 'IN_TRANSIT' | 'RECEIVED' | 'REJECTED' | 'CANCELLED';
  approvedBy?: string;
  approvedAt?: string;
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

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  entityType: string;
  entityId: string;
  oldValue?: string;
  newValue?: string;
  reason?: string;
  recommendationId?: string;
}

export interface SimulationScenario {
  id: string;
  name: string;
  description: string;
  demandMultiplier: number;
  donationChangePercent: number;
  outageFacilityIds: string[];
  massCasualtyEvent: boolean;
  durationDays: number;
}

