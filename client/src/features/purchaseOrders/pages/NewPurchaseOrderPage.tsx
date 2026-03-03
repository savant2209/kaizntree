import { ActionIcon, Button, Card, Group, NumberInput, Select, Stack, Table, TextInput, Title } from '@mantine/core';
import { IconTrash } from '@tabler/icons-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { ProductDTO } from '../../../shared/types/dto';
import { PageError, PageLoading } from '../../../shared/ui/PageFeedback';
import { currency, toNumber } from '../../../shared/utils/format';
import { useCreatePurchaseOrderMutation, usePurchaseOrderFormQuery } from '../queries';

type PurchaseItemForm = {
  product: string | null;
  quantity: number | string;
  unit_price: number | string;
  order_unit: ProductDTO['default_unit'];
};

const toApiDate = (value: string): string | null => {
  if (!value) return null;
  return value;
};

const toDateInput = (value: Date): string => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export function NewPurchaseOrderPage() {
  const navigate = useNavigate();
  const { data, isLoading, error } = usePurchaseOrderFormQuery();
  const createMutation = useCreatePurchaseOrderMutation();

  const [supplier, setSupplier] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [orderAt, setOrderAt] = useState('');
  const [expectedDelivery, setExpectedDelivery] = useState('');
  const [paymentDueDate, setPaymentDueDate] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<'UNPAID' | 'PAID' | 'REFUNDED'>('UNPAID');
  const [items, setItems] = useState<PurchaseItemForm[]>([
    { product: null, quantity: 1, unit_price: 0, order_unit: 'UN' },
  ]);

  if (isLoading) return <PageLoading label="Loading form" />;
  if (error || !data) return <PageError message="Unable to load form data." />;

  const productOptions = data.products.map((product) => ({ value: String(product.id), label: `${product.name} (${product.sku})` }));
  const supplierOptions = data.suppliers.map((supplierItem) => ({ value: String(supplierItem.id), label: supplierItem.legal_name }));
  const selectedSupplier = data.suppliers.find((supplierItem) => String(supplierItem.id) === supplier) || null;

  const total = items.reduce((sum, item) => sum + toNumber(item.quantity) * toNumber(item.unit_price), 0);

  const updateItem = (index: number, next: Partial<PurchaseItemForm>) => {
    setItems((current) => current.map((item, i) => (i === index ? { ...item, ...next } : item)));
  };

  const handleAutoPaymentDueDate = () => {
    if (!orderAt || !selectedSupplier) return;

    const baseDate = new Date(`${orderAt}T00:00:00`);
    if (Number.isNaN(baseDate.getTime())) return;

    const paymentTermDays = selectedSupplier.payment_term_days;
    baseDate.setDate(baseDate.getDate() + paymentTermDays);
    setPaymentDueDate(toDateInput(baseDate));
  };

  const handleSubmit = async () => {
    if (!supplier) return;
    const payloadItems = items.filter((item) => item.product && toNumber(item.quantity) > 0);
    if (payloadItems.length === 0) return;

    const order = await createMutation.mutateAsync({
      supplier: supplier ? Number(supplier) : null,
      order_at: toApiDate(orderAt),
      expected_delivery: toApiDate(expectedDelivery),
      payment_due_date: paymentDueDate || null,
      payment_status: paymentStatus,
      notes,
      items: payloadItems.map((item) => ({
        product: Number(item.product),
        quantity: toNumber(item.quantity),
        unit_price: toNumber(item.unit_price),
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
            <Select
              label="Supplier"
              withAsterisk
              data={supplierOptions}
              value={supplier}
              onChange={setSupplier}
              allowDeselect={false}
              searchable
              placeholder="Select a supplier"
            />
            <TextInput
              label="Order at"
              type="date"
              placeholder="MM/DD/YYYY"
              value={orderAt}
              onChange={(event) => setOrderAt(event.currentTarget.value)}
            />
          </Group>
          <Group grow mt="md">
            <TextInput
              label="Expected delivery"
              type="date"
              placeholder="MM/DD/YYYY"
              value={expectedDelivery}
              onChange={(event) => setExpectedDelivery(event.currentTarget.value)}
            />
            <TextInput
              label="Payment due date"
              type="date"
              placeholder="MM/DD/YYYY"
              value={paymentDueDate}
              onChange={(event) => setPaymentDueDate(event.currentTarget.value)}
            />
          </Group>
          <Group justify="flex-end" mt="xs">
            <Button variant="light" onClick={handleAutoPaymentDueDate} disabled={!orderAt || !selectedSupplier}>
              Auto-fill from Order date + Payment terms
            </Button>
          </Group>
          <Group grow mt="md">
            <Select
              label="Payment status"
              value={paymentStatus}
              onChange={(value) => setPaymentStatus((value as 'UNPAID' | 'PAID' | 'REFUNDED') || 'UNPAID')}
              data={[
                { value: 'UNPAID', label: 'Unpaid' },
                { value: 'PAID', label: 'Paid' },
                { value: 'REFUNDED', label: 'Refunded' },
              ]}
              allowDeselect={false}
            />
            <TextInput
              label="Notes"
              placeholder="Add internal notes for this purchase order"
              value={notes}
              onChange={(event) => setNotes(event.currentTarget.value)}
            />
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
                    <Select
                      data={productOptions}
                      value={item.product}
                      onChange={(value) => updateItem(index, { product: value })}
                      searchable
                      placeholder="Select a product"
                    />
                  </Table.Td>
                  <Table.Td>
                    <NumberInput
                      min={0}
                      decimalScale={3}
                      thousandSeparator=","
                      decimalSeparator="."
                      value={item.quantity}
                      onChange={(value) => updateItem(index, { quantity: value })}
                    />
                  </Table.Td>
                  <Table.Td>
                    <NumberInput
                      min={0}
                      decimalScale={2}
                      thousandSeparator=","
                      decimalSeparator="."
                      prefix="$ "
                      value={item.unit_price}
                      onChange={(value) => updateItem(index, { unit_price: value })}
                    />
                  </Table.Td>
                  <Table.Td>{currency(toNumber(item.quantity) * toNumber(item.unit_price))}</Table.Td>
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
          <Button onClick={handleSubmit} loading={createMutation.isPending} disabled={!supplier}>
            Save PO
          </Button>
        </Group>
      </Stack>
    </>
  );
}
