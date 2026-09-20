from rest_framework import viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.db import connection
from .models import User
from .serializers import UserSerializer
from integrations.ml_service.client import MLServiceClient

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [AllowAny]

@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    db_status = "healthy"
    db_vendor = getattr(connection, 'vendor', 'unknown')
    try:
        connection.ensure_connection()
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"

    ml_client = MLServiceClient()
    ml_health = ml_client.check_health()

    return Response({
        "status": "healthy",
        "service": "BloodChain Django REST Framework API",
        "database": {
            "status": db_status,
            "vendor": db_vendor,
            "is_postgresql": db_vendor == 'postgresql'
        },
        "ml_service": ml_health,
        "mode": "PostgreSQL (Neon Cloud)" if db_vendor == 'postgresql' else "SQLite (Local Fallback)"
    })
