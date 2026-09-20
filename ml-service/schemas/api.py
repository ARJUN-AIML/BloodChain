"""
BloodChain AI — API Schemas (Pydantic v2)
"""

from datetime import datetime
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field


class BloodGroup(str, Enum):
    A_POSITIVE = "A_POSITIVE"
    A_NEGATIVE = "A_NEGATIVE"
    B_POSITIVE = "B_POSITIVE"
    B_NEGATIVE = "B_NEGATIVE"
    AB_POSITIVE = "AB_POSITIVE"
    AB_NEGATIVE = "AB_NEGATIVE"
    O_POSITIVE = "O_POSITIVE"
    O_NEGATIVE = "O_NEGATIVE"


class ComponentType(str, Enum):
    RBC = "RBC"
    PLASMA = "PLASMA"
    PLATELETS = "PLATELETS"
    WHOLE_BLOOD = "WHOLE_BLOOD"
    CRYOPRECIPITATE = "CRYOPRECIPITATE"


class Priority(str, Enum):
    ROUTINE = "ROUTINE"
    URGENT = "URGENT"
    EMERGENCY = "EMERGENCY"


class RiskLevel(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class Severity(str, Enum):
    INFO = "INFO"
    WARNING = "WARNING"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


# ---------------------------------------------------------------------------
# Forecast
# ---------------------------------------------------------------------------

class ForecastRequest(BaseModel):
    organizationId: str
    bloodGroup: BloodGroup
    componentType: ComponentType
    forecastHorizonHours: int = 24


class ForecastResponse(BaseModel):
    organizationId: str
    bloodGroup: str
    componentType: str
    forecastDate: str
    predictedUnits: float
    lowerBound: float
    upperBound: float
    p10: Optional[float] = None
    p50: Optional[float] = None
    p90: Optional[float] = None
    confidenceInterval: Optional[float] = 0.80
    modelName: str
    modelVersion: str


class BatchForecastRequest(BaseModel):
    requests: List[ForecastRequest]


class BatchForecastResponse(BaseModel):
    forecasts: List[ForecastResponse]


# ---------------------------------------------------------------------------
# Model Status
# ---------------------------------------------------------------------------

class ModelStatusResponse(BaseModel):
    modelName: str
    modelVersion: str
    datasetRows: int
    dateRange: str
    globalWinner: str
    trainingDate: str
    metrics: dict
    predictionIntervals: dict


class TrainRequest(BaseModel):
    datasetPath: Optional[str] = None


class TrainResponse(BaseModel):
    status: str
    message: str
    metrics: Optional[dict] = None


# ---------------------------------------------------------------------------
# Shortage
# ---------------------------------------------------------------------------

class ShortageInput(BaseModel):
    organizationId: str
    bloodGroup: BloodGroup
    componentType: ComponentType
    currentUsableInventory: int
    confirmedIncoming: int
    reservedUnits: int
    expectedExpiryUnits: int
    predictedDemand: float
    safetyStock: int
    forecastUpperBound: Optional[float] = None
    isEmergency: bool = False


class ShortageResult(BaseModel):
    organizationId: str
    bloodGroup: str
    componentType: str
    projectedAvailable: int
    requiredInventory: float
    projectedDeficit: float
    severity: str
    coverageRatio: float
    explanation: str


# ---------------------------------------------------------------------------
# Safe Share
# ---------------------------------------------------------------------------

class SafeShareInput(BaseModel):
    organizationId: str
    bloodGroup: BloodGroup
    componentType: ComponentType
    usableInventory: int
    predictedLocalDemand: float
    safetyReserve: int
    reservedUnits: int


class SafeShareResult(BaseModel):
    organizationId: str
    bloodGroup: str
    componentType: str
    safeShareUnits: int
    usableInventory: int
    predictedLocalDemand: float
    safetyReserve: int
    reservedUnits: int


# ---------------------------------------------------------------------------
# Allocation / Optimization
# ---------------------------------------------------------------------------

class AllocationSourceInput(BaseModel):
    organizationId: str
    organizationName: str
    bloodGroup: str
    componentType: str
    availableCompatibleUnits: int
    safeShareUnits: int
    distanceKm: float
    etaMinutes: float
    sourceRisk: RiskLevel = RiskLevel.LOW
    expiryHoursAvg: float = 720
    qualityPassed: bool = True


class AllocationRequestInput(BaseModel):
    requestId: str
    destinationId: str
    destinationName: str
    bloodGroup: BloodGroup
    componentType: ComponentType
    unitsNeeded: int
    priority: Priority = Priority.ROUTINE
    maxEtaMinutes: float = 240


class AllocationSourceResult(BaseModel):
    sourceId: str
    sourceName: str
    unitsAllocated: int
    rank: int
    distanceKm: float
    etaMinutes: float
    sourceRisk: str
    safeShareRemaining: int
    explanation: str


class AllocationOptimizationRequest(BaseModel):
    request: AllocationRequestInput
    sources: List[AllocationSourceInput]


class AllocationOptimizationResponse(BaseModel):
    requestId: str
    status: str
    totalAllocated: int
    totalNeeded: int
    unfulfilled: int
    allocations: List[AllocationSourceResult]
    solverRuntimeMs: float
    objectiveValue: float
    explanation: str


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

class HealthResponse(BaseModel):
    status: str
    version: str
    timestamp: str
    models_loaded: bool
    ortools_available: bool
