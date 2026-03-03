import { Badge, Button, Card, Group, Select, Table, TextInput, Title } from '@mantine/core';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { PageError, PageLoading } from '../../../shared/ui/PageFeedback';
import { currency, dateTime } from '../../../shared/utils/format';
import { usePurchaseOrdersQuery } from '../queries';

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

export function PurchaseOrdersPage() {
  const navigate = useNavigate();
  const { data, isLoading, error } = usePurchaseOrdersQuery();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'DRAFT' | 'ORDER' | 'RECEIVED' | 'CANCELLED' | 'RETURNED'>('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<'all' | 'UNPAID' | 'PAID' | 'REFUNDED'>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  if (isLoading) return <PageLoading label="Loading purchase orders" />;
  if (error || !data) return <PageError message="Unable to load purchase orders." />;

  const supplierById = Object.fromEntries(data.suppliers.map((supplier) => [supplier.id, supplier.legal_name]));

  const normalizedSearch = search.trim().toLowerCase();
  const filteredOrders = data.orders.filter((order) => {
    const supplierName = order.supplier ? supplierById[order.supplier] || '' : '';
    const matchesSearch =
      normalizedSearch.length === 0 ||
      (order.order_number || '').toLowerCase().includes(normalizedSearch) ||
      supplierName.toLowerCase().includes(normalizedSearch);

    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    const matchesPaymentStatus = paymentStatusFilter === 'all' || order.payment_status === paymentStatusFilter;

    const orderDate = order.order_at ? String(order.order_at).slice(0, 10) : '';
    const matchesFrom = !fromDate || (orderDate !== '' && orderDate >= fromDate);
    const matchesTo = !toDate || (orderDate !== '' && orderDate <= toDate);

    return matchesSearch && matchesStatus && matchesPaymentStatus && matchesFrom && matchesTo;
  })
  .sort((a, b) => String(b.order_at || b.created_at || '').localeCompare(String(a.order_at || a.created_at || '')));

  return (
    <>
      <Group justify="space-between" mb="md">
        <Title order={2}>Purchase Orders</Title>
        <Button component={Link} to="/purchase-orders/new">
          New PO
        </Button>
      </Group>

      <Card withBorder>
        <Group grow mb="md">
          <TextInput
            label="Search"
            placeholder="Order number or supplier"
            value={search}
            onChange={(event) => setSearch(event.currentTarget.value)}
          />
          <Select
            label="Status"
            value={statusFilter}
            onChange={(value) =>
              setStatusFilter((value as 'all' | 'DRAFT' | 'ORDER' | 'RECEIVED' | 'CANCELLED' | 'RETURNED') || 'all')
            }
            data={[
              { value: 'all', label: 'All' },
              { value: 'DRAFT', label: 'Draft' },
              { value: 'ORDER', label: 'Ordered' },
              { value: 'RECEIVED', label: 'Received' },
              { value: 'CANCELLED', label: 'Cancelled' },
              { value: 'RETURNED', label: 'Returned' },
            ]}
            allowDeselect={false}
          />
          <Select
            label="Payment status"
            value={paymentStatusFilter}
            onChange={(value) => setPaymentStatusFilter((value as 'all' | 'UNPAID' | 'PAID' | 'REFUNDED') || 'all')}
            data={[
              { value: 'all', label: 'All' },
              { value: 'UNPAID', label: 'Unpaid' },
              { value: 'PAID', label: 'Paid' },
              { value: 'REFUNDED', label: 'Refunded' },
            ]}
            allowDeselect={false}
          />
          <TextInput label="From date" type="date" value={fromDate} onChange={(event) => setFromDate(event.currentTarget.value)} />
          <TextInput label="To date" type="date" value={toDate} onChange={(event) => setToDate(event.currentTarget.value)} />
        </Group>

        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Number</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Payment status</Table.Th>
              <Table.Th>Supplier</Table.Th>
              <Table.Th>Created at</Table.Th>
              <Table.Th>Order at</Table.Th>
              <Table.Th>Total</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {filteredOrders.map((order) => (
              <Table.Tr key={order.id} onClick={() => navigate(`/purchase-orders/${order.id}`)} style={{ cursor: 'pointer' }}>
                <Table.Td>{order.order_number || `PO-${order.id}`}</Table.Td>
                <Table.Td>
                  <Badge color={purchaseOrderStatusColor[order.status] || 'gray'}>{order.status}</Badge>
                </Table.Td>
                <Table.Td>
                  <Badge color={paymentStatusColor[order.payment_status] || 'gray'}>{order.payment_status}</Badge>
                </Table.Td>
                <Table.Td>{order.supplier ? supplierById[order.supplier] || '-' : '-'}</Table.Td>
                <Table.Td>{dateTime(order.created_at)}</Table.Td>
                <Table.Td>{dateTime(order.order_at)}</Table.Td>
                <Table.Td>{currency(Number(order.total_amount))}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Card>
    </>
  );
}
