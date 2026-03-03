import { notifications } from '@mantine/notifications';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createStock,
  deliverSalesOrder,
  deliverSalesOrderItem,
  listCustomers,
  listProducts,
  listPurchaseOrderItems,
  listPurchaseOrders,
  listSalesOrderItems,
  listSalesOrders,
  listStocks,
  listSuppliers,
  receivePurchaseOrder,
  receivePurchaseOrderItem,
} from '../../shared/api/inventoryApi';
import { toNumber } from '../../shared/utils/format';

const stockKeys = {
  all: ['stocks'] as const,
};

export function useStockEntriesQuery() {
  return useQuery({
    queryKey: stockKeys.all,
    queryFn: async () => {
      const [
        stocks,
        products,
        purchaseOrders,
        purchaseOrderItems,
        suppliers,
        salesOrders,
        salesOrderItems,
        customers,
      ] = await Promise.all([
        listStocks(),
        listProducts(),
        listPurchaseOrders(),
        listPurchaseOrderItems(),
        listSuppliers(),
        listSalesOrders(),
        listSalesOrderItems(),
        listCustomers(),
      ]);

      const purchaseOrderById = Object.fromEntries(purchaseOrders.map((order) => [order.id, order]));
      const salesOrderById = Object.fromEntries(salesOrders.map((order) => [order.id, order]));

      const poItemByOrderAndProduct = new Map<string, number>();
      for (const item of purchaseOrderItems) {
        const key = `${item.purchase_order}-${item.product}`;
        if (!poItemByOrderAndProduct.has(key)) {
          poItemByOrderAndProduct.set(key, toNumber(item.quantity));
        }
      }

      const stocksWithComputedInitial = stocks.map((stock) => {
        const key = stock.purchase_order ? `${stock.purchase_order}-${stock.product}` : null;
        const persistedInitial = stock.initial_quantity ? toNumber(stock.initial_quantity) : null;
        const initialQuantity =
          persistedInitial ??
          (key && poItemByOrderAndProduct.has(key)
            ? poItemByOrderAndProduct.get(key) || toNumber(stock.quantity)
            : toNumber(stock.quantity));

        return {
          ...stock,
          initial_quantity: initialQuantity,
          current_quantity: toNumber(stock.quantity),
        };
      });

      const allocatedByProduct = salesOrderItems.reduce<Record<number, number>>((acc, item) => {
        const order = salesOrderById[item.sales_order];
        if (!order || order.status !== 'ORDER') return acc;
        const remaining = toNumber(item.quantity) - toNumber(item.quantity_delivered);
        if (remaining <= 0) return acc;
        acc[item.product] = (acc[item.product] || 0) + remaining;
        return acc;
      }, {});

      const inTransitByProduct = purchaseOrderItems.reduce<Record<number, number>>((acc, item) => {
        const order = purchaseOrderById[item.purchase_order];
        if (!order || order.status !== 'ORDER') return acc;
        const remaining = toNumber(item.quantity) - toNumber(item.quantity_received);
        if (remaining <= 0) return acc;
        acc[item.product] = (acc[item.product] || 0) + remaining;
        return acc;
      }, {});

      const physicalByProduct = stocksWithComputedInitial.reduce<Record<number, number>>((acc, stock) => {
        acc[stock.product] = (acc[stock.product] || 0) + stock.current_quantity;
        return acc;
      }, {});

      const currentStockRows = products
        .map((product) => {
          const physicalQty = physicalByProduct[product.id] || 0;
          const allocatedQty = allocatedByProduct[product.id] || 0;
          const inTransitQty = inTransitByProduct[product.id] || 0;
          const availableQty = physicalQty - allocatedQty;
          const details = stocksWithComputedInitial
            .filter((stock) => stock.product === product.id && stock.current_quantity > 0)
            .sort((a, b) => String(a.created_at || '').localeCompare(String(b.created_at || '')));

          return {
            product_id: product.id,
            product_name: product.name,
            sku: product.sku,
            physical_qty: physicalQty,
            allocated_qty: allocatedQty,
            available_qty: availableQty,
            in_transit_qty: inTransitQty,
            details,
          };
        })
        .filter((row) => row.physical_qty > 0 || row.allocated_qty > 0 || row.in_transit_qty > 0)
        .sort((a, b) => a.product_name.localeCompare(b.product_name));

      const inboundOrders = purchaseOrders
        .filter((order) => order.status === 'ORDER')
        .map((order) => {
          const items = purchaseOrderItems
            .filter((item) => item.purchase_order === order.id)
            .map((item) => {
              const orderedQty = toNumber(item.quantity);
              const receivedQty = toNumber(item.quantity_received);
              const remainingQty = orderedQty - receivedQty;
              return {
                ...item,
                ordered_qty: orderedQty,
                received_qty: receivedQty,
                remaining_qty: remainingQty,
              };
            });

          return {
            ...order,
            items,
          };
        })
        .sort((a, b) => String(b.order_at || b.created_at || '').localeCompare(String(a.order_at || a.created_at || '')));

      const outboundOrders = salesOrders
        .filter((order) => order.status === 'ORDER')
        .map((order) => {
          const items = salesOrderItems
            .filter((item) => item.sales_order === order.id)
            .map((item) => {
              const orderedQty = toNumber(item.quantity);
              const deliveredQty = toNumber(item.quantity_delivered);
              const remainingQty = orderedQty - deliveredQty;
              const stockQty = physicalByProduct[item.product] || 0;
              const availableToDeliver = Math.max(0, Math.min(remainingQty, stockQty));
              return {
                ...item,
                ordered_qty: orderedQty,
                delivered_qty: deliveredQty,
                remaining_qty: remainingQty,
                available_to_deliver: availableToDeliver,
              };
            });

          return {
            ...order,
            items,
          };
        })
        .sort((a, b) => String(b.order_at || b.last_updated || '').localeCompare(String(a.order_at || a.last_updated || '')));

      return {
        currentStockRows,
        inboundOrders,
        outboundOrders,
        products,
        purchaseOrders,
        salesOrders,
        suppliers,
        customers,
      };
    },
  });
}

export function useReceivePurchaseOrderItemMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId, quantityReceived }: { itemId: number; quantityReceived: number }) =>
      receivePurchaseOrderItem(itemId, quantityReceived),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stockKeys.all });
      notifications.show({ color: 'green', title: 'Item received', message: 'Stock entry was added successfully.' });
    },
    onError: () => {
      notifications.show({ color: 'red', title: 'Receive failed', message: 'Check quantity and try again.' });
    },
  });
}

export function useReceivePurchaseOrderMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orderId,
      items,
    }: {
      orderId: number;
      items: Array<{ id: number; quantity_received: number }>;
    }) => receivePurchaseOrder(orderId, items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stockKeys.all });
      notifications.show({ color: 'green', title: 'PO received', message: 'Purchase order receiving was processed.' });
    },
    onError: () => {
      notifications.show({ color: 'red', title: 'Receive failed', message: 'Check quantities and try again.' });
    },
  });
}

export function useDeliverSalesOrderItemMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId, quantityDelivered }: { itemId: number; quantityDelivered: number }) =>
      deliverSalesOrderItem(itemId, quantityDelivered),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stockKeys.all });
      notifications.show({ color: 'green', title: 'Delivery completed', message: 'Stock was updated successfully.' });
    },
    onError: () => {
      notifications.show({ color: 'red', title: 'Delivery failed', message: 'Not enough stock or invalid quantity.' });
    },
  });
}

export function useDeliverSalesOrderMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orderId,
      items,
    }: {
      orderId: number;
      items: Array<{ id: number; quantity_delivered: number }>;
    }) => deliverSalesOrder(orderId, items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stockKeys.all });
      notifications.show({ color: 'green', title: 'SO delivered', message: 'Sales order delivery was processed.' });
    },
    onError: () => {
      notifications.show({ color: 'red', title: 'Delivery failed', message: 'Not enough stock or invalid quantity.' });
    },
  });
}

export function useCreateManualStockMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      product,
      quantity,
      batchNumber,
      expirationDate,
    }: {
      product: number;
      quantity: number;
      batchNumber?: string;
      expirationDate?: string;
    }) =>
      createStock({
        product,
        quantity: quantity.toFixed(3),
        source: 'MANUAL',
        purchase_order: null,
        batch_number: batchNumber || null,
        expiration_date: expirationDate || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stockKeys.all });
      notifications.show({ color: 'green', title: 'Stock added', message: 'Manual stock entry created successfully.' });
    },
    onError: () => {
      notifications.show({ color: 'red', title: 'Create failed', message: 'Check product and quantity and try again.' });
    },
  });
}
