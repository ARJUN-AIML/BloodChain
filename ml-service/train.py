#!/usr/bin/env python3
"""
BloodChain AI — Model Training Pipeline
=========================================
Trains and evaluates Seasonal Naive, Holt-Winters, and XGBoost models.
Selects best model per segment. Saves artifacts and metrics.

Usage:
    python ml-service/train.py [--data datasets/synthetic/blood_demand_history.csv]
"""

import argparse
import json
import os
import sys
import time
from datetime import datetime
from pathlib import Path

import numpy as np
import pandas as pd

# Add project root to path
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, PROJECT_ROOT)
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from preprocessing.features import (
    load_and_prepare,
    build_features,
    get_feature_columns,
    time_series_split,
    walk_forward_splits,
    SEGMENT_COLS,
    TARGET_COL,
)
from forecasting.models import (
    SeasonalNaive,
    HoltWintersModel,
    XGBoostModel,
    compute_metrics,
)

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

DEFAULT_DATA = os.path.join(PROJECT_ROOT, "datasets", "synthetic", "blood_demand_history.csv")
ARTIFACTS_DIR = os.path.join(PROJECT_ROOT, "model-artifacts")
FORECAST_DIR = os.path.join(ARTIFACTS_DIR, "forecasting")
METADATA_DIR = os.path.join(ARTIFACTS_DIR, "metadata")


def ensure_dirs():
    for d in [FORECAST_DIR, METADATA_DIR]:
        os.makedirs(d, exist_ok=True)


# ---------------------------------------------------------------------------
# Main Training
# ---------------------------------------------------------------------------

def train_pipeline(data_path: str):
    ensure_dirs()

    print("=" * 70)
    print("BloodChain AI — Model Training Pipeline")
    print("=" * 70)
    print(f"Dataset: {data_path}")
    print(f"Started: {datetime.now().isoformat()}")
    print()

    # -----------------------------------------------------------------------
    # 1. Load & Validate
    # -----------------------------------------------------------------------
    print("[1/8] Loading and validating dataset...")
    df = load_and_prepare(data_path)
    print(f"       Rows: {len(df):,}")
    print(f"       Date range: {df['date'].min().date()} → {df['date'].max().date()}")
    print(f"       Organizations: {df['organization_id'].nunique()}")
    print(f"       Blood groups: {df['blood_group'].nunique()}")
    print(f"       Components: {df['component_type'].nunique()}")
    print()

    # -----------------------------------------------------------------------
    # 2. Feature Engineering
    # -----------------------------------------------------------------------
    print("[2/8] Building features...")
    t0 = time.time()
    df, encoders = build_features(df, fit_encoders=True)
    feature_cols = get_feature_columns(include_encoded=True)
    actual_features = [c for c in feature_cols if c in df.columns]
    print(f"       Features: {len(actual_features)}")
    print(f"       Time: {time.time()-t0:.1f}s")
    print()

    # -----------------------------------------------------------------------
    # 3. Time-order split
    # -----------------------------------------------------------------------
    print("[3/8] Splitting data (time-ordered)...")
    train_df, val_df, test_df = time_series_split(df, train_frac=0.70, val_frac=0.15)

    # Drop rows with NaN in essential lag features (cold start)
    essential_lags = ["lag_1", "lag_7"]
    train_clean = train_df.dropna(subset=essential_lags).copy()
    val_clean = val_df.dropna(subset=essential_lags).copy()
    test_clean = test_df.dropna(subset=essential_lags).copy()

    print(f"       Train: {len(train_clean):,} rows ({train_df['date'].min().date()} → {train_df['date'].max().date()})")
    print(f"       Val:   {len(val_clean):,} rows ({val_df['date'].min().date()} → {val_df['date'].max().date()})")
    print(f"       Test:  {len(test_clean):,} rows ({test_df['date'].min().date()} → {test_df['date'].max().date()})")
    print()

    # -----------------------------------------------------------------------
    # 4. Train Seasonal Naive
    # -----------------------------------------------------------------------
    print("[4/8] Training Seasonal Naive (baseline)...")
    naive = SeasonalNaive(season_length=7)
    naive.fit(train_clean)

    naive_val_preds = naive.predict(val_clean)
    naive_test_preds = naive.predict(test_clean)

    naive_val_metrics = compute_metrics(val_clean[TARGET_COL].values, naive_val_preds)
    naive_test_metrics = compute_metrics(test_clean[TARGET_COL].values, naive_test_preds)

    print(f"       Val  — MAE: {naive_val_metrics['mae']:.3f}, WAPE: {naive_val_metrics['wape']:.4f}, RMSE: {naive_val_metrics['rmse']:.3f}")
    print(f"       Test — MAE: {naive_test_metrics['mae']:.3f}, WAPE: {naive_test_metrics['wape']:.4f}, RMSE: {naive_test_metrics['rmse']:.3f}")
    print()

    # -----------------------------------------------------------------------
    # 5. Train Holt-Winters
    # -----------------------------------------------------------------------
    print("[5/8] Training Holt-Winters (this may take a while)...")
    t0 = time.time()
    hw = HoltWintersModel(seasonal_periods=7, seasonal="add")

    # For efficiency, sample representative segments for HW
    # HW is per-segment, training all 224 segments is slow
    hw.fit(train_clean)
    hw_time = time.time() - t0

    hw_val_preds = hw.predict(val_clean)
    hw_test_preds = hw.predict(test_clean)

    hw_val_metrics = compute_metrics(val_clean[TARGET_COL].values, hw_val_preds)
    hw_test_metrics = compute_metrics(test_clean[TARGET_COL].values, hw_test_preds)

    print(f"       Time: {hw_time:.1f}s")
    print(f"       Val  — MAE: {hw_val_metrics['mae']:.3f}, WAPE: {hw_val_metrics['wape']:.4f}, RMSE: {hw_val_metrics['rmse']:.3f}")
    print(f"       Test — MAE: {hw_test_metrics['mae']:.3f}, WAPE: {hw_test_metrics['wape']:.4f}, RMSE: {hw_test_metrics['rmse']:.3f}")
    print()

    # -----------------------------------------------------------------------
    # 6. Train XGBoost
    # -----------------------------------------------------------------------
    print("[6/8] Training XGBoost / Tree model...")
    t0 = time.time()

    xgb_model = XGBoostModel(feature_columns=actual_features)
    xgb_model.fit(train_clean, val_df=val_clean)
    xgb_time = time.time() - t0

    xgb_val_preds = xgb_model.predict(val_clean)
    xgb_test_preds = xgb_model.predict(test_clean)

    xgb_val_metrics = compute_metrics(val_clean[TARGET_COL].values, xgb_val_preds)
    xgb_test_metrics = compute_metrics(test_clean[TARGET_COL].values, xgb_test_preds)

    _, xgb_lower, xgb_upper = xgb_model.predict_with_intervals(test_clean)

    print(f"       Model: {xgb_model.name}")
    print(f"       Time: {xgb_time:.1f}s")
    print(f"       Val  — MAE: {xgb_val_metrics['mae']:.3f}, WAPE: {xgb_val_metrics['wape']:.4f}, RMSE: {xgb_val_metrics['rmse']:.3f}")
    print(f"       Test — MAE: {xgb_test_metrics['mae']:.3f}, WAPE: {xgb_test_metrics['wape']:.4f}, RMSE: {xgb_test_metrics['rmse']:.3f}")
    print(f"       Prediction interval: [{xgb_model.residual_q05:.2f}, {xgb_model.residual_q95:.2f}]")
    print()

    # -----------------------------------------------------------------------
    # 7. Model Selection & Registry
    # -----------------------------------------------------------------------
    print("[7/8] Model selection...")

    all_results = {
        "seasonal_naive": {"val": naive_val_metrics, "test": naive_test_metrics},
        "holt_winters": {"val": hw_val_metrics, "test": hw_test_metrics},
        xgb_model.name: {"val": xgb_val_metrics, "test": xgb_test_metrics},
    }

    # Global winner (by validation WAPE)
    model_scores = {
        "seasonal_naive": naive_val_metrics["wape"],
        "holt_winters": hw_val_metrics["wape"],
        xgb_model.name: xgb_val_metrics["wape"],
    }
    global_winner = min(model_scores, key=model_scores.get)
    print(f"       Global winner (by val WAPE): {global_winner}")
    print(f"       Scores: {json.dumps(model_scores, indent=8)}")

    # Per-segment selection: evaluate each model per segment on validation
    registry = {}
    segment_metrics = []

    segments = val_clean.groupby(SEGMENT_COLS)
    for key, group in segments:
        org_id, bg, comp = key
        seg_key = f"{org_id}|{bg}|{comp}"

        y_actual = group[TARGET_COL].values

        # Seasonal Naive
        sn_preds = naive.predict(group)
        sn_m = compute_metrics(y_actual, sn_preds)

        # XGBoost
        xgb_preds = xgb_model.predict(group)
        xgb_m = compute_metrics(y_actual, xgb_preds)

        # Pick best
        candidates = {
            "seasonal_naive": sn_m["wape"] if not np.isnan(sn_m["wape"]) else 999,
            xgb_model.name: xgb_m["wape"] if not np.isnan(xgb_m["wape"]) else 999,
        }
        winner = min(candidates, key=candidates.get)

        registry[seg_key] = {
            "model": winner,
            "version": "v1",
            "val_wape": round(candidates[winner], 4),
        }

        for model_name, metrics in [(f"seasonal_naive", sn_m), (xgb_model.name, xgb_m)]:
            segment_metrics.append({
                "model_name": model_name,
                "model_version": "v1",
                "organization_id": org_id,
                "blood_group": bg,
                "component_type": comp,
                "forecast_horizon": "24h",
                "mae": metrics["mae"],
                "rmse": metrics["rmse"],
                "wape": metrics["wape"],
                "bias": metrics["bias"],
                "trained_at": datetime.now().isoformat(),
            })

    xgb_wins = sum(1 for v in registry.values() if v["model"] == xgb_model.name)
    naive_wins = sum(1 for v in registry.values() if v["model"] == "seasonal_naive")
    print(f"       Per-segment: {xgb_model.name} wins {xgb_wins}, seasonal_naive wins {naive_wins}")
    print()

    # -----------------------------------------------------------------------
    # 8. Save Artifacts
    # -----------------------------------------------------------------------
    print("[8/8] Saving artifacts...")

    # Save XGBoost model
    model_path = xgb_model.save(FORECAST_DIR, prefix="xgboost_global")
    print(f"       Model saved: {model_path}")

    # Save encoders
    import joblib
    enc_path = os.path.join(FORECAST_DIR, "preprocessor_v1.joblib")
    joblib.dump({"encoders": encoders, "feature_columns": actual_features}, enc_path)
    print(f"       Preprocessor saved: {enc_path}")

    # Save model metrics JSON
    metrics_json = {
        "training_date": datetime.now().isoformat(),
        "dataset": os.path.basename(data_path),
        "dataset_rows": len(df),
        "date_range": f"{df['date'].min().date()} → {df['date'].max().date()}",
        "train_rows": len(train_clean),
        "val_rows": len(val_clean),
        "test_rows": len(test_clean),
        "global_winner": global_winner,
        "models": all_results,
        "prediction_intervals": {
            "method": "empirical_residuals",
            "residual_q05": xgb_model.residual_q05,
            "residual_q95": xgb_model.residual_q95,
            "note": "Empirical prediction intervals for prototype use.",
        },
    }
    metrics_path = os.path.join(METADATA_DIR, "model_metrics.json")
    with open(metrics_path, "w") as f:
        json.dump(metrics_json, f, indent=2)
    print(f"       Metrics saved: {metrics_path}")

    # Save segment metrics CSV
    metrics_df = pd.DataFrame(segment_metrics)
    metrics_csv_path = os.path.join(METADATA_DIR, "model_metrics.csv")
    metrics_df.to_csv(metrics_csv_path, index=False)
    print(f"       Metrics CSV saved: {metrics_csv_path}")

    # Save model registry
    registry_path = os.path.join(METADATA_DIR, "model_registry.json")
    with open(registry_path, "w") as f:
        json.dump(registry, f, indent=2)
    print(f"       Registry saved: {registry_path}")

    print()
    print("=" * 70)
    print("✅ Training pipeline completed successfully!")
    print(f"   Global best model: {global_winner}")
    print(f"   Artifacts: {ARTIFACTS_DIR}")
    print("=" * 70)

    return all_results, registry


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train BloodChain forecasting models")
    parser.add_argument("--data", default=DEFAULT_DATA, help="Path to training CSV")
    args = parser.parse_args()
    train_pipeline(args.data)
