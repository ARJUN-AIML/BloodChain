"""
BloodChain AI — Forecasting Models
====================================
Implements Seasonal Naive, Holt-Winters, and XGBoost forecasting models.

Model selection follows proper time-series methodology:
- Time-ordered splits (no random splitting)
- Walk-forward validation
- Per-segment model selection
"""

import json
import os
import warnings
from abc import ABC, abstractmethod
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error, mean_squared_error

warnings.filterwarnings("ignore", category=FutureWarning)
warnings.filterwarnings("ignore", category=UserWarning)

# Try to import XGBoost, fall back to HistGradientBoosting
try:
    import xgboost as xgb
    HAS_XGBOOST = True
except ImportError:
    HAS_XGBOOST = False

from sklearn.ensemble import HistGradientBoostingRegressor

try:
    from statsmodels.tsa.holtwinters import ExponentialSmoothing
    HAS_STATSMODELS = True
except ImportError:
    HAS_STATSMODELS = False


# ---------------------------------------------------------------------------
# Metrics
# ---------------------------------------------------------------------------

def compute_metrics(actual: np.ndarray, predicted: np.ndarray) -> Dict[str, float]:
    """Compute evaluation metrics."""
    actual = np.array(actual, dtype=float)
    predicted = np.array(predicted, dtype=float)

    mask = ~(np.isnan(actual) | np.isnan(predicted))
    actual = actual[mask]
    predicted = predicted[mask]

    if len(actual) == 0:
        return {"mae": np.nan, "rmse": np.nan, "wape": np.nan, "bias": np.nan}

    mae = float(mean_absolute_error(actual, predicted))
    rmse = float(np.sqrt(mean_squared_error(actual, predicted)))

    total_actual = np.sum(np.abs(actual))
    wape = float(np.sum(np.abs(actual - predicted)) / max(total_actual, 1e-8))

    bias = float(np.mean(predicted - actual))

    return {"mae": round(mae, 4), "rmse": round(rmse, 4), "wape": round(wape, 4), "bias": round(bias, 4)}


# ---------------------------------------------------------------------------
# Base Model
# ---------------------------------------------------------------------------

class ForecastModel(ABC):
    """Base class for all forecasting models."""

    name: str = "base"
    version: str = "v1"

    @abstractmethod
    def fit(self, train_df: pd.DataFrame, val_df: Optional[pd.DataFrame] = None, **kwargs):
        pass

    @abstractmethod
    def predict(self, df: pd.DataFrame) -> np.ndarray:
        pass

    def evaluate(self, actual: np.ndarray, predicted: np.ndarray) -> Dict[str, float]:
        return compute_metrics(actual, predicted)


# ---------------------------------------------------------------------------
# Model 1: Seasonal Naive
# ---------------------------------------------------------------------------

class SeasonalNaive(ForecastModel):
    """
    Seasonal Naive: prediction[t] = actual[t - 7]
    Mandatory baseline model.
    """

    name = "seasonal_naive"
    version = "v1"

    def __init__(self, season_length: int = 7):
        self.season_length = season_length

    def fit(self, train_df: pd.DataFrame, val_df=None, **kwargs):
        """No training needed for seasonal naive."""
        pass

    def predict(self, df: pd.DataFrame) -> np.ndarray:
        """Use lag_7 as the prediction."""
        if f"lag_{self.season_length}" in df.columns:
            preds = df[f"lag_{self.season_length}"].fillna(0).values
        else:
            preds = np.zeros(len(df))
        return np.maximum(0, preds)


# ---------------------------------------------------------------------------
# Model 2: Holt-Winters Exponential Smoothing
# ---------------------------------------------------------------------------

class HoltWintersModel(ForecastModel):
    """
    Holt-Winters with additive or multiplicative seasonality.
    Trained per segment (organization × blood_group × component_type).
    """

    name = "holt_winters"
    version = "v1"

    def __init__(self, seasonal_periods: int = 7, seasonal: str = "add"):
        self.seasonal_periods = seasonal_periods
        self.seasonal = seasonal
        self.models: Dict[str, Any] = {}
        self.fallback_values: Dict[str, float] = {}

    def fit(self, train_df: pd.DataFrame, val_df=None, **kwargs):
        if not HAS_STATSMODELS:
            print("  ⚠ statsmodels not available, Holt-Winters will use fallback")
            return

        segments = train_df.groupby(["organization_id", "blood_group", "component_type"])

        for key, group in segments:
            seg_key = "|".join(str(k) for k in key)
            ts = group.sort_values("date").set_index("date")["units_used"]

            # Need enough data points
            if len(ts) < self.seasonal_periods * 2 + 1:
                self.fallback_values[seg_key] = float(ts.mean()) if len(ts) > 0 else 0
                continue

            # Ensure positive values for multiplicative
            ts_clean = ts.clip(lower=0.1)

            try:
                model = ExponentialSmoothing(
                    ts_clean,
                    trend="add",
                    seasonal=self.seasonal,
                    seasonal_periods=self.seasonal_periods,
                    initialization_method="estimated",
                ).fit(optimized=True, use_brute=False)
                self.models[seg_key] = model
                self.fallback_values[seg_key] = float(ts.mean())
            except Exception:
                self.fallback_values[seg_key] = float(ts.mean()) if len(ts) > 0 else 0

    def predict(self, df: pd.DataFrame) -> np.ndarray:
        predictions = np.zeros(len(df))

        if not HAS_STATSMODELS:
            # Fallback: use lag_7
            if "lag_7" in df.columns:
                return np.maximum(0, df["lag_7"].fillna(0).values)
            return predictions

        for idx, row in df.iterrows():
            seg_key = f"{row['organization_id']}|{row['blood_group']}|{row['component_type']}"
            if seg_key in self.models:
                try:
                    model = self.models[seg_key]
                    # Forecast 1 step ahead
                    pred = model.forecast(1).values[0]
                    predictions[df.index.get_loc(idx)] = max(0, pred)
                except Exception:
                    predictions[df.index.get_loc(idx)] = self.fallback_values.get(seg_key, 0)
            else:
                predictions[df.index.get_loc(idx)] = self.fallback_values.get(seg_key, 0)

        return np.maximum(0, predictions)


# ---------------------------------------------------------------------------
# Model 3: XGBoost (or HistGradientBoosting fallback)
# ---------------------------------------------------------------------------

class XGBoostModel(ForecastModel):
    """
    XGBoost Regressor using engineered lag/context features.
    Falls back to HistGradientBoostingRegressor if XGBoost unavailable.
    """

    name = "xgboost" if HAS_XGBOOST else "hist_gradient_boosting"
    version = "v1"

    def __init__(self, feature_columns: List[str], params: Optional[Dict] = None):
        self.feature_columns = feature_columns
        self.model = None
        self.params = params or {}
        self.residuals: Optional[np.ndarray] = None
        self.residual_q05: float = 0
        self.residual_q95: float = 0

    def fit(self, train_df: pd.DataFrame, val_df: Optional[pd.DataFrame] = None, **kwargs):
        X_train = train_df[self.feature_columns].copy()
        y_train = train_df["units_used"].values

        # Handle NaN in features
        X_train = X_train.fillna(-999)

        if HAS_XGBOOST:
            default_params = {
                "n_estimators": 500,
                "max_depth": 6,
                "learning_rate": 0.05,
                "subsample": 0.8,
                "colsample_bytree": 0.8,
                "min_child_weight": 5,
                "reg_alpha": 0.1,
                "reg_lambda": 1.0,
                "random_state": 42,
                "n_jobs": -1,
            }
            default_params.update(self.params)

            self.model = xgb.XGBRegressor(**default_params)

            if val_df is not None:
                X_val = val_df[self.feature_columns].fillna(-999)
                y_val = val_df["units_used"].values
                self.model.fit(
                    X_train, y_train,
                    eval_set=[(X_val, y_val)],
                    verbose=False,
                )
            else:
                self.model.fit(X_train, y_train)
        else:
            default_params = {
                "max_iter": 500,
                "max_depth": 6,
                "learning_rate": 0.05,
                "min_samples_leaf": 10,
                "random_state": 42,
            }
            default_params.update(self.params)
            self.model = HistGradientBoostingRegressor(**default_params)
            self.model.fit(X_train, y_train)

        # Compute residuals on validation set for prediction intervals
        if val_df is not None:
            X_val = val_df[self.feature_columns].fillna(-999)
            y_val = val_df["units_used"].values
            preds = self.model.predict(X_val)
            self.residuals = y_val - preds
            self.residual_q05 = float(np.percentile(self.residuals, 5))
            self.residual_q95 = float(np.percentile(self.residuals, 95))

    def predict(self, df: pd.DataFrame) -> np.ndarray:
        if self.model is None:
            raise RuntimeError("Model not fitted")
        X = df[self.feature_columns].fillna(-999)
        preds = self.model.predict(X)
        return np.maximum(0, preds)

    def predict_with_intervals(self, df: pd.DataFrame) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """Return (predicted, lower_bound, upper_bound)."""
        preds = self.predict(df)
        lower = np.maximum(0, preds + self.residual_q05)
        upper = np.maximum(lower, preds + self.residual_q95)
        return preds, lower, upper

    def save(self, dirpath: str, prefix: str = "xgboost_global"):
        """Save model and metadata."""
        os.makedirs(dirpath, exist_ok=True)

        if HAS_XGBOOST and self.model is not None:
            model_path = os.path.join(dirpath, f"{prefix}_{self.version}.json")
            self.model.save_model(model_path)
        else:
            model_path = os.path.join(dirpath, f"{prefix}_{self.version}.joblib")
            joblib.dump(self.model, model_path)

        # Save metadata
        meta = {
            "model_name": self.name,
            "version": self.version,
            "feature_columns": self.feature_columns,
            "residual_q05": self.residual_q05,
            "residual_q95": self.residual_q95,
            "saved_at": datetime.now().isoformat(),
            "model_file": os.path.basename(model_path),
        }
        meta_path = os.path.join(dirpath, f"{prefix}_{self.version}_meta.json")
        with open(meta_path, "w") as f:
            json.dump(meta, f, indent=2)

        return model_path

    def load(self, dirpath: str, prefix: str = "xgboost_global"):
        """Load model and metadata."""
        meta_path = os.path.join(dirpath, f"{prefix}_{self.version}_meta.json")
        with open(meta_path) as f:
            meta = json.load(f)

        self.feature_columns = meta["feature_columns"]
        self.residual_q05 = meta.get("residual_q05", 0)
        self.residual_q95 = meta.get("residual_q95", 0)

        model_file = meta["model_file"]
        model_path = os.path.join(dirpath, model_file)

        if model_file.endswith(".json") and HAS_XGBOOST:
            self.model = xgb.XGBRegressor()
            self.model.load_model(model_path)
        else:
            self.model = joblib.load(model_path)
