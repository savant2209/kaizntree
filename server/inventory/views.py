from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

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


class PurchaseOrderItemViewSet(OwnedModelViewSet):
	queryset = PurchaseOrderItem.objects.all()
	serializer_class = PurchaseOrderItemSerializer


class SalesOrdersViewSet(OwnedModelViewSet):
	queryset = SalesOrder.objects.all()
	serializer_class = SalesOrdersSerializer


class SalesOrderItemViewSet(OwnedModelViewSet):
	queryset = SalesOrderItem.objects.all()
	serializer_class = SalesOrderItemSerializer


class StockViewSet(OwnedModelViewSet):
	queryset = Stock.objects.all()
	serializer_class = StockSerializer


class SupplierViewSet(OwnedModelViewSet):
	queryset = Supplier.objects.all()
	serializer_class = SupplierSerializer