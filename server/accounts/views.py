from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView

from .serializers import RegisterSerializer


class EmailOrUsernameTokenObtainPairSerializer(TokenObtainPairSerializer):
	def validate(self, attrs):
		login_value = attrs.get(self.username_field)

		if login_value and '@' in login_value:
			user_model = get_user_model()
			user = user_model.objects.filter(email__iexact=login_value).first()
			if user:
				attrs[self.username_field] = getattr(user, self.username_field)

		return super().validate(attrs)


class EmailOrUsernameTokenObtainPairView(TokenObtainPairView):
	serializer_class = EmailOrUsernameTokenObtainPairSerializer


class RegisterView(APIView):
	permission_classes = (AllowAny,)

	def post(self, request):
		serializer = RegisterSerializer(data=request.data)
		serializer.is_valid(raise_exception=True)
		serializer.save()
		return Response({'detail': 'Account created successfully.'}, status=status.HTTP_201_CREATED)
