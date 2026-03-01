import { ActionIcon, Button, Card, Group, NumberInput, Select, Stack, Table, Text, TextInput, Title } from '@mantine/core';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { ProductDTO } from '../../../shared/types/dto';
import { PageError, PageLoading } from '../../../shared/ui/PageFeedback';
import { currency, percent } from '../../../shared/utils/format';
import { useCreateSalesOrderMutation, useSalesOrderFormQuery } from '../queries';

type SalesItemForm = {
  product: string | null;
  quantity: number;
  unit_price: number;
  order_unit: ProductDTO['default_unit'];
};

export function NewSalesOrderPage() {
  const navigate = useNavigate();
  const { data, isLoading, error } = useSalesOrderFormQuery();
  const createMutation = useCreateSalesOrderMutation();

  const [customer, setCustomer] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<SalesItemForm[]>([
    { product: null, quantity: 1, unit_price: 0, order_unit: 'UN' },
  ]);

  if (isLoading) return <PageLoading label="Loading form" />;
  if (error || !data) return <PageError message="Unable to load form data." />;

  const customerOptions = data.customers.map((entry) => ({ value: String(entry.id), label: entry.name }));
  const productOptions = data.products.map((entry) => ({ value: String(entry.id), label: `${entry.name} (${entry.sku})` }));

  const updateItem = (index: number, next: Partial<SalesItemForm>) => {
    setItems((current) => current.map((item, i) => (i === index ? { ...item, ...next } : item)));
  };

  const itemFinancial = items.map((item) => {
    const productId = Number(item.product);
    const costData = data.averageCostByProduct[productId];
    const avgCost = costData && costData.totalQty > 0 ? costData.totalCost / costData.totalQty : 0;
    const revenue = item.quantity * item.unit_price;
    const cost = item.quantity * avgCost;
    const profit = revenue - cost;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
    return { avgCost, revenue, profit, margin };
  });

  const total = itemFinancial.reduce((sum, line) => sum + line.revenue, 0);
  const totalProfit = itemFinancial.reduce((sum, line) => sum + line.profit, 0);

  const handleSubmit = async () => {
    const payloadItems = items.filter((item) => item.product && item.quantity > 0);
    if (payloadItems.length === 0) return;

    const order = await createMutation.mutateAsync({
      customer: customer ? Number(customer) : null,
      notes,
      items: payloadItems.map((item) => ({
        product: Number(item.product),
        quantity: item.quantity,
        unit_price: item.unit_price,
        order_unit: item.order_unit,
      })),
    });

    navigate(`/sales-orders/${order.id}`);
  };

  return (
    <>
      <Title order={2} mb="md">
        New Sales Order
      </Title>

      <Stack>
        <Card withBorder>
          <Group grow>
            <Select label="Customer" data={customerOptions} value={customer} onChange={setCustomer} clearable searchable />
            <TextInput label="Notes" value={notes} onChange={(event) => setNotes(event.currentTarget.value)} />
          </Group>
        </Card>

        <Card withBorder>
          <Table striped>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Product</Table.Th>
                <Table.Th>Quantity</Table.Th>
                <Table.Th>Unit price</Table.Th>
                <Table.Th>Average cost</Table.Th>
                <Table.Th>Subtotal</Table.Th>
                <Table.Th>Item profit</Table.Th>
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
                  <Table.Td>{currency(itemFinancial[index].avgCost)}</Table.Td>
                  <Table.Td>{currency(itemFinancial[index].revenue)}</Table.Td>
                  <Table.Td>
                    <Text className={itemFinancial[index].margin < 0 ? 'text-red-600 font-semibold' : ''}>
                      {currency(itemFinancial[index].profit)} ({percent(itemFinancial[index].margin)})
                    </Text>
                  </Table.Td>
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
            <Button leftSection={<IconPlus size={16} />} variant="light" onClick={() => setItems((current) => [...current, { product: null, quantity: 1, unit_price: 0, order_unit: 'UN' }])}>
              Add item
            </Button>
            <Stack gap={2} align="flex-end">
              <Text fw={600}>Total: {currency(total)}</Text>
              <Text className={totalProfit < 0 ? 'text-red-600 font-semibold' : ''}>Estimated profit: {currency(totalProfit)}</Text>
            </Stack>
          </Group>
        </Card>

        <Group justify="flex-end">
          <Button onClick={handleSubmit} loading={createMutation.isPending}>
            Save SO
          </Button>
        </Group>
      </Stack>
    </>
  );
}
