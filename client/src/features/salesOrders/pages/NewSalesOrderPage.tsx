import { ActionIcon, Button, Card, Group, NumberInput, Select, Stack, Table, Text, TextInput, Title } from '@mantine/core';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { ProductDTO } from '../../../shared/types/dto';
import { PageError, PageLoading } from '../../../shared/ui/PageFeedback';
import { currency, percent, toNumber } from '../../../shared/utils/format';
import { useCreateSalesOrderMutation, useSalesOrderFormQuery } from '../queries';

type SalesItemForm = {
  product: string | null;
  quantity: number | string;
  unit_price: number | string;
  order_unit: ProductDTO['default_unit'];
};

export function NewSalesOrderPage() {
  const navigate = useNavigate();
  const { data, isLoading, error } = useSalesOrderFormQuery();
  const createMutation = useCreateSalesOrderMutation();

  const [customer, setCustomer] = useState<string | null>(null);
  const [status, setStatus] = useState<'ORDER' | 'DELIVERED' | 'CANCELLED' | 'RETURNED'>('ORDER');
  const [paymentStatus, setPaymentStatus] = useState<'UNPAID' | 'PAID' | 'REFUNDED'>('UNPAID');
  const [expectedDelivery, setExpectedDelivery] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [paymentDueDate, setPaymentDueDate] = useState('');
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

  const handleProductChange = (index: number, productId: string | null) => {
    if (!productId) {
      updateItem(index, { product: null, unit_price: 0, order_unit: 'UN' });
      return;
    }

    const selectedProduct = data.products.find((entry) => String(entry.id) === productId);
    updateItem(index, {
      product: productId,
      unit_price: selectedProduct ? toNumber(selectedProduct.price) : 0,
      order_unit: selectedProduct?.default_unit || 'UN',
    });
  };

  const itemFinancial = items.map((item) => {
    const productId = Number(item.product);
    const costData = data.averageCostByProduct[productId];
    const avgCost = costData && costData.totalQty > 0 ? costData.totalCost / costData.totalQty : 0;
    const quantity = toNumber(item.quantity);
    const unitPrice = toNumber(item.unit_price);
    const revenue = quantity * unitPrice;
    const cost = quantity * avgCost;
    const profit = revenue - cost;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
    return { avgCost, revenue, profit, margin };
  });

  const total = itemFinancial.reduce((sum, line) => sum + line.revenue, 0);
  const totalProfit = itemFinancial.reduce((sum, line) => sum + line.profit, 0);

  const handleSubmit = async () => {
    if (!customer) return;
    const payloadItems = items.filter((item) => item.product && toNumber(item.quantity) > 0);
    if (payloadItems.length === 0) return;

    const order = await createMutation.mutateAsync({
      customer: customer ? Number(customer) : null,
      status,
      payment_status: paymentStatus,
      expected_delivery: expectedDelivery || null,
      invoice_number: invoiceNumber || null,
      issue_date: issueDate || null,
      payment_due_date: paymentDueDate || null,
      notes,
      items: payloadItems.map((item) => ({
        product: Number(item.product),
        quantity: toNumber(item.quantity),
        unit_price: toNumber(item.unit_price),
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
            <Select
              label="Customer"
              withAsterisk
              placeholder="Select a customer"
              data={customerOptions}
              value={customer}
              onChange={setCustomer}
              allowDeselect={false}
              searchable
            />
            <Select
              label="Status"
              withAsterisk
              value={status}
              onChange={(value) => setStatus((value as 'ORDER' | 'DELIVERED' | 'CANCELLED' | 'RETURNED') || 'ORDER')}
              data={[
                { value: 'ORDER', label: 'Ordered' },
                { value: 'DELIVERED', label: 'Delivered' },
                { value: 'CANCELLED', label: 'Cancelled' },
                { value: 'RETURNED', label: 'Returned' },
              ]}
              allowDeselect={false}
            />
          </Group>

          <Group grow mt="md">
            <Select
              label="Payment status"
              withAsterisk
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
              label="Expected delivery"
              type="date"
              placeholder="MM/DD/YYYY"
              value={expectedDelivery}
              onChange={(event) => setExpectedDelivery(event.currentTarget.value)}
            />
          </Group>

          <Group grow mt="md">
            <TextInput
              label="Invoice number"
              placeholder="e.g. INV-2001"
              value={invoiceNumber}
              onChange={(event) => setInvoiceNumber(event.currentTarget.value)}
            />
            <TextInput
              label="Issue date"
              type="date"
              placeholder="MM/DD/YYYY"
              value={issueDate}
              onChange={(event) => setIssueDate(event.currentTarget.value)}
            />
          </Group>

          <Group grow mt="md">
            <TextInput
              label="Payment due date"
              type="date"
              placeholder="MM/DD/YYYY"
              value={paymentDueDate}
              onChange={(event) => setPaymentDueDate(event.currentTarget.value)}
            />
            <TextInput
              label="Notes"
              placeholder="Add notes for this sales order"
              value={notes}
              onChange={(event) => setNotes(event.currentTarget.value)}
            />
          </Group>
        </Card>

        <Card withBorder>
          <Table striped style={{ tableLayout: 'fixed' }}>
            <Table.Thead>
              <Table.Tr>
                <Table.Th style={{ width: '24%' }}>Product</Table.Th>
                <Table.Th style={{ width: '12%' }}>Quantity</Table.Th>
                <Table.Th style={{ width: '14%' }}>Unit price</Table.Th>
                <Table.Th style={{ width: '14%' }}>Average cost</Table.Th>
                <Table.Th style={{ width: '14%' }}>Subtotal</Table.Th>
                <Table.Th style={{ width: '18%' }}>Item profit</Table.Th>
                <Table.Th style={{ width: '4%' }}></Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {items.map((item, index) => (
                <Table.Tr key={index}>
                  <Table.Td>
                    <Select
                      data={productOptions}
                      placeholder="Select a product"
                      withAsterisk
                      value={item.product}
                      onChange={(value) => handleProductChange(index, value)}
                      searchable
                    />
                  </Table.Td>
                  <Table.Td>
                    <NumberInput
                      withAsterisk
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
                      withAsterisk
                      min={0}
                      decimalScale={2}
                      thousandSeparator="," 
                      decimalSeparator="."
                      prefix="$ "
                      value={item.unit_price}
                      onChange={(value) => updateItem(index, { unit_price: value })}
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
          <Button onClick={handleSubmit} loading={createMutation.isPending} disabled={!customer}>
            Save SO
          </Button>
        </Group>
      </Stack>
    </>
  );
}
