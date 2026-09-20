from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SimulationRecordViewSet, run_simulation_api

router = DefaultRouter()
router.register('simulations', SimulationRecordViewSet, basename='simulation')

urlpatterns = [
    path('', include(router.urls)),
    path('simulations/run/', run_simulation_api, name='run_simulation_api'),
]
