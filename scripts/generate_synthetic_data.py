#!/usr/bin/env python3
"""
BloodChain AI — Synthetic Data Generator
=========================================
Generates realistic but clearly synthetic datasets for the BloodChain AI
blood-supply orchestration platform.

All data is synthetic and generated for demonstration / hackathon purposes only.
No real patient, donor, or clinical data is included.

Usage:
    python scripts/generate_synthetic_data.py [--seed 42] [--output datasets/synthetic]
"""

import argparse
import csv
import json
import math
import os
import random
import uuid
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

SEED = 42
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "datasets", "synthetic")

# Date range: ~3 years of daily data
START_DATE = datetime(2022, 1, 1)
END_DATE = datetime(2024, 12, 31)

BLOOD_GROUPS = [
    "A_POSITIVE", "A_NEGATIVE",
    "B_POSITIVE", "B_NEGATIVE",
    "AB_POSITIVE", "AB_NEGATIVE",
    "O_POSITIVE", "O_NEGATIVE",
]

COMPONENTS = ["RBC", "PLASMA", "PLATELETS", "WHOLE_BLOOD"]

REGIONS = ["North", "South", "East", "West", "Central"]

# Blood group population frequency (approximate)
BG_FREQ = {
    "O_POSITIVE": 0.37, "O_NEGATIVE": 0.07,
    "A_POSITIVE": 0.28, "A_NEGATIVE": 0.06,
    "B_POSITIVE": 0.13, "B_NEGATIVE": 0.03,
    "AB_POSITIVE": 0.04, "AB_NEGATIVE": 0.02,
}

# Component demand ratios (RBC most common)
COMP_FACTOR = {
    "RBC": 1.0,
    "PLASMA": 0.55,
    "PLATELETS": 0.40,
    "WHOLE_BLOOD": 0.25,
}

# ---------------------------------------------------------------------------
# Facilities
# ---------------------------------------------------------------------------

FACILITIES: List[Dict[str, Any]] = [
    {
        "organization_id": "HOSP_A",
        "organization_name": "Metro General Hospital",
        "organization_type": "HOSPITAL",
        "region": "Central",
        "city": "Metropolis",
        "latitude": 28.6139,
        "longitude": 77.2090,
        "population_served": 850000,
        "bed_capacity": 1200,
        "icu_beds": 80,
        "emergency_capacity": 120,
        "is_active": True,
        "base_daily_demand": 32,
    },
    {
        "organization_id": "HOSP_B",
        "organization_name": "City Care Hospital",
        "organization_type": "HOSPITAL",
        "region": "North",
        "city": "Northville",
        "latitude": 28.7041,
        "longitude": 77.1025,
        "population_served": 550000,
        "bed_capacity": 800,
        "icu_beds": 50,
        "emergency_capacity": 80,
        "is_active": True,
        "base_daily_demand": 22,
    },
    {
        "organization_id": "HOSP_C",
        "organization_name": "Sunrise Medical Center",
        "organization_type": "HOSPITAL",
        "region": "East",
        "city": "Eastport",
        "latitude": 28.5355,
        "longitude": 77.3910,
        "population_served": 420000,
        "bed_capacity": 600,
        "icu_beds": 35,
        "emergency_capacity": 60,
        "is_active": True,
        "base_daily_demand": 18,
    },
    {
        "organization_id": "HOSP_D",
        "organization_name": "Heritage Multispecialty Hospital",
        "organization_type": "HOSPITAL",
        "region": "South",
        "city": "Southtown",
        "latitude": 28.4595,
        "longitude": 77.0266,
        "population_served": 380000,
        "bed_capacity": 500,
        "icu_beds": 30,
        "emergency_capacity": 50,
        "is_active": True,
        "base_daily_demand": 15,
    },
    {
        "organization_id": "HOSP_E",
        "organization_name": "Valley Children's Hospital",
        "organization_type": "HOSPITAL",
        "region": "West",
        "city": "Westfield",
        "latitude": 28.6304,
        "longitude": 77.0819,
        "population_served": 290000,
        "bed_capacity": 350,
        "icu_beds": 25,
        "emergency_capacity": 40,
        "is_active": True,
        "base_daily_demand": 12,
    },
    {
        "organization_id": "BB_A",
        "organization_name": "Regional Blood Center Alpha",
        "organization_type": "BLOOD_BANK",
        "region": "Central",
        "city": "Metropolis",
        "latitude": 28.6280,
        "longitude": 77.2200,
        "population_served": 1500000,
        "bed_capacity": 0,
        "icu_beds": 0,
        "emergency_capacity": 0,
        "is_active": True,
        "base_daily_demand": 45,
    },
    {
        "organization_id": "BB_B",
        "organization_name": "Northern Blood Bank",
        "organization_type": "BLOOD_BANK",
        "region": "North",
        "city": "Northville",
        "latitude": 28.7200,
        "longitude": 77.1100,
        "population_served": 900000,
        "bed_capacity": 0,
        "icu_beds": 0,
        "emergency_capacity": 0,
        "is_active": True,
        "base_daily_demand": 30,
    },
    {
        "organization_id": "LOG_A",
        "organization_name": "BloodRun Logistics",
        "organization_type": "LOGISTICS",
        "region": "Central",
        "city": "Metropolis",
        "latitude": 28.6100,
        "longitude": 77.2300,
        "population_served": 0,
        "bed_capacity": 0,
        "icu_beds": 0,
        "emergency_capacity": 0,
        "is_active": True,
        "base_daily_demand": 0,
    },
    {
        "organization_id": "ADMIN_A",
        "organization_name": "Regional Blood Authority",
        "organization_type": "REGIONAL_ADMIN",
        "region": "Central",
        "city": "Metropolis",
        "latitude": 28.6200,
        "longitude": 77.2100,
        "population_served": 3400000,
        "bed_capacity": 0,
        "icu_beds": 0,
        "emergency_capacity": 0,
        "is_active": True,
        "base_daily_demand": 0,
    },
]

# Only facilities that consume/hold blood
DEMAND_FACILITIES = [f for f in FACILITIES if f["base_daily_demand"] > 0]

# ---------------------------------------------------------------------------
# Holidays / events
# ---------------------------------------------------------------------------

def generate_holidays_events(rng: random.Random) -> List[Dict[str, Any]]:
    """Generate holidays and events for the entire date range."""
    events = []

    # Fixed holidays each year
    fixed_holidays = [
        ("01-01", "New Year's Day", "HOLIDAY", 0.3),
        ("01-26", "Republic Day", "HOLIDAY", 0.4),
        ("03-08", "International Women's Day", "AWARENESS", 0.1),
        ("06-14", "World Blood Donor Day", "AWARENESS", 0.5),
        ("08-15", "Independence Day", "HOLIDAY", 0.5),
        ("10-02", "Gandhi Jayanti", "HOLIDAY", 0.3),
        ("11-14", "Children's Day", "AWARENESS", 0.1),
        ("12-25", "Christmas", "HOLIDAY", 0.4),
        ("12-31", "New Year's Eve", "HOLIDAY", 0.2),
    ]

    for year in range(START_DATE.year, END_DATE.year + 1):
        for md, name, etype, weight in fixed_holidays:
            month, day = map(int, md.split("-"))
            events.append({
                "date": datetime(year, month, day).strftime("%Y-%m-%d"),
                "region": "ALL",
                "event_name": name,
                "event_type": etype,
                "impact_weight": weight,
            })

        # Approximate variable holidays (Diwali, Holi, Eid)
        diwali_dates = {2022: "10-24", 2023: "11-12", 2024: "11-01"}
        holi_dates   = {2022: "03-18", 2023: "03-08", 2024: "03-25"}

        if year in diwali_dates:
            m, d = map(int, diwali_dates[year].split("-"))
            events.append({"date": datetime(year, m, d).strftime("%Y-%m-%d"),
                           "region": "ALL", "event_name": "Diwali (Synthetic)",
                           "event_type": "FESTIVAL", "impact_weight": 0.7})
        if year in holi_dates:
            m, d = map(int, holi_dates[year].split("-"))
            events.append({"date": datetime(year, m, d).strftime("%Y-%m-%d"),
                           "region": "ALL", "event_name": "Holi (Synthetic)",
                           "event_type": "FESTIVAL", "impact_weight": 0.5})

        # Random regional events (mass gatherings, simulated emergencies)
        for _ in range(rng.randint(4, 8)):
            day_offset = rng.randint(0, 364)
            event_date = datetime(year, 1, 1) + timedelta(days=day_offset)
            if event_date > END_DATE:
                continue
            region = rng.choice(REGIONS)
            etype = rng.choice(["MASS_GATHERING", "EMERGENCY_SIM", "REGIONAL_EVENT"])
            events.append({
                "date": event_date.strftime("%Y-%m-%d"),
                "region": region,
                "event_name": f"Synthetic {etype.replace('_',' ').title()} ({region})",
                "event_type": etype,
                "impact_weight": round(rng.uniform(0.2, 0.8), 2),
            })

    return events


# ---------------------------------------------------------------------------
# Demand generation helpers
# ---------------------------------------------------------------------------

def day_of_week_seasonality(dow: int) -> float:
    """0=Monday … 6=Sunday. Surgeries drop on weekends."""
    pattern = [1.05, 1.08, 1.10, 1.07, 1.02, 0.82, 0.78]
    return pattern[dow]


def monthly_seasonality(month: int) -> float:
    """Monthly pattern – slight winter increase (cold/flu → accidents)."""
    pattern = [1.08, 1.05, 1.00, 0.95, 0.92, 0.90,
               0.93, 0.95, 0.97, 1.00, 1.05, 1.10]
    return pattern[month - 1]


def season_name(month: int) -> str:
    if month in (12, 1, 2):
        return "WINTER"
    elif month in (3, 4, 5):
        return "SPRING"
    elif month in (6, 7, 8):
        return "SUMMER"
    else:
        return "AUTUMN"


def trend_factor(date: datetime) -> float:
    """Slight upward trend over the years (~2% per year)."""
    days_elapsed = (date - START_DATE).days
    return 1.0 + 0.02 * (days_elapsed / 365.0)


# ---------------------------------------------------------------------------
# Main generation
# ---------------------------------------------------------------------------

def generate_demand_history(
    rng: random.Random,
    events_lookup: Dict[str, List[Dict]],
) -> List[Dict[str, Any]]:
    """Generate the main blood_demand_history dataset."""

    rows: List[Dict[str, Any]] = []
    current = START_DATE

    # Running state per (facility, bg, comp) for smooth trajectories
    prev_demand: Dict[Tuple[str, str, str], float] = {}

    # Recent emergency tracker per facility
    emergency_buffer: Dict[str, List[int]] = {f["organization_id"]: [] for f in DEMAND_FACILITIES}

    while current <= END_DATE:
        date_str = current.strftime("%Y-%m-%d")
        dow = current.weekday()
        dom = current.day
        woy = current.isocalendar()[1]
        month = current.month
        quarter = (month - 1) // 3 + 1
        year = current.year
        is_weekend = 1 if dow >= 5 else 0

        # Check events/holidays for this date
        day_events = events_lookup.get(date_str, [])
        is_holiday = 1 if any(e["event_type"] in ("HOLIDAY", "FESTIVAL") for e in day_events) else 0
        special_event = 1 if any(e["event_type"] in ("MASS_GATHERING", "REGIONAL_EVENT", "EMERGENCY_SIM") for e in day_events) else 0
        outbreak = 1 if any(e["event_type"] == "EMERGENCY_SIM" and e["impact_weight"] > 0.6 for e in day_events) else 0
        event_weight = max((e["impact_weight"] for e in day_events), default=0.0)

        ssn = season_name(month)

        # Weather (synthetic, loosely seasonal)
        if ssn == "SUMMER":
            temp = rng.gauss(38, 4)
            rain = max(0, rng.gauss(5, 10))
        elif ssn == "WINTER":
            temp = rng.gauss(12, 4)
            rain = max(0, rng.gauss(2, 5))
        elif ssn == "SPRING":
            temp = rng.gauss(28, 5)
            rain = max(0, rng.gauss(3, 6))
        else:  # AUTUMN / monsoon-ish
            temp = rng.gauss(30, 4)
            rain = max(0, rng.gauss(15, 15))
        temp = round(temp, 1)
        rain = round(rain, 1)

        for fac in DEMAND_FACILITIES:
            fid = fac["organization_id"]
            ftype = fac["organization_type"]
            region = fac["region"]
            base = fac["base_daily_demand"]
            pop = fac["population_served"]
            beds = fac["bed_capacity"]

            # Facility-level clinical drivers (only hospitals have surgeries etc.)
            if ftype == "HOSPITAL":
                # Admissions
                base_admissions = beds * rng.uniform(0.55, 0.75)
                admissions_seasonal = base_admissions * monthly_seasonality(month)
                hospital_admissions = max(0, int(admissions_seasonal + rng.gauss(0, beds * 0.03)))

                icu_base = fac["icu_beds"] * rng.uniform(0.6, 0.85)
                icu_admissions = max(0, int(icu_base + rng.gauss(0, fac["icu_beds"] * 0.05)))

                ed_base = fac["emergency_capacity"] * rng.uniform(0.5, 0.9)
                ed_visits = max(0, int(ed_base * day_of_week_seasonality(dow) + rng.gauss(0, 5)))

                surg_base = beds * 0.04 * day_of_week_seasonality(dow)
                if is_weekend or is_holiday:
                    surg_base *= 0.3  # Elective surgeries drop
                scheduled_surgeries = max(0, int(surg_base + rng.gauss(0, 2)))

                trauma_base = ed_visits * rng.uniform(0.05, 0.15)
                if rain > 20:
                    trauma_base *= 1.3  # Wet roads
                if special_event:
                    trauma_base *= (1 + event_weight * 0.5)
                trauma_cases = max(0, int(trauma_base + rng.gauss(0, 1)))
            else:
                # Blood banks have demand but not hospital clinical drivers
                hospital_admissions = 0
                icu_admissions = 0
                ed_visits = 0
                scheduled_surgeries = 0
                trauma_cases = 0

            # Track emergency counts for 7d rolling
            daily_emergency_count = ed_visits + trauma_cases
            ebuf = emergency_buffer[fid]
            ebuf.append(daily_emergency_count)
            if len(ebuf) > 7:
                ebuf.pop(0)
            recent_emergency_7d = sum(ebuf)
            regional_emergency_index = round(recent_emergency_7d / max(fac["emergency_capacity"], 1), 2) if ftype == "HOSPITAL" else round(rng.uniform(0.1, 0.5), 2)

            for bg in BLOOD_GROUPS:
                bg_factor = BG_FREQ[bg]

                for comp in COMPONENTS:
                    comp_factor = COMP_FACTOR[comp]

                    # --- Demand calculation ---
                    key = (fid, bg, comp)

                    # Base
                    demand_base = base * bg_factor * comp_factor

                    # Seasonality
                    weekly_effect = day_of_week_seasonality(dow)
                    monthly_effect = monthly_seasonality(month)

                    # Clinical drivers
                    surgery_effect = 0
                    admission_effect = 0
                    emergency_effect = 0
                    trauma_effect = 0

                    if ftype == "HOSPITAL":
                        if comp in ("RBC", "WHOLE_BLOOD"):
                            surgery_effect = scheduled_surgeries * bg_factor * 0.08
                            admission_effect = hospital_admissions * bg_factor * 0.003
                            trauma_effect = trauma_cases * bg_factor * 0.15
                        elif comp == "PLASMA":
                            surgery_effect = scheduled_surgeries * bg_factor * 0.05
                            trauma_effect = trauma_cases * bg_factor * 0.12
                        elif comp == "PLATELETS":
                            admission_effect = icu_admissions * bg_factor * 0.04
                            surgery_effect = scheduled_surgeries * bg_factor * 0.03

                        emergency_effect = ed_visits * bg_factor * 0.005

                    # Event / outbreak spikes
                    event_effect = 0
                    if special_event:
                        event_effect = demand_base * event_weight * rng.uniform(0.1, 0.4)
                    if outbreak:
                        event_effect += demand_base * 0.3

                    # Holiday effect (donations drop → banks might see less supply,
                    # but for demand we model slight decrease in elective)
                    holiday_effect = 0
                    if is_holiday:
                        holiday_effect = -demand_base * 0.15

                    # Trend
                    trend = demand_base * (trend_factor(current) - 1.0)

                    # Combine
                    demand_raw = (
                        demand_base * weekly_effect * monthly_effect
                        + surgery_effect
                        + admission_effect
                        + emergency_effect
                        + trauma_effect
                        + event_effect
                        + holiday_effect
                        + trend
                    )

                    # AR(1)-like smoothing with previous day
                    prev = prev_demand.get(key, demand_raw)
                    alpha = 0.3
                    demand_smooth = alpha * demand_raw + (1 - alpha) * prev

                    # Noise
                    noise = rng.gauss(0, max(1, demand_smooth * 0.08))
                    demand_final = max(0, demand_smooth + noise)
                    units_used = max(0, round(demand_final))

                    prev_demand[key] = demand_final

                    # Split into emergency vs scheduled
                    if ftype == "HOSPITAL" and units_used > 0:
                        emergency_ratio = min(0.5, (trauma_cases + ed_visits * 0.1) / max(base, 1))
                        emergency_units = min(units_used, max(0, round(units_used * emergency_ratio * rng.uniform(0.8, 1.2))))
                        scheduled_units = max(0, units_used - emergency_units)
                    else:
                        emergency_units = 0
                        scheduled_units = units_used

                    # Inventory context (synthetic starting state)
                    inv_available = max(0, round(demand_final * rng.uniform(2.5, 5.0)))
                    inv_reserved = max(0, round(inv_available * rng.uniform(0.05, 0.2)))
                    incoming = max(0, round(demand_final * rng.uniform(0.3, 0.8)))
                    expired = max(0, round(inv_available * rng.uniform(0.01, 0.04)))
                    discarded = max(0, round(inv_available * rng.uniform(0.005, 0.02)))

                    row = {
                        "date": date_str,
                        "organization_id": fid,
                        "organization_name": fac["organization_name"],
                        "organization_type": ftype,
                        "region": region,
                        "blood_group": bg,
                        "component_type": comp,
                        "units_used": units_used,
                        "emergency_units": emergency_units,
                        "scheduled_units": scheduled_units,
                        "hospital_admissions": hospital_admissions,
                        "icu_admissions": icu_admissions,
                        "emergency_department_visits": ed_visits,
                        "scheduled_surgeries": scheduled_surgeries,
                        "trauma_cases": trauma_cases,
                        "day_of_week": dow,
                        "day_of_month": dom,
                        "week_of_year": woy,
                        "month": month,
                        "quarter": quarter,
                        "year": year,
                        "is_weekend": is_weekend,
                        "is_holiday": is_holiday,
                        "season": ssn,
                        "recent_emergency_count_7d": recent_emergency_7d,
                        "regional_emergency_index": regional_emergency_index,
                        "population_served": pop,
                        "temperature_c": temp,
                        "rainfall_mm": rain,
                        "special_event_flag": special_event,
                        "outbreak_flag": outbreak,
                        "inventory_available_start": inv_available,
                        "inventory_reserved_start": inv_reserved,
                        "incoming_units": incoming,
                        "units_expired": expired,
                        "units_discarded": discarded,
                    }
                    rows.append(row)

        current += timedelta(days=1)

    return rows


def generate_facilities_csv() -> List[Dict[str, Any]]:
    """facilities.csv"""
    rows = []
    for f in FACILITIES:
        rows.append({
            "organization_id": f["organization_id"],
            "organization_name": f["organization_name"],
            "organization_type": f["organization_type"],
            "region": f["region"],
            "city": f["city"],
            "latitude": f["latitude"],
            "longitude": f["longitude"],
            "population_served": f["population_served"],
            "bed_capacity": f["bed_capacity"],
            "icu_beds": f["icu_beds"],
            "emergency_capacity": f["emergency_capacity"],
            "is_active": f["is_active"],
        })
    return rows


def generate_donors(rng: random.Random, n: int = 200) -> List[Dict[str, Any]]:
    """donors.csv — synthetic donor pool."""
    first_names = [
        "Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Sai", "Reyansh",
        "Ayaan", "Krishna", "Ishaan", "Diya", "Ananya", "Aanya", "Aadhya",
        "Isha", "Saanvi", "Myra", "Sara", "Kavya", "Navya", "Rohan",
        "Karan", "Priya", "Neha", "Rahul", "Amit", "Suman", "Deepak",
        "Pooja", "Meera", "Lakshmi", "Ganesh", "Vikram", "Sunita", "Rajesh",
        "Monali", "Tanvi", "Harish", "Sneha", "Akash",
    ]
    last_names = [
        "Sharma", "Verma", "Patel", "Kumar", "Singh", "Gupta", "Reddy",
        "Nair", "Iyer", "Chopra", "Mehta", "Das", "Roy", "Joshi",
        "Malhotra", "Kapoor", "Saxena", "Mishra", "Rao", "Desai",
    ]
    cities = ["Metropolis", "Northville", "Eastport", "Southtown", "Westfield"]

    donors = []
    for i in range(n):
        donor_id = f"DONOR_{i+1:04d}"
        fname = rng.choice(first_names)
        lname = rng.choice(last_names)
        bg = rng.choices(BLOOD_GROUPS, weights=[BG_FREQ[b] for b in BLOOD_GROUPS])[0]
        city = rng.choice(cities)
        lat = 28.5 + rng.uniform(-0.3, 0.3)
        lng = 77.1 + rng.uniform(-0.3, 0.3)
        last_donation = (END_DATE - timedelta(days=rng.randint(30, 365))).strftime("%Y-%m-%d")
        eligibility = rng.choice(["ELIGIBLE", "ELIGIBLE", "ELIGIBLE", "DEFERRED", "PENDING_REVIEW"])
        donors.append({
            "donor_id": donor_id,
            "full_name": f"{fname} {lname}",
            "blood_group": bg,
            "city": city,
            "latitude": round(lat, 4),
            "longitude": round(lng, 4),
            "last_donation_date": last_donation,
            "eligibility_status": eligibility,
            "consent_given": True,
        })
    return donors


def generate_donation_history(
    rng: random.Random,
    donors: List[Dict],
    n: int = 800,
) -> List[Dict[str, Any]]:
    """donation_history.csv"""
    bb_ids = [f["organization_id"] for f in FACILITIES if f["organization_type"] == "BLOOD_BANK"]
    donations = []
    for i in range(n):
        donor = rng.choice(donors)
        donation_date = START_DATE + timedelta(days=rng.randint(0, (END_DATE - START_DATE).days))
        donations.append({
            "donation_id": f"DON_{i+1:05d}",
            "donor_id": donor["donor_id"],
            "organization_id": rng.choice(bb_ids),
            "donation_date": donation_date.strftime("%Y-%m-%d"),
            "blood_group": donor["blood_group"],
            "donation_type": rng.choice(["WHOLE_BLOOD", "WHOLE_BLOOD", "WHOLE_BLOOD", "APHERESIS_PLATELETS", "APHERESIS_PLASMA"]),
            "status": rng.choice(["COMPLETED", "COMPLETED", "COMPLETED", "COMPLETED", "DEFERRED", "ADVERSE_REACTION"]),
        })
    return donations


def generate_blood_units(
    rng: random.Random,
    n: int = 2000,
) -> List[Dict[str, Any]]:
    """blood_units.csv — unit-level dataset."""
    statuses = ["AVAILABLE", "AVAILABLE", "AVAILABLE", "RESERVED", "DISPATCHED",
                "RECEIVED", "USED", "EXPIRED", "QUARANTINED"]
    quality_statuses = ["PASSED", "PASSED", "PASSED", "PASSED", "PENDING", "FAILED", "REVIEW_REQUIRED"]
    storage_locs = ["Shelf-A1", "Shelf-A2", "Shelf-B1", "Shelf-B2", "Shelf-C1",
                    "Fridge-1", "Fridge-2", "Fridge-3", "Platelet-Agitator-1"]

    org_ids = [f["organization_id"] for f in FACILITIES if f["organization_type"] in ("HOSPITAL", "BLOOD_BANK")]
    units = []
    for i in range(n):
        org = rng.choice(org_ids)
        bg = rng.choices(BLOOD_GROUPS, weights=[BG_FREQ[b] for b in BLOOD_GROUPS])[0]
        comp = rng.choice(COMPONENTS)

        # Shelf life depends on component
        shelf_days = {"RBC": 42, "PLASMA": 365, "PLATELETS": 5, "WHOLE_BLOOD": 35}
        collection_date = END_DATE - timedelta(days=rng.randint(0, shelf_days[comp]))
        expiry_date = collection_date + timedelta(days=shelf_days[comp])
        status = rng.choice(statuses)
        qt = rng.choice(quality_statuses)
        if status == "QUARANTINED":
            qt = rng.choice(["FAILED", "REVIEW_REQUIRED"])

        units.append({
            "unit_code": f"BU-{uuid.uuid4().hex[:8].upper()}",
            "organization_id": org,
            "blood_group": bg,
            "component_type": comp,
            "collection_date": collection_date.strftime("%Y-%m-%d"),
            "expiry_date": expiry_date.strftime("%Y-%m-%d"),
            "status": status,
            "quality_testing_status": qt,
            "storage_location": rng.choice(storage_locs),
            "source_donation_id": f"DON_{rng.randint(1,800):05d}",
        })
    return units


def generate_blood_inventory(
    rng: random.Random,
) -> List[Dict[str, Any]]:
    """blood_inventory.csv — snapshot of current inventory."""
    snapshot_date = END_DATE.strftime("%Y-%m-%d")
    rows = []
    org_ids = [f["organization_id"] for f in FACILITIES if f["organization_type"] in ("HOSPITAL", "BLOOD_BANK")]

    for org_id in org_ids:
        fac = next(f for f in FACILITIES if f["organization_id"] == org_id)
        base = fac.get("base_daily_demand", 20)

        for bg in BLOOD_GROUPS:
            bg_f = BG_FREQ[bg]
            for comp in COMPONENTS:
                comp_f = COMP_FACTOR[comp]
                base_inv = base * bg_f * comp_f * rng.uniform(3, 6)

                available = max(0, round(base_inv))
                reserved = max(0, round(available * rng.uniform(0.05, 0.15)))
                quarantined = max(0, round(available * rng.uniform(0.01, 0.05)))
                near_expiry = max(0, round(available * rng.uniform(0.02, 0.08)))
                incoming = max(0, round(base_inv * rng.uniform(0.2, 0.5)))
                expected_expiry = max(0, round(available * rng.uniform(0.01, 0.04)))
                safety_stock = max(1, round(base * bg_f * comp_f * 2))

                rows.append({
                    "snapshot_date": snapshot_date,
                    "organization_id": org_id,
                    "blood_group": bg,
                    "component_type": comp,
                    "available_units": available,
                    "reserved_units": reserved,
                    "quarantined_units": quarantined,
                    "near_expiry_units": near_expiry,
                    "incoming_units": incoming,
                    "expected_expiry_units": expected_expiry,
                    "safety_stock_target": safety_stock,
                })
    return rows


def generate_transfers(rng: random.Random, n: int = 150) -> List[Dict[str, Any]]:
    """transfers.csv"""
    org_ids = [f["organization_id"] for f in FACILITIES if f["organization_type"] in ("HOSPITAL", "BLOOD_BANK")]
    statuses = ["PREPARING", "READY_FOR_PICKUP", "IN_TRANSIT", "DELIVERED", "VERIFIED", "CANCELLED"]
    priorities = ["ROUTINE", "ROUTINE", "URGENT", "URGENT", "EMERGENCY"]
    transfers = []

    for i in range(n):
        src = rng.choice(org_ids)
        dst = rng.choice([o for o in org_ids if o != src])
        status = rng.choice(statuses)
        prio = rng.choice(priorities)

        pickup = START_DATE + timedelta(days=rng.randint(0, (END_DATE - START_DATE).days), hours=rng.randint(6, 18))
        dispatch = pickup + timedelta(minutes=rng.randint(10, 60))
        distance = round(rng.uniform(5, 80), 1)
        duration = round(distance / rng.uniform(20, 50) * 60, 0)
        expected_arrival = dispatch + timedelta(minutes=int(duration))
        actual_arrival = expected_arrival + timedelta(minutes=rng.randint(-5, 30)) if status in ("DELIVERED", "VERIFIED") else None

        transfers.append({
            "transfer_id": f"TRF_{i+1:05d}",
            "request_id": f"REQ_{rng.randint(1,200):05d}",
            "source_organization_id": src,
            "destination_organization_id": dst,
            "status": status,
            "priority": prio,
            "pickup_time": pickup.strftime("%Y-%m-%d %H:%M:%S"),
            "dispatch_time": dispatch.strftime("%Y-%m-%d %H:%M:%S") if status not in ("PREPARING",) else "",
            "expected_arrival": expected_arrival.strftime("%Y-%m-%d %H:%M:%S"),
            "actual_arrival": actual_arrival.strftime("%Y-%m-%d %H:%M:%S") if actual_arrival else "",
            "route_distance_km": distance,
            "route_duration_minutes": int(duration),
        })
    return transfers


def generate_temperature_readings(
    rng: random.Random,
    transfers: List[Dict],
) -> List[Dict[str, Any]]:
    """temperature_readings.csv"""
    readings = []
    for t in transfers:
        if t["status"] in ("PREPARING", "CANCELLED"):
            continue
        n_readings = rng.randint(3, 12)
        base_temp = rng.uniform(2.0, 6.0)
        for j in range(n_readings):
            temp = base_temp + rng.gauss(0, 0.5)
            excursion = temp < 1.0 or temp > 10.0

            # Simulate rare excursions
            if rng.random() < 0.03:
                temp = rng.choice([rng.uniform(10.5, 15.0), rng.uniform(-2.0, 0.5)])
                excursion = True

            readings.append({
                "transfer_id": t["transfer_id"],
                "device_id": f"SENSOR_{rng.randint(1,20):03d}",
                "recorded_at": t["pickup_time"],  # Simplified
                "temperature_c": round(temp, 2),
                "latitude": 28.6 + rng.uniform(-0.2, 0.2),
                "longitude": 77.2 + rng.uniform(-0.2, 0.2),
                "excursion_flag": excursion,
            })
    return readings


# ---------------------------------------------------------------------------
# CSV Writer
# ---------------------------------------------------------------------------

def write_csv(filepath: str, rows: List[Dict[str, Any]]) -> int:
    if not rows:
        print(f"  ⚠ No rows for {filepath}")
        return 0
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    fieldnames = list(rows[0].keys())
    with open(filepath, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    return len(rows)


# ---------------------------------------------------------------------------
# Entrypoint
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Generate BloodChain synthetic datasets")
    parser.add_argument("--seed", type=int, default=SEED, help="Random seed")
    parser.add_argument("--output", type=str, default=OUTPUT_DIR, help="Output directory")
    args = parser.parse_args()

    rng = random.Random(args.seed)
    out = args.output

    print("=" * 60)
    print("BloodChain AI — Synthetic Data Generator")
    print("=" * 60)
    print(f"Seed:   {args.seed}")
    print(f"Output: {out}")
    print(f"Range:  {START_DATE.date()} → {END_DATE.date()}")
    print()

    # 1. Holidays & Events
    print("[1/9] Generating holidays & events...")
    events = generate_holidays_events(rng)
    n = write_csv(os.path.join(out, "holidays_events.csv"), events)
    print(f"       → {n} events")

    events_lookup: Dict[str, List[Dict]] = {}
    for e in events:
        events_lookup.setdefault(e["date"], []).append(e)

    # 2. Facilities
    print("[2/9] Generating facilities...")
    facilities = generate_facilities_csv()
    n = write_csv(os.path.join(out, "facilities.csv"), facilities)
    print(f"       → {n} facilities")

    # 3. Blood demand history (THE BIG ONE)
    print("[3/9] Generating blood demand history (this may take a moment)...")
    demand = generate_demand_history(rng, events_lookup)
    n = write_csv(os.path.join(out, "blood_demand_history.csv"), demand)
    print(f"       → {n:,} demand records")

    # 4. Donors
    print("[4/9] Generating donors...")
    donors = generate_donors(rng, n=200)
    n = write_csv(os.path.join(out, "donors.csv"), donors)
    print(f"       → {n} donors")

    # 5. Donation history
    print("[5/9] Generating donation history...")
    donations = generate_donation_history(rng, donors, n=800)
    n = write_csv(os.path.join(out, "donation_history.csv"), donations)
    print(f"       → {n} donations")

    # 6. Blood units
    print("[6/9] Generating blood units...")
    units = generate_blood_units(rng, n=2000)
    n = write_csv(os.path.join(out, "blood_units.csv"), units)
    print(f"       → {n} blood units")

    # 7. Blood inventory snapshot
    print("[7/9] Generating blood inventory snapshot...")
    inventory = generate_blood_inventory(rng)
    n = write_csv(os.path.join(out, "blood_inventory.csv"), inventory)
    print(f"       → {n} inventory records")

    # 8. Transfers
    print("[8/9] Generating transfers...")
    transfers = generate_transfers(rng, n=150)
    n = write_csv(os.path.join(out, "transfers.csv"), transfers)
    print(f"       → {n} transfers")

    # 9. Temperature readings
    print("[9/9] Generating temperature readings...")
    temp_readings = generate_temperature_readings(rng, transfers)
    n = write_csv(os.path.join(out, "temperature_readings.csv"), temp_readings)
    print(f"       → {n} temperature readings")

    print()
    print("✅ All synthetic datasets generated successfully!")
    print(f"   Output directory: {out}")
    print()
    print("⚠  All data is SYNTHETIC. No real patient/donor data is included.")


if __name__ == "__main__":
    main()
