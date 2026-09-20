from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ForecastRecordViewSet, generate_forecast_api

router = DefaultRouter()
router.register('forecasts', ForecastRecordViewSet, basename='forecast')

urlpatterns = [
    path('', include(router.urls)),
    path('forecasts/generate/', generate_forecast_api, name='generate_forecast_api'),
]
