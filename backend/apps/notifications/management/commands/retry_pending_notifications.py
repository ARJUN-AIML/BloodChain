from django.core.management.base import BaseCommand
from apps.notifications.integration_service import NotificationService

class Command(BaseCommand):
    help = 'Sweeps and retries stuck pending or retryable failed NotificationDelivery records.'

    def handle(self, *args, **options):
        self.stdout.write("Starting outbox notification retry sweeper...")
        retried_count = NotificationService.retry_pending_notifications()
        self.stdout.write(self.style.SUCCESS(f"Successfully processed {retried_count} notification outbox records."))
