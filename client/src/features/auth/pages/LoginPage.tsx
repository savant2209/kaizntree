import { Button, Card, PasswordInput, Stack, Text, TextInput, Title } from '@mantine/core';
import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';

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
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
      <Card shadow="sm" radius="md" p="lg" w={420}>
        <form onSubmit={handleSubmit}>
          <Stack>
            <Title order={2}>Sign in</Title>
            <Text c="dimmed" size="sm">
              Use your username (or email if configured) and password.
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
            <Button type="submit" loading={loginMutation.isPending}>
              Sign in
            </Button>
          </Stack>
        </form>
      </Card>
    </div>
  );
}
