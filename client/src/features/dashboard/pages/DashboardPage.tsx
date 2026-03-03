import { Card, Group, Select, SimpleGrid, Table, Text, Title } from '@mantine/core';
import { useState } from 'react';

import { useDashboardQuery, type DashboardPeriod } from '../queries';
import { PageError, PageLoading } from '../../../shared/ui/PageFeedback';
import { currency, formatQuantity, percent } from '../../../shared/utils/format';

export function DashboardPage() {
  const [period, setPeriod] = useState<DashboardPeriod>('all');
  const [productId, setProductId] = useState<string | null>(null);

  const { data, isLoading, error } = useDashboardQuery({ period, productId });

  if (isLoading) return <PageLoading label="Loading financial analysis" />;
  if (error || !data) return <PageError message="Unable to load dashboard data." />;

  const kpis = [
    {
      label: 'Revenue',
      value: currency(data.revenue),
      helper: `Avg: ${currency(data.avgRevenuePerUnit)} /un`,
    },
    {
      label: 'Costs',
      value: currency(data.cost),
      helper: `Avg: ${currency(data.avgCostPerUnit)} /un`,
    },
    {
      label: 'Profit',
      value: currency(data.profit),
      helper: `Avg: ${currency(data.avgProfitPerUnit)} /un`,
    },
    {
      label: 'Profit margin',
      value: percent(data.margin),
      helper: `Open orders: ${data.openOrders}`,
    },
    {
      label: 'Profit markup',
      value: percent(data.markup),
      helper: 'Profit / Costs',
    },
  ];

  return (
    <>
      <Title order={2} mb="md">
        Financial Dashboard
      </Title>

      <Card withBorder mb="md">
        <Group grow>
          <Select
            label="Period"
            value={period}
            onChange={(value) => setPeriod((value as DashboardPeriod) || 'all')}
            data={[
              { value: 'all', label: 'All time' },
              { value: 'this-month', label: 'This month' },
              { value: 'last-30-days', label: 'Last 30 days' },
            ]}
            allowDeselect={false}
          />
          <Select
            label="Product"
            placeholder="All products"
            searchable
            clearable
            data={data.products}
            value={productId}
            onChange={setProductId}
          />
        </Group>
      </Card>

      <SimpleGrid cols={{ base: 1, md: 5 }} spacing="md">
        {kpis.map((metric) => (
          <Card key={metric.label} withBorder>
            <Text c="dimmed" size="sm">
              {metric.label}
            </Text>
            <Text fw={700} size="xl">
              {metric.value}
            </Text>
            <Text c="dimmed" size="xs" mt="xs">
              {metric.helper}
            </Text>
          </Card>
        ))}
      </SimpleGrid>

      <Card withBorder mt="md">
        <Text fw={600} mb="sm">
          Product profit analysis
        </Text>
        <Table striped>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Product</Table.Th>
              <Table.Th>Purchased qty</Table.Th>
              <Table.Th>Purchase cost</Table.Th>
              <Table.Th>Sold qty</Table.Th>
              <Table.Th>Revenue</Table.Th>
              <Table.Th>Cost</Table.Th>
              <Table.Th>Profit</Table.Th>
              <Table.Th>Margin</Table.Th>
              <Table.Th>Markup</Table.Th>
              <Table.Th>In Stock</Table.Th>
              <Table.Th>Asset Value</Table.Th>
              <Table.Th>Expected Revenue</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {data.productFinancials.map((item) => (
              <Table.Tr key={item.productId}>
                <Table.Td>{item.name}</Table.Td>
                <Table.Td>{formatQuantity(item.purchasedQty)}</Table.Td>
                <Table.Td>{currency(item.purchaseCost)}</Table.Td>
                <Table.Td>{formatQuantity(item.soldQty)}</Table.Td>
                <Table.Td>{currency(item.revenue)}</Table.Td>
                <Table.Td>{currency(item.cost)}</Table.Td>
                <Table.Td>{currency(item.profit)}</Table.Td>
                <Table.Td className={item.margin < 0 ? 'text-red-600 font-semibold' : ''}>{percent(item.margin)}</Table.Td>
                <Table.Td className={item.markup < 0 ? 'text-red-600 font-semibold' : ''}>{percent(item.markup)}</Table.Td>
                <Table.Td>{formatQuantity(item.inStockQty)}</Table.Td>
                <Table.Td>{currency(item.assetValue)}</Table.Td>
                <Table.Td>{currency(item.expectedRevenue)}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Card>
    </>
  );
}
