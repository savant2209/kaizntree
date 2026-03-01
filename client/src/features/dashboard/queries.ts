import { useQuery } from '@tanstack/react-query';

import {
  listProducts,
  listPurchaseOrderItems,
  listPurchaseOrders,
  listSalesOrderItems,
  listSalesOrders,
} from '../../shared/api/inventoryApi';
import { toNumber } from '../../shared/utils/format';

const dashboardKey = ['dashboard', 'summary'];

type TopProduct = {
  productId: number;
  name: string;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
};

type DashboardData = {
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
  openOrders: number;
  topProducts: TopProduct[];
};

export function useDashboardQuery() {
  return useQuery<DashboardData>({
    queryKey: dashboardKey,
    queryFn: async () => {
      const [products, purchaseOrders, purchaseItems, salesOrders, salesItems] = await Promise.all([
        listProducts(),
        listPurchaseOrders(),
        listPurchaseOrderItems(),
        listSalesOrders(),
        listSalesOrderItems(),
      ]);

      const revenue = salesOrders
        .filter((order) => order.status !== 'CANCELLED')
        .reduce((sum, order) => sum + toNumber(order.total_amount), 0);

      const cost = purchaseOrders
        .filter((order) => order.status !== 'CANCELLED')
        .reduce((sum, order) => sum + toNumber(order.total_amount), 0);

      const profit = revenue - cost;
      const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

      const openOrders =
        purchaseOrders.filter((order) => order.status === 'DRAFT' || order.status === 'ORDER').length +
        salesOrders.filter((order) => order.status === 'ORDER').length;

      const weightedCostByProduct = new Map<number, { totalCost: number; totalQty: number }>();
      purchaseItems.forEach((item) => {
        const qty = toNumber(item.quantity);
        const unitPrice = toNumber(item.unit_price);
        const current = weightedCostByProduct.get(item.product) || { totalCost: 0, totalQty: 0 };
        current.totalCost += qty * unitPrice;
        current.totalQty += qty;
        weightedCostByProduct.set(item.product, current);
      });

      const salesByProduct = new Map<number, { revenue: number; qty: number }>();
      salesItems.forEach((item) => {
        const qty = toNumber(item.quantity);
        const unitPrice = toNumber(item.unit_price);
        const current = salesByProduct.get(item.product) || { revenue: 0, qty: 0 };
        current.revenue += qty * unitPrice;
        current.qty += qty;
        salesByProduct.set(item.product, current);
      });

      const topProducts: TopProduct[] = [...salesByProduct.entries()]
        .map(([productId, sales]) => {
          const costData = weightedCostByProduct.get(productId);
          const avgCost = costData && costData.totalQty > 0 ? costData.totalCost / costData.totalQty : 0;
          const totalCost = sales.qty * avgCost;
          const totalProfit = sales.revenue - totalCost;
          const itemMargin = sales.revenue > 0 ? (totalProfit / sales.revenue) * 100 : 0;
          const product = products.find((candidate) => candidate.id === productId);

          return {
            productId,
            name: product?.name || `Produto #${productId}`,
            revenue: sales.revenue,
            cost: totalCost,
            profit: totalProfit,
            margin: itemMargin,
          };
        })
        .sort((left, right) => right.profit - left.profit)
        .slice(0, 5);

      return { revenue, cost, profit, margin, openOrders, topProducts };
    },
  });
}
