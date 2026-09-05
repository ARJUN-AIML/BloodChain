"""
BloodChain AI — OR-Tools Optimization Engine
==============================================
Multi-source blood allocation optimizer.

Uses Google OR-Tools to solve the allocation problem:
- Multiple sources → single destination
- Minimizes unfulfilled demand, travel time, distance, and wastage
- Respects safe-share limits, compatibility, and quality constraints
- Supports emergency priority weighting
"""

import json
from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Optional, Tuple

import numpy as np

try:
    from ortools.linear_solver import pywraplp
    HAS_ORTOOLS = True
except ImportError:
    HAS_ORTOOLS = False


# ---------------------------------------------------------------------------
# Types
# ---------------------------------------------------------------------------

class Priority(str, Enum):
    ROUTINE = "ROUTINE"
    URGENT = "URGENT"
    EMERGENCY = "EMERGENCY"


class RiskLevel(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


@dataclass
class AllocationSource:
    """A candidate source facility."""
    organization_id: str
    organization_name: str
    blood_group: str
    component_type: str
    available_compatible_units: int
    safe_share_units: int
    distance_km: float
    eta_minutes: float
    source_risk: RiskLevel = RiskLevel.LOW
    expiry_hours_avg: float = 720  # avg hours until expiry
    quality_passed: bool = True


@dataclass
class AllocationRequest:
    """Demand request to fulfill."""
    request_id: str
    destination_id: str
    destination_name: str
    blood_group: str
    component_type: str
    units_needed: int
    priority: Priority = Priority.ROUTINE
    max_eta_minutes: float = 240


@dataclass
class AllocationResult:
    """Result from a single source."""
    source_id: str
    source_name: str
    units_allocated: int
    rank: int
    distance_km: float
    eta_minutes: float
    source_risk: str
    safe_share_remaining: int
    explanation: str = ""


@dataclass
class OptimizationResult:
    """Complete optimization result."""
    request_id: str
    status: str  # "OPTIMAL", "FEASIBLE", "INFEASIBLE", "PARTIAL"
    total_allocated: int
    total_needed: int
    unfulfilled: int
    allocations: List[AllocationResult] = field(default_factory=list)
    solver_runtime_ms: float = 0
    objective_value: float = 0
    explanation: str = ""


# ---------------------------------------------------------------------------
# Compatibility Rules (Rule-Based, NOT ML)
# ---------------------------------------------------------------------------

# RBC compatibility: recipient → compatible donor blood groups
RBC_COMPATIBILITY = {
    "O_NEGATIVE":  ["O_NEGATIVE"],
    "O_POSITIVE":  ["O_NEGATIVE", "O_POSITIVE"],
    "A_NEGATIVE":  ["O_NEGATIVE", "A_NEGATIVE"],
    "A_POSITIVE":  ["O_NEGATIVE", "O_POSITIVE", "A_NEGATIVE", "A_POSITIVE"],
    "B_NEGATIVE":  ["O_NEGATIVE", "B_NEGATIVE"],
    "B_POSITIVE":  ["O_NEGATIVE", "O_POSITIVE", "B_NEGATIVE", "B_POSITIVE"],
    "AB_NEGATIVE": ["O_NEGATIVE", "A_NEGATIVE", "B_NEGATIVE", "AB_NEGATIVE"],
    "AB_POSITIVE": ["O_NEGATIVE", "O_POSITIVE", "A_NEGATIVE", "A_POSITIVE",
                    "B_NEGATIVE", "B_POSITIVE", "AB_NEGATIVE", "AB_POSITIVE"],
}

# Plasma compatibility: REVERSED from RBC
PLASMA_COMPATIBILITY = {
    "O_NEGATIVE":  ["O_NEGATIVE", "O_POSITIVE", "A_NEGATIVE", "A_POSITIVE",
                    "B_NEGATIVE", "B_POSITIVE", "AB_NEGATIVE", "AB_POSITIVE"],
    "O_POSITIVE":  ["O_POSITIVE", "A_POSITIVE", "B_POSITIVE", "AB_POSITIVE"],
    "A_NEGATIVE":  ["A_NEGATIVE", "A_POSITIVE", "AB_NEGATIVE", "AB_POSITIVE"],
    "A_POSITIVE":  ["A_POSITIVE", "AB_POSITIVE"],
    "B_NEGATIVE":  ["B_NEGATIVE", "B_POSITIVE", "AB_NEGATIVE", "AB_POSITIVE"],
    "B_POSITIVE":  ["B_POSITIVE", "AB_POSITIVE"],
    "AB_NEGATIVE": ["AB_NEGATIVE", "AB_POSITIVE"],
    "AB_POSITIVE": ["AB_POSITIVE"],
}

# Platelets: generally same as RBC, but ABO-identical preferred
PLATELET_COMPATIBILITY = RBC_COMPATIBILITY.copy()

# Whole blood: identical type preferred
WHOLE_BLOOD_COMPATIBILITY = {bg: [bg] for bg in RBC_COMPATIBILITY.keys()}


def get_compatible_groups(
    recipient_bg: str,
    component: str,
) -> List[str]:
    """Get compatible donor blood groups for a given recipient and component."""
    compat_map = {
        "RBC": RBC_COMPATIBILITY,
        "PLASMA": PLASMA_COMPATIBILITY,
        "PLATELETS": PLATELET_COMPATIBILITY,
        "WHOLE_BLOOD": WHOLE_BLOOD_COMPATIBILITY,
        "CRYOPRECIPITATE": PLASMA_COMPATIBILITY,
    }
    return compat_map.get(component, RBC_COMPATIBILITY).get(recipient_bg, [recipient_bg])


def is_compatible(
    recipient_bg: str,
    donor_bg: str,
    component: str,
) -> bool:
    """Check if donor blood group is compatible with recipient for given component."""
    compatible = get_compatible_groups(recipient_bg, component)
    return donor_bg in compatible


# ---------------------------------------------------------------------------
# Optimizer
# ---------------------------------------------------------------------------

def optimize_allocation(
    request: AllocationRequest,
    sources: List[AllocationSource],
) -> OptimizationResult:
    """
    Solve multi-source allocation using OR-Tools.
    
    Decision variables: x[i] = units allocated from source i
    
    Objective: minimize weighted combination of:
    - Unfulfilled demand (high weight, even higher for emergencies)
    - Travel time
    - Distance
    - Source risk
    - Expiry/wastage penalty
    
    Constraints:
    - x[i] <= source safe share
    - x[i] <= source available compatible units
    - sum(x[i]) <= units_needed
    - x[i] >= 0, integer
    - Only quality-passed sources
    """

    if not sources:
        return OptimizationResult(
            request_id=request.request_id,
            status="INFEASIBLE",
            total_allocated=0,
            total_needed=request.units_needed,
            unfulfilled=request.units_needed,
            explanation="No candidate sources available.",
        )

    if not HAS_ORTOOLS:
        return _greedy_allocation(request, sources)

    # Filter to quality-passed sources only
    valid_sources = [s for s in sources if s.quality_passed]
    if not valid_sources:
        return OptimizationResult(
            request_id=request.request_id,
            status="INFEASIBLE",
            total_allocated=0,
            total_needed=request.units_needed,
            unfulfilled=request.units_needed,
            explanation="No quality-passed sources available.",
        )

    # Create solver
    solver = pywraplp.Solver.CreateSolver("SCIP")
    if not solver:
        return _greedy_allocation(request, valid_sources)

    n = len(valid_sources)

    # Decision variables
    x = [solver.IntVar(0, min(s.safe_share_units, s.available_compatible_units), f"x_{i}")
         for i, s in enumerate(valid_sources)]

    # Slack variable for unfulfilled demand
    slack = solver.IntVar(0, request.units_needed, "slack")

    # Constraint: total allocation + slack = demand
    solver.Add(sum(x) + slack == request.units_needed)

    # Individual source limits
    for i, s in enumerate(valid_sources):
        solver.Add(x[i] <= s.safe_share_units)
        solver.Add(x[i] <= s.available_compatible_units)

    # Objective weights
    unfulfilled_weight = 1000.0
    if request.priority == Priority.EMERGENCY:
        unfulfilled_weight = 5000.0
    elif request.priority == Priority.URGENT:
        unfulfilled_weight = 2000.0

    risk_weights = {
        RiskLevel.LOW: 0,
        RiskLevel.MEDIUM: 5,
        RiskLevel.HIGH: 20,
        RiskLevel.CRITICAL: 100,
    }

    # Objective: minimize
    objective = solver.Objective()
    objective.SetCoefficient(slack, unfulfilled_weight)

    for i, s in enumerate(valid_sources):
        # Travel time cost (per unit)
        time_cost = s.eta_minutes / 60.0  # normalize to hours
        distance_cost = s.distance_km / 100.0
        risk_cost = risk_weights.get(s.source_risk, 0)
        expiry_cost = max(0, (720 - s.expiry_hours_avg) / 720.0) * 10  # Penalize near-expiry
        
        total_cost = time_cost + distance_cost + risk_cost + expiry_cost
        objective.SetCoefficient(x[i], total_cost)

    objective.SetMinimization()

    # Solve
    import time
    t0 = time.time()
    status = solver.Solve()
    runtime_ms = (time.time() - t0) * 1000

    if status not in (pywraplp.Solver.OPTIMAL, pywraplp.Solver.FEASIBLE):
        return _greedy_allocation(request, valid_sources)

    # Build result
    allocations = []
    total_allocated = 0
    ranked = []

    for i, s in enumerate(valid_sources):
        units = int(x[i].solution_value())
        if units > 0:
            ranked.append((units, s, i))
            total_allocated += units

    # Sort by units allocated (descending) for ranking
    ranked.sort(key=lambda r: r[0], reverse=True)

    for rank, (units, s, i) in enumerate(ranked, 1):
        allocations.append(AllocationResult(
            source_id=s.organization_id,
            source_name=s.organization_name,
            units_allocated=units,
            rank=rank,
            distance_km=s.distance_km,
            eta_minutes=s.eta_minutes,
            source_risk=s.source_risk.value,
            safe_share_remaining=s.safe_share_units - units,
            explanation=f"{s.organization_name}: {units} units, rank {rank}, "
                       f"ETA {s.eta_minutes:.0f} min, safe share {s.safe_share_units}, "
                       f"source risk {s.source_risk.value}",
        ))

    unfulfilled = int(slack.solution_value())
    result_status = "OPTIMAL" if status == pywraplp.Solver.OPTIMAL else "FEASIBLE"
    if unfulfilled > 0 and total_allocated > 0:
        result_status = "PARTIAL"
    elif total_allocated == 0:
        result_status = "INFEASIBLE"

    return OptimizationResult(
        request_id=request.request_id,
        status=result_status,
        total_allocated=total_allocated,
        total_needed=request.units_needed,
        unfulfilled=unfulfilled,
        allocations=allocations,
        solver_runtime_ms=round(runtime_ms, 2),
        objective_value=round(solver.Objective().Value(), 4),
        explanation=f"Allocated {total_allocated}/{request.units_needed} units from {len(allocations)} sources.",
    )


def _greedy_allocation(
    request: AllocationRequest,
    sources: List[AllocationSource],
) -> OptimizationResult:
    """Fallback greedy allocation when OR-Tools is unavailable."""
    # Sort by: lower risk first, then shorter ETA, then more available
    sorted_sources = sorted(
        sources,
        key=lambda s: (
            {"LOW": 0, "MEDIUM": 1, "HIGH": 2, "CRITICAL": 3}.get(s.source_risk.value, 2),
            s.eta_minutes,
            -min(s.safe_share_units, s.available_compatible_units),
        ),
    )

    remaining = request.units_needed
    allocations = []
    rank = 0

    for s in sorted_sources:
        if remaining <= 0:
            break
        if not s.quality_passed:
            continue

        allocatable = min(remaining, s.safe_share_units, s.available_compatible_units)
        if allocatable <= 0:
            continue

        rank += 1
        allocations.append(AllocationResult(
            source_id=s.organization_id,
            source_name=s.organization_name,
            units_allocated=allocatable,
            rank=rank,
            distance_km=s.distance_km,
            eta_minutes=s.eta_minutes,
            source_risk=s.source_risk.value,
            safe_share_remaining=s.safe_share_units - allocatable,
            explanation=f"{s.organization_name}: {allocatable} units (greedy), "
                       f"ETA {s.eta_minutes:.0f} min",
        ))
        remaining -= allocatable

    total_allocated = request.units_needed - remaining
    status = "OPTIMAL" if remaining == 0 else ("PARTIAL" if total_allocated > 0 else "INFEASIBLE")

    return OptimizationResult(
        request_id=request.request_id,
        status=status,
        total_allocated=total_allocated,
        total_needed=request.units_needed,
        unfulfilled=max(0, remaining),
        allocations=allocations,
        solver_runtime_ms=0,
        objective_value=0,
        explanation=f"Greedy: {total_allocated}/{request.units_needed} units from {len(allocations)} sources.",
    )
