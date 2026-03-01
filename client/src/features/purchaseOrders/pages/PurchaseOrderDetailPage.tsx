import { Badge, Button, Card, Group, Table, Text, Title } from '@mantine/core';
import { useParams } from 'react-router-dom';

import { PageError, PageLoading } from '../../../shared/ui/PageFeedback';
import { currency } from '../../../shared/utils/format';
import { usePurchaseOrderDetailQuery, useUpdatePurchaseOrderStatusMutation } from '../queries';

export function PurchaseOrderDetailPage() {
  const params = useParams();
  const orderId = Number(params.id);

  const { data, isLoading, error } = usePurchaseOrderDetailQuery(orderId);
  const updateStatusMutation = useUpdatePurchaseOrderStatusMutation(orderId);

  if (isLoading) return <PageLoading label="Loading purchase order" />;
  if (error || !data) return <PageError message="Unable to load purchase order." />;

  const productById = Object.fromEntries(data.products.map((product) => [product.id, product.name]));
  const supplierById = Object.fromEntries(data.suppliers.map((supplier) => [supplier.id, supplier.legal_name]));

  return (
    <>
      <Group justify="space-between" mb="md">
        <Title order={2}>Purchase Order #{data.order.order_number || data.order.id}</Title>
        <Badge>{data.order.status}</Badge>
      </Group>

      <Card withBorder mb="md">
        <Text>Supplier: {data.order.supplier ? supplierById[data.order.supplier] || '-' : '-'}</Text>
        <Text>Total: {currency(Number(data.order.total_amount))}</Text>
      </Card>

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
                <Table.Td>{item.quantity}</Table.Td>
                <Table.Td>{currency(Number(item.unit_price))}</Table.Td>
                <Table.Td>{currency(Number(item.quantity) * Number(item.unit_price))}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Card>

      <Group justify="flex-end" mt="md">
        <Button variant="outline" color="red" onClick={() => updateStatusMutation.mutate('CANCELLED')} loading={updateStatusMutation.isPending}>
          Cancel
        </Button>
        <Button onClick={() => updateStatusMutation.mutate('RECEIVED')} loading={updateStatusMutation.isPending}>
          Mark as received
        </Button>
      </Group>
    </>
  );
}
