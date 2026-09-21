from django.urls import path
from .views import NotificationTestView, NotificationStatusView, BrevoWebhookView

app_name = 'notifications'

urlpatterns = [
    path('test/', NotificationTestView.as_view(), name='notification_test'),
    path('status/<str:notification_id>/', NotificationStatusView.as_view(), name='notification_status'),
    path('brevo-webhook/', BrevoWebhookView.as_view(), name='brevo_webhook'),
]
