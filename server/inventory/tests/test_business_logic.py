from decimal import Decimal
from typing import Any, cast

import pytest

from inventory.models import SalesOrder, SalesOrderItem, Stock


pytestmark = pytest.mark.django_db


def _realized_financials(purchased_qty: Decimal, purchased_cost: Decimal, sold_qty: Decimal, revenue: Decimal):
    avg_cost = purchased_cost / purchased_qty if purchased_qty > 0 else Decimal('0')
    cost = sold_qty * avg_cost
    profit = revenue - cost
    margin = (profit / revenue * Decimal('100')) if revenue > 0 else Decimal('0')
    markup = (profit / cost * Decimal('100')) if cost > 0 else Decimal('0')
    return cost, profit, margin, markup


def test_realized_profit_calculation_weighted_average_cost():
    cost, profit, margin, markup = _realized_financials(
        purchased_qty=Decimal('20'),
        purchased_cost=Decimal('120'),
        sold_qty=Decimal('8'),
        revenue=Decimal('80'),
    )

    assert cost == Decimal('48')
    assert profit == Decimal('32')
    assert margin == Decimal('40')
    assert round(markup, 2) == Decimal('66.67')


def test_sales_delivery_consumes_stock_by_fefo(auth_client, user, product):
    early_batch = Stock.objects.create(
        user=user,
        product=product,
        quantity=Decimal('2.000'),
        expiration_date='2026-03-15',
        source='MANUAL',
    )
    late_batch = Stock.objects.create(
        user=user,
        product=product,
        quantity=Decimal('3.000'),
        expiration_date='2026-04-15',
        source='MANUAL',
    )

    order = SalesOrder.objects.create(user=user, total_amount=Decimal('80.00'))
    item = SalesOrderItem.objects.create(
        user=user,
        sales_order=order,
        product=product,
        quantity=Decimal('4.000'),
        unit_price=Decimal('10.00'),
        order_unit='KG',
    )
    assert item.pk is not None

    response = cast(
        Any,
        auth_client.post(
            f'/api/inventory/sales-order-items/{item.pk}/deliver/',
            {'quantity_delivered': '4.000'},
            format='json',
        ),
    )

    assert response.status_code == 200

    early_batch.refresh_from_db()
    late_batch.refresh_from_db()
    order.refresh_from_db()

    assert early_batch.quantity == Decimal('0.000')
    assert late_batch.quantity == Decimal('1.000')
    assert order.status == 'DELIVERED'
