from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from inventory.models import Product


@pytest.fixture
def user(db):
    User = get_user_model()
    return User.objects.create_user(
        username='tester',
        email='tester@example.com',
        password='StrongPass123!'
    )


@pytest.fixture
def auth_client(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.fixture
def product(user):
    return Product.objects.create(
        user=user,
        name='Feijao',
        sku='FEI-001',
        default_unit='KG',
        price=Decimal('10.00'),
        category='Grains',
    )
