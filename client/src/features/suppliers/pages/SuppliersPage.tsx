import { Button, Card, Group, Modal, NumberInput, Select, Stack, Switch, Table, TextInput, Title } from '@mantine/core';
import { useState } from 'react';

import type { SupplierDTO } from '../../../shared/types/dto';
import { PageError, PageLoading } from '../../../shared/ui/PageFeedback';
import { toNumber } from '../../../shared/utils/format';
import { useSuppliersQuery, useUpsertSupplierMutation } from '../queries';

type SupplierForm = {
  legal_name: string;
  dba_name: string;
  account_number: string;
  contact_name: string;
  email: string;
  phone: string;
  tax_id: string;
  w9_on_file: boolean;
  payment_term_days: number | string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  zip_code: string;
  is_active: boolean;
};

const initialForm: SupplierForm = {
  legal_name: '',
  dba_name: '',
  account_number: '',
  contact_name: '',
  email: '',
  phone: '',
  tax_id: '',
  w9_on_file: false,
  payment_term_days: 30,
  address_line1: '',
  address_line2: '',
  city: '',
  state: '',
  zip_code: '',
  is_active: true,
};

const formatPhone = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
};

export function SuppliersPage() {
  const { data, isLoading, error } = useSuppliersQuery();
  const saveMutation = useUpsertSupplierMutation();

  const [opened, setOpened] = useState(false);
  const [selected, setSelected] = useState<SupplierDTO | null>(null);
  const [form, setForm] = useState<SupplierForm>(initialForm);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');

  if (isLoading) return <PageLoading label="Loading suppliers" />;
  if (error || !data) return <PageError message="Unable to load suppliers." />;

  const openNew = () => {
    setSelected(null);
    setForm(initialForm);
    setOpened(true);
  };

  const openEdit = (supplier: SupplierDTO) => {
    setSelected(supplier);
    setForm({
      legal_name: supplier.legal_name,
      dba_name: supplier.dba_name || '',
      account_number: supplier.account_number || '',
      contact_name: supplier.contact_name || '',
      email: supplier.email || '',
      phone: supplier.phone || '',
      tax_id: supplier.tax_id || '',
      w9_on_file: supplier.w9_on_file,
      payment_term_days: supplier.payment_term_days,
      address_line1: supplier.address_line1 || '',
      address_line2: supplier.address_line2 || '',
      city: supplier.city || '',
      state: supplier.state || '',
      zip_code: supplier.zip_code || '',
      is_active: supplier.is_active,
    });
    setOpened(true);
  };

  const handleSave = async () => {
    await saveMutation.mutateAsync({
      id: selected?.id,
      payload: {
        legal_name: form.legal_name,
        dba_name: form.dba_name || null,
        account_number: form.account_number || null,
        contact_name: form.contact_name || null,
        email: form.email || null,
        phone: form.phone || null,
        tax_id: form.tax_id || null,
        w9_on_file: form.w9_on_file,
        payment_term_days: toNumber(form.payment_term_days),
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
  const filteredSuppliers = data.filter((supplier) => {
    const matchesSearch =
      normalizedSearch.length === 0 ||
      supplier.legal_name.toLowerCase().includes(normalizedSearch) ||
      (supplier.email || '').toLowerCase().includes(normalizedSearch) ||
      (supplier.phone || '').toLowerCase().includes(normalizedSearch);

    const matchesActive =
      activeFilter === 'all' ||
      (activeFilter === 'active' && supplier.is_active) ||
      (activeFilter === 'inactive' && !supplier.is_active);

    return matchesSearch && matchesActive;
  });

  return (
    <>
      <Group justify="space-between" mb="md">
        <Title order={2}>Suppliers</Title>
        <Button onClick={openNew}>New Supplier</Button>
      </Group>

      <Card withBorder>
        <Group grow mb="md">
          <TextInput
            label="Search"
            placeholder="Legal name, email or phone"
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
              <Table.Th style={{ width: '28%' }}>Legal name</Table.Th>
              <Table.Th style={{ width: '22%' }}>Contact</Table.Th>
              <Table.Th style={{ width: '25%' }}>Email</Table.Th>
              <Table.Th style={{ width: '15%' }}>Phone</Table.Th>
              <Table.Th style={{ width: '10%', textAlign: 'right', whiteSpace: 'nowrap' }}>Active</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {filteredSuppliers.map((supplier) => (
              <Table.Tr key={supplier.id} onClick={() => openEdit(supplier)} style={{ cursor: 'pointer' }}>
                <Table.Td>{supplier.legal_name}</Table.Td>
                <Table.Td style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{supplier.contact_name || '-'}</Table.Td>
                <Table.Td style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{supplier.email || '-'}</Table.Td>
                <Table.Td style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{supplier.phone || '-'}</Table.Td>
                <Table.Td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{supplier.is_active ? 'Yes' : 'No'}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Card>

      <Modal opened={opened} onClose={() => setOpened(false)} title={selected ? 'Edit supplier' : 'New supplier'}>
        <Stack>
          <TextInput
            label="Legal name"
            placeholder="e.g. ACME Supplies LLC"
            withAsterisk
            value={form.legal_name}
            onChange={(event) => setForm({ ...form, legal_name: event.currentTarget.value })}
          />
          <TextInput
            label="DBA name"
            placeholder="Doing business as"
            value={form.dba_name}
            onChange={(event) => setForm({ ...form, dba_name: event.currentTarget.value })}
          />
          <TextInput
            label="Account number"
            placeholder="Internal account reference"
            value={form.account_number}
            onChange={(event) => setForm({ ...form, account_number: event.currentTarget.value })}
          />
          <TextInput
            label="Contact"
            placeholder="Contact full name"
            value={form.contact_name}
            onChange={(event) => setForm({ ...form, contact_name: event.currentTarget.value })}
          />
          <TextInput
            label="Email"
            placeholder="supplier@email.com"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.currentTarget.value })}
          />
          <TextInput
            label="Phone"
            placeholder="(555) 123-4567"
            value={form.phone}
            onChange={(event) => setForm({ ...form, phone: formatPhone(event.currentTarget.value) })}
          />
          <TextInput
            label="Tax ID"
            placeholder="Tax identification number"
            value={form.tax_id}
            onChange={(event) => setForm({ ...form, tax_id: event.currentTarget.value })}
          />
          <NumberInput
            label="Payment terms (days)"
            placeholder="e.g. 30"
            withAsterisk
            min={0}
            value={form.payment_term_days}
            onChange={(value) => setForm({ ...form, payment_term_days: value })}
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
            label="W-9 on file"
            checked={form.w9_on_file}
            onChange={(event) => setForm({ ...form, w9_on_file: event.currentTarget.checked })}
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
