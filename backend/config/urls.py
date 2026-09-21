from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from apps.facilities.views import FacilityViewSet
from apps.inventory.views import (
    BloodInventoryViewSet, InventoryBatchViewSet, UsageRecordViewSet,
    CollectionCampaignViewSet, calculate_safe_share_api, expiry_rescue_api
)
from apps.transfers.views import TransferRequestViewSet
from apps.audit.views import AuditEventViewSet, AlertViewSet
from apps.accounts.views import UserViewSet, health_check
from apps.simulations.views import SimulationRecordViewSet, run_simulation_api
from apps.forecasting.views import ForecastRecordViewSet, generate_forecast_api

router = DefaultRouter()
router.register('facilities', FacilityViewSet, basename='facility')
router.register('inventory/batches', InventoryBatchViewSet, basename='inventory-batch')
router.register('inventory/usage', UsageRecordViewSet, basename='usage-record')
router.register('inventory', BloodInventoryViewSet, basename='blood-inventory')
router.register('campaigns', CollectionCampaignViewSet, basename='campaign')
router.register('transfers', TransferRequestViewSet, basename='transfer')
router.register('alerts', AlertViewSet, basename='alert')
router.register('audit', AuditEventViewSet, basename='audit')
router.register('users', UserViewSet, basename='user')
router.register('simulations', SimulationRecordViewSet, basename='simulation')
router.register('forecasting', ForecastRecordViewSet, basename='forecasting')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/health/', health_check, name='health_check'),
    path('api/forecast/', generate_forecast_api, name='generate_forecast_api'),
    path('api/simulations/run/', run_simulation_api, name='run_simulation_api'),
    path('api/inventory/safe-share/', calculate_safe_share_api, name='calculate_safe_share_api'),
    path('api/inventory/expiry-rescue/', expiry_rescue_api, name='expiry_rescue_api'),
    path('api/notifications/', include('apps.notifications.urls')),
    path('api/', include(router.urls)),
]
