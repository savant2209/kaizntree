import { ActionIcon, Button, Card, Group, NumberInput, Select, Stack, Table, TextInput, Title } from '@mantine/core';
import { IconTrash } from '@tabler/icons-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { ProductDTO } from '../../../shared/types/dto';
import { PageError, PageLoading } from '../../../shared/ui/PageFeedback';
import { currency } from '../../../shared/utils/format';
import { useCreatePurchaseOrderMutation, usePurchaseOrderFormQuery } from '../queries';

type PurchaseItemForm = {
  product: string | null;
  quantity: number;
  unit_price: number;
  order_unit: ProductDTO['default_unit'];
};

export function NewPurchaseOrderPage() {
  const navigate = useNavigate();
  const { data, isLoading, error } = usePurchaseOrderFormQuery();
  const createMutation = useCreatePurchaseOrderMutation();

  const [supplier, setSupplier] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<PurchaseItemForm[]>([
    { product: null, quantity: 1, unit_price: 0, order_unit: 'UN' },
  ]);

  if (isLoading) return <PageLoading label="Loading form" />;
  if (error || !data) return <PageError message="Unable to load form data." />;

  const productOptions = data.products.map((product) => ({ value: String(product.id), label: `${product.name} (${product.sku})` }));
  const supplierOptions = data.suppliers.map((supplierItem) => ({ value: String(supplierItem.id), label: supplierItem.legal_name }));

  const total = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);

  const updateItem = (index: number, next: Partial<PurchaseItemForm>) => {
    setItems((current) => current.map((item, i) => (i === index ? { ...item, ...next } : item)));
  };

  const handleSubmit = async () => {
    const payloadItems = items.filter((item) => item.product && item.quantity > 0);
    if (payloadItems.length === 0) return;

    const order = await createMutation.mutateAsync({
      supplier: supplier ? Number(supplier) : null,
      notes,
      items: payloadItems.map((item) => ({
        product: Number(item.product),
        quantity: item.quantity,
        unit_price: item.unit_price,
        order_unit: item.order_unit,
      })),
    });

    navigate(`/purchase-orders/${order.id}`);
  };

  return (
    <>
      <Title order={2} mb="md">
        New Purchase Order
      </Title>

      <Stack>
        <Card withBorder>
          <Group grow>
            <Select label="Supplier" data={supplierOptions} value={supplier} onChange={setSupplier} clearable searchable />
            <TextInput label="Notes" value={notes} onChange={(event) => setNotes(event.currentTarget.value)} />
          </Group>
        </Card>

        <Card withBorder>
          <Table striped>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Product</Table.Th>
                <Table.Th>Quantity</Table.Th>
                <Table.Th>Unit cost</Table.Th>
                <Table.Th>Subtotal</Table.Th>
                <Table.Th></Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {items.map((item, index) => (
                <Table.Tr key={index}>
                  <Table.Td>
                    <Select data={productOptions} value={item.product} onChange={(value) => updateItem(index, { product: value })} searchable />
                  </Table.Td>
                  <Table.Td>
                    <NumberInput min={0} value={item.quantity} onChange={(value) => updateItem(index, { quantity: Number(value) || 0 })} />
                  </Table.Td>
                  <Table.Td>
                    <NumberInput
                      min={0}
                      decimalScale={2}
                      fixedDecimalScale
                      value={item.unit_price}
                      onChange={(value) => updateItem(index, { unit_price: Number(value) || 0 })}
                    />
                  </Table.Td>
                  <Table.Td>{currency(item.quantity * item.unit_price)}</Table.Td>
                  <Table.Td>
                    <ActionIcon color="red" variant="subtle" onClick={() => setItems((current) => current.filter((_, i) => i !== index))}>
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>

          <Group justify="space-between" mt="md">
            <Button variant="light" onClick={() => setItems((current) => [...current, { product: null, quantity: 1, unit_price: 0, order_unit: 'UN' }])}>
              Add item
            </Button>
            <Title order={4}>Total: {currency(total)}</Title>
          </Group>
        </Card>

        <Group justify="flex-end">
          <Button onClick={handleSubmit} loading={createMutation.isPending}>
            Save PO
          </Button>
        </Group>
      </Stack>
    </>
  );
}
