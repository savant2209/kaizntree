import { Badge, Button, Card, Group, Select, Table, TextInput, Title } from '@mantine/core';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { PageError, PageLoading } from '../../../shared/ui/PageFeedback';
import { currency, dateTime } from '../../../shared/utils/format';
import { useSalesOrdersQuery } from '../queries';

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

export function SalesOrdersPage() {
  const navigate = useNavigate();
  const { data, isLoading, error } = useSalesOrdersQuery();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ORDER' | 'DELIVERED' | 'CANCELLED' | 'RETURNED'>('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<'all' | 'UNPAID' | 'PAID' | 'REFUNDED'>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  if (isLoading) return <PageLoading label="Loading sales orders" />;
  if (error || !data) return <PageError message="Unable to load sales orders." />;

  const customerById = Object.fromEntries(data.customers.map((customer) => [customer.id, customer.name]));

  const normalizedSearch = search.trim().toLowerCase();
  const filteredOrders = data.orders.filter((order) => {
    const customerName = order.customer ? customerById[order.customer] || '' : '';
    const matchesSearch =
      normalizedSearch.length === 0 ||
      (order.order_number || '').toLowerCase().includes(normalizedSearch) ||
      customerName.toLowerCase().includes(normalizedSearch);

    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    const matchesPaymentStatus = paymentStatusFilter === 'all' || order.payment_status === paymentStatusFilter;

    const orderDate = order.order_at ? String(order.order_at).slice(0, 10) : '';
    const matchesFrom = !fromDate || (orderDate !== '' && orderDate >= fromDate);
    const matchesTo = !toDate || (orderDate !== '' && orderDate <= toDate);

    return matchesSearch && matchesStatus && matchesPaymentStatus && matchesFrom && matchesTo;
  })
  .sort((a, b) => String(b.order_at || b.last_updated || '').localeCompare(String(a.order_at || a.last_updated || '')));

  return (
    <>
      <Group justify="space-between" mb="md">
        <Title order={2}>Sales Orders</Title>
        <Button component={Link} to="/sales-orders/new">
          New SO
        </Button>
      </Group>

      <Card withBorder>
        <Group grow mb="md">
          <TextInput
            label="Search"
            placeholder="Order number or customer"
            value={search}
            onChange={(event) => setSearch(event.currentTarget.value)}
          />
          <Select
            label="Status"
            value={statusFilter}
            onChange={(value) => setStatusFilter((value as 'all' | 'ORDER' | 'DELIVERED' | 'CANCELLED' | 'RETURNED') || 'all')}
            data={[
              { value: 'all', label: 'All' },
              { value: 'ORDER', label: 'Ordered' },
              { value: 'DELIVERED', label: 'Delivered' },
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
              <Table.Th>Customer</Table.Th>
              <Table.Th>Order at</Table.Th>
              <Table.Th>Expected delivery</Table.Th>
              <Table.Th>Total</Table.Th>
              <Table.Th>Estimated profit</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {filteredOrders.map((order) => (
              <Table.Tr key={order.id} onClick={() => navigate(`/sales-orders/${order.id}`)} style={{ cursor: 'pointer' }}>
                <Table.Td>{order.order_number || `SO-${order.id}`}</Table.Td>
                <Table.Td>
                  <Badge color={salesOrderStatusColor[order.status] || 'gray'}>{order.status}</Badge>
                </Table.Td>
                <Table.Td>
                  <Badge color={paymentStatusColor[order.payment_status] || 'gray'}>{order.payment_status}</Badge>
                </Table.Td>
                <Table.Td>{order.customer ? customerById[order.customer] || '-' : '-'}</Table.Td>
                <Table.Td>{dateTime(order.order_at)}</Table.Td>
                <Table.Td>{order.expected_delivery ? dateTime(order.expected_delivery) : '-'}</Table.Td>
                <Table.Td>{currency(Number(order.total_amount))}</Table.Td>
                <Table.Td>{currency(data.estimatedProfitByOrder[order.id] || 0)}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Card>
    </>
  );
}
