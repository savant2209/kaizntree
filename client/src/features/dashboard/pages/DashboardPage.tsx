import { Card, Group, Progress, SimpleGrid, Table, Text, Title } from '@mantine/core';

import { useDashboardQuery } from '../queries';
import { PageError, PageLoading } from '../../../shared/ui/PageFeedback';
import { currency, percent } from '../../../shared/utils/format';

export function DashboardPage() {
  const { data, isLoading, error } = useDashboardQuery();

  if (isLoading) return <PageLoading label="Loading financial analysis" />;
  if (error || !data) return <PageError message="Unable to load dashboard data." />;

  const metrics = [
    { label: 'Revenue', value: currency(data.revenue) },
    { label: 'Cost', value: currency(data.cost) },
    { label: 'Profit', value: currency(data.profit) },
    { label: 'Margin', value: percent(data.margin) },
    { label: 'Open orders', value: String(data.openOrders) },
  ];

  return (
    <>
      <Title order={2} mb="md">
        Financial Dashboard
      </Title>

      <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
        {metrics.map((metric) => (
          <Card key={metric.label} withBorder>
            <Text c="dimmed" size="sm">
              {metric.label}
            </Text>
            <Text fw={700} size="xl">
              {metric.value}
            </Text>
          </Card>
        ))}
      </SimpleGrid>

      <Card withBorder mt="md">
        <Group justify="space-between" mb="sm">
          <Text fw={600}>Profit analysis</Text>
          <Text c="dimmed" size="sm">
            Overall margin: {percent(data.margin)}
          </Text>
        </Group>
        <Progress value={Math.max(0, Math.min(100, data.margin))} color={data.margin >= 0 ? 'green' : 'red'} />
      </Card>

      <Card withBorder mt="md">
        <Text fw={600} mb="sm">
          Top products by profit
        </Text>
        <Table striped>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Product</Table.Th>
              <Table.Th>Revenue</Table.Th>
              <Table.Th>Cost</Table.Th>
              <Table.Th>Profit</Table.Th>
              <Table.Th>Margin</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {data.topProducts.map((item) => (
              <Table.Tr key={item.productId}>
                <Table.Td>{item.name}</Table.Td>
                <Table.Td>{currency(item.revenue)}</Table.Td>
                <Table.Td>{currency(item.cost)}</Table.Td>
                <Table.Td>{currency(item.profit)}</Table.Td>
                <Table.Td className={item.margin < 0 ? 'text-red-600 font-semibold' : ''}>{percent(item.margin)}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Card>
    </>
  );
}
