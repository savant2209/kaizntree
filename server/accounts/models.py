from django.db import models
from django.contrib.auth.models import AbstractUser

class CustomUser(AbstractUser):
    # AWS Cognito sub 
    cognito_sub = models.UUIDField(unique=True, null=True, blank=True)
    
    def __str__(self):
        return self.email or self.username