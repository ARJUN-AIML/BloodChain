import logging
import requests
from django.conf import settings
from .exceptions import MLServiceUnavailable, MLServiceValidationError

logger = logging.getLogger(__name__)

class MLServiceClient:
    def __init__(self, base_url: str = None, timeout: float = 5.0):
        self.base_url = (base_url or getattr(settings, 'ML_SERVICE_URL', 'http://127.0.0.1:8001')).rstrip('/')
        self.timeout = timeout

    def check_health(self) -> dict:
        try:
            resp = requests.get(f"{self.base_url}/health", timeout=self.timeout)
            if resp.status_code == 200:
                return resp.json()
            return {"status": "degraded", "http_code": resp.status_code}
        except requests.RequestException as e:
            logger.warning(f"FastAPI ML service health check failed: {e}")
            return {"status": "unavailable", "error": str(e)}

    def generate_forecast(self, facility_id: str, blood_group: str, component_type: str, horizon_days: int = 7) -> dict:
        payload = {
            "facility_id": facility_id,
            "blood_group": blood_group,
            "component_type": component_type,
            "horizon_days": horizon_days
        }
        try:
            resp = requests.post(f"{self.base_url}/forecast", json=payload, timeout=self.timeout)
            if resp.status_code == 200:
                res = resp.json()
                # Validate P10 <= P50 <= P90 invariant
                if not (res['p10'] <= res['p50'] <= res['p90']):
                    logger.error(f"Quantile ordering violation from FastAPI ML service: {res}")
                    raise MLServiceValidationError("P10 <= P50 <= P90 invariant violated in ML service response.")
                return res
            raise MLServiceUnavailable(f"FastAPI service returned status {resp.status_code}")
        except requests.RequestException as e:
            logger.warning(f"FastAPI ML forecast request failed: {e}. Returning labeled synthetic fallback.")
            # Fallback labeled explicitly as DEMO FALLBACK
            base = 25.0
            return {
                "facility_id": facility_id,
                "blood_group": blood_group,
                "component_type": component_type,
                "horizon_days": horizon_days,
                "p10": round(base * 0.7, 1),
                "p50": round(base * 1.0, 1),
                "p90": round(base * 1.3, 1),
                "confidence_interval": "Estimated prediction interval [DEMO FALLBACK]",
                "model_used": "XGBoost (Synthetic Fallback)",
                "fallback_used": True
            }

    def allocate_optimization(self, allocation_request: dict) -> dict:
        try:
            resp = requests.post(f"{self.base_url}/optimization/allocate", json=allocation_request, timeout=self.timeout)
            if resp.status_code == 200:
                return resp.json()
            raise MLServiceUnavailable(f"FastAPI optimizer returned status {resp.status_code}")
        except requests.RequestException as e:
            logger.error(f"FastAPI OR-Tools optimizer request failed: {e}")
            raise MLServiceUnavailable(f"OR-Tools solver unavailable: {str(e)}")
