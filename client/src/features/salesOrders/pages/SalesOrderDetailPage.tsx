import { Badge, Button, Card, Group, Table, Text, Title } from '@mantine/core';
import { useMemo } from 'react';
import { useParams } from 'react-router-dom';

import { PageError, PageLoading } from '../../../shared/ui/PageFeedback';
import { currency, percent, toNumber } from '../../../shared/utils/format';
import { useSalesOrderDetailQuery, useUpdateSalesOrderStatusMutation } from '../queries';

export function SalesOrderDetailPage() {
  const params = useParams();
  const orderId = Number(params.id);

  const { data, isLoading, error } = useSalesOrderDetailQuery(orderId);
  const updateStatusMutation = useUpdateSalesOrderStatusMutation(orderId);

  if (isLoading) return <PageLoading label="Loading sales order" />;
  if (error || !data) return <PageError message="Unable to load sales order." />;

  const productById = Object.fromEntries(data.products.map((product) => [product.id, product.name]));
  const customerById = Object.fromEntries(data.customers.map((customer) => [customer.id, customer.name]));

  const estimatedProfit = useMemo(() => {
    return data.items.reduce((sum, item) => {
      const qty = toNumber(item.quantity);
      const unitPrice = toNumber(item.unit_price);
      const costData = data.averageCostByProduct[item.product];
      const avgCost = costData && costData.totalQty > 0 ? costData.totalCost / costData.totalQty : 0;
      return sum + qty * (unitPrice - avgCost);
    }, 0);
  }, [data.averageCostByProduct, data.items]);

  const total = toNumber(data.order.total_amount);
  const margin = total > 0 ? (estimatedProfit / total) * 100 : 0;

  return (
    <>
      <Group justify="space-between" mb="md">
        <Title order={2}>Sales Order #{data.order.order_number || data.order.id}</Title>
        <Badge>{data.order.status}</Badge>
      </Group>

      <Card withBorder mb="md">
        <Text>Customer: {data.order.customer ? customerById[data.order.customer] || '-' : '-'}</Text>
        <Text>Total: {currency(total)}</Text>
        <Text className={margin < 0 ? 'text-red-600 font-semibold' : ''}>
          Estimated profit: {currency(estimatedProfit)} ({percent(margin)})
        </Text>
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
        <Button onClick={() => updateStatusMutation.mutate('DELIVERED')} loading={updateStatusMutation.isPending}>
          Mark as delivered
        </Button>
      </Group>
    </>
  );
}
