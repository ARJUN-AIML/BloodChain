from django.db import models

class SimulationRecord(models.Model):
    scenario_name = models.CharField(max_length=100)
    baseline_demand = models.FloatField(default=1.0)
    modified_demand = models.FloatField(default=1.0)
    risk_summary = models.JSONField(default=dict)
    created_by = models.CharField(max_length=255, default='SYSTEM')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Simulation [{self.scenario_name}] at {self.created_at}"
