import { Badge, Button, Card, Group, Table, Title } from '@mantine/core';
import { Link, useNavigate } from 'react-router-dom';

import { PageError, PageLoading } from '../../../shared/ui/PageFeedback';
import { currency, dateTime } from '../../../shared/utils/format';
import { usePurchaseOrdersQuery } from '../queries';

export function PurchaseOrdersPage() {
  const navigate = useNavigate();
  const { data, isLoading, error } = usePurchaseOrdersQuery();

  if (isLoading) return <PageLoading label="Loading purchase orders" />;
  if (error || !data) return <PageError message="Unable to load purchase orders." />;

  const supplierById = Object.fromEntries(data.suppliers.map((supplier) => [supplier.id, supplier.legal_name]));

  return (
    <>
      <Group justify="space-between" mb="md">
        <Title order={2}>Purchase Orders</Title>
        <Button component={Link} to="/purchase-orders/new">
          New PO
        </Button>
      </Group>

      <Card withBorder>
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Number</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Supplier</Table.Th>
              <Table.Th>Date</Table.Th>
              <Table.Th>Total</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {data.orders.map((order) => (
              <Table.Tr key={order.id} onClick={() => navigate(`/purchase-orders/${order.id}`)} style={{ cursor: 'pointer' }}>
                <Table.Td>{order.order_number || `PO-${order.id}`}</Table.Td>
                <Table.Td>
                  <Badge>{order.status}</Badge>
                </Table.Td>
                <Table.Td>{order.supplier ? supplierById[order.supplier] || '-' : '-'}</Table.Td>
                <Table.Td>{dateTime(order.created_at)}</Table.Td>
                <Table.Td>{currency(Number(order.total_amount))}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Card>
    </>
  );
}
