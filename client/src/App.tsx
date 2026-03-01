import { Navigate, Route, Routes } from 'react-router-dom';

import { LoginPage } from './features/auth/pages/LoginPage';
import { CustomersPage } from './features/customers/pages/CustomersPage';
import { DashboardPage } from './features/dashboard/pages/DashboardPage';
import { ProductsPage } from './features/products/pages/ProductsPage';
import { NewPurchaseOrderPage } from './features/purchaseOrders/pages/NewPurchaseOrderPage';
import { PurchaseOrderDetailPage } from './features/purchaseOrders/pages/PurchaseOrderDetailPage';
import { PurchaseOrdersPage } from './features/purchaseOrders/pages/PurchaseOrdersPage';
import { NewSalesOrderPage } from './features/salesOrders/pages/NewSalesOrderPage';
import { SalesOrderDetailPage } from './features/salesOrders/pages/SalesOrderDetailPage';
import { SalesOrdersPage } from './features/salesOrders/pages/SalesOrdersPage';
import { SuppliersPage } from './features/suppliers/pages/SuppliersPage';
import { AppLayout } from './shared/layout/AppLayout';
import { ProtectedRoute } from './shared/router/ProtectedRoute';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/purchase-orders" element={<PurchaseOrdersPage />} />
          <Route path="/purchase-orders/new" element={<NewPurchaseOrderPage />} />
          <Route path="/purchase-orders/:id" element={<PurchaseOrderDetailPage />} />
          <Route path="/sales-orders" element={<SalesOrdersPage />} />
          <Route path="/sales-orders/new" element={<NewSalesOrderPage />} />
          <Route path="/sales-orders/:id" element={<SalesOrderDetailPage />} />
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/suppliers" element={<SuppliersPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;