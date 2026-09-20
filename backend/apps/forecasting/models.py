from django.db import models
from django.core.exceptions import ValidationError
from apps.facilities.models import Facility

class ForecastRecord(models.Model):
    facility = models.ForeignKey(Facility, on_delete=models.CASCADE, related_name='forecasts')
    blood_group = models.CharField(max_length=20)
    component_type = models.CharField(max_length=30)
    forecast_date = models.DateField()
    p10 = models.FloatField()
    p50 = models.FloatField()
    p90 = models.FloatField()
    protection_level = models.FloatField(default=0.0)
    model_name = models.CharField(max_length=100, default='XGBoost')
    prediction_interval_type = models.CharField(max_length=100, default='Estimated prediction interval')
    created_at = models.DateTimeField(auto_now_add=True)

    def clean(self):
        if not (self.p10 <= self.p50 <= self.p90):
            raise ValidationError(f"Invalid quantile ordering: P10 ({self.p10}) <= P50 ({self.p50}) <= P90 ({self.p90}) violated.")

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Forecast {self.facility.name} - {self.blood_group} ({self.p10}/{self.p50}/{self.p90})"
