import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';

import {
  createPurchaseOrder,
  createPurchaseOrderItem,
  getPurchaseOrder,
  listProducts,
  listPurchaseOrderItems,
  listPurchaseOrders,
  listSuppliers,
  updatePurchaseOrder,
} from '../../shared/api/inventoryApi';
import type { ProductDTO, PurchaseOrderDTO } from '../../shared/types/dto';

const purchaseKeys = {
  orders: ['purchase-orders'] as const,
  items: ['purchase-order-items'] as const,
  detail: (id: number) => ['purchase-orders', id] as const,
};

export function usePurchaseOrdersQuery() {
  return useQuery({
    queryKey: purchaseKeys.orders,
    queryFn: async () => {
      const [orders, suppliers] = await Promise.all([listPurchaseOrders(), listSuppliers()]);
      return { orders, suppliers };
    },
  });
}

export function usePurchaseOrderDetailQuery(orderId: number) {
  return useQuery({
    queryKey: purchaseKeys.detail(orderId),
    queryFn: async () => {
      const [order, items, products, suppliers] = await Promise.all([
        getPurchaseOrder(orderId),
        listPurchaseOrderItems(),
        listProducts(),
        listSuppliers(),
      ]);
      return {
        order,
        items: items.filter((item) => item.purchase_order === orderId),
        products,
        suppliers,
      };
    },
  });
}

export function usePurchaseOrderFormQuery() {
  return useQuery({
    queryKey: ['purchase-order-form'],
    queryFn: async () => {
      const [products, suppliers] = await Promise.all([listProducts(), listSuppliers()]);
      return { products, suppliers };
    },
  });
}

export function useCreatePurchaseOrderMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      supplier: number | null;
      order_at?: string | null;
      expected_delivery?: string | null;
      payment_due_date?: string | null;
      payment_status?: PurchaseOrderDTO['payment_status'];
      notes?: string;
      items: Array<{ product: number; quantity: number; unit_price: number; order_unit: ProductDTO['default_unit'] }>;
    }) => {
      const totalAmount = payload.items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);

      const order = await createPurchaseOrder({
        supplier: payload.supplier,
        status: 'DRAFT',
        total_amount: totalAmount.toFixed(2),
        order_at: payload.order_at || null,
        expected_delivery: payload.expected_delivery || null,
        payment_due_date: payload.payment_due_date || null,
        payment_status: payload.payment_status || 'UNPAID',
        notes: payload.notes || '',
      });

      await Promise.all(
        payload.items.map((item) =>
          createPurchaseOrderItem({
            purchase_order: order.id,
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
      queryClient.invalidateQueries({ queryKey: purchaseKeys.orders });
      queryClient.invalidateQueries({ queryKey: purchaseKeys.items });
      notifications.show({
        color: 'green',
        title: 'Purchase order created',
        message: 'Order was saved successfully.',
      });
    },
    onError: () => {
      notifications.show({
        color: 'red',
        title: 'Failed to create purchase order',
        message: 'Check the data and try again.',
      });
    },
  });
}

export function useUpdatePurchaseOrderMutation(orderId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: Partial<PurchaseOrderDTO>) => updatePurchaseOrder(orderId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: purchaseKeys.orders });
      queryClient.invalidateQueries({ queryKey: purchaseKeys.detail(orderId) });
    },
  });
}
