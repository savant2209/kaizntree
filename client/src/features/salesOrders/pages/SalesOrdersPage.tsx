import { Badge, Button, Card, Group, Table, Title } from '@mantine/core';
import { Link, useNavigate } from 'react-router-dom';

import { PageError, PageLoading } from '../../../shared/ui/PageFeedback';
import { currency, dateTime } from '../../../shared/utils/format';
import { useSalesOrdersQuery } from '../queries';

export function SalesOrdersPage() {
  const navigate = useNavigate();
  const { data, isLoading, error } = useSalesOrdersQuery();

  if (isLoading) return <PageLoading label="Loading sales orders" />;
  if (error || !data) return <PageError message="Unable to load sales orders." />;

  const customerById = Object.fromEntries(data.customers.map((customer) => [customer.id, customer.name]));

  return (
    <>
      <Group justify="space-between" mb="md">
        <Title order={2}>Sales Orders</Title>
        <Button component={Link} to="/sales-orders/new">
          New SO
        </Button>
      </Group>

      <Card withBorder>
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Number</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Customer</Table.Th>
              <Table.Th>Date</Table.Th>
              <Table.Th>Total</Table.Th>
              <Table.Th>Estimated profit</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {data.orders.map((order) => (
              <Table.Tr key={order.id} onClick={() => navigate(`/sales-orders/${order.id}`)} style={{ cursor: 'pointer' }}>
                <Table.Td>{order.order_number || `SO-${order.id}`}</Table.Td>
                <Table.Td>
                  <Badge>{order.status}</Badge>
                </Table.Td>
                <Table.Td>{order.customer ? customerById[order.customer] || '-' : '-'}</Table.Td>
                <Table.Td>{dateTime(order.order_at)}</Table.Td>
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
