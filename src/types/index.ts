export type ShopId = 'Shop 1' | 'Shop 2' | 'Shop 3';

export const SHOPS: ShopId[] = ['Shop 1', 'Shop 2', 'Shop 3'];

export interface Employee {
  id: string;
  name: string;
  age: number;
  contact_number: string;
  date_of_joining: string;
  address_proof_url: string;
  address_proof_filename?: string;
  assigned_shop: ShopId;
  created_at: string;
  updated_at?: string;
}

export interface SupplierAddressDetails {
  building_number?: string | null;
  building_name?: string | null;
  floor?: string | null;
  street?: string | null;
  locality?: string | null;
  district?: string | null;
  city?: string | null;
  state?: string | null;
  landmark?: string | null;
  pincode?: string | null;
}

export interface Supplier {
  id: string;
  name: string;
  contact_number: string;
  address: string;
  notes?: string;
  created_at: string;
  updated_at?: string;

  // GST Verification fields
  gstin?: string;
  legal_name?: string;
  trade_name?: string;
  gst_status?: 'Active' | 'Inactive' | 'Cancelled' | 'Suspended' | string;
  taxpayer_type?: 'Regular' | 'Composition' | 'SEZ' | 'Casual' | string;
  registration_date?: string;
  state_code?: string;
  state_name?: string;
  city?: string;
  pincode?: string;
  gst_verified?: boolean;
  verified_at?: string;
  address_details?: SupplierAddressDetails;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  purchase_price: number;
  selling_price: number;
  current_stock: number;
  minimum_stock: number;
  shop: ShopId;
  created_at: string;
  updated_at?: string;
}

export type StockStatus = 'In Stock' | 'Low Stock' | 'Out of Stock';

export type PaymentMode = 'Cash' | 'UPI' | 'Bank Transfer' | 'Card' | 'Other';
export type PurchasePaymentStatus = 'Paid' | 'Partially Paid' | 'Pending';

export interface PurchaseItem {
  id?: string;
  purchase_id?: string;
  product_id: string;
  product_name?: string;
  quantity: number;
  purchase_price: number;
  total: number;
}

export interface Purchase {
  id: string;
  supplier_id: string;
  supplier_name?: string;
  invoice_number: string;
  purchase_date: string;
  total_amount: number;
  paid_amount: number;
  pending_amount: number;
  payment_mode: PaymentMode;
  payment_status: PurchasePaymentStatus;
  invoice_url?: string;
  invoice_filename?: string;
  items: PurchaseItem[];
  created_at: string;
  updated_at?: string;
}

export type OfflinePaymentMethod = 'Cash' | 'UPI' | 'Card';
export type OfflineSaleStatus = 'Completed' | 'Returned' | 'Exchanged';

export interface OfflineSaleItem {
  id?: string;
  sale_id?: string;
  product_id: string;
  product_name?: string;
  quantity: number;
  selling_price: number;
  total: number;
}

export interface OfflineSale {
  id: string;
  sale_number: string;
  shop: ShopId;
  customer_name: string;
  customer_phone: string;
  discount: number;
  total_amount: number;
  payment_method: OfflinePaymentMethod;
  sale_date: string;
  status: OfflineSaleStatus;
  items: OfflineSaleItem[];
  created_at: string;
}

export type SalesChannel = 'Instagram' | 'WhatsApp';
export type OnlinePaymentStatus = 'Pending' | 'Paid' | 'Failed' | 'Refunded';
export type OnlineOrderStatus =
  | 'New'
  | 'Confirmed'
  | 'Processing'
  | 'Packed'
  | 'Shipped'
  | 'Delivered'
  | 'Cancelled'
  | 'Returned';

export interface OnlineOrderItem {
  id?: string;
  order_id?: string;
  product_id: string;
  product_name?: string;
  quantity: number;
  selling_price: number;
  total: number;
}

export interface OnlineOrder {
  id: string;
  order_number: string;
  sales_channel: SalesChannel;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  total_amount: number;
  payment_status: OnlinePaymentStatus;
  order_status: OnlineOrderStatus;
  order_date: string;
  items: OnlineOrderItem[];
  upi_reference?: string;
  upi_transaction_id?: string;
  created_at: string;
  updated_at?: string;
}

export type ReturnType = 'Return' | 'Exchange';

export interface ReturnRecord {
  id: string;
  sale_id: string;
  sale_type: 'offline' | 'online';
  product_id: string;
  product_name?: string;
  replacement_product_id?: string;
  replacement_product_name?: string;
  quantity: number;
  return_type: ReturnType;
  reason: string;
  created_at: string;
}

export interface DashboardStats {
  todayOfflineSales: number;
  todayOnlineSales: number;
  todayTotalSales: number;
  monthlyOfflineSales: number;
  monthlyOnlineSales: number;
  monthlyTotalSales: number;
  totalSuppliers: number;
  totalPurchaseAmount: number;
  totalPaidAmount: number;
  totalPendingAmount: number;
  totalProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  newOrders: number;
  processingOrders: number;
  deliveredOrders: number;
  pendingOnlinePayments: number;
  suppliersWithPending: Array<{
    id: string;
    name: string;
    pendingAmount: number;
    contact: string;
  }>;
}

export interface RecentActivityItem {
  id: string;
  type: 'offline_sale' | 'online_order' | 'purchase' | 'supplier_payment';
  title: string;
  subtitle: string;
  amount: number;
  date: string;
  statusBadge?: string;
}

export type UpiPaymentStatus = 'Paid' | 'Not Paid';
export type UpiChannel = 'Counter' | 'WhatsApp' | 'Instagram';

export interface UpiSettings {
  upi_id: string;
  payee_name: string;
  shop_name?: string;
  merchant_code?: string;
}

export interface UpiTransaction {
  id: string;
  reference_id: string;
  amount: number;
  customer_name?: string;
  customer_phone?: string;
  delivery_address?: string;
  note?: string;
  status: UpiPaymentStatus;
  upi_id: string;
  payee_name: string;
  channel?: UpiChannel;
  linked_order_id?: string;
  linked_order_number?: string;
  created_at: string;
  paid_at?: string;
}

export interface UpiDashboardStats {
  todayCollected: number;
  todayCount: number;
  totalCollected: number;
  pendingAmount: number;
  pendingCount: number;
  totalTransactions: number;
}

export type BranchStatus = 'Active' | 'Inactive' | 'Under Maintenance';

export interface Branch {
  id: string;
  name: string;
  code: string;
  shop_identifier: string;
  address: string;
  city: string;
  state_zip?: string;
  contact_number: string;
  manager_name?: string;
  status: BranchStatus;
  opening_hours?: string;
  notes?: string;
  capacity?: number;
  created_at: string;
  updated_at?: string;
}

export interface BranchWithEmployees extends Branch {
  assigned_employees_count: number;
  employees: Employee[];
}

export interface BranchDashboardStats {
  totalBranches: number;
  activeBranches: number;
  totalEmployees: number;
  avgEmployeesPerBranch: number;
}

// ----------------------------------------------------
// GST MANAGEMENT TYPES
// ----------------------------------------------------

export interface GstSettings {
  gstin: string;
  legal_name: string;
  trade_name: string;
  state_name: string;
  state_code: string;
  tax_scheme: 'Regular' | 'Composition';
  default_hsn: string;
  default_gst_rate: number;
  filing_frequency: 'Monthly' | 'Quarterly';
  enable_e_invoicing: boolean;
  contact_email?: string;
  contact_phone?: string;
}

export interface HsnEntry {
  id: string;
  hsn_code: string;
  description: string;
  category: string;
  gst_rate: number;
  cgst_rate: number;
  sgst_rate: number;
  igst_rate: number;
}

export type GstInvoiceType = 'B2C (Retail In-Store)' | 'B2C (Online Order)' | 'B2B (Tax Invoice)' | 'Inward (Supplier Purchase)';

export interface GstInvoiceRecord {
  id: string;
  invoice_number: string;
  invoice_date: string;
  type: GstInvoiceType;
  party_name: string;
  party_gstin?: string;
  place_of_supply: string;
  is_inter_state: boolean;
  hsn_code?: string;
  taxable_value: number;
  gst_rate: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  total_tax: number;
  total_invoice_amount: number;
  payment_status: 'Paid' | 'Pending';
  branch?: string;
}

export interface GstSummaryStats {
  totalTaxableSales: number;
  totalOutputGst: number;
  totalTaxablePurchases: number;
  totalEligibleItc: number;
  netGstPayable: number;
  cgstLiability: number;
  sgstLiability: number;
  igstLiability: number;
  totalInvoicesCount: number;
  b2cCount: number;
  b2bCount: number;
  purchaseBillCount: number;
}


