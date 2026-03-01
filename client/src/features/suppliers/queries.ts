import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';

import { createSupplier, listSuppliers, updateSupplier } from '../../shared/api/inventoryApi';
import type { SupplierDTO } from '../../shared/types/dto';

const supplierKeys = {
  all: ['suppliers'] as const,
};

export function useSuppliersQuery() {
  return useQuery({
    queryKey: supplierKeys.all,
    queryFn: listSuppliers,
  });
}

export function useUpsertSupplierMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }: { id?: number; payload: Partial<SupplierDTO> }) => {
      if (id) return updateSupplier(id, payload);
      return createSupplier(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: supplierKeys.all });
      notifications.show({ color: 'green', title: 'Supplier saved', message: 'Supplier data has been updated.' });
    },
    onError: () => {
      notifications.show({ color: 'red', title: 'Failed to save supplier', message: 'Please try again.' });
    },
  });
}
