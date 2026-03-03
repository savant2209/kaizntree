import { Anchor, Button, Card, PasswordInput, Stack, Text, TextInput, Title } from '@mantine/core';
import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';

import { useLoginMutation } from '../queries';
import { useAuth } from '../../../shared/auth/AuthContext';

export function LoginPage() {
  const navigate = useNavigate();
  const { isAuthenticated, login } = useAuth();
  const loginMutation = useLoginMutation();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const token = await loginMutation.mutateAsync({ username, password });
    login(token);
    navigate('/dashboard', { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 flex items-center justify-center px-4">
      <Card shadow="md" withBorder radius="lg" p="xl" w={460}>
        <form onSubmit={handleSubmit}>
          <Stack gap="md">
            <Title order={2} ta="center">
              Welcome back
            </Title>
            <Text c="dimmed" size="sm" ta="center">
              Sign in with your username and password.
            </Text>
            <TextInput
              label="Username"
              required
              value={username}
              onChange={(event) => setUsername(event.currentTarget.value)}
            />
            <PasswordInput
              label="Password"
              required
              value={password}
              onChange={(event) => setPassword(event.currentTarget.value)}
            />
            <Button
              type="submit"
              loading={loginMutation.isPending}
              fullWidth
              justify="center"
            >
              Sign in
            </Button>
            <Text c="dimmed" size="sm" ta="center">
              No account yet?{' '}
              <Anchor component={Link} to="/register" size="sm">
                Create one
              </Anchor>
            </Text>
          </Stack>
        </form>
      </Card>
    </div>
  );
}
