from datetime import date
from decimal import Decimal
from typing import Any

from django.db import transaction
from django.db.models import DateField, F, Value
from django.db.models.functions import Coalesce
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import (
	Customer,
	Product,
	PurchaseOrder,
	PurchaseOrderItem,
	SalesOrderItem,
	SalesOrder,
	Stock,
	Supplier,
)
from .serializers import (
	CustomerSerializer,
	ProductSerializer,
	PurchaseOrderItemSerializer,
	PurchaseOrderSerializer,
	SalesOrderItemSerializer,
	SalesOrdersSerializer,
	StockSerializer,
	SupplierSerializer,
)


def _read_decimal(value, fallback: Decimal) -> Decimal:
	if value is None or value == '':
		return fallback
	return Decimal(str(value))


def _consume_fifo_stock(user, product_id: int, quantity_to_consume: Decimal) -> None:
	stock_entries = list(
		Stock.objects.select_for_update()
		.filter(user=user, product_id=product_id, quantity__gt=0)
		.annotate(_expiration_sort=Coalesce('expiration_date', Value(date(9999, 12, 31), output_field=DateField())))
		.order_by('_expiration_sort', 'created_at', 'id')
	)

	available = sum((entry.quantity for entry in stock_entries), Decimal('0'))
	if available < quantity_to_consume:
		raise ValueError(f'Insufficient stock. Required={quantity_to_consume}, available={available}')

	remaining = quantity_to_consume
	for entry in stock_entries:
		if remaining <= Decimal('0'):
			break

		deduct = min(entry.quantity, remaining)
		entry.quantity = entry.quantity - deduct
		entry.save(update_fields=['quantity'])
		remaining -= deduct


def _deliver_sales_order(user, order: SalesOrder, payload_items=None) -> None:
	items = list(SalesOrderItem.objects.select_for_update().filter(user=user, sales_order=order))
	payload_by_id: dict[int, dict[str, Any]] = {}
	if isinstance(payload_items, list):
		for payload in payload_items:
			if isinstance(payload, dict) and payload.get('id'):
				payload_by_id[int(payload['id'])] = payload

	for item in items:
		remaining = item.quantity - item.quantity_delivered
		if remaining <= Decimal('0'):
			continue

		item_id = int(getattr(item, 'id'))
		product_id = int(getattr(item, 'product_id'))

		payload = payload_by_id.get(item_id)
		qty = _read_decimal(payload.get('quantity_delivered') if payload else None, remaining)
		if qty <= Decimal('0'):
			continue
		if qty > remaining:
			raise ValueError(f'Delivered quantity exceeds remaining quantity for item #{item_id}.')

		_consume_fifo_stock(user, product_id, qty)

		item.quantity_delivered = item.quantity_delivered + qty
		item.save(update_fields=['quantity_delivered'])

	order_items = getattr(order, 'items')
	if not order_items.filter(quantity_delivered__lt=F('quantity')).exists() and order.status != 'DELIVERED':
		order.status = 'DELIVERED'
		order.save(update_fields=['status'])


def _receive_purchase_order(user, order: PurchaseOrder, payload_items=None) -> None:
	items = list(PurchaseOrderItem.objects.select_for_update().filter(user=user, purchase_order=order))
	payload_by_id: dict[int, dict[str, Any]] = {}
	if isinstance(payload_items, list):
		for payload in payload_items:
			if isinstance(payload, dict) and payload.get('id'):
				payload_by_id[int(payload['id'])] = payload

	for item in items:
		remaining = item.quantity - item.quantity_received
		if remaining <= Decimal('0'):
			continue

		item_id = int(getattr(item, 'id'))
		payload = payload_by_id.get(item_id)
		qty = _read_decimal(payload.get('quantity_received') if payload else None, remaining)
		if qty <= Decimal('0'):
			continue
		if qty > remaining:
			raise ValueError(f'Received quantity exceeds remaining quantity for item #{item_id}.')

		Stock.objects.create(
			user=user,
			product=item.product,
			quantity=qty,
			source='PO',
			purchase_order=order,
		)

		item.quantity_received = item.quantity_received + qty
		item.save(update_fields=['quantity_received'])

	order_items = getattr(order, 'items')
	if not order_items.filter(quantity_received__lt=F('quantity')).exists() and order.status != 'RECEIVED':
		order.status = 'RECEIVED'
		order.save(update_fields=['status'])


class OwnedModelViewSet(viewsets.ModelViewSet):
	permission_classes = (IsAuthenticated,)

	def get_queryset(self):
		queryset = super().get_queryset()
		return queryset.filter(user=self.request.user)

	def perform_create(self, serializer):
		serializer.save(user=self.request.user)


class CustomerViewSet(OwnedModelViewSet):
	queryset = Customer.objects.all()
	serializer_class = CustomerSerializer


class ProductViewSet(OwnedModelViewSet):
	queryset = Product.objects.all()
	serializer_class = ProductSerializer


class PurchaseOrderViewSet(OwnedModelViewSet):
	queryset = PurchaseOrder.objects.all()
	serializer_class = PurchaseOrderSerializer

	def partial_update(self, request, *args, **kwargs):
		order = self.get_object()
		requested_status = request.data.get('status') if isinstance(request.data, dict) else None

		with transaction.atomic():
			locked_order = PurchaseOrder.objects.select_for_update().get(pk=order.pk, user=request.user)

			if requested_status == 'RECEIVED' and locked_order.status != 'RECEIVED':
				try:
					_receive_purchase_order(request.user, locked_order)
				except ValueError as exc:
					return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

		return super().partial_update(request, *args, **kwargs)

	@action(detail=True, methods=['post'], url_path='receive')
	def receive(self, request, pk=None):
		order = self.get_object()

		with transaction.atomic():
			order = PurchaseOrder.objects.select_for_update().get(pk=order.pk, user=request.user)
			payload_items = request.data.get('items') if isinstance(request.data, dict) else None
			try:
				_receive_purchase_order(request.user, order, payload_items)
			except ValueError as exc:
				return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

		serializer = self.get_serializer(order)
		return Response(serializer.data, status=status.HTTP_200_OK)


class PurchaseOrderItemViewSet(OwnedModelViewSet):
	queryset = PurchaseOrderItem.objects.all()
	serializer_class = PurchaseOrderItemSerializer

	@action(detail=True, methods=['post'], url_path='receive')
	def receive(self, request, pk=None):
		item = self.get_object()

		with transaction.atomic():
			item = PurchaseOrderItem.objects.select_for_update().get(pk=item.pk, user=request.user)
			remaining = item.quantity - item.quantity_received
			if remaining <= Decimal('0'):
				return Response({'detail': 'Item already fully received.'}, status=status.HTTP_400_BAD_REQUEST)

			qty = _read_decimal(request.data.get('quantity_received') if isinstance(request.data, dict) else None, remaining)
			if qty <= Decimal('0'):
				return Response({'detail': 'Received quantity must be greater than zero.'}, status=status.HTTP_400_BAD_REQUEST)
			if qty > remaining:
				return Response({'detail': 'Received quantity exceeds remaining quantity.'}, status=status.HTTP_400_BAD_REQUEST)

			Stock.objects.create(
				user=request.user,
				product=item.product,
				quantity=qty,
				source='PO',
				purchase_order=item.purchase_order,
			)

			item.quantity_received = item.quantity_received + qty
			item.save(update_fields=['quantity_received'])

			order = item.purchase_order
			if not order.items.filter(quantity_received__lt=F('quantity')).exists() and order.status != 'RECEIVED':
				order.status = 'RECEIVED'
				order.save(update_fields=['status'])

		serializer = self.get_serializer(item)
		return Response(serializer.data, status=status.HTTP_200_OK)


class SalesOrdersViewSet(OwnedModelViewSet):
	queryset = SalesOrder.objects.all()
	serializer_class = SalesOrdersSerializer

	def partial_update(self, request, *args, **kwargs):
		order = self.get_object()
		requested_status = request.data.get('status') if isinstance(request.data, dict) else None

		with transaction.atomic():
			locked_order = SalesOrder.objects.select_for_update().get(pk=order.pk, user=request.user)

			if requested_status == 'DELIVERED' and locked_order.status != 'DELIVERED':
				try:
					_deliver_sales_order(request.user, locked_order)
				except ValueError as exc:
					return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

		return super().partial_update(request, *args, **kwargs)

	@action(detail=True, methods=['post'], url_path='deliver')
	def deliver(self, request, pk=None):
		order = self.get_object()

		with transaction.atomic():
			order = SalesOrder.objects.select_for_update().get(pk=order.pk, user=request.user)
			payload_items = request.data.get('items') if isinstance(request.data, dict) else None
			try:
				_deliver_sales_order(request.user, order, payload_items)
			except ValueError as exc:
				return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

		serializer = self.get_serializer(order)
		return Response(serializer.data, status=status.HTTP_200_OK)


class SalesOrderItemViewSet(OwnedModelViewSet):
	queryset = SalesOrderItem.objects.all()
	serializer_class = SalesOrderItemSerializer

	@action(detail=True, methods=['post'], url_path='deliver')
	def deliver(self, request, pk=None):
		item = self.get_object()

		with transaction.atomic():
			item = SalesOrderItem.objects.select_for_update().get(pk=item.pk, user=request.user)
			remaining = item.quantity - item.quantity_delivered

			if remaining <= Decimal('0'):
				return Response({'detail': 'Item already fully delivered.'}, status=status.HTTP_400_BAD_REQUEST)

			qty = _read_decimal(request.data.get('quantity_delivered') if isinstance(request.data, dict) else None, remaining)
			if qty <= Decimal('0'):
				return Response({'detail': 'Delivered quantity must be greater than zero.'}, status=status.HTTP_400_BAD_REQUEST)
			if qty > remaining:
				return Response({'detail': 'Delivered quantity exceeds remaining quantity.'}, status=status.HTTP_400_BAD_REQUEST)

			try:
				_consume_fifo_stock(request.user, item.product_id, qty)
			except ValueError as exc:
				return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

			item.quantity_delivered = item.quantity_delivered + qty
			item.save(update_fields=['quantity_delivered'])

			sales_order = item.sales_order
			if not sales_order.items.filter(quantity_delivered__lt=F('quantity')).exists() and sales_order.status != 'DELIVERED':
				sales_order.status = 'DELIVERED'
				sales_order.save(update_fields=['status'])

		serializer = self.get_serializer(item)
		return Response(serializer.data, status=status.HTTP_200_OK)


class StockViewSet(OwnedModelViewSet):
	queryset = Stock.objects.all()
	serializer_class = StockSerializer


class SupplierViewSet(OwnedModelViewSet):
	queryset = Supplier.objects.all()
	serializer_class = SupplierSerializer