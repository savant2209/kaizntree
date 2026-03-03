from decimal import Decimal
from typing import Any, cast

import pytest

from inventory.models import PurchaseOrder, PurchaseOrderItem, SalesOrder, SalesOrderItem, Stock


pytestmark = pytest.mark.django_db


def test_products_endpoint_requires_authentication():
    from rest_framework.test import APIClient

    client = APIClient()
    response = cast(Any, client.get('/api/inventory/products/'))

    assert response.status_code == 401


def test_token_endpoint_accepts_email_login(user):
    from rest_framework.test import APIClient

    client = APIClient()
    response = cast(
        Any,
        client.post(
            '/api/auth/token/',
            {'username': user.email, 'password': 'StrongPass123!'},
            format='json',
        ),
    )

    assert response.status_code == 200
    assert 'access' in response.data
    assert 'refresh' in response.data


def test_receive_purchase_order_endpoint_creates_stock_and_updates_status(auth_client, user, product):
    order = PurchaseOrder.objects.create(user=user, total_amount=Decimal('15.00'))
    item = PurchaseOrderItem.objects.create(
        user=user,
        purchase_order=order,
        product=product,
        quantity=Decimal('5.000'),
        unit_price=Decimal('3.00'),
        order_unit='KG',
    )
    assert order.pk is not None
    assert item.pk is not None

    response = cast(
        Any,
        auth_client.post(
            f'/api/inventory/purchase-orders/{order.pk}/receive/',
            {'items': [{'id': item.pk, 'quantity_received': '5.000'}]},
            format='json',
        ),
    )

    assert response.status_code == 200

    item.refresh_from_db()
    order.refresh_from_db()
    stock = Stock.objects.get(purchase_order=order, product=product)

    assert item.quantity_received == Decimal('5.000')
    assert order.status == 'RECEIVED'
    assert stock.quantity == Decimal('5.000')


def test_deliver_item_endpoint_rejects_quantity_above_remaining(auth_client, user, product):
    Stock.objects.create(user=user, product=product, quantity=Decimal('10.000'), source='MANUAL')
    order = SalesOrder.objects.create(user=user, total_amount=Decimal('20.00'))
    item = SalesOrderItem.objects.create(
        user=user,
        sales_order=order,
        product=product,
        quantity=Decimal('2.000'),
        unit_price=Decimal('10.00'),
        order_unit='KG',
    )
    assert item.pk is not None

    response = cast(
        Any,
        auth_client.post(
            f'/api/inventory/sales-order-items/{item.pk}/deliver/',
            {'quantity_delivered': '3.000'},
            format='json',
        ),
    )

    assert response.status_code == 400
    assert 'exceeds remaining quantity' in str(response.data).lower()
