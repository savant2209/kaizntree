import { apiClient, rootApiClient } from './client';
import type {
  CustomerDTO,
  ProductDTO,
  PurchaseOrderDTO,
  PurchaseOrderItemDTO,
  SalesOrderDTO,
  SalesOrderItemDTO,
  SupplierDTO,
  StockDTO,
  LoginPayload,
  LoginResponseDTO,
} from '../types/dto';

const unwrapList = <T,>(payload: unknown): T[] => {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === 'object' && 'results' in payload) {
    const possible = (payload as { results?: unknown }).results;
    if (Array.isArray(possible)) return possible as T[];
  }
  return [];
};

export const loginRequest = async (data: LoginPayload): Promise<string> => {
  const response = await rootApiClient.post<LoginResponseDTO>('/auth/token/', data);
  const token = response.data.access || response.data.token;
  if (!token) throw new Error('Token was not found in login response');
  return token;
};

export const listProducts = async (): Promise<ProductDTO[]> => {
  const response = await apiClient.get('/products/');
  return unwrapList<ProductDTO>(response.data);
};

export const createProduct = async (payload: Partial<ProductDTO>): Promise<ProductDTO> => {
  const response = await apiClient.post('/products/', payload);
  return response.data as ProductDTO;
};

export const updateProduct = async (id: number, payload: Partial<ProductDTO>): Promise<ProductDTO> => {
  const response = await apiClient.patch(`/products/${id}/`, payload);
  return response.data as ProductDTO;
};

export const listStocks = async (): Promise<StockDTO[]> => {
  const response = await apiClient.get('/stocks/');
  return unwrapList<StockDTO>(response.data);
};

export const listSuppliers = async (): Promise<SupplierDTO[]> => {
  const response = await apiClient.get('/suppliers/');
  return unwrapList<SupplierDTO>(response.data);
};

export const createSupplier = async (payload: Partial<SupplierDTO>): Promise<SupplierDTO> => {
  const response = await apiClient.post('/suppliers/', payload);
  return response.data as SupplierDTO;
};

export const updateSupplier = async (id: number, payload: Partial<SupplierDTO>): Promise<SupplierDTO> => {
  const response = await apiClient.patch(`/suppliers/${id}/`, payload);
  return response.data as SupplierDTO;
};

export const listCustomers = async (): Promise<CustomerDTO[]> => {
  const response = await apiClient.get('/customers/');
  return unwrapList<CustomerDTO>(response.data);
};

export const createCustomer = async (payload: Partial<CustomerDTO>): Promise<CustomerDTO> => {
  const response = await apiClient.post('/customers/', payload);
  return response.data as CustomerDTO;
};

export const updateCustomer = async (id: number, payload: Partial<CustomerDTO>): Promise<CustomerDTO> => {
  const response = await apiClient.patch(`/customers/${id}/`, payload);
  return response.data as CustomerDTO;
};

export const listPurchaseOrders = async (): Promise<PurchaseOrderDTO[]> => {
  const response = await apiClient.get('/purchase-orders/');
  return unwrapList<PurchaseOrderDTO>(response.data);
};

export const getPurchaseOrder = async (id: number): Promise<PurchaseOrderDTO> => {
  const response = await apiClient.get(`/purchase-orders/${id}/`);
  return response.data as PurchaseOrderDTO;
};

export const createPurchaseOrder = async (payload: Partial<PurchaseOrderDTO>): Promise<PurchaseOrderDTO> => {
  const response = await apiClient.post('/purchase-orders/', payload);
  return response.data as PurchaseOrderDTO;
};

export const updatePurchaseOrder = async (id: number, payload: Partial<PurchaseOrderDTO>): Promise<PurchaseOrderDTO> => {
  const response = await apiClient.patch(`/purchase-orders/${id}/`, payload);
  return response.data as PurchaseOrderDTO;
};

export const listPurchaseOrderItems = async (): Promise<PurchaseOrderItemDTO[]> => {
  const response = await apiClient.get('/purchase-order-items/');
  return unwrapList<PurchaseOrderItemDTO>(response.data);
};

export const createPurchaseOrderItem = async (payload: Partial<PurchaseOrderItemDTO>): Promise<PurchaseOrderItemDTO> => {
  const response = await apiClient.post('/purchase-order-items/', payload);
  return response.data as PurchaseOrderItemDTO;
};

export const listSalesOrders = async (): Promise<SalesOrderDTO[]> => {
  const response = await apiClient.get('/sales-orders/');
  return unwrapList<SalesOrderDTO>(response.data);
};

export const getSalesOrder = async (id: number): Promise<SalesOrderDTO> => {
  const response = await apiClient.get(`/sales-orders/${id}/`);
  return response.data as SalesOrderDTO;
};

export const createSalesOrder = async (payload: Partial<SalesOrderDTO>): Promise<SalesOrderDTO> => {
  const response = await apiClient.post('/sales-orders/', payload);
  return response.data as SalesOrderDTO;
};

export const updateSalesOrder = async (id: number, payload: Partial<SalesOrderDTO>): Promise<SalesOrderDTO> => {
  const response = await apiClient.patch(`/sales-orders/${id}/`, payload);
  return response.data as SalesOrderDTO;
};

export const listSalesOrderItems = async (): Promise<SalesOrderItemDTO[]> => {
  const response = await apiClient.get('/sales-order-items/');
  return unwrapList<SalesOrderItemDTO>(response.data);
};

export const createSalesOrderItem = async (payload: Partial<SalesOrderItemDTO>): Promise<SalesOrderItemDTO> => {
  const response = await apiClient.post('/sales-order-items/', payload);
  return response.data as SalesOrderItemDTO;
};
