import { useMutation } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';

import { loginRequest } from '../../shared/api/inventoryApi';
import type { LoginPayload } from '../../shared/types/dto';

export function useLoginMutation() {
  return useMutation({
    mutationFn: (payload: LoginPayload) => loginRequest(payload),
    onSuccess: () => {
      notifications.show({
        color: 'green',
        title: 'Signed in successfully',
        message: 'Welcome to the inventory system.',
      });
    },
    onError: () => {
      notifications.show({
        color: 'red',
        title: 'Sign in failed',
        message: 'Check your credentials and try again.',
      });
    },
  });
}
