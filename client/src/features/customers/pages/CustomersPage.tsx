import { Button, Card, Group, Modal, Select, Stack, Switch, Table, TextInput, Textarea, Title } from '@mantine/core';
import { useState } from 'react';

import type { CustomerDTO } from '../../../shared/types/dto';
import { PageError, PageLoading } from '../../../shared/ui/PageFeedback';
import { useCustomersQuery, useUpsertCustomerMutation } from '../queries';

type CustomerForm = {
  name: string;
  email: string;
  phone: string;
  notes: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  zip_code: string;
  is_active: boolean;
};

const initialForm: CustomerForm = {
  name: '',
  email: '',
  phone: '',
  notes: '',
  address_line1: '',
  address_line2: '',
  city: '',
  state: '',
  zip_code: '',
  is_active: true,
};

const truncateNotes = (value?: string | null): string => {
  if (!value) return '-';
  return value.length > 20 ? `${value.slice(0, 20)}...` : value;
};

const formatPhone = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
};

export function CustomersPage() {
  const { data, isLoading, error } = useCustomersQuery();
  const saveMutation = useUpsertCustomerMutation();

  const [opened, setOpened] = useState(false);
  const [selected, setSelected] = useState<CustomerDTO | null>(null);
  const [form, setForm] = useState<CustomerForm>(initialForm);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');

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
      notes: customer.notes || '',
      address_line1: customer.address_line1 || '',
      address_line2: customer.address_line2 || '',
      city: customer.city || '',
      state: customer.state || '',
      zip_code: customer.zip_code || '',
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
        notes: form.notes || null,
        address_line1: form.address_line1 || null,
        address_line2: form.address_line2 || null,
        city: form.city || null,
        state: form.state || null,
        zip_code: form.zip_code || null,
        is_active: form.is_active,
      },
    });
    setOpened(false);
  };

  const normalizedSearch = search.trim().toLowerCase();
  const filteredCustomers = data.filter((customer) => {
    const matchesSearch =
      normalizedSearch.length === 0 ||
      customer.name.toLowerCase().includes(normalizedSearch) ||
      (customer.email || '').toLowerCase().includes(normalizedSearch) ||
      (customer.phone || '').toLowerCase().includes(normalizedSearch);

    const matchesActive =
      activeFilter === 'all' ||
      (activeFilter === 'active' && customer.is_active) ||
      (activeFilter === 'inactive' && !customer.is_active);

    return matchesSearch && matchesActive;
  });

  return (
    <>
      <Group justify="space-between" mb="md">
        <Title order={2}>Customers</Title>
        <Button onClick={openNew}>New Customer</Button>
      </Group>

      <Card withBorder>
        <Group grow mb="md">
          <TextInput
            label="Search"
            placeholder="Name, email or phone"
            value={search}
            onChange={(event) => setSearch(event.currentTarget.value)}
          />
          <Select
            label="Active"
            placeholder="Filter by status"
            value={activeFilter}
            onChange={(value) => setActiveFilter((value as 'all' | 'active' | 'inactive') || 'all')}
            data={[
              { value: 'all', label: 'All' },
              { value: 'active', label: 'Active only' },
              { value: 'inactive', label: 'Inactive only' },
            ]}
            allowDeselect={false}
          />
        </Group>

        <Table striped highlightOnHover style={{ tableLayout: 'fixed' }}>
          <Table.Thead>
            <Table.Tr>
              <Table.Th style={{ width: '22%' }}>Name</Table.Th>
              <Table.Th style={{ width: '30%' }}>Email</Table.Th>
              <Table.Th style={{ width: '18%' }}>Phone</Table.Th>
              <Table.Th style={{ width: '20%' }}>Notes</Table.Th>
              <Table.Th style={{ width: '10%', textAlign: 'right', whiteSpace: 'nowrap' }}>Active</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {filteredCustomers.map((customer) => (
              <Table.Tr key={customer.id} onClick={() => openEdit(customer)} style={{ cursor: 'pointer' }}>
                <Table.Td>{customer.name}</Table.Td>
                <Table.Td style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{customer.email || '-'}</Table.Td>
                <Table.Td style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{customer.phone || '-'}</Table.Td>
                <Table.Td style={{ whiteSpace: 'nowrap' }}>{truncateNotes(customer.notes)}</Table.Td>
                <Table.Td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{customer.is_active ? 'Yes' : 'No'}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Card>

      <Modal opened={opened} onClose={() => setOpened(false)} title={selected ? 'Edit customer' : 'New customer'}>
        <Stack>
          <TextInput
            label="Name"
            placeholder="John Doe"
            withAsterisk
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.currentTarget.value })}
          />
          <TextInput
            label="Email"
            placeholder="john@email.com"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.currentTarget.value })}
          />
          <TextInput
            label="Phone"
            placeholder="(555) 123-4567"
            value={form.phone}
            onChange={(event) => setForm({ ...form, phone: formatPhone(event.currentTarget.value) })}
          />
          <Textarea
            label="Notes"
            placeholder="Add notes about this customer"
            value={form.notes}
            onChange={(event) => setForm({ ...form, notes: event.currentTarget.value })}
          />
          <TextInput
            label="Address line 1"
            placeholder="Street and number"
            value={form.address_line1}
            onChange={(event) => setForm({ ...form, address_line1: event.currentTarget.value })}
          />
          <TextInput
            label="Address line 2"
            placeholder="Apt, suite, etc."
            value={form.address_line2}
            onChange={(event) => setForm({ ...form, address_line2: event.currentTarget.value })}
          />
          <TextInput
            label="City"
            placeholder="City"
            value={form.city}
            onChange={(event) => setForm({ ...form, city: event.currentTarget.value })}
          />
          <TextInput
            label="State"
            placeholder="State"
            value={form.state}
            onChange={(event) => setForm({ ...form, state: event.currentTarget.value })}
          />
          <TextInput
            label="ZIP code"
            placeholder="12345 or 12345-6789"
            value={form.zip_code}
            onChange={(event) => setForm({ ...form, zip_code: event.currentTarget.value })}
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
