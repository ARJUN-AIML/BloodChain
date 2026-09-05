"""
BloodChain AI — Feature Engineering Pipeline
=============================================
Builds lag features, rolling statistics, calendar features, and encodes
categoricals for the demand forecasting models.

CRITICAL: All features are constructed from information available at
prediction time. No future data leakage.
"""

import pandas as pd
import numpy as np
from typing import List, Optional, Tuple


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

BLOOD_GROUPS = [
    "A_POSITIVE", "A_NEGATIVE", "B_POSITIVE", "B_NEGATIVE",
    "AB_POSITIVE", "AB_NEGATIVE", "O_POSITIVE", "O_NEGATIVE",
]

COMPONENTS = ["RBC", "PLASMA", "PLATELETS", "WHOLE_BLOOD"]

LAG_DAYS = [1, 2, 3, 7, 14, 21, 28]

ROLLING_WINDOWS = [3, 7, 14, 28]

TARGET_COL = "units_used"

SEGMENT_COLS = ["organization_id", "blood_group", "component_type"]

CALENDAR_FEATURES = [
    "day_of_week", "day_of_month", "week_of_year",
    "month", "quarter", "is_weekend", "is_holiday",
]

CONTEXT_FEATURES = [
    "scheduled_surgeries", "hospital_admissions", "icu_admissions",
    "emergency_department_visits", "trauma_cases",
    "recent_emergency_count_7d", "regional_emergency_index",
    "special_event_flag", "outbreak_flag",
    "population_served", "temperature_c", "rainfall_mm",
]

CATEGORICAL_FEATURES = ["organization_id", "blood_group", "component_type", "region"]


def validate_schema(df: pd.DataFrame) -> None:
    """Validate required columns exist."""
    required = (
        ["date"] + SEGMENT_COLS + [TARGET_COL]
        + CALENDAR_FEATURES + CONTEXT_FEATURES + ["region"]
    )
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"Missing columns in dataset: {missing}")


def load_and_prepare(filepath: str) -> pd.DataFrame:
    """Load CSV, parse dates, sort, validate."""
    df = pd.read_csv(filepath)
    validate_schema(df)
    df["date"] = pd.to_datetime(df["date"])
    df = df.sort_values(SEGMENT_COLS + ["date"]).reset_index(drop=True)
    return df


def add_lag_features(df: pd.DataFrame) -> pd.DataFrame:
    """Add lagged target values per segment. Uses only past data."""
    for lag in LAG_DAYS:
        df[f"lag_{lag}"] = df.groupby(SEGMENT_COLS)[TARGET_COL].shift(lag)
    return df


def add_rolling_features(df: pd.DataFrame) -> pd.DataFrame:
    """Add rolling statistics. Window is applied to LAGGED values to prevent leakage."""
    grouped = df.groupby(SEGMENT_COLS)[TARGET_COL]

    for w in ROLLING_WINDOWS:
        # shift(1) ensures we don't include the current day
        shifted = grouped.shift(1)
        rolling = shifted.rolling(window=w, min_periods=max(1, w // 2))

        df[f"rolling_mean_{w}"] = grouped.transform(
            lambda x: x.shift(1).rolling(w, min_periods=max(1, w // 2)).mean()
        )
        df[f"rolling_std_{w}"] = grouped.transform(
            lambda x: x.shift(1).rolling(w, min_periods=max(1, w // 2)).std()
        )

    # Min/max for 7-day window
    df["rolling_min_7"] = df.groupby(SEGMENT_COLS)[TARGET_COL].transform(
        lambda x: x.shift(1).rolling(7, min_periods=3).min()
    )
    df["rolling_max_7"] = df.groupby(SEGMENT_COLS)[TARGET_COL].transform(
        lambda x: x.shift(1).rolling(7, min_periods=3).max()
    )

    # Slope (linear regression coefficient over window)
    for w in [7, 14]:
        df[f"rolling_slope_{w}"] = df.groupby(SEGMENT_COLS)[TARGET_COL].transform(
            lambda x: _rolling_slope(x.shift(1), w)
        )

    return df


def _rolling_slope(series: pd.Series, window: int) -> pd.Series:
    """Compute rolling slope using OLS on the rolling window."""
    def slope_func(vals):
        if len(vals) < 3 or vals.isna().sum() > len(vals) // 2:
            return np.nan
        y = vals.dropna().values
        x = np.arange(len(y))
        if len(y) < 2:
            return 0.0
        try:
            coeffs = np.polyfit(x, y, 1)
            return coeffs[0]
        except Exception:
            return 0.0

    return series.rolling(window, min_periods=max(3, window // 2)).apply(
        slope_func, raw=False
    )


def encode_categoricals(
    df: pd.DataFrame,
    fit: bool = True,
    encoders: Optional[dict] = None,
) -> Tuple[pd.DataFrame, dict]:
    """
    Encode categorical features for tree-based models.
    Uses label encoding (safe for XGBoost / tree models).
    """
    if encoders is None:
        encoders = {}

    for col in CATEGORICAL_FEATURES:
        if col not in df.columns:
            continue
        if fit:
            categories = sorted(df[col].unique())
            mapping = {v: i for i, v in enumerate(categories)}
            encoders[col] = mapping
        else:
            mapping = encoders.get(col, {})

        df[f"{col}_encoded"] = df[col].map(mapping).fillna(-1).astype(int)

    return df, encoders


def get_feature_columns(include_encoded: bool = True) -> List[str]:
    """Return the list of feature columns for model training."""
    features = []

    # Lag features
    features += [f"lag_{d}" for d in LAG_DAYS]

    # Rolling features
    for w in ROLLING_WINDOWS:
        features += [f"rolling_mean_{w}", f"rolling_std_{w}"]
    features += ["rolling_min_7", "rolling_max_7"]
    features += [f"rolling_slope_{w}" for w in [7, 14]]

    # Calendar features
    features += CALENDAR_FEATURES

    # Context features
    features += CONTEXT_FEATURES

    # Categorical encoded
    if include_encoded:
        features += [f"{c}_encoded" for c in CATEGORICAL_FEATURES]

    return features


def build_features(
    df: pd.DataFrame,
    fit_encoders: bool = True,
    encoders: Optional[dict] = None,
) -> Tuple[pd.DataFrame, dict]:
    """Full feature engineering pipeline."""
    df = add_lag_features(df)
    df = add_rolling_features(df)
    df, encoders = encode_categoricals(df, fit=fit_encoders, encoders=encoders)
    return df, encoders


def time_series_split(
    df: pd.DataFrame,
    train_frac: float = 0.70,
    val_frac: float = 0.15,
) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """
    Split by time order. No random splitting.
    train: first train_frac
    val:   next val_frac
    test:  remainder
    """
    dates = sorted(df["date"].unique())
    n = len(dates)
    train_end = dates[int(n * train_frac)]
    val_end = dates[int(n * (train_frac + val_frac))]

    train = df[df["date"] < train_end].copy()
    val = df[(df["date"] >= train_end) & (df["date"] < val_end)].copy()
    test = df[df["date"] >= val_end].copy()

    return train, val, test


def walk_forward_splits(
    df: pd.DataFrame,
    initial_train_months: int = 12,
    step_months: int = 1,
    val_months: int = 1,
    max_folds: int = 6,
) -> List[Tuple[pd.DataFrame, pd.DataFrame]]:
    """
    Walk-forward validation splits.
    
    Fold 1: train months 1-12, validate month 13
    Fold 2: train months 1-13, validate month 14
    ...
    """
    df = df.copy()
    df["year_month"] = df["date"].dt.to_period("M")
    months = sorted(df["year_month"].unique())

    folds = []
    for i in range(max_folds):
        train_end_idx = initial_train_months + i * step_months
        val_end_idx = train_end_idx + val_months

        if val_end_idx > len(months):
            break

        train_months = months[:train_end_idx]
        val_months_set = months[train_end_idx:val_end_idx]

        train = df[df["year_month"].isin(train_months)].copy()
        val = df[df["year_month"].isin(val_months_set)].copy()

        if len(train) > 0 and len(val) > 0:
            folds.append((train, val))

    return folds
