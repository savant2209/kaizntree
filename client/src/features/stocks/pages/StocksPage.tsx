import { ActionIcon, Box, Button, Card, Group, Modal, NumberInput, Select, Table, Tabs, Text, TextInput, Title } from '@mantine/core';
import { IconCheck, IconChevronDown, IconChevronUp } from '@tabler/icons-react';
import { Fragment, useMemo, useState } from 'react';

import { PageError, PageLoading } from '../../../shared/ui/PageFeedback';
import { dateTime, formatQuantity } from '../../../shared/utils/format';
import {
  useCreateManualStockMutation,
  useDeliverSalesOrderItemMutation,
  useDeliverSalesOrderMutation,
  useReceivePurchaseOrderItemMutation,
  useReceivePurchaseOrderMutation,
  useStockEntriesQuery,
} from '../queries';

const formatDateOnly = (value?: string | null): string => {
  if (!value) return '-';
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return value;
  return `${match[2]}/${match[3]}/${match[1]}`;
};

const clampQuantity = (value: number | string, min: number, max: number): number => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return min;
  if (numeric < min) return min;
  if (numeric > max) return max;
  return numeric;
};

export function StocksPage() {
  const { data, isLoading, error } = useStockEntriesQuery();
  const receiveItemMutation = useReceivePurchaseOrderItemMutation();
  const receiveOrderMutation = useReceivePurchaseOrderMutation();
  const deliverItemMutation = useDeliverSalesOrderItemMutation();
  const deliverOrderMutation = useDeliverSalesOrderMutation();
  const createManualStockMutation = useCreateManualStockMutation();

  const [expandedCurrentProduct, setExpandedCurrentProduct] = useState<number | null>(null);
  const [expandedInboundOrder, setExpandedInboundOrder] = useState<number | null>(null);
  const [expandedOutboundOrder, setExpandedOutboundOrder] = useState<number | null>(null);

  const [receiveItemModal, setReceiveItemModal] = useState<{ open: boolean; itemId: number | null; expected: number; quantity: number | string }>({
    open: false,
    itemId: null,
    expected: 0,
    quantity: 0,
  });

  const [deliverItemModal, setDeliverItemModal] = useState<{ open: boolean; itemId: number | null; expected: number; quantity: number | string }>({
    open: false,
    itemId: null,
    expected: 0,
    quantity: 0,
  });

  const [receiveOrderModal, setReceiveOrderModal] = useState<{ open: boolean; orderId: number | null; quantities: Record<number, number | string> }>({
    open: false,
    orderId: null,
    quantities: {},
  });

  const [deliverOrderModal, setDeliverOrderModal] = useState<{ open: boolean; orderId: number | null; quantities: Record<number, number | string> }>({
    open: false,
    orderId: null,
    quantities: {},
  });

  const [manualStockModal, setManualStockModal] = useState<{
    open: boolean;
    productId: string | null;
    quantity: number | string;
    batchNumber: string;
    expirationDate: string;
  }>({
    open: false,
    productId: null,
    quantity: 0,
    batchNumber: '',
    expirationDate: '',
  });

  const safeData = data ?? {
    currentStockRows: [],
    inboundOrders: [],
    outboundOrders: [],
    products: [],
    purchaseOrders: [],
    salesOrders: [],
    suppliers: [],
    customers: [],
  };

  const productById = Object.fromEntries(safeData.products.map((product) => [product.id, product.name]));
  const supplierById = Object.fromEntries(safeData.suppliers.map((supplier) => [supplier.id, supplier.legal_name]));
  const customerById = Object.fromEntries(safeData.customers.map((customer) => [customer.id, customer.name]));

  const purchaseOrderById = Object.fromEntries(safeData.purchaseOrders.map((order) => [order.id, order]));

  const activeReceiveOrder = useMemo(
    () => safeData.inboundOrders.find((order) => order.id === receiveOrderModal.orderId) || null,
    [safeData.inboundOrders, receiveOrderModal.orderId],
  );

  const activeDeliverOrder = useMemo(
    () => safeData.outboundOrders.find((order) => order.id === deliverOrderModal.orderId) || null,
    [safeData.outboundOrders, deliverOrderModal.orderId],
  );

  const deliverableActiveItems = useMemo(
    () => (activeDeliverOrder?.items || []).filter((item) => item.remaining_qty > 0 && item.available_to_deliver > 0),
    [activeDeliverOrder],
  );

  if (isLoading) return <PageLoading label="Loading stock entries" />;
  if (error || !data) return <PageError message="Unable to load stock entries." />;

  const submitReceiveItem = async () => {
    if (!receiveItemModal.itemId) return;
    const quantityReceived = Number(receiveItemModal.quantity);
    if (!Number.isFinite(quantityReceived) || quantityReceived <= 0) return;
    await receiveItemMutation.mutateAsync({
      itemId: receiveItemModal.itemId,
      quantityReceived,
    });
    setReceiveItemModal({ open: false, itemId: null, expected: 0, quantity: 0 });
  };

  const submitDeliverItem = async () => {
    if (!deliverItemModal.itemId) return;
    const quantityDelivered = clampQuantity(deliverItemModal.quantity, 0, deliverItemModal.expected);
    if (!Number.isFinite(quantityDelivered) || quantityDelivered <= 0) return;
    await deliverItemMutation.mutateAsync({
      itemId: deliverItemModal.itemId,
      quantityDelivered,
    });
    setDeliverItemModal({ open: false, itemId: null, expected: 0, quantity: 0 });
  };

  const submitReceiveOrder = async () => {
    if (!receiveOrderModal.orderId) return;
    const items = Object.entries(receiveOrderModal.quantities)
      .map(([id, quantity]) => ({ id: Number(id), quantity_received: Number(quantity) }))
      .filter((entry) => entry.quantity_received > 0);
    if (items.length === 0) return;

    await receiveOrderMutation.mutateAsync({ orderId: receiveOrderModal.orderId, items });
    setReceiveOrderModal({ open: false, orderId: null, quantities: {} });
  };

  const submitDeliverOrder = async () => {
    if (!deliverOrderModal.orderId) return;
    const maxByItemId = Object.fromEntries(
      deliverableActiveItems.map((item) => [item.id, item.available_to_deliver]),
    ) as Record<number, number>;

    const items = Object.entries(deliverOrderModal.quantities)
      .map(([id, quantity]) => {
        const itemId = Number(id);
        const max = maxByItemId[itemId] ?? 0;
        return { id: itemId, quantity_delivered: clampQuantity(quantity, 0, max) };
      })
      .filter((entry) => entry.quantity_delivered > 0);
    if (items.length === 0) return;

    await deliverOrderMutation.mutateAsync({ orderId: deliverOrderModal.orderId, items });
    setDeliverOrderModal({ open: false, orderId: null, quantities: {} });
  };

  const submitManualStock = async () => {
    const productId = Number(manualStockModal.productId);
    const quantity = Number(manualStockModal.quantity);
    if (!Number.isFinite(productId) || productId <= 0) return;
    if (!Number.isFinite(quantity) || quantity <= 0) return;

    await createManualStockMutation.mutateAsync({
      product: productId,
      quantity,
      batchNumber: manualStockModal.batchNumber.trim() || undefined,
      expirationDate: manualStockModal.expirationDate || undefined,
    });

    setManualStockModal({ open: false, productId: null, quantity: 0, batchNumber: '', expirationDate: '' });
  };

  return (
    <>
      <Group justify="space-between" mb="md">
        <Title order={2}>Stock</Title>
      </Group>

      <Card withBorder>
        <Tabs defaultValue="current-stock">
          <Tabs.List>
            <Tabs.Tab value="current-stock">Current Stock</Tabs.Tab>
            <Tabs.Tab value="inbound">Inbound</Tabs.Tab>
            <Tabs.Tab value="outbound">Outbound</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="current-stock" pt="md">
            <Group justify="space-between" align="center" mb="md">
              <Text c="dimmed" size="sm">
                Current physical, allocated, available and in-transit quantities by product.
              </Text>
              <Button
                size="xs"
                onClick={() =>
                  setManualStockModal({
                    open: true,
                    productId: null,
                    quantity: 0,
                    batchNumber: '',
                    expirationDate: '',
                  })
                }
              >
                Add manual stock
              </Button>
            </Group>

            <Table highlightOnHover style={{ tableLayout: 'fixed' }}>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th style={{ width: '32%' }}>Product</Table.Th>
                  <Table.Th style={{ width: '13%', textAlign: 'right' }}>Physical</Table.Th>
                  <Table.Th style={{ width: '13%', textAlign: 'right' }}>Allocated</Table.Th>
                  <Table.Th style={{ width: '13%', textAlign: 'right' }}>Available</Table.Th>
                  <Table.Th style={{ width: '13%', textAlign: 'right' }}>In transit</Table.Th>
                  <Table.Th style={{ width: '16%', textAlign: 'right' }}>Details</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {data.currentStockRows.map((row) => (
                  <Fragment key={row.product_id}>
                    <Table.Tr>
                      <Table.Td>{row.product_name}</Table.Td>
                      <Table.Td style={{ textAlign: 'right' }}>{formatQuantity(row.physical_qty)}</Table.Td>
                      <Table.Td style={{ textAlign: 'right' }}>{formatQuantity(row.allocated_qty)}</Table.Td>
                      <Table.Td style={{ textAlign: 'right' }}>{formatQuantity(row.available_qty)}</Table.Td>
                      <Table.Td style={{ textAlign: 'right' }}>{formatQuantity(row.in_transit_qty)}</Table.Td>
                      <Table.Td style={{ textAlign: 'right' }}>
                        <ActionIcon
                          size="sm"
                          variant="subtle"
                          onClick={() => setExpandedCurrentProduct((current) => (current === row.product_id ? null : row.product_id))}
                          aria-label={expandedCurrentProduct === row.product_id ? 'Collapse details' : 'Expand details'}
                        >
                          {expandedCurrentProduct === row.product_id ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
                        </ActionIcon>
                      </Table.Td>
                    </Table.Tr>

                    {expandedCurrentProduct === row.product_id && (
                      <Table.Tr>
                        <Table.Td colSpan={6} style={{ paddingTop: 6, paddingBottom: 10 }}>
                          <Box style={{ backgroundColor: 'var(--mantine-color-gray-0)', borderLeft: '3px solid var(--mantine-color-blue-6)', borderRadius: 6, padding: 10 }}>
                          <Table>
                            <Table.Thead>
                              <Table.Tr>
                                <Table.Th c="dimmed" fz="xs" tt="uppercase" style={{ letterSpacing: '0.04em' }}>Source</Table.Th>
                                <Table.Th c="dimmed" fz="xs" tt="uppercase" style={{ letterSpacing: '0.04em' }}>PO number</Table.Th>
                                <Table.Th c="dimmed" fz="xs" tt="uppercase" style={{ letterSpacing: '0.04em' }}>Supplier</Table.Th>
                                <Table.Th c="dimmed" fz="xs" tt="uppercase" style={{ letterSpacing: '0.04em' }}>Batch</Table.Th>
                                <Table.Th c="dimmed" fz="xs" tt="uppercase" style={{ letterSpacing: '0.04em' }}>Expiration</Table.Th>
                                <Table.Th c="dimmed" fz="xs" tt="uppercase" style={{ letterSpacing: '0.04em', textAlign: 'right' }}>Initial qty</Table.Th>
                                <Table.Th c="dimmed" fz="xs" tt="uppercase" style={{ letterSpacing: '0.04em', textAlign: 'right' }}>Current qty</Table.Th>
                                <Table.Th c="dimmed" fz="xs" tt="uppercase" style={{ letterSpacing: '0.04em' }}>Received at</Table.Th>
                              </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                              {row.details.map((detail) => {
                                const linkedOrder = detail.purchase_order ? purchaseOrderById[detail.purchase_order] : null;
                                const supplierName = linkedOrder?.supplier ? supplierById[linkedOrder.supplier] || '-' : '-';

                                return (
                                  <Table.Tr key={detail.id}>
                                    <Table.Td>{detail.source}</Table.Td>
                                    <Table.Td>{linkedOrder?.order_number || '-'}</Table.Td>
                                    <Table.Td>{supplierName}</Table.Td>
                                    <Table.Td>{detail.batch_number || '-'}</Table.Td>
                                    <Table.Td>{formatDateOnly(detail.expiration_date)}</Table.Td>
                                    <Table.Td style={{ textAlign: 'right' }}>{formatQuantity(detail.initial_quantity)}</Table.Td>
                                    <Table.Td style={{ textAlign: 'right' }}>{formatQuantity(detail.current_quantity)}</Table.Td>
                                    <Table.Td>{dateTime(detail.created_at)}</Table.Td>
                                  </Table.Tr>
                                );
                              })}
                            </Table.Tbody>
                          </Table>
                          </Box>
                        </Table.Td>
                      </Table.Tr>
                    )}
                  </Fragment>
                ))}
              </Table.Tbody>
            </Table>
          </Tabs.Panel>

          <Tabs.Panel value="inbound" pt="md">
            <Text c="dimmed" size="sm" mb="md">
              Purchase orders with status Ordered. Confirm receipt by item or for entire order.
            </Text>

            <Table highlightOnHover style={{ tableLayout: 'fixed' }}>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th style={{ width: '24%' }}>PO number</Table.Th>
                  <Table.Th style={{ width: '26%' }}>Supplier</Table.Th>
                  <Table.Th style={{ width: '20%' }}>Expected date</Table.Th>
                  <Table.Th style={{ width: '12%' }}>Status</Table.Th>
                  <Table.Th style={{ width: '18%', textAlign: 'right' }}>Action</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {data.inboundOrders.map((order) => (
                  <Fragment key={order.id}>
                    <Table.Tr>
                      <Table.Td>{order.order_number || `PO-${order.id}`}</Table.Td>
                      <Table.Td>{order.supplier ? supplierById[order.supplier] || '-' : '-'}</Table.Td>
                      <Table.Td>{formatDateOnly(order.expected_delivery || order.order_at)}</Table.Td>
                      <Table.Td>{order.status}</Table.Td>
                      <Table.Td style={{ textAlign: 'right' }}>
                        <Group justify="flex-end" gap="xs">
                          <ActionIcon
                            size="sm"
                            variant="subtle"
                            onClick={() => setExpandedInboundOrder((current) => (current === order.id ? null : order.id))}
                            aria-label={expandedInboundOrder === order.id ? 'Collapse details' : 'Expand details'}
                          >
                            {expandedInboundOrder === order.id ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
                          </ActionIcon>
                          <Button
                            size="xs"
                            onClick={() =>
                              setReceiveOrderModal({
                                open: true,
                                orderId: order.id,
                                quantities: Object.fromEntries(
                                  order.items
                                    .filter((item) => item.remaining_qty > 0)
                                    .map((item) => [item.id, item.remaining_qty]),
                                ),
                              })
                            }
                          >
                            Confirm PO receipt
                          </Button>
                        </Group>
                      </Table.Td>
                    </Table.Tr>

                    {expandedInboundOrder === order.id && (
                      <Table.Tr>
                        <Table.Td colSpan={5} style={{ paddingTop: 6, paddingBottom: 10 }}>
                          <Box style={{ backgroundColor: 'var(--mantine-color-gray-0)', borderLeft: '3px solid var(--mantine-color-blue-6)', borderRadius: 6, padding: 10 }}>
                          <Table>
                            <Table.Thead>
                              <Table.Tr>
                                <Table.Th c="dimmed" fz="xs" tt="uppercase" style={{ letterSpacing: '0.04em' }}>Product</Table.Th>
                                <Table.Th c="dimmed" fz="xs" tt="uppercase" style={{ letterSpacing: '0.04em', textAlign: 'right' }}>Ordered qty</Table.Th>
                                <Table.Th c="dimmed" fz="xs" tt="uppercase" style={{ letterSpacing: '0.04em', textAlign: 'right' }}>Received qty</Table.Th>
                                <Table.Th c="dimmed" fz="xs" tt="uppercase" style={{ letterSpacing: '0.04em', textAlign: 'right' }}>Remaining qty</Table.Th>
                                <Table.Th c="dimmed" fz="xs" tt="uppercase" style={{ letterSpacing: '0.04em', textAlign: 'right' }}>Action</Table.Th>
                              </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                              {order.items.map((item) => (
                                <Table.Tr key={item.id}>
                                  <Table.Td>{productById[item.product] || `Product #${item.product}`}</Table.Td>
                                  <Table.Td style={{ textAlign: 'right' }}>{formatQuantity(item.ordered_qty)}</Table.Td>
                                  <Table.Td style={{ textAlign: 'right' }}>{formatQuantity(item.received_qty)}</Table.Td>
                                  <Table.Td style={{ textAlign: 'right' }}>{formatQuantity(item.remaining_qty)}</Table.Td>
                                  <Table.Td style={{ textAlign: 'right' }}>
                                    <Button
                                      size="xs"
                                      variant="subtle"
                                      leftSection={<IconCheck size={14} />}
                                      onClick={() =>
                                        setReceiveItemModal({
                                          open: true,
                                          itemId: item.id,
                                          expected: item.remaining_qty,
                                          quantity: item.remaining_qty,
                                        })
                                      }
                                      disabled={item.remaining_qty <= 0}
                                    >
                                      Confirm receipt
                                    </Button>
                                  </Table.Td>
                                </Table.Tr>
                              ))}
                            </Table.Tbody>
                          </Table>
                          </Box>
                        </Table.Td>
                      </Table.Tr>
                    )}
                  </Fragment>
                ))}
              </Table.Tbody>
            </Table>
          </Tabs.Panel>

          <Tabs.Panel value="outbound" pt="md">
            <Text c="dimmed" size="sm" mb="md">
              Sales orders with status Ordered. Deliver by item or complete the entire order.
            </Text>

            <Table highlightOnHover style={{ tableLayout: 'fixed' }}>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th style={{ width: '26%' }}>SO number</Table.Th>
                  <Table.Th style={{ width: '30%' }}>Customer</Table.Th>
                  <Table.Th style={{ width: '24%' }}>Expected date</Table.Th>
                  <Table.Th style={{ width: '20%', textAlign: 'right' }}>Action</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {data.outboundOrders.map((order) => (
                  <Fragment key={order.id}>
                    <Table.Tr>
                      <Table.Td>{order.order_number || `SO-${order.id}`}</Table.Td>
                      <Table.Td>{order.customer ? customerById[order.customer] || '-' : '-'}</Table.Td>
                      <Table.Td>{formatDateOnly(order.expected_delivery || order.order_at)}</Table.Td>
                      <Table.Td style={{ textAlign: 'right' }}>
                        <Group justify="flex-end" gap="xs">
                          <ActionIcon
                            size="sm"
                            variant="subtle"
                            onClick={() => setExpandedOutboundOrder((current) => (current === order.id ? null : order.id))}
                            aria-label={expandedOutboundOrder === order.id ? 'Collapse details' : 'Expand details'}
                          >
                            {expandedOutboundOrder === order.id ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
                          </ActionIcon>
                          <Button
                            size="xs"
                            disabled={!order.items.some((item) => item.remaining_qty > 0 && item.available_to_deliver > 0)}
                            onClick={() =>
                              setDeliverOrderModal({
                                open: true,
                                orderId: order.id,
                                quantities: Object.fromEntries(
                                  order.items
                                    .filter((item) => item.available_to_deliver > 0)
                                    .map((item) => [item.id, item.available_to_deliver]),
                                ),
                              })
                            }
                          >
                            Mark as Delivered
                          </Button>
                        </Group>
                      </Table.Td>
                    </Table.Tr>

                    {expandedOutboundOrder === order.id && (
                      <Table.Tr>
                        <Table.Td colSpan={4} style={{ paddingTop: 6, paddingBottom: 10 }}>
                          <Box style={{ backgroundColor: 'var(--mantine-color-gray-0)', borderLeft: '3px solid var(--mantine-color-blue-6)', borderRadius: 6, padding: 10 }}>
                          <Table>
                            <Table.Thead>
                              <Table.Tr>
                                <Table.Th c="dimmed" fz="xs" tt="uppercase" style={{ letterSpacing: '0.04em' }}>Product</Table.Th>
                                <Table.Th c="dimmed" fz="xs" tt="uppercase" style={{ letterSpacing: '0.04em', textAlign: 'right' }}>Ordered qty</Table.Th>
                                <Table.Th c="dimmed" fz="xs" tt="uppercase" style={{ letterSpacing: '0.04em', textAlign: 'right' }}>Delivered qty</Table.Th>
                                <Table.Th c="dimmed" fz="xs" tt="uppercase" style={{ letterSpacing: '0.04em', textAlign: 'right' }}>Remaining qty</Table.Th>
                                <Table.Th c="dimmed" fz="xs" tt="uppercase" style={{ letterSpacing: '0.04em', textAlign: 'right' }}>Action</Table.Th>
                              </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                              {order.items.map((item) => (
                                <Table.Tr key={item.id}>
                                  <Table.Td>{productById[item.product] || `Product #${item.product}`}</Table.Td>
                                  <Table.Td style={{ textAlign: 'right' }}>{formatQuantity(item.ordered_qty)}</Table.Td>
                                  <Table.Td style={{ textAlign: 'right' }}>{formatQuantity(item.delivered_qty)}</Table.Td>
                                  <Table.Td style={{ textAlign: 'right' }}>{formatQuantity(item.remaining_qty)}</Table.Td>
                                  <Table.Td style={{ textAlign: 'right' }}>
                                    <Button
                                      size="xs"
                                      variant="subtle"
                                      leftSection={<IconCheck size={14} />}
                                      onClick={() =>
                                        setDeliverItemModal({
                                          open: true,
                                          itemId: item.id,
                                          expected: item.available_to_deliver,
                                          quantity: item.available_to_deliver,
                                        })
                                      }
                                      disabled={item.available_to_deliver <= 0}
                                    >
                                      Deliver item
                                    </Button>
                                  </Table.Td>
                                </Table.Tr>
                              ))}
                            </Table.Tbody>
                          </Table>
                          </Box>
                        </Table.Td>
                      </Table.Tr>
                    )}
                  </Fragment>
                ))}
              </Table.Tbody>
            </Table>
          </Tabs.Panel>
        </Tabs>
      </Card>

      <Modal opened={receiveItemModal.open} onClose={() => setReceiveItemModal({ open: false, itemId: null, expected: 0, quantity: 0 })} title="Confirm item receipt">
        <Text mb="sm">Expected remaining quantity: {formatQuantity(receiveItemModal.expected)}</Text>
        <NumberInput
          label="Received quantity"
          decimalScale={3}
          min={0}
          max={receiveItemModal.expected}
          value={receiveItemModal.quantity}
          onChange={(value) => setReceiveItemModal((prev) => ({ ...prev, quantity: value }))}
        />
        <Group justify="flex-end" mt="md">
          <Button onClick={submitReceiveItem} loading={receiveItemMutation.isPending}>
            Confirm receipt
          </Button>
        </Group>
      </Modal>

      <Modal opened={deliverItemModal.open} onClose={() => setDeliverItemModal({ open: false, itemId: null, expected: 0, quantity: 0 })} title="Confirm item delivery">
        <Text mb="sm">Expected remaining quantity: {formatQuantity(deliverItemModal.expected)}</Text>
        <NumberInput
          label="Delivered quantity"
          decimalScale={3}
          min={0}
          max={deliverItemModal.expected}
          value={deliverItemModal.quantity}
          onChange={(value) =>
            setDeliverItemModal((prev) => ({
              ...prev,
              quantity: clampQuantity(value ?? 0, 0, prev.expected),
            }))
          }
        />
        <Group justify="flex-end" mt="md">
          <Button onClick={submitDeliverItem} loading={deliverItemMutation.isPending}>
            Confirm delivery
          </Button>
        </Group>
      </Modal>

      <Modal
        opened={receiveOrderModal.open}
        onClose={() => setReceiveOrderModal({ open: false, orderId: null, quantities: {} })}
        title="Confirm purchase order receipt"
        size="lg"
      >
        <Table striped>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Product</Table.Th>
              <Table.Th>Remaining qty</Table.Th>
              <Table.Th>Receive now</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {(activeReceiveOrder?.items || []).map((item) => (
              <Table.Tr key={item.id}>
                <Table.Td>{productById[item.product] || `Product #${item.product}`}</Table.Td>
                <Table.Td>{formatQuantity(item.remaining_qty)}</Table.Td>
                <Table.Td>
                  <NumberInput
                    decimalScale={3}
                    min={0}
                    max={item.remaining_qty}
                    value={receiveOrderModal.quantities[item.id] ?? 0}
                    onChange={(value) =>
                      setReceiveOrderModal((prev) => ({
                        ...prev,
                        quantities: {
                          ...prev.quantities,
                          [item.id]: value,
                        },
                      }))
                    }
                  />
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>

        <Group justify="flex-end" mt="md">
          <Button onClick={submitReceiveOrder} loading={receiveOrderMutation.isPending}>
            Confirm PO receipt
          </Button>
        </Group>
      </Modal>

      <Modal
        opened={deliverOrderModal.open}
        onClose={() => setDeliverOrderModal({ open: false, orderId: null, quantities: {} })}
        title="Confirm sales order delivery"
        size="lg"
      >
        <Table striped>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Product</Table.Th>
              <Table.Th>Remaining qty</Table.Th>
              <Table.Th>Deliver now</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {deliverableActiveItems.map((item) => (
              <Table.Tr key={item.id}>
                <Table.Td>{productById[item.product] || `Product #${item.product}`}</Table.Td>
                <Table.Td>{formatQuantity(item.remaining_qty)}</Table.Td>
                <Table.Td>
                  <NumberInput
                    decimalScale={3}
                    min={0}
                    max={item.available_to_deliver}
                    value={deliverOrderModal.quantities[item.id] ?? 0}
                    onChange={(value) =>
                      setDeliverOrderModal((prev) => ({
                        ...prev,
                        quantities: {
                          ...prev.quantities,
                          [item.id]: clampQuantity(value ?? 0, 0, item.available_to_deliver),
                        },
                      }))
                    }
                  />
                </Table.Td>
              </Table.Tr>
            ))}
            {deliverableActiveItems.length === 0 && (
              <Table.Tr>
                <Table.Td colSpan={3}>No deliverable quantity available in stock for this order.</Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>

        <Group justify="flex-end" mt="md">
          <Button onClick={submitDeliverOrder} loading={deliverOrderMutation.isPending}>
            Confirm delivery
          </Button>
        </Group>
      </Modal>

      <Modal
        opened={manualStockModal.open}
        onClose={() => setManualStockModal({ open: false, productId: null, quantity: 0, batchNumber: '', expirationDate: '' })}
        title="Add manual stock entry"
      >
        <Select
          label="Product"
          withAsterisk
          placeholder="Select product"
          data={data.products.map((product) => ({ value: String(product.id), label: `${product.name} (${product.sku})` }))}
          value={manualStockModal.productId}
          onChange={(value) => setManualStockModal((prev) => ({ ...prev, productId: value }))}
          searchable
          mb="sm"
        />
        <NumberInput
          label="Quantity"
          withAsterisk
          decimalScale={3}
          min={0}
          value={manualStockModal.quantity}
          onChange={(value) => setManualStockModal((prev) => ({ ...prev, quantity: value }))}
          mb="sm"
        />
        <TextInput
          label="Batch number"
          placeholder="Optional"
          value={manualStockModal.batchNumber}
          onChange={(event) => setManualStockModal((prev) => ({ ...prev, batchNumber: event.currentTarget.value }))}
          mb="sm"
        />
        <TextInput
          label="Expiration date"
          type="date"
          value={manualStockModal.expirationDate}
          onChange={(event) => setManualStockModal((prev) => ({ ...prev, expirationDate: event.currentTarget.value }))}
        />

        <Group justify="flex-end" mt="md">
          <Button
            onClick={submitManualStock}
            loading={createManualStockMutation.isPending}
            disabled={!manualStockModal.productId || Number(manualStockModal.quantity) <= 0}
          >
            Save manual stock
          </Button>
        </Group>
      </Modal>
    </>
  );
}
