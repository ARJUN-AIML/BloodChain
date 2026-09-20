from django.test import TestCase
from integrations.ml_service.client import MLServiceClient
from integrations.ml_service.exceptions import MLServiceValidationError

class MLServiceClientTests(TestCase):
    def setUp(self):
        self.client = MLServiceClient(base_url='http://127.0.0.1:9999') # Non-existent port to force fallback

    def test_ml_service_fallback_on_unavailability(self):
        """When ML service is unavailable, MLServiceClient returns labeled synthetic fallback with P10 <= P50 <= P90."""
        res = self.client.generate_forecast('HOSP_A', 'O_POSITIVE', 'RBC', horizon_days=7)
        self.assertTrue(res.get('fallback_used'))
        self.assertIn('DEMO FALLBACK', res.get('confidence_interval', ''))
        self.assertLessEqual(res['p10'], res['p50'])
        self.assertLessEqual(res['p50'], res['p90'])

    def test_ml_service_health_check_unavailable(self):
        """Health check returns status unavailable when service is unreachable."""
        res = self.client.check_health()
        self.assertEqual(res.get('status'), 'unavailable')
