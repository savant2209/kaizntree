import { Badge, Button, Card, Drawer, Group, Menu, SimpleGrid, Stack, Table, Text, TextInput, Textarea, Title } from '@mantine/core';
import { IconDotsVertical } from '@tabler/icons-react';
import { useState } from 'react';
import { useParams } from 'react-router-dom';

import { PageError, PageLoading } from '../../../shared/ui/PageFeedback';
import { currency, dateTime, formatQuantity, percent, toNumber } from '../../../shared/utils/format';
import { useSalesOrderDetailQuery, useUpdateSalesOrderMutation } from '../queries';

const salesOrderStatusColor: Record<string, string> = {
  ORDER: 'indigo',
  DELIVERED: 'green',
  CANCELLED: 'red',
  RETURNED: 'orange',
};

const paymentStatusColor: Record<string, string> = {
  UNPAID: 'yellow',
  PAID: 'green',
  REFUNDED: 'orange',
};

const salesStatusLabel: Record<string, string> = {
  ORDER: 'Ordered',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  RETURNED: 'Returned',
};

const paymentStatusLabel: Record<string, string> = {
  UNPAID: 'Unpaid',
  PAID: 'Paid',
  REFUNDED: 'Refunded',
};

const getNextSalesStatus = (status: string): 'DELIVERED' | null => {
  if (status === 'ORDER') return 'DELIVERED';
  return null;
};

const getNextPaymentStatus = (status: string): 'PAID' | 'REFUNDED' | null => {
  if (status === 'UNPAID') return 'PAID';
  if (status === 'PAID') return 'REFUNDED';
  return null;
};

export function SalesOrderDetailPage() {
  const params = useParams();
  const orderId = Number(params.id);

  const { data, isLoading, error } = useSalesOrderDetailQuery(orderId);
  const updateMutation = useUpdateSalesOrderMutation(orderId);

  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [paymentDueDate, setPaymentDueDate] = useState('');
  const [expectedDelivery, setExpectedDelivery] = useState('');
  const [notes, setNotes] = useState('');
  const [isEditOpen, setIsEditOpen] = useState(false);

  if (isLoading) return <PageLoading label="Loading sales order" />;
  if (error || !data) return <PageError message="Unable to load sales order." />;

  const productById = Object.fromEntries(data.products.map((product) => [product.id, product.name]));
  const customerById = Object.fromEntries(data.customers.map((customer) => [customer.id, customer.name]));
  const nextStatus = getNextSalesStatus(data.order.status);
  const nextPaymentStatus = getNextPaymentStatus(data.order.payment_status);

  const openEditDrawer = () => {
    setInvoiceNumber(data.order.invoice_number || '');
    setIssueDate((data.order.issue_date || '').slice(0, 10));
    setPaymentDueDate((data.order.payment_due_date || '').slice(0, 10));
    setExpectedDelivery((data.order.expected_delivery || '').slice(0, 10));
    setNotes(data.order.notes || '');
    setIsEditOpen(true);
  };

  const handleSaveDetails = async () => {
    await updateMutation.mutateAsync({
      invoice_number: invoiceNumber || null,
      issue_date: issueDate || null,
      expected_delivery: expectedDelivery || null,
      payment_due_date: paymentDueDate || null,
      notes: notes || null,
    });
    setIsEditOpen(false);
  };

  const estimatedProfit = data.items.reduce((sum, item) => {
    const qty = toNumber(item.quantity);
    const unitPrice = toNumber(item.unit_price);
    const costData = data.averageCostByProduct[item.product];
    const avgCost = costData && costData.totalQty > 0 ? costData.totalCost / costData.totalQty : 0;
    return sum + qty * (unitPrice - avgCost);
  }, 0);

  const total = toNumber(data.order.total_amount);
  const margin = total > 0 ? (estimatedProfit / total) * 100 : 0;

  return (
    <>
      <Group justify="space-between" mb="md">
        <Title order={2}>Sales Order #{data.order.order_number || data.order.id}</Title>
        <Group>
          <Badge color={salesOrderStatusColor[data.order.status] || 'gray'}>{data.order.status}</Badge>
          <Badge color={paymentStatusColor[data.order.payment_status] || 'gray'}>{data.order.payment_status}</Badge>
        </Group>
      </Group>

      <Group justify="space-between" mb="md">
        <Button variant="light" onClick={openEditDrawer}>
          Edit details
        </Button>

        <Group>
          {nextStatus && (
            <Button
              color={salesOrderStatusColor[nextStatus] || 'indigo'}
              onClick={() => updateMutation.mutate({ status: nextStatus })}
              loading={updateMutation.isPending}
            >
              Mark as {salesStatusLabel[nextStatus]}
            </Button>
          )}

          <Menu shadow="md" width={220}>
            <Menu.Target>
              <Button variant="default" leftSection={<IconDotsVertical size={16} />}>
                More status actions
              </Button>
            </Menu.Target>
            <Menu.Dropdown>
              {(['ORDER', 'DELIVERED', 'CANCELLED', 'RETURNED'] as const)
                .filter((status) => status !== data.order.status && status !== nextStatus)
                .map((status) => (
                  <Menu.Item key={status} onClick={() => updateMutation.mutate({ status })}>
                    Mark as {salesStatusLabel[status]}
                  </Menu.Item>
                ))}
            </Menu.Dropdown>
          </Menu>

          {nextPaymentStatus && (
            <Button
              variant="outline"
              color={paymentStatusColor[nextPaymentStatus] || 'gray'}
              onClick={() => updateMutation.mutate({ payment_status: nextPaymentStatus })}
              loading={updateMutation.isPending}
            >
              Mark as {paymentStatusLabel[nextPaymentStatus]}
            </Button>
          )}

          <Menu shadow="md" width={220}>
            <Menu.Target>
              <Button variant="default">Payment actions</Button>
            </Menu.Target>
            <Menu.Dropdown>
              {(['UNPAID', 'PAID', 'REFUNDED'] as const)
                .filter((status) => status !== data.order.payment_status && status !== nextPaymentStatus)
                .map((status) => (
                  <Menu.Item key={status} onClick={() => updateMutation.mutate({ payment_status: status })}>
                    Mark as {paymentStatusLabel[status]}
                  </Menu.Item>
                ))}
            </Menu.Dropdown>
          </Menu>
        </Group>
      </Group>

      <SimpleGrid cols={{ base: 1, md: 3 }} mb="md">
        <Card withBorder>
          <Text fw={600} mb="xs">Entity</Text>
          <Text c="dimmed" size="sm">Customer</Text>
          <Text mb="sm">{data.order.customer ? customerById[data.order.customer] || '-' : '-'}</Text>
          <Text c="dimmed" size="sm">Notes</Text>
          <Text>{data.order.notes || '-'}</Text>
        </Card>

        <Card withBorder>
          <Text fw={600} mb="xs">Dates</Text>
          <Text c="dimmed" size="sm">Order at</Text>
          <Text mb="sm">{dateTime(data.order.order_at)}</Text>
          <Text c="dimmed" size="sm">Expected delivery</Text>
          <Text mb="sm">{dateTime(data.order.expected_delivery)}</Text>
          <Text c="dimmed" size="sm">Issue date</Text>
          <Text>{dateTime(data.order.issue_date)}</Text>
        </Card>

        <Card withBorder>
          <Text fw={600} mb="xs">Financial</Text>
          <Text c="dimmed" size="sm">Invoice number</Text>
          <Text mb="sm">{data.order.invoice_number || '-'}</Text>
          <Text c="dimmed" size="sm">Payment due date</Text>
          <Text mb="sm">{dateTime(data.order.payment_due_date)}</Text>
          <Text c="dimmed" size="sm">Total / Profit</Text>
          <Text fw={600}>Total: {currency(total)}</Text>
          <Text className={margin < 0 ? 'text-red-600 font-semibold' : ''}>
            Profit: {currency(estimatedProfit)} ({percent(margin)})
          </Text>
        </Card>
      </SimpleGrid>

      <Card withBorder>
        <Table striped>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Product</Table.Th>
              <Table.Th>Qty</Table.Th>
              <Table.Th>Unit price</Table.Th>
              <Table.Th>Subtotal</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {data.items.map((item) => (
              <Table.Tr key={item.id}>
                <Table.Td>{productById[item.product] || `Product #${item.product}`}</Table.Td>
                <Table.Td>{formatQuantity(item.quantity)}</Table.Td>
                <Table.Td>{currency(toNumber(item.unit_price))}</Table.Td>
                <Table.Td>{currency(toNumber(item.quantity) * toNumber(item.unit_price))}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Card>

      <Drawer opened={isEditOpen} onClose={() => setIsEditOpen(false)} title="Edit sales order details" position="right" size="md">
        <Stack>
          <Group grow>
            <TextInput
              label="Invoice number"
              placeholder="e.g. INV-2001"
              value={invoiceNumber}
              onChange={(event) => setInvoiceNumber(event.currentTarget.value)}
            />
            <TextInput
              label="Issue date"
              type="date"
              value={issueDate}
              onChange={(event) => setIssueDate(event.currentTarget.value)}
            />
          </Group>
          <Group grow>
            <TextInput
              label="Expected delivery"
              type="date"
              value={expectedDelivery}
              onChange={(event) => setExpectedDelivery(event.currentTarget.value)}
            />
            <TextInput
              label="Payment due date"
              type="date"
              value={paymentDueDate}
              onChange={(event) => setPaymentDueDate(event.currentTarget.value)}
            />
          </Group>
          <Textarea
            label="Notes"
            placeholder="Add notes for this sales order"
            value={notes}
            onChange={(event) => setNotes(event.currentTarget.value)}
          />
          <Button onClick={handleSaveDetails} loading={updateMutation.isPending}>
            Save order fields
          </Button>
        </Stack>
      </Drawer>
    </>
  );
}
