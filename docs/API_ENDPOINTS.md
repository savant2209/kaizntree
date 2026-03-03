# API Endpoints Reference

Base URL prefix: `/api`

Authentication:

- JWT Bearer token is required for all inventory endpoints.
- Public endpoints are limited to register/login/refresh.

---

## Auth Endpoints

Prefix: `/api/auth`

### `POST /api/auth/register/`

Creates a new user account.

Request body:

```json
{
  "username": "john",
  "password": "strong-password",
  "confirm_password": "strong-password"
}
```

Response `201`:

```json
{
  "detail": "Account created successfully."
}
```

### `POST /api/auth/token/`

Returns access and refresh tokens.

Request body:

```json
{
  "username": "john",
  "password": "strong-password"
}
```

Notes:

- The `username` field also accepts an e-mail value; backend resolves matching user and authenticates.

Response `200` (SimpleJWT default):

```json
{
  "refresh": "...",
  "access": "..."
}
```

### `POST /api/auth/token/refresh/`

Refreshes access token.

Request body:

```json
{
  "refresh": "..."
}
```

Response `200`:

```json
{
  "access": "..."
}
```

---

## Inventory Endpoints

Prefix: `/api/inventory`

All routes below are protected (`Authorization: Bearer <access_token>`).

### Resource CRUD Pattern

For each resource, DRF router exposes:

- `GET /resource/` - list
- `POST /resource/` - create
- `GET /resource/{id}/` - retrieve
- `PATCH /resource/{id}/` - partial update
- `PUT /resource/{id}/` - full update
- `DELETE /resource/{id}/` - delete

Resources:

- `/customers/`
- `/products/`
- `/suppliers/`
- `/stocks/`
- `/purchase-orders/`
- `/purchase-order-items/`
- `/sales-orders/`
- `/sales-order-items/`

---

## Custom Action Endpoints

### Purchase Orders

#### `POST /api/inventory/purchase-orders/{id}/receive/`

Receives items for a purchase order.

Behavior:

- If no item payload is sent, receives all remaining quantities.
- If item payload is provided, receives only specified quantities.
- Creates stock entries (`source = PO`).
- Auto-sets order status to `RECEIVED` when all items are fully received.

Optional request body:

```json
{
  "items": [
    { "id": 1, "quantity_received": "5.000" },
    { "id": 2, "quantity_received": "2.500" }
  ]
}
```

Errors (`400`): invalid quantity or quantity exceeding remaining amount.

#### `PATCH /api/inventory/purchase-orders/{id}/`

When payload sets `status` to `RECEIVED`, backend attempts to receive all remaining items transactionally.

### Purchase Order Items

#### `POST /api/inventory/purchase-order-items/{id}/receive/`

Receives a specific purchase item (full remaining quantity by default).

Optional request body:

```json
{
  "quantity_received": "3.000"
}
```

Behavior:

- Creates stock batch for received quantity.
- Updates item `quantity_received`.
- If all order items are received, parent purchase order status becomes `RECEIVED`.

### Sales Orders

#### `POST /api/inventory/sales-orders/{id}/deliver/`

Delivers items for a sales order.

Behavior:

- If no item payload is sent, delivers all remaining quantities.
- If item payload is provided, delivers only specified quantities.
- Consumes stock using FIFO: earliest expiration first, then oldest entry.
- Auto-sets order status to `DELIVERED` when all items are fully delivered.

Optional request body:

```json
{
  "items": [
    { "id": 1, "quantity_delivered": "1.000" },
    { "id": 2, "quantity_delivered": "0.500" }
  ]
}
```

Errors (`400`): insufficient stock, invalid quantity, or quantity exceeding remaining amount.

#### `PATCH /api/inventory/sales-orders/{id}/`

When payload sets `status` to `DELIVERED`, backend attempts to deliver all remaining items transactionally.

### Sales Order Items

#### `POST /api/inventory/sales-order-items/{id}/deliver/`

Delivers a specific sales item (full remaining quantity by default).

Optional request body:

```json
{
  "quantity_delivered": "1.000"
}
```

Behavior:

- Consumes FIFO stock for the item product.
- Updates item `quantity_delivered`.
- If all order items are delivered, parent sales order status becomes `DELIVERED`.

---

## Common Validation and Ownership Rules

- Every inventory object is automatically created with the authenticated user.
- List/retrieve/update/delete operations are scoped to user-owned rows.
- Attempting to consume/deliver beyond available stock returns `400`.
- Decimal quantities are expected as numeric strings or numbers, with 3 decimal precision in stock/order items.

---

## cURL Quick Examples

### 1) Login

```bash
curl -X POST http://127.0.0.1:8000/api/auth/token/ \
  -H "Content-Type: application/json" \
  -d '{"username":"john","password":"strong-password"}'
```

### 2) Create Product

```bash
curl -X POST http://127.0.0.1:8000/api/inventory/products/ \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Orange Juice","sku":"OJ-001","default_unit":"L","price":"12.50","category":"Beverages"}'
```

### 3) Deliver a Sales Item

```bash
curl -X POST http://127.0.0.1:8000/api/inventory/sales-order-items/5/deliver/ \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{"quantity_delivered":"1.000"}'
```
