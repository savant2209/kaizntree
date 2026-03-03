from rest_framework import serializers

from .models import (
    Customer,
    Product,
    PurchaseOrder,
    PurchaseOrderItem,
    SalesOrderItem,
    SalesOrder,
    SequenceCounterPO,
    SequenceCounterSO,
    Stock,
    Supplier,
)


class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'user')


class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'user')


class PurchaseOrderSerializer(serializers.ModelSerializer):
    class Meta:
        model = PurchaseOrder
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'last_updated', 'order_number', 'user')


class PurchaseOrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = PurchaseOrderItem
        fields = '__all__'
        read_only_fields = ('id', 'user', 'quantity_received')


class SalesOrdersSerializer(serializers.ModelSerializer):
    class Meta:
        model = SalesOrder
        fields = '__all__'
        read_only_fields = ('id', 'order_at', 'last_updated', 'order_number', 'user')


class SalesOrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = SalesOrderItem
        fields = '__all__'
        read_only_fields = ('id', 'user', 'quantity_delivered')


class StockSerializer(serializers.ModelSerializer):
    class Meta:
        model = Stock
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'user')


class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'user')


class SequenceCounterPOSerializer(serializers.ModelSerializer):
    class Meta:
        model = SequenceCounterPO
        fields = '__all__'
        read_only_fields = ('id', 'user')


class SequenceCounterSOSerializer(serializers.ModelSerializer):
    class Meta:
        model = SequenceCounterSO
        fields = '__all__'
        read_only_fields = ('id', 'user')