from rest_framework.permissions import BasePermission, SAFE_METHODS


class PublicReadStaffWrite(BasePermission):
    """Survey configuration is public; only staff can change it."""

    def has_permission(self, request, view):
        return request.method in SAFE_METHODS or bool(request.user and request.user.is_staff)
