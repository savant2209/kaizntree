import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';

import {
  createSalesOrder,
  createSalesOrderItem,
  getSalesOrder,
  listCustomers,
  listProducts,
  listPurchaseOrderItems,
  listSalesOrderItems,
  listSalesOrders,
  updateSalesOrder,
} from '../../shared/api/inventoryApi';
import type { ProductDTO, SalesOrderDTO } from '../../shared/types/dto';
import { toNumber } from '../../shared/utils/format';

const salesKeys = {
  orders: ['sales-orders'] as const,
  items: ['sales-order-items'] as const,
  detail: (id: number) => ['sales-orders', id] as const,
};

export function useSalesOrdersQuery() {
  return useQuery({
    queryKey: salesKeys.orders,
    queryFn: async () => {
      const [orders, customers, salesItems, purchaseItems] = await Promise.all([
        listSalesOrders(),
        listCustomers(),
        listSalesOrderItems(),
        listPurchaseOrderItems(),
      ]);

      const averageCostByProduct = purchaseItems.reduce<Record<number, { totalCost: number; totalQty: number }>>(
        (acc, item) => {
          const current = acc[item.product] || { totalCost: 0, totalQty: 0 };
          const qty = toNumber(item.quantity);
          current.totalQty += qty;
          current.totalCost += qty * toNumber(item.unit_price);
          acc[item.product] = current;
          return acc;
        },
        {},
      );

      const estimatedProfitByOrder = salesItems.reduce<Record<number, number>>((acc, item) => {
        const costData = averageCostByProduct[item.product];
        const avgCost = costData && costData.totalQty > 0 ? costData.totalCost / costData.totalQty : 0;
        const qty = toNumber(item.quantity);
        const unitPrice = toNumber(item.unit_price);
        const profit = qty * (unitPrice - avgCost);
        acc[item.sales_order] = (acc[item.sales_order] || 0) + profit;
        return acc;
      }, {});

      return { orders, customers, estimatedProfitByOrder };
    },
  });
}

export function useSalesOrderDetailQuery(orderId: number) {
  return useQuery({
    queryKey: salesKeys.detail(orderId),
    queryFn: async () => {
      const [order, items, products, customers, purchaseItems] = await Promise.all([
        getSalesOrder(orderId),
        listSalesOrderItems(),
        listProducts(),
        listCustomers(),
        listPurchaseOrderItems(),
      ]);

      const averageCostByProduct = purchaseItems.reduce<Record<number, { totalCost: number; totalQty: number }>>(
        (acc, item) => {
          const current = acc[item.product] || { totalCost: 0, totalQty: 0 };
          const qty = toNumber(item.quantity);
          current.totalQty += qty;
          current.totalCost += qty * toNumber(item.unit_price);
          acc[item.product] = current;
          return acc;
        },
        {},
      );

      return {
        order,
        items: items.filter((item) => item.sales_order === orderId),
        products,
        customers,
        averageCostByProduct,
      };
    },
  });
}

export function useSalesOrderFormQuery() {
  return useQuery({
    queryKey: ['sales-order-form'],
    queryFn: async () => {
      const [products, customers, purchaseItems] = await Promise.all([
        listProducts(),
        listCustomers(),
        listPurchaseOrderItems(),
      ]);

      const averageCostByProduct = purchaseItems.reduce<Record<number, { totalCost: number; totalQty: number }>>(
        (acc, item) => {
          const current = acc[item.product] || { totalCost: 0, totalQty: 0 };
          const qty = toNumber(item.quantity);
          current.totalQty += qty;
          current.totalCost += qty * toNumber(item.unit_price);
          acc[item.product] = current;
          return acc;
        },
        {},
      );

      return { products, customers, averageCostByProduct };
    },
  });
}

export function useCreateSalesOrderMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      customer: number | null;
      status?: SalesOrderDTO['status'];
      payment_status?: SalesOrderDTO['payment_status'];
      expected_delivery?: string | null;
      invoice_number?: string | null;
      issue_date?: string | null;
      payment_due_date?: string | null;
      notes?: string;
      items: Array<{ product: number; quantity: number; unit_price: number; order_unit: ProductDTO['default_unit'] }>;
    }) => {
      const totalAmount = payload.items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);

      const order = await createSalesOrder({
        customer: payload.customer,
        status: payload.status || 'ORDER',
        payment_status: payload.payment_status || 'UNPAID',
        expected_delivery: payload.expected_delivery || null,
        invoice_number: payload.invoice_number || null,
        issue_date: payload.issue_date || null,
        payment_due_date: payload.payment_due_date || null,
        total_amount: totalAmount.toFixed(2),
        notes: payload.notes || '',
      });

      await Promise.all(
        payload.items.map((item) =>
          createSalesOrderItem({
            sales_order: order.id,
            product: item.product,
            quantity: item.quantity.toFixed(3),
            unit_price: item.unit_price.toFixed(2),
            order_unit: item.order_unit,
          }),
        ),
      );

      return order;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: salesKeys.orders });
      queryClient.invalidateQueries({ queryKey: salesKeys.items });
      notifications.show({ color: 'green', title: 'Sales order created', message: 'Order was saved successfully.' });
    },
    onError: () => {
      notifications.show({ color: 'red', title: 'Failed to create sales order', message: 'Check the data and try again.' });
    },
  });
}

export function useUpdateSalesOrderMutation(orderId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: Partial<SalesOrderDTO>) => updateSalesOrder(orderId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: salesKeys.orders });
      queryClient.invalidateQueries({ queryKey: salesKeys.detail(orderId) });
    },
  });
}
