import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';

import { createCustomer, listCustomers, updateCustomer } from '../../shared/api/inventoryApi';
import type { CustomerDTO } from '../../shared/types/dto';

const customerKeys = {
  all: ['customers'] as const,
};

export function useCustomersQuery() {
  return useQuery({
    queryKey: customerKeys.all,
    queryFn: listCustomers,
  });
}

export function useUpsertCustomerMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }: { id?: number; payload: Partial<CustomerDTO> }) => {
      if (id) return updateCustomer(id, payload);
      return createCustomer(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.all });
      notifications.show({ color: 'green', title: 'Customer saved', message: 'Customer data has been updated.' });
    },
    onError: () => {
      notifications.show({ color: 'red', title: 'Failed to save customer', message: 'Please try again.' });
    },
  });
}
