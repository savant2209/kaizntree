import { Anchor, Button, Card, PasswordInput, Stack, Text, TextInput, Title } from '@mantine/core';
import axios from 'axios';
import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';

import { useRegisterMutation } from '../queries';
import { useAuth } from '../../../shared/auth/AuthContext';

const normalizeError = (value: unknown): string | null => {
  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value)) {
    const first = value.find((item) => typeof item === 'string');
    return typeof first === 'string' ? first : null;
  }

  if (value && typeof value === 'object') {
    for (const nested of Object.values(value as Record<string, unknown>)) {
      const message = normalizeError(nested);
      if (message) return message;
    }
  }

  return null;
};

export function RegisterPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const registerMutation = useRegisterMutation();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    if (password.length < 8) {
      setFormError('Password must have at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setFormError('Passwords do not match.');
      return;
    }

    try {
      await registerMutation.mutateAsync({
        username,
        password,
        confirm_password: confirmPassword,
      });
      navigate('/login', { replace: true });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const apiMessage = normalizeError(error.response?.data);
        setFormError(apiMessage || 'Unable to create account right now. Please try again.');
        return;
      }

      setFormError('Unable to create account right now. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 flex items-center justify-center px-4">
      <Card shadow="md" withBorder radius="lg" p="xl" w={460}>
        <form onSubmit={handleSubmit}>
          <Stack gap="md">
            <Title order={2} ta="center">
              Create account
            </Title>
            <Text c="dimmed" size="sm" ta="center">
              Choose any username and set a password with at least 8 characters.
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

            <PasswordInput
              label="Confirm password"
              required
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.currentTarget.value)}
            />

            {formError && (
              <Text c="red" size="sm">
                {formError}
              </Text>
            )}

            <Button
              type="submit"
              loading={registerMutation.isPending}
              fullWidth
              justify="center"
            >
              Create account
            </Button>

            <Text c="dimmed" size="sm" ta="center">
              Already have an account?{' '}
              <Anchor component={Link} to="/login" size="sm">
                Sign in
              </Anchor>
            </Text>
          </Stack>
        </form>
      </Card>
    </div>
  );
}
