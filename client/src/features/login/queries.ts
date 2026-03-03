import { useMutation } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';

import { loginRequest, registerRequest } from '../../shared/api/inventoryApi';
import type { LoginPayload, RegisterPayload } from '../../shared/types/dto';

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

export function useRegisterMutation() {
  return useMutation({
    mutationFn: (payload: RegisterPayload) => registerRequest(payload),
    onSuccess: () => {
      notifications.show({
        color: 'green',
        title: 'Account created',
        message: 'You can now sign in with your new credentials.',
      });
    },
    onError: () => {
      notifications.show({
        color: 'red',
        title: 'Sign up failed',
        message: 'Check the form and try again.',
      });
    },
  });
}
