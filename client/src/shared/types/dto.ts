export type ID = number;

export interface ProductDTO {
  id: ID;
  user: ID;
  name: string;
  description?: string | null;
  sku: string;
  default_unit: 'KG' | 'G' | 'L' | 'ML' | 'UN';
  price: string;
  category: string;
  created_at: string;
  is_active: boolean;
}

export interface StockDTO {
  id: ID;
  user: ID;
  batch_number?: string | null;
  product: ID;
  quantity: string;
  expiration_date?: string | null;
  source: 'MANUAL' | 'PO' | 'ADJUSTMENT';
  purchase_order?: ID | null;
  created_at: string;
}

export interface SupplierDTO {
  id: ID;
  user: ID;
  legal_name: string;
  dba_name?: string | null;
  account_number?: string | null;
  contact_name?: string | null;
  email?: string | null;
  phone?: string | null;
  tax_id?: string | null;
  w9_on_file: boolean;
  payment_term_days: number;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  is_active: boolean;
  created_at: string;
}

export interface PurchaseOrderDTO {
  id: ID;
  user: ID;
  supplier?: ID | null;
  status: 'DRAFT' | 'ORDER' | 'RECEIVED' | 'CANCELLED' | 'RETURNED';
  order_number: string;
  total_amount: string;
  created_at: string;
  order_at?: string | null;
  expected_delivery?: string | null;
  last_updated: string;
  invoice_number?: string | null;
  payment_due_date?: string | null;
  payment_status: 'UNPAID' | 'PAID' | 'REFUNDED';
  notes?: string | null;
}

export interface PurchaseOrderItemDTO {
  id: ID;
  user: ID;
  purchase_order: ID;
  product: ID;
  quantity: string;
  order_unit: ProductDTO['default_unit'];
  unit_price: string;
}

export interface CustomerDTO {
  id: ID;
  user: ID;
  name: string;
  phone?: string | null;
  email?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  notes?: string | null;
  created_at: string;
  is_active: boolean;
}

export interface SalesOrderDTO {
  id: ID;
  user: ID;
  customer?: ID | null;
  status: 'ORDER' | 'DELIVERED' | 'CANCELLED' | 'RETURNED';
  payment_status: 'UNPAID' | 'PAID' | 'REFUNDED';
  order_number: string;
  total_amount: string;
  order_at: string;
  expected_delivery?: string | null;
  last_updated: string;
  invoice_number?: string | null;
  payment_due_date?: string | null;
  notes?: string | null;
}

export interface SalesOrderItemDTO {
  id: ID;
  user: ID;
  sales_order: ID;
  product: ID;
  quantity: string;
  order_unit: ProductDTO['default_unit'];
  unit_price: string;
}

export interface LoginPayload {
  username: string;
  password: string;
}

export interface LoginResponseDTO {
  access?: string;
  token?: string;
}
