from rest_framework import permissions
from .models import UserRole

class IsAuthorizedApprover(permissions.BasePermission):
    """
    Permission check: Only ADMIN and AUTHORIZED_APPROVER roles can perform transfer approvals.
    """
    def has_permission(self, request, view):
        role = getattr(request.user, 'role', None) or request.headers.get('X-User-Role')
        if not role and hasattr(request, 'data'):
            role = request.data.get('user_role') or request.data.get('role')
        return role in ['ADMIN', 'AUTHORIZED_APPROVER']

class IsAdminUserRole(permissions.BasePermission):
    def has_permission(self, request, view):
        role = getattr(request.user, 'role', None) or request.headers.get('X-User-Role')
        return role == 'ADMIN'
