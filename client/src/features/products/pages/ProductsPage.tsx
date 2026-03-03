import {
  Badge,
  Button,
  Card,
  Divider,
  Drawer,
  Group,
  NumberInput,
  Select,
  Stack,
  Switch,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useState } from 'react';

import type { ProductDTO } from '../../../shared/types/dto';
import { PageError, PageLoading } from '../../../shared/ui/PageFeedback';
import { currency, formatQuantity, percent, toNumber } from '../../../shared/utils/format';
import { useProductsFinancialQuery, useUpsertProductMutation } from '../queries';

type ProductForm = {
  name: string;
  sku: string;
  category: string;
  price: number | string;
  default_unit: ProductDTO['default_unit'];
  description: string;
  is_active: boolean;
};

const defaultForm: ProductForm = {
  name: '',
  sku: '',
  category: '',
  price: 0,
  default_unit: 'UN',
  description: '',
  is_active: true,
};

export function ProductsPage() {
  const { data, isLoading, error } = useProductsFinancialQuery();
  const saveMutation = useUpsertProductMutation();

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [opened, setOpened] = useState(false);
  const [selected, setSelected] = useState<ProductDTO | null>(null);
  const [form, setForm] = useState<ProductForm>(defaultForm);

  if (isLoading) return <PageLoading label="Loading products" />;
  if (error || !data) return <PageError message="Unable to load products." />;

  const stockByProduct = data.stocks.reduce<Record<number, number>>((acc, stock) => {
    acc[stock.product] = (acc[stock.product] || 0) + toNumber(stock.quantity);
    return acc;
  }, {});

  const costByProduct = data.purchaseItems.reduce<Record<number, { totalCost: number; totalQty: number }>>(
    (acc, item) => {
      const current = acc[item.product] || { totalCost: 0, totalQty: 0 };
      const qty = toNumber(item.quantity);
      current.totalQty += qty;
      current.totalCost += qty * toNumber(item.unit_price);
      acc[item.product] = current;
      return acc;
    },
    {},
  );

  const categories = Array.from(new Set(data.products.map((product) => product.category))).map((item) => ({
    label: item,
    value: item,
  }));

  const filtered = data.products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(search.toLowerCase()) ||
      product.sku.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !category || product.category === category;
    return matchesSearch && matchesCategory;
  });

  const openNewModal = () => {
    setSelected(null);
    setForm(defaultForm);
    setOpened(true);
  };

  const openProductDrawer = (product: ProductDTO) => {
    setSelected(product);
    setForm({
      name: product.name,
      sku: product.sku,
      category: product.category,
      price: toNumber(product.price),
      default_unit: product.default_unit,
      description: product.description || '',
      is_active: product.is_active,
    });
    setOpened(true);
  };

  const handleSave = async () => {
    await saveMutation.mutateAsync({
      id: selected?.id,
      payload: {
        name: form.name,
        sku: form.sku,
        category: form.category,
        price: toNumber(form.price).toFixed(2),
        default_unit: form.default_unit,
        description: form.description,
        is_active: form.is_active,
      },
    });
    setOpened(false);
  };

  return (
    <>
      <Group justify="space-between" mb="md">
        <Title order={2}>Products</Title>
        <Button onClick={openNewModal}>New Product</Button>
      </Group>

      <Card withBorder mb="md">
        <Group grow>
          <TextInput
            label="Search"
            placeholder="Name or SKU"
            value={search}
            onChange={(event) => setSearch(event.currentTarget.value)}
          />
          <Select
            label="Category"
            placeholder="All"
            data={categories}
            clearable
            value={category}
            onChange={setCategory}
          />
        </Group>
      </Card>

      <Card withBorder>
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Name</Table.Th>
              <Table.Th>SKU</Table.Th>
              <Table.Th>Sale price</Table.Th>
              <Table.Th>Average cost</Table.Th>
              <Table.Th>Current stock</Table.Th>
              <Table.Th>Unit profit</Table.Th>
              <Table.Th>Margin</Table.Th>
              <Table.Th style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>Active</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {filtered.map((product) => {
              const averageCost =
                costByProduct[product.id] && costByProduct[product.id].totalQty > 0
                  ? costByProduct[product.id].totalCost / costByProduct[product.id].totalQty
                  : 0;
              const salePrice = toNumber(product.price);
              const unitProfit = salePrice - averageCost;
              const unitMargin = salePrice > 0 ? (unitProfit / salePrice) * 100 : 0;

              return (
                <Table.Tr key={product.id} onClick={() => openProductDrawer(product)} style={{ cursor: 'pointer' }}>
                  <Table.Td>{product.name}</Table.Td>
                  <Table.Td>{product.sku}</Table.Td>
                  <Table.Td>{currency(salePrice)}</Table.Td>
                  <Table.Td>{currency(averageCost)}</Table.Td>
                  <Table.Td>{formatQuantity(stockByProduct[product.id] || 0)}</Table.Td>
                  <Table.Td>{currency(unitProfit)}</Table.Td>
                  <Table.Td>
                    <span className={unitMargin < 0 ? 'text-red-600 font-semibold' : ''}>{percent(unitMargin)}</span>
                  </Table.Td>
                  <Table.Td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{product.is_active ? 'Yes' : 'No'}</Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      </Card>

      <Drawer
        opened={opened}
        onClose={() => setOpened(false)}
        title={selected ? `Product #${selected.id}` : 'New Product'}
        position="right"
        size="lg"
      >
        <Stack>
          <TextInput
            label="Name"
            placeholder="e.g. Whole Milk"
            withAsterisk
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.currentTarget.value })}
          />
          <TextInput
            label="SKU"
            placeholder="e.g. MILK-BRAND-1L"
            withAsterisk
            value={form.sku}
            onChange={(event) => setForm({ ...form, sku: event.currentTarget.value })}
          />
          <TextInput
            label="Category"
            placeholder="e.g. Dairy"
            withAsterisk
            value={form.category}
            onChange={(event) => setForm({ ...form, category: event.currentTarget.value })}
          />
          <NumberInput
            label="Sale price"
            placeholder="0.00"
            withAsterisk
            min={0}
            decimalScale={2}
            value={form.price}
            onChange={(value) => setForm({ ...form, price: value })}
          />
          <Select
            label="Unit"
            placeholder="Select a unit"
            withAsterisk
            data={[
              { value: 'KG', label: 'kg' },
              { value: 'G', label: 'g' },
              { value: 'L', label: 'L' },
              { value: 'ML', label: 'mL' },
              { value: 'UN', label: 'Unit' },
            ]}
            value={form.default_unit}
            onChange={(value) => setForm({ ...form, default_unit: (value || 'UN') as ProductDTO['default_unit'] })}
          />
          <TextInput
            label="Description"
            placeholder="Short description"
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.currentTarget.value })}
          />
          <Switch
            label="Active"
            checked={form.is_active}
            onChange={(event) => setForm({ ...form, is_active: event.currentTarget.checked })}
          />

          {selected && (
            <>
              <Divider />
              <Text fw={600}>Financial overview</Text>
              <Badge variant="light">Current price: {currency(toNumber(selected.price))}</Badge>
            </>
          )}

          <Button onClick={handleSave} loading={saveMutation.isPending}>
            Save
          </Button>
        </Stack>
      </Drawer>
    </>
  );
}
