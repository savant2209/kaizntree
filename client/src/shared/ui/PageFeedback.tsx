import { Alert, Center, Loader, Stack, Text } from '@mantine/core';

export function PageLoading({ label = 'Loading...' }: { label?: string }) {
  return (
    <Center py="xl">
      <Stack align="center" gap="xs">
        <Loader />
        <Text c="dimmed">{label}</Text>
      </Stack>
    </Center>
  );
}

export function PageError({ message }: { message?: string }) {
  return (
    <Alert color="red" title="Error loading data">
      {message || 'Please try again in a moment.'}
    </Alert>
  );
}
