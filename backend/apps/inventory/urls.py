from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import BloodInventoryViewSet, InventoryBatchViewSet, calculate_safe_share_api, expiry_rescue_api

router = DefaultRouter()
router.register('inventory', BloodInventoryViewSet, basename='inventory')
router.register('inventory/batches', InventoryBatchViewSet, basename='inventory-batch')

urlpatterns = [
    path('', include(router.urls)),
    path('safe-to-share/', calculate_safe_share_api, name='safe_to_share_api'),
    path('expiry-rescue/', expiry_rescue_api, name='expiry_rescue_api'),
]
