from rest_framework.authtoken.models import Token
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView


class StaffTokenLogin(ObtainAuthToken):
    """Keep the existing frontend token contract with Django/DRF authentication."""

    def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        if not user.is_staff:
            return Response({"detail": "Staff access required"}, status=403)
        token, _created = Token.objects.get_or_create(user=user)
        return Response({"auth_token": token.key})


class StaffTokenLogout(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        request.auth.delete()
        return Response(status=204)
