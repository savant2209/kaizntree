from django.contrib.auth import get_user_model
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView


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
