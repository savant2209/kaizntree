import { Button, Card, Group, Modal, Stack, Switch, Table, TextInput, Title } from '@mantine/core';
import { useState } from 'react';

import type { SupplierDTO } from '../../../shared/types/dto';
import { PageError, PageLoading } from '../../../shared/ui/PageFeedback';
import { useSuppliersQuery, useUpsertSupplierMutation } from '../queries';

type SupplierForm = {
  legal_name: string;
  contact_name: string;
  email: string;
  phone: string;
  is_active: boolean;
};

const initialForm: SupplierForm = {
  legal_name: '',
  contact_name: '',
  email: '',
  phone: '',
  is_active: true,
};

export function SuppliersPage() {
  const { data, isLoading, error } = useSuppliersQuery();
  const saveMutation = useUpsertSupplierMutation();

  const [opened, setOpened] = useState(false);
  const [selected, setSelected] = useState<SupplierDTO | null>(null);
  const [form, setForm] = useState<SupplierForm>(initialForm);

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
      contact_name: supplier.contact_name || '',
      email: supplier.email || '',
      phone: supplier.phone || '',
      is_active: supplier.is_active,
    });
    setOpened(true);
  };

  const handleSave = async () => {
    await saveMutation.mutateAsync({
      id: selected?.id,
      payload: {
        legal_name: form.legal_name,
        contact_name: form.contact_name || null,
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
        <Title order={2}>Suppliers</Title>
        <Button onClick={openNew}>New Supplier</Button>
      </Group>

      <Card withBorder>
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Legal name</Table.Th>
              <Table.Th>Contact</Table.Th>
              <Table.Th>Email</Table.Th>
              <Table.Th>Phone</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {data.map((supplier) => (
              <Table.Tr key={supplier.id} onClick={() => openEdit(supplier)} style={{ cursor: 'pointer' }}>
                <Table.Td>{supplier.legal_name}</Table.Td>
                <Table.Td>{supplier.contact_name || '-'}</Table.Td>
                <Table.Td>{supplier.email || '-'}</Table.Td>
                <Table.Td>{supplier.phone || '-'}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Card>

      <Modal opened={opened} onClose={() => setOpened(false)} title={selected ? 'Edit supplier' : 'New supplier'}>
        <Stack>
          <TextInput
            label="Legal name"
            value={form.legal_name}
            onChange={(event) => setForm({ ...form, legal_name: event.currentTarget.value })}
          />
          <TextInput
            label="Contact"
            value={form.contact_name}
            onChange={(event) => setForm({ ...form, contact_name: event.currentTarget.value })}
          />
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
