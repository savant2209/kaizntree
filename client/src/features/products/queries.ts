import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';

import { createProduct, listProducts, listPurchaseOrderItems, listStocks, updateProduct } from '../../shared/api/inventoryApi';
import type { ProductDTO } from '../../shared/types/dto';

const productKeys = {
  all: ['products'] as const,
  financial: ['products', 'financial'] as const,
};

export function useProductsFinancialQuery() {
  return useQuery({
    queryKey: productKeys.financial,
    queryFn: async () => {
      const [products, stocks, purchaseItems] = await Promise.all([
        listProducts(),
        listStocks(),
        listPurchaseOrderItems(),
      ]);
      return { products, stocks, purchaseItems };
    },
  });
}

export function useUpsertProductMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }: { id?: number; payload: Partial<ProductDTO> }) => {
      if (id) {
        return updateProduct(id, payload);
      }
      return createProduct(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.all });
      notifications.show({
        color: 'green',
        title: 'Product saved',
        message: 'Product data has been updated.',
      });
    },
    onError: () => {
      notifications.show({
        color: 'red',
        title: 'Failed to save product',
        message: 'Review the fields and try again.',
      });
    },
  });
}
