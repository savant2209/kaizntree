from rest_framework.routers import DefaultRouter

from .views import (
  CustomerViewSet,
  ProductViewSet,
  PurchaseOrderItemViewSet,
  PurchaseOrderViewSet,
  SalesOrderItemViewSet,
  SalesOrdersViewSet,
  StockViewSet,
  SupplierViewSet,
)

router = DefaultRouter()
router.register(r'customers', CustomerViewSet, basename='customer')
router.register(r'products', ProductViewSet, basename='product')
router.register(r'purchase-orders', PurchaseOrderViewSet, basename='purchase-order')
router.register(r'purchase-order-items', PurchaseOrderItemViewSet, basename='purchase-order-item')
router.register(r'sales-orders', SalesOrdersViewSet, basename='sales-order')
router.register(r'sales-order-items', SalesOrderItemViewSet, basename='sales-order-item')
router.register(r'stocks', StockViewSet, basename='stock')
router.register(r'suppliers', SupplierViewSet, basename='supplier')

urlpatterns = router.urls
