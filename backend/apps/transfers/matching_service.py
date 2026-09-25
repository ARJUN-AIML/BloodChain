import math
from typing import List, Dict, Any
from apps.facilities.models import Facility
from apps.inventory.models import BloodInventory
from apps.inventory.services import calculate_safe_to_share

# ABO/Rh RBC Compatibility Matrix (Recipient -> Compatible Donors)
RBC_COMPATIBILITY: Dict[str, List[str]] = {
    'O_NEGATIVE': ['O_NEGATIVE'],
    'O_POSITIVE': ['O_POSITIVE', 'O_NEGATIVE'],
    'A_NEGATIVE': ['A_NEGATIVE', 'O_NEGATIVE'],
    'A_POSITIVE': ['A_POSITIVE', 'A_NEGATIVE', 'O_POSITIVE', 'O_NEGATIVE'],
    'B_NEGATIVE': ['B_NEGATIVE', 'O_NEGATIVE'],
    'B_POSITIVE': ['B_POSITIVE', 'B_NEGATIVE', 'O_POSITIVE', 'O_NEGATIVE'],
    'AB_NEGATIVE': ['AB_NEGATIVE', 'A_NEGATIVE', 'B_NEGATIVE', 'O_NEGATIVE'],
    'AB_POSITIVE': ['AB_POSITIVE', 'AB_NEGATIVE', 'A_POSITIVE', 'A_NEGATIVE', 'B_POSITIVE', 'B_NEGATIVE', 'O_POSITIVE', 'O_NEGATIVE'],
}

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance in km between two lat/lon coordinates."""
    R = 6371.0 # Earth radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 1)

def calculate_matching_sources(
    destination_facility_id: str,
    requested_blood_group: str,
    component_type: str,
    quantity_needed: int
) -> List[Dict[str, Any]]:
    """
    Evaluates real database inventory across active facilities to find and rank
    compatible blood sources with explainable scoring.
    """
    dest_facility = Facility.objects.filter(id=destination_facility_id).first()
    dest_lat = dest_facility.latitude if dest_facility else 10.7925
    dest_lon = dest_facility.longitude if dest_facility else 78.6980

    compatible_groups = RBC_COMPATIBILITY.get(requested_blood_group, [requested_blood_group])
    
    # Query facilities with inventory
    candidate_sources = []

    facilities = Facility.objects.filter(is_active=True).exclude(id=destination_facility_id)

    for fac in facilities:
        for bg in compatible_groups:
            inv_summary = BloodInventory.objects.filter(
                facility=fac,
                blood_group=bg,
                component_type=component_type
            ).first()

            if not inv_summary or inv_summary.available_units <= 0:
                continue

            dist_km = haversine_distance(dest_lat, dest_lon, fac.latitude, fac.longitude)
            # Estimate ETA: 50 km/h avg speed + 10 min dispatch handling
            eta_mins = max(15, round((dist_km / 50.0) * 60 + 10))

            safe_share = calculate_safe_to_share(fac, bg, component_type)

            # Match Score calculation (0 - 100)
            is_exact_bg = (bg == requested_blood_group)
            bg_score = 50.0 if is_exact_bg else 35.0
            share_score = min(30.0, (safe_share / max(quantity_needed, 1)) * 30.0)
            dist_score = max(0.0, 20.0 - (dist_km / 5.0))
            total_match_score = round(bg_score + share_score + dist_score, 1)

            explanation = (
                f"Match score {total_match_score}%: Facility '{fac.name}' has {inv_summary.available_units} units available "
                f"({safe_share} safe-to-share) of {'exact match ' if is_exact_bg else 'compatible '} {bg}. "
                f"Distance: {dist_km} km (est. ETA: {eta_mins} mins)."
            )

            candidate_sources.append({
                'sourceFacilityId': fac.id,
                'sourceFacilityName': fac.name,
                'bloodGroup': bg,
                'componentType': component_type,
                'availableUnits': inv_summary.available_units,
                'safeShareUnits': safe_share,
                'distanceKm': dist_km,
                'etaMinutes': eta_mins,
                'isExactMatch': is_exact_bg,
                'matchScore': total_match_score,
                'explanation': explanation,
            })

    # Sort candidates by matchScore descending then distance ascending
    candidate_sources.sort(key=lambda x: (-x['matchScore'], x['distanceKm']))
    return candidate_sources
