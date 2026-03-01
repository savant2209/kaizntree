import { Button, Card, Group, Modal, Stack, Switch, Table, TextInput, Title } from '@mantine/core';
import { useState } from 'react';

import type { CustomerDTO } from '../../../shared/types/dto';
import { PageError, PageLoading } from '../../../shared/ui/PageFeedback';
import { useCustomersQuery, useUpsertCustomerMutation } from '../queries';

type CustomerForm = {
  name: string;
  email: string;
  phone: string;
  is_active: boolean;
};

const initialForm: CustomerForm = {
  name: '',
  email: '',
  phone: '',
  is_active: true,
};

export function CustomersPage() {
  const { data, isLoading, error } = useCustomersQuery();
  const saveMutation = useUpsertCustomerMutation();

  const [opened, setOpened] = useState(false);
  const [selected, setSelected] = useState<CustomerDTO | null>(null);
  const [form, setForm] = useState<CustomerForm>(initialForm);

  if (isLoading) return <PageLoading label="Loading customers" />;
  if (error || !data) return <PageError message="Unable to load customers." />;

  const openNew = () => {
    setSelected(null);
    setForm(initialForm);
    setOpened(true);
  };

  const openEdit = (customer: CustomerDTO) => {
    setSelected(customer);
    setForm({
      name: customer.name,
      email: customer.email || '',
      phone: customer.phone || '',
      is_active: customer.is_active,
    });
    setOpened(true);
  };

  const handleSave = async () => {
    await saveMutation.mutateAsync({
      id: selected?.id,
      payload: {
        name: form.name,
        email: form.email || null,
        phone: form.phone || null,
        is_active: form.is_active,
      },
    });
    setOpened(false);
  };

  return (
    <>
      <Group justify="space-between" mb="md">
        <Title order={2}>Customers</Title>
        <Button onClick={openNew}>New Customer</Button>
      </Group>

      <Card withBorder>
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Name</Table.Th>
              <Table.Th>Email</Table.Th>
              <Table.Th>Phone</Table.Th>
              <Table.Th>Active</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {data.map((customer) => (
              <Table.Tr key={customer.id} onClick={() => openEdit(customer)} style={{ cursor: 'pointer' }}>
                <Table.Td>{customer.name}</Table.Td>
                <Table.Td>{customer.email || '-'}</Table.Td>
                <Table.Td>{customer.phone || '-'}</Table.Td>
                <Table.Td>{customer.is_active ? 'Yes' : 'No'}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Card>

      <Modal opened={opened} onClose={() => setOpened(false)} title={selected ? 'Edit customer' : 'New customer'}>
        <Stack>
          <TextInput label="Name" value={form.name} onChange={(event) => setForm({ ...form, name: event.currentTarget.value })} />
          <TextInput
            label="Email"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.currentTarget.value })}
          />
          <TextInput
            label="Phone"
            value={form.phone}
            onChange={(event) => setForm({ ...form, phone: event.currentTarget.value })}
          />
          <Switch
            label="Active"
            checked={form.is_active}
            onChange={(event) => setForm({ ...form, is_active: event.currentTarget.checked })}
          />
          <Button onClick={handleSave} loading={saveMutation.isPending}>
            Save
          </Button>
        </Stack>
      </Modal>
    </>
  );
}
