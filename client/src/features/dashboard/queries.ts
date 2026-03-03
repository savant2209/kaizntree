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

export type DashboardPeriod = 'all' | 'this-month' | 'last-30-days';

type ProductFinancial = {
  productId: number;
  name: string;
  purchasedQty: number;
  purchaseCost: number;
  soldQty: number;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
  markup: number;
  inStockQty: number;
  assetValue: number;
  expectedRevenue: number;
};

type DashboardData = {
  purchasedQty: number;
  soldQty: number;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
  markup: number;
  avgRevenuePerUnit: number;
  avgCostPerUnit: number;
  avgProfitPerUnit: number;
  totalInStockQty: number;
  totalAssetValue: number;
  totalExpectedRevenue: number;
  openOrders: number;
  productFinancials: ProductFinancial[];
  products: Array<{ value: string; label: string }>;
};

const resolveDate = (value?: string | null): Date | null => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
};

const isWithinPeriod = (date: Date | null, period: DashboardPeriod): boolean => {
  if (!date) return period === 'all';
  if (period === 'all') return true;

  const now = new Date();

  if (period === 'last-30-days') {
    const cutoff = new Date(now);
    cutoff.setDate(now.getDate() - 30);
    return date >= cutoff;
  }

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  return date >= startOfMonth;
};

export function useDashboardQuery(filters: { period: DashboardPeriod; productId: string | null }) {
  const { period, productId } = filters;

  return useQuery<DashboardData>({
    queryKey: [...dashboardKey, period, productId],
    queryFn: async () => {
      const [products, purchaseOrders, purchaseItems, salesOrders, salesItems] = await Promise.all([
        listProducts(),
        listPurchaseOrders(),
        listPurchaseOrderItems(),
        listSalesOrders(),
        listSalesOrderItems(),
      ]);

      const selectedProductId = productId ? Number(productId) : null;

      const filteredPurchaseOrders = purchaseOrders.filter((order) =>
        isWithinPeriod(resolveDate(order.order_at || order.created_at), period),
      );
      const filteredSalesOrders = salesOrders.filter((order) => isWithinPeriod(resolveDate(order.order_at || order.last_updated), period));

      const filteredPurchaseOrderIds = new Set(filteredPurchaseOrders.map((order) => order.id));
      const filteredSalesOrderIds = new Set(filteredSalesOrders.map((order) => order.id));

      const periodPurchaseItems = purchaseItems.filter((item) => filteredPurchaseOrderIds.has(item.purchase_order));
      const periodSalesItems = salesItems.filter((item) => filteredSalesOrderIds.has(item.sales_order));

      const scopedPurchaseItems = selectedProductId
        ? periodPurchaseItems.filter((item) => item.product === selectedProductId)
        : periodPurchaseItems;
      const scopedSalesItems = selectedProductId
        ? periodSalesItems.filter((item) => item.product === selectedProductId)
        : periodSalesItems;

      const purchaseOrdersWithSelectedProduct = new Set(scopedPurchaseItems.map((item) => item.purchase_order));
      const salesOrdersWithSelectedProduct = new Set(scopedSalesItems.map((item) => item.sales_order));

      const validPurchaseOrderIds = new Set(
        filteredPurchaseOrders
          .filter((order) => order.status !== 'DRAFT' && order.status !== 'CANCELLED' && order.status !== 'RETURNED')
          .filter((order) => !selectedProductId || purchaseOrdersWithSelectedProduct.has(order.id))
          .map((order) => order.id),
      );
      const validSalesOrderIds = new Set(
        filteredSalesOrders
          .filter((order) => order.status !== 'CANCELLED' && order.status !== 'RETURNED')
          .filter((order) => !selectedProductId || salesOrdersWithSelectedProduct.has(order.id))
          .map((order) => order.id),
      );

      const validPurchaseItems = scopedPurchaseItems.filter((item) => validPurchaseOrderIds.has(item.purchase_order));
      const validSalesItems = scopedSalesItems.filter((item) => validSalesOrderIds.has(item.sales_order));

      const openPurchaseOrders = filteredPurchaseOrders.filter(
        (order) =>
          (order.status === 'DRAFT' || order.status === 'ORDER') &&
          (!selectedProductId || purchaseOrdersWithSelectedProduct.has(order.id)),
      ).length;
      const openSalesOrders = filteredSalesOrders.filter(
        (order) => order.status === 'ORDER' && (!selectedProductId || salesOrdersWithSelectedProduct.has(order.id)),
      ).length;
      const openOrders = openPurchaseOrders + openSalesOrders;

      const weightedCostByProduct = new Map<number, { totalCost: number; totalQty: number }>();
      validPurchaseItems.forEach((item) => {
        const qty = toNumber(item.quantity);
        const unitPrice = toNumber(item.unit_price);
        const current = weightedCostByProduct.get(item.product) || { totalCost: 0, totalQty: 0 };
        current.totalCost += qty * unitPrice;
        current.totalQty += qty;
        weightedCostByProduct.set(item.product, current);
      });

      const purchaseByProduct = new Map<number, { cost: number; qty: number }>();
      validPurchaseItems.forEach((item) => {
        const qty = toNumber(item.quantity);
        const unitPrice = toNumber(item.unit_price);
        const current = purchaseByProduct.get(item.product) || { cost: 0, qty: 0 };
        current.cost += qty * unitPrice;
        current.qty += qty;
        purchaseByProduct.set(item.product, current);
      });

      const salesByProduct = new Map<number, { revenue: number; qty: number }>();
      validSalesItems.forEach((item) => {
        const qty = toNumber(item.quantity);
        const unitPrice = toNumber(item.unit_price);
        const current = salesByProduct.get(item.product) || { revenue: 0, qty: 0 };
        current.revenue += qty * unitPrice;
        current.qty += qty;
        salesByProduct.set(item.product, current);
      });

      const productIds = new Set<number>([
        ...Array.from(purchaseByProduct.keys()),
        ...Array.from(salesByProduct.keys()),
      ]);

      const productFinancials: ProductFinancial[] = [...productIds]
        .map((productId) => {
          const sales = salesByProduct.get(productId) || { revenue: 0, qty: 0 };
          const purchases = purchaseByProduct.get(productId) || { cost: 0, qty: 0 };
          const costData = weightedCostByProduct.get(productId);
          const avgCost = costData && costData.totalQty > 0 ? costData.totalCost / costData.totalQty : 0;
          const avgSellPrice = sales.qty > 0 ? sales.revenue / sales.qty : 0;
          const allocatedCost = sales.qty * avgCost;
          const totalProfit = sales.revenue - allocatedCost;
          const itemMargin = sales.revenue > 0 ? (totalProfit / sales.revenue) * 100 : 0;
          const itemMarkup = allocatedCost > 0 ? (totalProfit / allocatedCost) * 100 : 0;
          const inStockQty = purchases.qty - sales.qty;
          const assetValue = inStockQty > 0 ? inStockQty * avgCost : 0;
          const expectedRevenue = inStockQty > 0 ? inStockQty * avgSellPrice : 0;
          const product = products.find((candidate) => candidate.id === productId);

          return {
            productId,
            name: product?.name || `Product #${productId}`,
            purchasedQty: purchases.qty,
            purchaseCost: purchases.cost,
            soldQty: sales.qty,
            revenue: sales.revenue,
            cost: allocatedCost,
            profit: totalProfit,
            margin: itemMargin,
            markup: itemMarkup,
            inStockQty,
            assetValue,
            expectedRevenue,
          };
        })
        .sort((left, right) => right.profit - left.profit)
        .slice(0, 10);

      const purchasedQty = productFinancials.reduce((sum, item) => sum + item.purchasedQty, 0);
      const soldQty = productFinancials.reduce((sum, item) => sum + item.soldQty, 0);
      const revenue = productFinancials.reduce((sum, item) => sum + item.revenue, 0);
      const cost = productFinancials.reduce((sum, item) => sum + item.cost, 0);
      const profit = productFinancials.reduce((sum, item) => sum + item.profit, 0);
      const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
      const markup = cost > 0 ? (profit / cost) * 100 : 0;
      const avgRevenuePerUnit = soldQty > 0 ? revenue / soldQty : 0;
      const avgCostPerUnit = soldQty > 0 ? cost / soldQty : 0;
      const avgProfitPerUnit = soldQty > 0 ? profit / soldQty : 0;
      const totalInStockQty = productFinancials.reduce((sum, item) => sum + item.inStockQty, 0);
      const totalAssetValue = productFinancials.reduce((sum, item) => sum + item.assetValue, 0);
      const totalExpectedRevenue = productFinancials.reduce((sum, item) => sum + item.expectedRevenue, 0);

      const productOptions = products
        .slice()
        .sort((left, right) => left.name.localeCompare(right.name))
        .map((product) => ({ value: String(product.id), label: `${product.name} (${product.sku})` }));

      return {
        purchasedQty,
        soldQty,
        revenue,
        cost,
        profit,
        margin,
        markup,
        avgRevenuePerUnit,
        avgCostPerUnit,
        avgProfitPerUnit,
        totalInStockQty,
        totalAssetValue,
        totalExpectedRevenue,
        openOrders,
        productFinancials,
        products: productOptions,
      };
    },
  });
}
