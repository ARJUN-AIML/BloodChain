"""
BloodChain AI — FastAPI ML Service
====================================
Main application entry point.

Endpoints:
- GET  /health
- GET  /model/status
- POST /forecast
- POST /forecast/batch
- POST /train
- GET  /metrics
- POST /shortage/calculate
- POST /safe-share/calculate
- POST /optimization/allocate
"""

import json
import os
import sys
import traceback
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

# Setup paths
SERVICE_DIR = os.path.dirname(os.path.abspath(__file__))
ML_ROOT = os.path.dirname(SERVICE_DIR)
PROJECT_ROOT = os.path.dirname(ML_ROOT)
sys.path.insert(0, ML_ROOT)

from schemas.api import (
    HealthResponse, ModelStatusResponse,
    ForecastRequest, ForecastResponse,
    BatchForecastRequest, BatchForecastResponse,
    TrainRequest, TrainResponse,
    ShortageInput, ShortageResult,
    SafeShareInput, SafeShareResult,
    AllocationOptimizationRequest, AllocationOptimizationResponse,
    AllocationSourceResult,
)
from forecasting.models import XGBoostModel, SeasonalNaive, compute_metrics, HAS_XGBOOST
from optimization.allocator import (
    optimize_allocation,
    AllocationRequest, AllocationSource,
    Priority as OptPriority, RiskLevel as OptRisk,
    HAS_ORTOOLS,
)


# ---------------------------------------------------------------------------
# App Setup
# ---------------------------------------------------------------------------

app = FastAPI(
    title="BloodChain AI — ML Service",
    description="Demand forecasting, shortage detection, and allocation optimization",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# State
# ---------------------------------------------------------------------------

ARTIFACTS_DIR = os.path.join(PROJECT_ROOT, "model-artifacts")
METADATA_DIR = os.path.join(ARTIFACTS_DIR, "metadata")
FORECAST_DIR = os.path.join(ARTIFACTS_DIR, "forecasting")
DATASET_DIR = os.path.join(PROJECT_ROOT, "datasets", "synthetic")

# Model state
model_state = {
    "loaded": False,
    "xgb_model": None,
    "feature_columns": [],
    "encoders": {},
    "metrics": None,
    "registry": None,
    "demand_data": None,
}


def load_models():
    """Load trained model artifacts."""
    try:
        import joblib

        # Load preprocessor
        prep_path = os.path.join(FORECAST_DIR, "preprocessor_v1.joblib")
        if os.path.exists(prep_path):
            prep = joblib.load(prep_path)
            model_state["encoders"] = prep.get("encoders", {})
            model_state["feature_columns"] = prep.get("feature_columns", [])

        # Load XGBoost model
        meta_path = os.path.join(FORECAST_DIR, "xgboost_global_v1_meta.json")
        if os.path.exists(meta_path):
            xgb = XGBoostModel(feature_columns=model_state["feature_columns"])
            xgb.load(FORECAST_DIR, prefix="xgboost_global")
            model_state["xgb_model"] = xgb

        # Load metrics
        metrics_path = os.path.join(METADATA_DIR, "model_metrics.json")
        if os.path.exists(metrics_path):
            with open(metrics_path) as f:
                model_state["metrics"] = json.load(f)

        # Load registry 
        reg_path = os.path.join(METADATA_DIR, "model_registry.json")
        if os.path.exists(reg_path):
            with open(reg_path) as f:
                model_state["registry"] = json.load(f)

        # Load recent demand data for context features
        demand_path = os.path.join(DATASET_DIR, "blood_demand_history.csv")
        if os.path.exists(demand_path):
            df = pd.read_csv(demand_path)
            df["date"] = pd.to_datetime(df["date"])
            # Keep last 60 days for lag computation
            cutoff = df["date"].max() - timedelta(days=60)
            model_state["demand_data"] = df[df["date"] >= cutoff].copy()

        model_state["loaded"] = True
        print("[INFO] Models loaded successfully")
    except Exception as e:
        print(f"[WARNING] Model loading error: {e}")
        traceback.print_exc()


@app.on_event("startup")
async def startup():
    load_models()


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/health", response_model=HealthResponse)
async def health():
    return HealthResponse(
        status="healthy",
        version="1.0.0",
        timestamp=datetime.now().isoformat(),
        models_loaded=model_state["loaded"],
        ortools_available=HAS_ORTOOLS,
    )


@app.get("/model/status", response_model=ModelStatusResponse)
async def model_status():
    metrics = model_state.get("metrics")
    if not metrics:
        raise HTTPException(404, "No model metrics found. Train models first.")

    return ModelStatusResponse(
        modelName=metrics.get("global_winner", "unknown"),
        modelVersion="v1",
        datasetRows=metrics.get("dataset_rows", 0),
        dateRange=metrics.get("date_range", ""),
        globalWinner=metrics.get("global_winner", ""),
        trainingDate=metrics.get("training_date", ""),
        metrics=metrics.get("models", {}),
        predictionIntervals=metrics.get("prediction_intervals", {}),
    )


@app.post("/forecast", response_model=ForecastResponse)
async def forecast(req: ForecastRequest):
    xgb = model_state.get("xgb_model")
    demand_data = model_state.get("demand_data")

    if xgb is None or demand_data is None:
        raise HTTPException(503, "Model not loaded. Train models first.")

    # Get recent data for this segment
    segment = demand_data[
        (demand_data["organization_id"] == req.organizationId) &
        (demand_data["blood_group"] == req.bloodGroup.value) &
        (demand_data["component_type"] == req.componentType.value)
    ].sort_values("date")

    if segment.empty:
        raise HTTPException(404, f"No historical data for segment {req.organizationId}|{req.bloodGroup}|{req.componentType}")

    # Build features for the last row
    from preprocessing.features import build_features
    feature_df, _ = build_features(segment, fit_encoders=False, encoders=model_state["encoders"])
    last_row = feature_df.tail(1)

    if last_row.empty:
        raise HTTPException(500, "Could not build features for prediction")

    preds, lower, upper = xgb.predict_with_intervals(last_row)
    pred_val = float(preds[0])
    lower_val = float(lower[0])
    upper_val = float(upper[0])

    # Scale by horizon
    horizon_days = req.forecastHorizonHours / 24.0
    pred_val *= horizon_days
    lower_val *= horizon_days
    upper_val *= horizon_days

    forecast_date = (segment["date"].max() + timedelta(hours=req.forecastHorizonHours)).strftime("%Y-%m-%d")

    return ForecastResponse(
        organizationId=req.organizationId,
        bloodGroup=req.bloodGroup.value,
        componentType=req.componentType.value,
        forecastDate=forecast_date,
        predictedUnits=round(pred_val, 1),
        lowerBound=round(lower_val, 1),
        upperBound=round(upper_val, 1),
        modelName=xgb.name,
        modelVersion=xgb.version,
    )


@app.post("/forecast/batch", response_model=BatchForecastResponse)
async def forecast_batch(req: BatchForecastRequest):
    results = []
    for r in req.requests:
        try:
            result = await forecast(r)
            results.append(result)
        except HTTPException:
            results.append(ForecastResponse(
                organizationId=r.organizationId,
                bloodGroup=r.bloodGroup.value,
                componentType=r.componentType.value,
                forecastDate="",
                predictedUnits=0,
                lowerBound=0,
                upperBound=0,
                modelName="unavailable",
                modelVersion="v0",
            ))
    return BatchForecastResponse(forecasts=results)


@app.post("/train", response_model=TrainResponse)
async def train(req: TrainRequest):
    try:
        from train import train_pipeline
        data_path = req.datasetPath or os.path.join(DATASET_DIR, "blood_demand_history.csv")
        results, registry = train_pipeline(data_path)
        # Reload models
        load_models()
        return TrainResponse(
            status="success",
            message="Models trained and saved successfully.",
            metrics=results,
        )
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(500, f"Training failed: {str(e)}")


@app.get("/metrics")
async def get_metrics():
    metrics = model_state.get("metrics")
    if not metrics:
        raise HTTPException(404, "No metrics found")
    return metrics


@app.get("/models")
async def get_models():
    registry = model_state.get("registry")
    if not registry:
        raise HTTPException(404, "No model registry found")
    return registry


# ---------------------------------------------------------------------------
# Shortage Engine (Deterministic)
# ---------------------------------------------------------------------------

@app.post("/shortage/calculate", response_model=ShortageResult)
async def calculate_shortage(inp: ShortageInput):
    projected_available = (
        inp.currentUsableInventory
        + inp.confirmedIncoming
        - inp.reservedUnits
        - inp.expectedExpiryUnits
    )

    required_inventory = inp.predictedDemand + inp.safetyStock
    projected_deficit = required_inventory - projected_available

    # Coverage ratio
    coverage_ratio = projected_available / max(required_inventory, 1)

    # Severity
    if projected_deficit <= 0:
        severity = "INFO"
    elif coverage_ratio >= 0.7:
        severity = "WARNING"
    elif coverage_ratio >= 0.4:
        severity = "HIGH"
    else:
        severity = "CRITICAL"

    if inp.isEmergency and severity in ("INFO", "WARNING"):
        severity = "HIGH"

    explanation = (
        f"Projected available: {projected_available} units "
        f"(inventory {inp.currentUsableInventory} + incoming {inp.confirmedIncoming} "
        f"- reserved {inp.reservedUnits} - expiring {inp.expectedExpiryUnits}). "
        f"Required: {required_inventory:.0f} (demand {inp.predictedDemand:.1f} + safety {inp.safetyStock}). "
        f"{'DEFICIT of ' + str(round(projected_deficit)) + ' units.' if projected_deficit > 0 else 'No shortage.'} "
        f"Coverage ratio: {coverage_ratio:.1%}."
    )

    return ShortageResult(
        organizationId=inp.organizationId,
        bloodGroup=inp.bloodGroup.value,
        componentType=inp.componentType.value,
        projectedAvailable=projected_available,
        requiredInventory=required_inventory,
        projectedDeficit=round(projected_deficit, 1),
        severity=severity,
        coverageRatio=round(coverage_ratio, 3),
        explanation=explanation,
    )


# ---------------------------------------------------------------------------
# Safe Share Engine (Deterministic)
# ---------------------------------------------------------------------------

@app.post("/safe-share/calculate", response_model=SafeShareResult)
async def calculate_safe_share(inp: SafeShareInput):
    safe_share = max(0, round(
        inp.usableInventory
        - inp.predictedLocalDemand
        - inp.safetyReserve
        - inp.reservedUnits
    ))

    return SafeShareResult(
        organizationId=inp.organizationId,
        bloodGroup=inp.bloodGroup.value,
        componentType=inp.componentType.value,
        safeShareUnits=safe_share,
        usableInventory=inp.usableInventory,
        predictedLocalDemand=inp.predictedLocalDemand,
        safetyReserve=inp.safetyReserve,
        reservedUnits=inp.reservedUnits,
    )


# ---------------------------------------------------------------------------
# Optimization Engine
# ---------------------------------------------------------------------------

@app.post("/optimization/allocate", response_model=AllocationOptimizationResponse)
async def allocate(req: AllocationOptimizationRequest):
    ar = AllocationRequest(
        request_id=req.request.requestId,
        destination_id=req.request.destinationId,
        destination_name=req.request.destinationName,
        blood_group=req.request.bloodGroup.value,
        component_type=req.request.componentType.value,
        units_needed=req.request.unitsNeeded,
        priority=OptPriority(req.request.priority.value),
        max_eta_minutes=req.request.maxEtaMinutes,
    )

    sources = [
        AllocationSource(
            organization_id=s.organizationId,
            organization_name=s.organizationName,
            blood_group=s.bloodGroup,
            component_type=s.componentType,
            available_compatible_units=s.availableCompatibleUnits,
            safe_share_units=s.safeShareUnits,
            distance_km=s.distanceKm,
            eta_minutes=s.etaMinutes,
            source_risk=OptRisk(s.sourceRisk.value),
            expiry_hours_avg=s.expiryHoursAvg,
            quality_passed=s.qualityPassed,
        )
        for s in req.sources
    ]

    result = optimize_allocation(ar, sources)

    return AllocationOptimizationResponse(
        requestId=result.request_id,
        status=result.status,
        totalAllocated=result.total_allocated,
        totalNeeded=result.total_needed,
        unfulfilled=result.unfulfilled,
        allocations=[
            AllocationSourceResult(
                sourceId=a.source_id,
                sourceName=a.source_name,
                unitsAllocated=a.units_allocated,
                rank=a.rank,
                distanceKm=a.distance_km,
                etaMinutes=a.eta_minutes,
                sourceRisk=a.source_risk,
                safeShareRemaining=a.safe_share_remaining,
                explanation=a.explanation,
            )
            for a in result.allocations
        ],
        solverRuntimeMs=result.solver_runtime_ms,
        objectiveValue=result.objective_value,
        explanation=result.explanation,
    )


# ---------------------------------------------------------------------------
# Run
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("ML_PORT", 8001))
    uvicorn.run(app, host="0.0.0.0", port=port)
