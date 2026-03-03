import { Badge, Button, Card, Drawer, Group, Menu, SimpleGrid, Stack, Table, Text, TextInput, Textarea, Title } from '@mantine/core';
import { IconDotsVertical } from '@tabler/icons-react';
import { useState } from 'react';
import { useParams } from 'react-router-dom';

import { PageError, PageLoading } from '../../../shared/ui/PageFeedback';
import { currency, dateTime, formatQuantity, toNumber } from '../../../shared/utils/format';
import { usePurchaseOrderDetailQuery, useUpdatePurchaseOrderMutation } from '../queries';

const purchaseOrderStatusColor: Record<string, string> = {
  DRAFT: 'blue',
  ORDER: 'indigo',
  RECEIVED: 'green',
  CANCELLED: 'red',
  RETURNED: 'orange',
};

const paymentStatusColor: Record<string, string> = {
  UNPAID: 'yellow',
  PAID: 'green',
  REFUNDED: 'orange',
};

const purchaseStatusLabel: Record<string, string> = {
  DRAFT: 'Draft',
  ORDER: 'Ordered',
  RECEIVED: 'Received',
  CANCELLED: 'Cancelled',
  RETURNED: 'Returned',
};

const paymentStatusLabel: Record<string, string> = {
  UNPAID: 'Unpaid',
  PAID: 'Paid',
  REFUNDED: 'Refunded',
};

const getNextPurchaseStatus = (status: string): 'ORDER' | 'RECEIVED' | null => {
  if (status === 'DRAFT') return 'ORDER';
  if (status === 'ORDER') return 'RECEIVED';
  return null;
};

const getNextPaymentStatus = (status: string): 'PAID' | 'REFUNDED' | null => {
  if (status === 'UNPAID') return 'PAID';
  if (status === 'PAID') return 'REFUNDED';
  return null;
};

const toDateInput = (value?: string | null): string => {
  if (!value) return '';

  const directDateMatch = value.match(/^(\d{4}-\d{2}-\d{2})/);
  if (directDateMatch) return directDateMatch[1];

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) return '';
  const year = parsedDate.getUTCFullYear();
  const month = String(parsedDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(parsedDate.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const toApiDate = (value: string): string | null => {
  if (!value) return null;
  return value;
};

export function PurchaseOrderDetailPage() {
  const params = useParams();
  const orderId = Number(params.id);

  const { data, isLoading, error } = usePurchaseOrderDetailQuery(orderId);
  const updateMutation = useUpdatePurchaseOrderMutation(orderId);

  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [paymentDueDate, setPaymentDueDate] = useState('');
  const [expectedDelivery, setExpectedDelivery] = useState('');
  const [orderedAt, setOrderedAt] = useState('');
  const [notes, setNotes] = useState('');
  const [isEditOpen, setIsEditOpen] = useState(false);

  if (isLoading) return <PageLoading label="Loading purchase order" />;
  if (error || !data) return <PageError message="Unable to load purchase order." />;

  const productById = Object.fromEntries(data.products.map((product) => [product.id, product.name]));
  const supplierById = Object.fromEntries(data.suppliers.map((supplier) => [supplier.id, supplier.legal_name]));
  const nextStatus = getNextPurchaseStatus(data.order.status);
  const nextPaymentStatus = getNextPaymentStatus(data.order.payment_status);

  const openEditDrawer = () => {
    setInvoiceNumber(data.order.invoice_number || '');
    setPaymentDueDate(toDateInput(data.order.payment_due_date));
    setExpectedDelivery(toDateInput(data.order.expected_delivery));
    setOrderedAt(toDateInput(data.order.order_at));
    setNotes(data.order.notes || '');
    setIsEditOpen(true);
  };

  const handleSaveDetails = async () => {
    await updateMutation.mutateAsync({
      invoice_number: invoiceNumber || null,
      payment_due_date: toApiDate(paymentDueDate),
      expected_delivery: toApiDate(expectedDelivery),
      order_at: toApiDate(orderedAt),
      notes: notes || null,
    });
    setIsEditOpen(false);
  };

  return (
    <>
      <Group justify="space-between" mb="md">
        <Title order={2}>Purchase Order #{data.order.order_number || data.order.id}</Title>
        <Group>
          <Badge color={purchaseOrderStatusColor[data.order.status] || 'gray'}>{data.order.status}</Badge>
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
              color={purchaseOrderStatusColor[nextStatus] || 'blue'}
              onClick={() => updateMutation.mutate({ status: nextStatus })}
              loading={updateMutation.isPending}
            >
              Mark as {purchaseStatusLabel[nextStatus]}
            </Button>
          )}

          <Menu shadow="md" width={220}>
            <Menu.Target>
              <Button variant="default" leftSection={<IconDotsVertical size={16} />}>
                More status actions
              </Button>
            </Menu.Target>
            <Menu.Dropdown>
              {(['DRAFT', 'ORDER', 'RECEIVED', 'CANCELLED', 'RETURNED'] as const)
                .filter((status) => status !== data.order.status && status !== nextStatus)
                .map((status) => (
                  <Menu.Item key={status} onClick={() => updateMutation.mutate({ status })}>
                    Mark as {purchaseStatusLabel[status]}
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
          <Text c="dimmed" size="sm">Supplier</Text>
          <Text mb="sm">{data.order.supplier ? supplierById[data.order.supplier] || '-' : '-'}</Text>
          <Text c="dimmed" size="sm">Notes</Text>
          <Text>{data.order.notes || '-'}</Text>
        </Card>

        <Card withBorder>
          <Text fw={600} mb="xs">Dates</Text>
          <Text c="dimmed" size="sm">Created at</Text>
          <Text mb="sm">{dateTime(data.order.created_at)}</Text>
          <Text c="dimmed" size="sm">Order at</Text>
          <Text mb="sm">{dateTime(data.order.order_at)}</Text>
          <Text c="dimmed" size="sm">Expected delivery</Text>
          <Text>{dateTime(data.order.expected_delivery)}</Text>
        </Card>

        <Card withBorder>
          <Text fw={600} mb="xs">Financial</Text>
          <Text c="dimmed" size="sm">Invoice number</Text>
          <Text mb="sm">{data.order.invoice_number || '-'}</Text>
          <Text c="dimmed" size="sm">Payment due date</Text>
          <Text mb="sm">{dateTime(data.order.payment_due_date)}</Text>
          <Text c="dimmed" size="sm">Total</Text>
          <Text fw={600}>{currency(toNumber(data.order.total_amount))}</Text>
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

      <Drawer opened={isEditOpen} onClose={() => setIsEditOpen(false)} title="Edit purchase order details" position="right" size="md">
        <Stack>
          <Group grow>
            <TextInput
              label="Invoice number"
              placeholder="e.g. INV-1001"
              value={invoiceNumber}
              onChange={(event) => setInvoiceNumber(event.currentTarget.value)}
            />
            <TextInput
              label="Payment due date"
              type="date"
              value={paymentDueDate}
              onChange={(event) => setPaymentDueDate(event.currentTarget.value)}
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
              label="Order at"
              type="date"
              value={orderedAt}
              onChange={(event) => setOrderedAt(event.currentTarget.value)}
            />
          </Group>
          <Textarea
            label="Notes"
            placeholder="Add notes for this purchase order"
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
