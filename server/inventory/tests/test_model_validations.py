from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from django.db import IntegrityError

from inventory.models import Product, SalesOrder, Stock


pytestmark = pytest.mark.django_db


def test_product_sku_must_be_unique_per_user(user):
    Product.objects.create(
        user=user,
        name='Feijao',
        sku='SKU-1',
        default_unit='KG',
        price=Decimal('10.00'),
        category='Grains',
    )

    with pytest.raises(IntegrityError):
        Product.objects.create(
            user=user,
            name='Arroz',
            sku='SKU-1',
            default_unit='KG',
            price=Decimal('12.00'),
            category='Grains',
        )


def test_product_sku_can_repeat_for_different_users(user):
    User = get_user_model()
    second_user = User.objects.create_user(
        username='tester2',
        email='tester2@example.com',
        password='StrongPass123!'
    )

    Product.objects.create(
        user=user,
        name='Feijao',
        sku='SKU-2',
        default_unit='KG',
        price=Decimal('10.00'),
        category='Grains',
    )

    product = Product.objects.create(
        user=second_user,
        name='Feijao B',
        sku='SKU-2',
        default_unit='KG',
        price=Decimal('11.00'),
        category='Grains',
    )

    assert product.pk is not None


def test_sales_order_number_must_be_unique_per_user(user):
    SalesOrder.objects.create(user=user, order_number='SO-TEST-1', total_amount=Decimal('10.00'))

    with pytest.raises(IntegrityError):
        SalesOrder.objects.create(user=user, order_number='SO-TEST-1', total_amount=Decimal('20.00'))


def test_stock_initial_quantity_defaults_to_quantity(user):
    product = Product.objects.create(
        user=user,
        name='Milho',
        sku='SKU-3',
        default_unit='KG',
        price=Decimal('8.00'),
        category='Grains',
    )

    stock = Stock.objects.create(
        user=user,
        product=product,
        quantity=Decimal('7.500'),
        source='MANUAL',
    )

    assert stock.initial_quantity == Decimal('7.500')
