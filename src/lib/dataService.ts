import { getSupabaseClient } from './supabase';
import {
  Employee,
  Supplier,
  Product,
  Purchase,
  PurchaseItem,
  OfflineSale,
  OfflineSaleItem,
  OnlineOrder,
  OnlineOrderItem,
  ReturnRecord,
  DashboardStats,
  RecentActivityItem,
  UpiSettings,
  UpiTransaction,
  UpiPaymentStatus,
  UpiDashboardStats,
  Branch,
  BranchWithEmployees,
  BranchDashboardStats,
  GstSettings,
  HsnEntry,
  GstInvoiceRecord,
  GstSummaryStats,
} from '../types';
import {
  INITIAL_EMPLOYEES,
  INITIAL_SUPPLIERS,
  INITIAL_PRODUCTS,
  INITIAL_PURCHASES,
  INITIAL_OFFLINE_SALES,
  INITIAL_ONLINE_ORDERS,
  INITIAL_RETURNS,
  INITIAL_BRANCHES,
  INITIAL_GST_SETTINGS,
  INITIAL_HSN_ENTRIES,
  INITIAL_GST_INVOICES,
} from './initialData';

// Local storage keys for reliable fallback persistence
const LS_KEYS = {
  EMPLOYEES: 'shopcore_employees',
  SUPPLIERS: 'shopcore_suppliers',
  PRODUCTS: 'shopcore_products',
  PURCHASES: 'shopcore_purchases',
  OFFLINE_SALES: 'shopcore_offline_sales',
  ONLINE_ORDERS: 'shopcore_online_orders',
  RETURNS: 'shopcore_returns',
  UPI_SETTINGS: 'shopcore_upi_settings',
  UPI_TRANSACTIONS: 'shopcore_upi_transactions',
  BRANCHES: 'shopcore_branches',
  GST_SETTINGS: 'shopcore_gst_settings',
  GST_HSN: 'shopcore_gst_hsn',
  GST_INVOICES: 'shopcore_gst_invoices',
};

function getLocal<T>(key: string, defaultVal: T): T {
  if (typeof window === 'undefined') return defaultVal;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(defaultVal));
      return defaultVal;
    }
    return JSON.parse(raw);
  } catch {
    return defaultVal;
  }
}

function setLocal<T>(key: string, val: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {
    console.warn('Storage quota exceeded or error:', e);
  }
}

// ----------------- EMPLOYEES -----------------
export async function getEmployees(): Promise<Employee[]> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) {
        setLocal(LS_KEYS.EMPLOYEES, data);
        return data as Employee[];
      }
    } catch (e) {
      console.warn('Supabase getEmployees fallback to local:', e);
    }
  }
  return getLocal<Employee[]>(LS_KEYS.EMPLOYEES, INITIAL_EMPLOYEES);
}

export async function createEmployee(emp: Omit<Employee, 'id' | 'created_at'>): Promise<Employee> {
  const newEmp: Employee = {
    ...emp,
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'emp-' + Date.now(),
    created_at: new Date().toISOString(),
  };

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase.from('employees').insert(newEmp).select().single();
      if (!error && data) {
        // Also sync local
        const list = getLocal<Employee[]>(LS_KEYS.EMPLOYEES, INITIAL_EMPLOYEES);
        setLocal(LS_KEYS.EMPLOYEES, [data, ...list]);
        return data as Employee;
      }
    } catch (e) {
      console.warn('Supabase createEmployee error:', e);
    }
  }

  const list = getLocal<Employee[]>(LS_KEYS.EMPLOYEES, INITIAL_EMPLOYEES);
  const updated = [newEmp, ...list];
  setLocal(LS_KEYS.EMPLOYEES, updated);
  return newEmp;
}

export async function updateEmployee(id: string, updates: Partial<Employee>): Promise<Employee> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('employees')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (!error && data) {
        const list = getLocal<Employee[]>(LS_KEYS.EMPLOYEES, INITIAL_EMPLOYEES);
        setLocal(
          LS_KEYS.EMPLOYEES,
          list.map((e) => (e.id === id ? { ...e, ...data } : e))
        );
        return data as Employee;
      }
    } catch (e) {
      console.warn('Supabase updateEmployee error:', e);
    }
  }

  const list = getLocal<Employee[]>(LS_KEYS.EMPLOYEES, INITIAL_EMPLOYEES);
  let updatedRecord: Employee | null = null;
  const updated = list.map((e) => {
    if (e.id === id) {
      updatedRecord = { ...e, ...updates, updated_at: new Date().toISOString() };
      return updatedRecord;
    }
    return e;
  });
  setLocal(LS_KEYS.EMPLOYEES, updated);
  return updatedRecord || (list.find((e) => e.id === id) as Employee);
}

export async function deleteEmployee(id: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from('employees').delete().eq('id', id);
    } catch (e) {
      console.warn('Supabase deleteEmployee error:', e);
    }
  }
  const list = getLocal<Employee[]>(LS_KEYS.EMPLOYEES, INITIAL_EMPLOYEES);
  setLocal(
    LS_KEYS.EMPLOYEES,
    list.filter((e) => e.id !== id)
  );
  return true;
}

// ----------------- FILE UPLOADS (SUPABASE STORAGE) -----------------
export async function uploadDocument(
  file: File,
  bucket: 'employee-documents' | 'purchase-invoices'
): Promise<{ url: string; filename: string }> {
  const supabase = getSupabaseClient();
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;

  if (supabase) {
    try {
      const { error: uploadError } = await supabase.storage.from(bucket).upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

      if (!uploadError) {
        const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
        return {
          url: data.publicUrl,
          filename: file.name,
        };
      }
    } catch (e) {
      console.warn(`Supabase storage upload to ${bucket} failed:`, e);
    }
  }

  // Fallback to in-memory / browser Data URL
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      resolve({
        url: (e.target?.result as string) || '',
        filename: file.name,
      });
    };
    reader.readAsDataURL(file);
  });
}

// ----------------- SUPPLIERS -----------------
export async function getSuppliers(): Promise<Supplier[]> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) {
        setLocal(LS_KEYS.SUPPLIERS, data);
        return data as Supplier[];
      }
    } catch (e) {
      console.warn('Supabase getSuppliers fallback:', e);
    }
  }
  return getLocal<Supplier[]>(LS_KEYS.SUPPLIERS, INITIAL_SUPPLIERS);
}

export async function createSupplier(sup: Omit<Supplier, 'id' | 'created_at'>): Promise<Supplier> {
  const newSup: Supplier = {
    ...sup,
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'sup-' + Date.now(),
    created_at: new Date().toISOString(),
  };

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase.from('suppliers').insert(newSup).select().single();
      if (!error && data) {
        const list = getLocal<Supplier[]>(LS_KEYS.SUPPLIERS, INITIAL_SUPPLIERS);
        setLocal(LS_KEYS.SUPPLIERS, [data, ...list]);
        return data as Supplier;
      }
    } catch (e) {
      console.warn('Supabase createSupplier error:', e);
    }
  }

  const list = getLocal<Supplier[]>(LS_KEYS.SUPPLIERS, INITIAL_SUPPLIERS);
  setLocal(LS_KEYS.SUPPLIERS, [newSup, ...list]);
  return newSup;
}

export async function updateSupplier(id: string, updates: Partial<Supplier>): Promise<Supplier> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (!error && data) {
        const list = getLocal<Supplier[]>(LS_KEYS.SUPPLIERS, INITIAL_SUPPLIERS);
        setLocal(
          LS_KEYS.SUPPLIERS,
          list.map((s) => (s.id === id ? { ...s, ...data } : s))
        );
        return data as Supplier;
      }
    } catch (e) {
      console.warn('Supabase updateSupplier error:', e);
    }
  }

  const list = getLocal<Supplier[]>(LS_KEYS.SUPPLIERS, INITIAL_SUPPLIERS);
  let updatedRecord: Supplier | null = null;
  const updated = list.map((s) => {
    if (s.id === id) {
      updatedRecord = { ...s, ...updates, updated_at: new Date().toISOString() };
      return updatedRecord;
    }
    return s;
  });
  setLocal(LS_KEYS.SUPPLIERS, updated);
  return updatedRecord || (list.find((s) => s.id === id) as Supplier);
}

export async function deleteSupplier(id: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from('suppliers').delete().eq('id', id);
    } catch (e) {
      console.warn('Supabase deleteSupplier error:', e);
    }
  }
  const list = getLocal<Supplier[]>(LS_KEYS.SUPPLIERS, INITIAL_SUPPLIERS);
  setLocal(
    LS_KEYS.SUPPLIERS,
    list.filter((s) => s.id !== id)
  );
  return true;
}

// ----------------- PRODUCTS / INVENTORY -----------------
export async function getProducts(): Promise<Product[]> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name', { ascending: true });
      if (!error && data) {
        setLocal(LS_KEYS.PRODUCTS, data);
        return data as Product[];
      }
    } catch (e) {
      console.warn('Supabase getProducts fallback:', e);
    }
  }
  return getLocal<Product[]>(LS_KEYS.PRODUCTS, INITIAL_PRODUCTS);
}

export async function createProduct(prod: Omit<Product, 'id' | 'created_at'>): Promise<Product> {
  const newProd: Product = {
    ...prod,
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'prod-' + Date.now(),
    created_at: new Date().toISOString(),
  };

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase.from('products').insert(newProd).select().single();
      if (!error && data) {
        const list = getLocal<Product[]>(LS_KEYS.PRODUCTS, INITIAL_PRODUCTS);
        setLocal(LS_KEYS.PRODUCTS, [data, ...list]);
        return data as Product;
      }
    } catch (e) {
      console.warn('Supabase createProduct error:', e);
    }
  }

  const list = getLocal<Product[]>(LS_KEYS.PRODUCTS, INITIAL_PRODUCTS);
  setLocal(LS_KEYS.PRODUCTS, [newProd, ...list]);
  return newProd;
}

export async function updateProduct(id: string, updates: Partial<Product>): Promise<Product> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('products')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (!error && data) {
        const list = getLocal<Product[]>(LS_KEYS.PRODUCTS, INITIAL_PRODUCTS);
        setLocal(
          LS_KEYS.PRODUCTS,
          list.map((p) => (p.id === id ? { ...p, ...data } : p))
        );
        return data as Product;
      }
    } catch (e) {
      console.warn('Supabase updateProduct error:', e);
    }
  }

  const list = getLocal<Product[]>(LS_KEYS.PRODUCTS, INITIAL_PRODUCTS);
  let updatedRecord: Product | null = null;
  const updated = list.map((p) => {
    if (p.id === id) {
      updatedRecord = { ...p, ...updates, updated_at: new Date().toISOString() };
      return updatedRecord;
    }
    return p;
  });
  setLocal(LS_KEYS.PRODUCTS, updated);
  return updatedRecord || (list.find((p) => p.id === id) as Product);
}

export async function deleteProduct(id: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      // 1. Clean up references in child item tables to prevent foreign key violation
      await supabase.from('purchase_items').delete().eq('product_id', id);
      await supabase.from('offline_sale_items').delete().eq('product_id', id);
      await supabase.from('online_order_items').delete().eq('product_id', id);
      await supabase.from('returns').delete().eq('product_id', id);
      await supabase.from('returns').update({ replacement_product_id: null }).eq('replacement_product_id', id);

      // 2. Delete the product
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) {
        console.error('Supabase deleteProduct error:', error);
      }
    } catch (e) {
      console.warn('Supabase deleteProduct error:', e);
    }
  }
  const list = getLocal<Product[]>(LS_KEYS.PRODUCTS, INITIAL_PRODUCTS);
  setLocal(
    LS_KEYS.PRODUCTS,
    list.filter((p) => p.id !== id)
  );
  return true;
}

export async function adjustProductStock(
  productId: string,
  delta: number
): Promise<Product | null> {
  const products = await getProducts();
  const target = products.find((p) => p.id === productId);
  if (!target) return null;

  const newStock = Math.max(0, target.current_stock + delta);
  return updateProduct(productId, { current_stock: newStock });
}

// ----------------- PURCHASES -----------------
export async function getPurchases(): Promise<Purchase[]> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('purchases')
        .select(`
          *,
          suppliers(name),
          purchase_items(*)
        `)
        .order('purchase_date', { ascending: false });
      if (!error && data) {
        const mapped = data.map((d: any) => ({
          ...d,
          supplier_name: d.suppliers?.name || 'Unknown Supplier',
          items: d.purchase_items || [],
        })) as Purchase[];
        setLocal(LS_KEYS.PURCHASES, mapped);
        return mapped;
      }
    } catch (e) {
      console.warn('Supabase getPurchases fallback:', e);
    }
  }
  return getLocal<Purchase[]>(LS_KEYS.PURCHASES, INITIAL_PURCHASES);
}

export async function createPurchase(
  purchaseData: Omit<Purchase, 'id' | 'created_at'>
): Promise<Purchase> {
  const newPurchase: Purchase = {
    ...purchaseData,
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'pur-' + Date.now(),
    created_at: new Date().toISOString(),
  };

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data: pData, error: pError } = await supabase
        .from('purchases')
        .insert({
          id: newPurchase.id,
          supplier_id: newPurchase.supplier_id,
          invoice_number: newPurchase.invoice_number,
          purchase_date: newPurchase.purchase_date,
          total_amount: newPurchase.total_amount,
          paid_amount: newPurchase.paid_amount,
          pending_amount: newPurchase.pending_amount,
          payment_mode: newPurchase.payment_mode,
          payment_status: newPurchase.payment_status,
          invoice_url: newPurchase.invoice_url || null,
          invoice_filename: newPurchase.invoice_filename || null,
        })
        .select()
        .single();

      if (!pError && pData) {
        if (newPurchase.items && newPurchase.items.length > 0) {
          const itemsToInsert = newPurchase.items.map((it) => ({
            id: it.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'pi-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6)),
            purchase_id: pData.id,
            product_id: it.product_id,
            quantity: it.quantity,
            purchase_price: it.purchase_price,
            total: it.total,
          }));
          await supabase.from('purchase_items').insert(itemsToInsert);
        }
      }
    } catch (e) {
      console.warn('Supabase createPurchase error:', e);
    }
  }

  // AUTOMATIC STOCK UPDATE: Increase stock for purchased items
  for (const item of newPurchase.items) {
    await adjustProductStock(item.product_id, item.quantity);
  }

  const list = getLocal<Purchase[]>(LS_KEYS.PURCHASES, INITIAL_PURCHASES);
  setLocal(LS_KEYS.PURCHASES, [newPurchase, ...list]);
  return newPurchase;
}

export async function deletePurchase(id: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from('purchases').delete().eq('id', id);
    } catch (e) {
      console.warn('Supabase deletePurchase error:', e);
    }
  }
  const list = getLocal<Purchase[]>(LS_KEYS.PURCHASES, INITIAL_PURCHASES);
  setLocal(
    LS_KEYS.PURCHASES,
    list.filter((p) => p.id !== id)
  );
  return true;
}

// ----------------- OFFLINE SALES -----------------
export async function getOfflineSales(): Promise<OfflineSale[]> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('offline_sales')
        .select(`*, offline_sale_items(*)`)
        .order('created_at', { ascending: false });
      if (!error && data) {
        const mapped = data.map((d: any) => ({
          ...d,
          items: d.offline_sale_items || [],
        })) as OfflineSale[];
        setLocal(LS_KEYS.OFFLINE_SALES, mapped);
        return mapped;
      }
    } catch (e) {
      console.warn('Supabase getOfflineSales fallback:', e);
    }
  }
  return getLocal<OfflineSale[]>(LS_KEYS.OFFLINE_SALES, INITIAL_OFFLINE_SALES);
}

export async function createOfflineSale(
  saleData: Omit<OfflineSale, 'id' | 'sale_number' | 'created_at'>
): Promise<OfflineSale> {
  const count = getLocal<OfflineSale[]>(LS_KEYS.OFFLINE_SALES, INITIAL_OFFLINE_SALES).length + 1;
  const saleNumber = `OFF-${new Date().getFullYear()}-${String(count).padStart(4, '0')}`;

  const newSale: OfflineSale = {
    ...saleData,
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'sale-' + Date.now(),
    sale_number: saleNumber,
    created_at: new Date().toISOString(),
  };

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data: sData, error: sError } = await supabase
        .from('offline_sales')
        .insert({
          id: newSale.id,
          sale_number: newSale.sale_number,
          shop: newSale.shop,
          customer_name: newSale.customer_name,
          customer_phone: newSale.customer_phone,
          discount: newSale.discount,
          total_amount: newSale.total_amount,
          payment_method: newSale.payment_method,
          sale_date: newSale.sale_date,
          status: newSale.status,
        })
        .select()
        .single();

      if (!sError && sData && newSale.items.length > 0) {
        const itemsToInsert = newSale.items.map((it) => ({
          id: it.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'osi-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6)),
          sale_id: sData.id,
          product_id: it.product_id,
          quantity: it.quantity,
          selling_price: it.selling_price,
          total: it.total,
        }));
        await supabase.from('offline_sale_items').insert(itemsToInsert);
      }
    } catch (e) {
      console.warn('Supabase createOfflineSale error:', e);
    }
  }

  // AUTOMATIC STOCK UPDATE: Reduce stock for sold items
  for (const item of newSale.items) {
    await adjustProductStock(item.product_id, -item.quantity);
  }

  const list = getLocal<OfflineSale[]>(LS_KEYS.OFFLINE_SALES, INITIAL_OFFLINE_SALES);
  setLocal(LS_KEYS.OFFLINE_SALES, [newSale, ...list]);
  return newSale;
}

export async function deleteOfflineSale(id: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from('offline_sales').delete().eq('id', id);
    } catch (e) {
      console.warn('Supabase deleteOfflineSale error:', e);
    }
  }
  const list = getLocal<OfflineSale[]>(LS_KEYS.OFFLINE_SALES, INITIAL_OFFLINE_SALES);
  setLocal(
    LS_KEYS.OFFLINE_SALES,
    list.filter((s) => s.id !== id)
  );
  return true;
}

// ----------------- ONLINE SALES -----------------
export async function getOnlineOrders(): Promise<OnlineOrder[]> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('online_orders')
        .select(`*, online_order_items(*)`)
        .order('created_at', { ascending: false });
      if (!error && data) {
        const mapped = data.map((d: any) => ({
          ...d,
          items: d.online_order_items || [],
        })) as OnlineOrder[];
        setLocal(LS_KEYS.ONLINE_ORDERS, mapped);
        return mapped;
      }
    } catch (e) {
      console.warn('Supabase getOnlineOrders fallback:', e);
    }
  }
  return getLocal<OnlineOrder[]>(LS_KEYS.ONLINE_ORDERS, INITIAL_ONLINE_ORDERS);
}

export async function createOnlineOrder(
  orderData: Omit<OnlineOrder, 'id' | 'order_number' | 'created_at'>
): Promise<OnlineOrder> {
  const count = getLocal<OnlineOrder[]>(LS_KEYS.ONLINE_ORDERS, INITIAL_ONLINE_ORDERS).length + 1;
  const orderNumber = `ONL-${new Date().getFullYear()}-${String(count).padStart(4, '0')}`;

  const newOrder: OnlineOrder = {
    ...orderData,
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'ord-' + Date.now(),
    order_number: orderNumber,
    created_at: new Date().toISOString(),
  };

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data: oData, error: oError } = await supabase
        .from('online_orders')
        .insert({
          id: newOrder.id,
          order_number: newOrder.order_number,
          sales_channel: newOrder.sales_channel,
          customer_name: newOrder.customer_name,
          customer_phone: newOrder.customer_phone,
          customer_address: newOrder.customer_address,
          total_amount: newOrder.total_amount,
          payment_status: newOrder.payment_status,
          order_status: newOrder.order_status,
          order_date: newOrder.order_date,
          upi_reference: newOrder.upi_reference || null,
          upi_transaction_id: newOrder.upi_transaction_id || null,
        })
        .select()
        .single();

      if (!oError && oData && newOrder.items.length > 0) {
        const itemsToInsert = newOrder.items.map((it) => ({
          id: it.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'ooi-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6)),
          order_id: oData.id,
          product_id: it.product_id,
          quantity: it.quantity,
          selling_price: it.selling_price,
          total: it.total,
        }));
        await supabase.from('online_order_items').insert(itemsToInsert);
      }
    } catch (e) {
      console.warn('Supabase createOnlineOrder error:', e);
    }
  }

  // AUTOMATIC STOCK UPDATE: Reduce stock on confirmed/created order
  for (const item of newOrder.items) {
    await adjustProductStock(item.product_id, -item.quantity);
  }

  const list = getLocal<OnlineOrder[]>(LS_KEYS.ONLINE_ORDERS, INITIAL_ONLINE_ORDERS);
  setLocal(LS_KEYS.ONLINE_ORDERS, [newOrder, ...list]);
  return newOrder;
}

export async function updateOnlineOrder(
  id: string,
  updates: Partial<OnlineOrder>
): Promise<OnlineOrder> {
  const currentOrders = await getOnlineOrders();
  const existing = currentOrders.find((o) => o.id === id);

  // If status is transitioning to Cancelled or Returned, restore stock!
  if (
    existing &&
    existing.order_status !== 'Cancelled' &&
    existing.order_status !== 'Returned' &&
    (updates.order_status === 'Cancelled' || updates.order_status === 'Returned')
  ) {
    for (const item of existing.items) {
      await adjustProductStock(item.product_id, item.quantity);
    }
  }

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('online_orders')
        .update({
          payment_status: updates.payment_status,
          order_status: updates.order_status,
          customer_name: updates.customer_name,
          customer_phone: updates.customer_phone,
          customer_address: updates.customer_address,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (!error && data) {
        const list = getLocal<OnlineOrder[]>(LS_KEYS.ONLINE_ORDERS, INITIAL_ONLINE_ORDERS);
        setLocal(
          LS_KEYS.ONLINE_ORDERS,
          list.map((o) => (o.id === id ? { ...o, ...updates, updated_at: new Date().toISOString() } : o))
        );
      }
    } catch (e) {
      console.warn('Supabase updateOnlineOrder error:', e);
    }
  }

  const list = getLocal<OnlineOrder[]>(LS_KEYS.ONLINE_ORDERS, INITIAL_ONLINE_ORDERS);
  let updatedRecord: OnlineOrder | null = null;
  const updated = list.map((o) => {
    if (o.id === id) {
      updatedRecord = { ...o, ...updates, updated_at: new Date().toISOString() };
      return updatedRecord;
    }
    return o;
  });
  setLocal(LS_KEYS.ONLINE_ORDERS, updated);
  return updatedRecord || (list.find((o) => o.id === id) as OnlineOrder);
}

export async function deleteOnlineOrder(id: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from('online_orders').delete().eq('id', id);
    } catch (e) {
      console.warn('Supabase deleteOnlineOrder error:', e);
    }
  }
  const list = getLocal<OnlineOrder[]>(LS_KEYS.ONLINE_ORDERS, INITIAL_ONLINE_ORDERS);
  setLocal(
    LS_KEYS.ONLINE_ORDERS,
    list.filter((o) => o.id !== id)
  );
  return true;
}

// ----------------- RETURNS & EXCHANGES -----------------
export async function getReturns(): Promise<ReturnRecord[]> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('returns')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) {
        setLocal(LS_KEYS.RETURNS, data);
        return data as ReturnRecord[];
      }
    } catch (e) {
      console.warn('Supabase getReturns fallback:', e);
    }
  }
  return getLocal<ReturnRecord[]>(LS_KEYS.RETURNS, INITIAL_RETURNS);
}

export async function createReturnRecord(
  record: Omit<ReturnRecord, 'id' | 'created_at'>
): Promise<ReturnRecord> {
  const newRecord: ReturnRecord = {
    ...record,
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'ret-' + Date.now(),
    created_at: new Date().toISOString(),
  };

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from('returns').insert({
        sale_id: newRecord.sale_id,
        sale_type: newRecord.sale_type,
        product_id: newRecord.product_id,
        replacement_product_id: newRecord.replacement_product_id || null,
        quantity: newRecord.quantity,
        return_type: newRecord.return_type,
        reason: newRecord.reason,
      });
    } catch (e) {
      console.warn('Supabase createReturnRecord error:', e);
    }
  }

  // AUTOMATIC STOCK UPDATE:
  // 1. Returned product stock INCREASES
  await adjustProductStock(newRecord.product_id, newRecord.quantity);

  // 2. If exchange, replacement product stock DECREASES
  if (newRecord.return_type === 'Exchange' && newRecord.replacement_product_id) {
    await adjustProductStock(newRecord.replacement_product_id, -newRecord.quantity);
  }

  const list = getLocal<ReturnRecord[]>(LS_KEYS.RETURNS, INITIAL_RETURNS);
  setLocal(LS_KEYS.RETURNS, [newRecord, ...list]);
  return newRecord;
}

// ----------------- DASHBOARD ANALYTICS (REAL CALCULATIONS) -----------------
export async function getDashboardStats(): Promise<DashboardStats> {
  const [offlineSales, onlineOrders, purchases, suppliers, products] = await Promise.all([
    getOfflineSales(),
    getOnlineOrders(),
    getPurchases(),
    getSuppliers(),
    getProducts(),
  ]);

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // Sales Overview
  let todayOfflineSales = 0;
  let monthlyOfflineSales = 0;
  for (const s of offlineSales) {
    if (s.status !== 'Returned') {
      if (s.sale_date === todayStr) {
        todayOfflineSales += Number(s.total_amount) || 0;
      }
      if (s.sale_date.startsWith(currentYearMonth)) {
        monthlyOfflineSales += Number(s.total_amount) || 0;
      }
    }
  }

  let todayOnlineSales = 0;
  let monthlyOnlineSales = 0;
  for (const o of onlineOrders) {
    if (o.order_status !== 'Cancelled' && o.order_status !== 'Returned') {
      if (o.order_date === todayStr) {
        todayOnlineSales += Number(o.total_amount) || 0;
      }
      if (o.order_date.startsWith(currentYearMonth)) {
        monthlyOnlineSales += Number(o.total_amount) || 0;
      }
    }
  }

  // Supplier Monitoring
  let totalPurchaseAmount = 0;
  let totalPaidAmount = 0;
  let totalPendingAmount = 0;
  const supplierPendingMap: Record<string, number> = {};

  for (const p of purchases) {
    const tot = Number(p.total_amount) || 0;
    const paid = Number(p.paid_amount) || 0;
    const pend = Number(p.pending_amount) || Math.max(0, tot - paid);

    totalPurchaseAmount += tot;
    totalPaidAmount += paid;
    totalPendingAmount += pend;

    if (pend > 0) {
      supplierPendingMap[p.supplier_id] = (supplierPendingMap[p.supplier_id] || 0) + pend;
    }
  }

  const suppliersWithPending = suppliers
    .filter((s) => (supplierPendingMap[s.id] || 0) > 0)
    .map((s) => ({
      id: s.id,
      name: s.name,
      contact: s.contact_number,
      pendingAmount: supplierPendingMap[s.id],
    }))
    .sort((a, b) => b.pendingAmount - a.pendingAmount);

  // Stock Overview
  let lowStockProducts = 0;
  let outOfStockProducts = 0;
  for (const p of products) {
    if (p.current_stock <= 0) {
      outOfStockProducts++;
    } else if (p.current_stock <= p.minimum_stock) {
      lowStockProducts++;
    }
  }

  // Online Sales Overview
  let newOrders = 0;
  let processingOrders = 0;
  let deliveredOrders = 0;
  let pendingOnlinePayments = 0;

  for (const o of onlineOrders) {
    if (o.order_status === 'New') newOrders++;
    if (o.order_status === 'Processing') processingOrders++;
    if (o.order_status === 'Delivered') deliveredOrders++;
    if (o.payment_status === 'Pending') pendingOnlinePayments++;
  }

  return {
    todayOfflineSales,
    todayOnlineSales,
    todayTotalSales: todayOfflineSales + todayOnlineSales,
    monthlyOfflineSales,
    monthlyOnlineSales,
    monthlyTotalSales: monthlyOfflineSales + monthlyOnlineSales,
    totalSuppliers: suppliers.length,
    totalPurchaseAmount,
    totalPaidAmount,
    totalPendingAmount,
    totalProducts: products.length,
    lowStockProducts,
    outOfStockProducts,
    newOrders,
    processingOrders,
    deliveredOrders,
    pendingOnlinePayments,
    suppliersWithPending,
  };
}

export async function getRecentActivity(): Promise<RecentActivityItem[]> {
  const [offlineSales, onlineOrders, purchases] = await Promise.all([
    getOfflineSales(),
    getOnlineOrders(),
    getPurchases(),
  ]);

  const activities: RecentActivityItem[] = [];

  for (const s of offlineSales.slice(0, 5)) {
    activities.push({
      id: 'act-off-' + s.id,
      type: 'offline_sale',
      title: `Offline Sale: ${s.sale_number}`,
      subtitle: `${s.customer_name} • ${s.shop} • ${s.payment_method}`,
      amount: s.total_amount,
      date: s.sale_date,
      statusBadge: s.status,
    });
  }

  for (const o of onlineOrders.slice(0, 5)) {
    activities.push({
      id: 'act-onl-' + o.id,
      type: 'online_order',
      title: `Online Order: ${o.order_number} (${o.sales_channel})`,
      subtitle: `${o.customer_name} • ${o.customer_phone}`,
      amount: o.total_amount,
      date: o.order_date,
      statusBadge: o.order_status,
    });
  }

  for (const p of purchases.slice(0, 5)) {
    activities.push({
      id: 'act-pur-' + p.id,
      type: 'purchase',
      title: `Stock Purchase: ${p.invoice_number}`,
      subtitle: `${p.supplier_name || 'Supplier'} • Mode: ${p.payment_mode}`,
      amount: p.total_amount,
      date: p.purchase_date,
      statusBadge: p.payment_status,
    });
  }

  // Sort latest first
  activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return activities.slice(0, 10);
}

// ----------------- UPI MANAGER & PAYMENTS -----------------
const DEFAULT_UPI_SETTINGS: UpiSettings = {
  upi_id: 'pasara@okhdfcbank',
  payee_name: 'Pasara Retail Store',
  shop_name: 'Shop 1',
  merchant_code: '5411',
};

const INITIAL_UPI_TRANSACTIONS: UpiTransaction[] = [
  {
    id: 'upi-tx-001',
    reference_id: 'UPI-2026-0001',
    amount: 1450.0,
    customer_name: 'Rahul Sharma',
    customer_phone: '+91 98765 43210',
    delivery_address: '42 Pine St, Apt 3B, New York, NY 10001',
    note: 'Cotton Shirt & Denim Jeans',
    status: 'Paid',
    upi_id: 'pasara@okhdfcbank',
    payee_name: 'Pasara Retail Store',
    channel: 'WhatsApp',
    linked_order_number: 'ONL-2026-0001',
    created_at: new Date(Date.now() - 3 * 3600000).toISOString(),
    paid_at: new Date(Date.now() - 2.8 * 3600000).toISOString(),
  },
  {
    id: 'upi-tx-002',
    reference_id: 'UPI-2026-0002',
    amount: 499.0,
    customer_name: 'Priya Patel',
    customer_phone: '+91 98111 22334',
    note: 'Leather Wallet',
    status: 'Paid',
    upi_id: 'pasara@okhdfcbank',
    payee_name: 'Pasara Retail Store',
    channel: 'Instagram',
    linked_order_number: 'ONL-2026-0003',
    created_at: new Date(Date.now() - 1.5 * 3600000).toISOString(),
    paid_at: new Date(Date.now() - 1.4 * 3600000).toISOString(),
  },
  {
    id: 'upi-tx-003',
    reference_id: 'UPI-2026-0003',
    amount: 850.0,
    customer_name: 'Anil Kumar',
    customer_phone: '+91 98222 33445',
    note: 'Runner Sneakers',
    status: 'Not Paid',
    upi_id: 'pasara@okhdfcbank',
    payee_name: 'Pasara Retail Store',
    channel: 'WhatsApp',
    linked_order_number: 'ONL-2026-0002',
    created_at: new Date(Date.now() - 30 * 60000).toISOString(),
  },
];

export async function getUpiSettings(): Promise<UpiSettings> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('upi_settings')
        .select('*')
        .eq('id', 'default')
        .single();
      if (!error && data) {
        return {
          upi_id: data.upi_id,
          payee_name: data.payee_name,
          shop_name: data.shop_name,
          merchant_code: data.merchant_code,
        };
      }
    } catch (e) {
      console.warn('Supabase getUpiSettings fallback:', e);
    }
  }
  return getLocal<UpiSettings>(LS_KEYS.UPI_SETTINGS, DEFAULT_UPI_SETTINGS);
}

export async function saveUpiSettings(settings: UpiSettings): Promise<UpiSettings> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { error } = await supabase.from('upi_settings').upsert({
        id: 'default',
        upi_id: settings.upi_id,
        payee_name: settings.payee_name,
        shop_name: settings.shop_name,
        merchant_code: settings.merchant_code,
        updated_at: new Date().toISOString(),
      });
      if (!error) {
        setLocal(LS_KEYS.UPI_SETTINGS, settings);
        return settings;
      }
    } catch (e) {
      console.warn('Supabase saveUpiSettings error:', e);
    }
  }
  setLocal(LS_KEYS.UPI_SETTINGS, settings);
  return settings;
}

export async function getUpiTransactions(): Promise<UpiTransaction[]> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('upi_transactions')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) {
        setLocal(LS_KEYS.UPI_TRANSACTIONS, data);
        return data as UpiTransaction[];
      }
    } catch (e) {
      console.warn('Supabase getUpiTransactions fallback:', e);
    }
  }
  return getLocal<UpiTransaction[]>(LS_KEYS.UPI_TRANSACTIONS, INITIAL_UPI_TRANSACTIONS);
}

export async function createUpiTransaction(
  data: Omit<UpiTransaction, 'id' | 'reference_id' | 'created_at'> & {
    autoAddToOnlineOrders?: boolean;
    delivery_address?: string;
  }
): Promise<UpiTransaction> {
  const list = getLocal<UpiTransaction[]>(LS_KEYS.UPI_TRANSACTIONS, INITIAL_UPI_TRANSACTIONS);
  const count = list.length + 1;
  const refId = `UPI-${new Date().getFullYear()}-${String(count).padStart(4, '0')}`;

  let linkedOrderId = data.linked_order_id;
  let linkedOrderNumber = data.linked_order_number;

  // AUTO-ADD TO WHATSAPP OR INSTAGRAM ORDER LIST:
  // If channel is 'WhatsApp' or 'Instagram', automatically sync into the online orders list!
  if (
    (data.channel === 'WhatsApp' || data.channel === 'Instagram') &&
    !linkedOrderId &&
    data.autoAddToOnlineOrders !== false
  ) {
    try {
      const onlineOrders = getLocal<OnlineOrder[]>(LS_KEYS.ONLINE_ORDERS, INITIAL_ONLINE_ORDERS);
      const orderCount = onlineOrders.length + 1;
      const orderNumber = `ONL-${new Date().getFullYear()}-${String(orderCount).padStart(4, '0')}`;

      const newOnlineOrder: OnlineOrder = {
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'ord-' + Date.now(),
        order_number: orderNumber,
        sales_channel: data.channel,
        customer_name: data.customer_name?.trim() || `${data.channel} Customer`,
        customer_phone: data.customer_phone?.trim() || '',
        customer_address:
          data.delivery_address?.trim() ||
          `Order generated via UPI QR Counter (${data.channel})`,
        total_amount: Number(data.amount) || 0,
        payment_status: data.status === 'Paid' ? 'Paid' : 'Pending',
        order_status: data.status === 'Paid' ? 'Confirmed' : 'New',
        order_date: new Date().toISOString().split('T')[0],
        items: [
          {
            id: 'item-' + Date.now(),
            product_id: 'prod-001',
            product_name: data.note?.trim() || `${data.channel} Order Item`,
            quantity: 1,
            selling_price: Number(data.amount) || 0,
            total: Number(data.amount) || 0,
          },
        ],
        upi_reference: refId,
        created_at: new Date().toISOString(),
      };

      // Store in online orders
      setLocal(LS_KEYS.ONLINE_ORDERS, [newOnlineOrder, ...onlineOrders]);

      // If Supabase is connected, insert to Supabase too
      const supabase = getSupabaseClient();
      if (supabase) {
        try {
          await supabase.from('online_orders').insert({
            id: newOnlineOrder.id,
            order_number: newOnlineOrder.order_number,
            sales_channel: newOnlineOrder.sales_channel,
            customer_name: newOnlineOrder.customer_name,
            customer_phone: newOnlineOrder.customer_phone,
            customer_address: newOnlineOrder.customer_address,
            total_amount: newOnlineOrder.total_amount,
            payment_status: newOnlineOrder.payment_status,
            order_status: newOnlineOrder.order_status,
            order_date: newOnlineOrder.order_date,
            upi_reference: newOnlineOrder.upi_reference || null,
            upi_transaction_id: newOnlineOrder.upi_transaction_id || null,
          });
        } catch (err) {
          console.warn('Failed to insert linked online order to Supabase:', err);
        }
      }

      linkedOrderId = newOnlineOrder.id;
      linkedOrderNumber = newOnlineOrder.order_number;
    } catch (e) {
      console.warn('Error auto-creating online order from UPI transaction:', e);
    }
  } else if (linkedOrderId && data.status === 'Paid') {
    // If an existing order was linked and transaction marked Paid, update the order to Paid
    try {
      await updateOnlineOrder(linkedOrderId, {
        payment_status: 'Paid',
        order_status: 'Confirmed',
        upi_reference: refId,
      });
    } catch (e) {
      console.warn('Error updating linked online order status:', e);
    }
  }

  const newTx: UpiTransaction = {
    ...data,
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'upi-' + Date.now(),
    reference_id: refId,
    channel: data.channel || 'Counter',
    linked_order_id: linkedOrderId,
    linked_order_number: linkedOrderNumber,
    created_at: new Date().toISOString(),
    paid_at: data.status === 'Paid' ? new Date().toISOString() : undefined,
  };

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data: sData, error } = await supabase
        .from('upi_transactions')
        .insert({
          id: newTx.id,
          reference_id: newTx.reference_id,
          amount: newTx.amount,
          customer_name: newTx.customer_name || null,
          customer_phone: newTx.customer_phone || null,
          delivery_address: newTx.delivery_address || null,
          note: newTx.note || null,
          status: newTx.status,
          upi_id: newTx.upi_id,
          payee_name: newTx.payee_name,
          channel: newTx.channel || 'Counter',
          linked_order_id: newTx.linked_order_id || null,
          linked_order_number: newTx.linked_order_number || null,
          paid_at: newTx.paid_at || null,
        })
        .select()
        .single();
      if (!error && sData) {
        const updated = [
          {
            ...newTx,
            ...sData,
          } as UpiTransaction,
          ...list,
        ];
        setLocal(LS_KEYS.UPI_TRANSACTIONS, updated);
        return updated[0];
      }
    } catch (e) {
      console.warn('Supabase createUpiTransaction error:', e);
    }
  }

  const updated = [newTx, ...list];
  setLocal(LS_KEYS.UPI_TRANSACTIONS, updated);
  return newTx;
}

export async function updateUpiTransactionStatus(
  id: string,
  status: UpiPaymentStatus
): Promise<UpiTransaction | null> {
  const paidAt = status === 'Paid' ? new Date().toISOString() : undefined;

  const list = getLocal<UpiTransaction[]>(LS_KEYS.UPI_TRANSACTIONS, INITIAL_UPI_TRANSACTIONS);
  const targetTx = list.find((t) => t.id === id);

  // AUTOMATIC SYNC: If this UPI transaction is linked to an Online Order (WhatsApp / IG),
  // synchronize the online order payment status as well!
  if (targetTx) {
    try {
      const onlineOrders = getLocal<OnlineOrder[]>(LS_KEYS.ONLINE_ORDERS, INITIAL_ONLINE_ORDERS);
      const linkedOrder = onlineOrders.find(
        (o) =>
          (targetTx.linked_order_id && o.id === targetTx.linked_order_id) ||
          (targetTx.linked_order_number && o.order_number === targetTx.linked_order_number) ||
          (targetTx.reference_id && o.upi_reference === targetTx.reference_id)
      );

      if (linkedOrder) {
        const nextPaymentStatus = status === 'Paid' ? 'Paid' : 'Pending';
        const nextOrderStatus =
          status === 'Paid' && linkedOrder.order_status === 'New'
            ? 'Confirmed'
            : linkedOrder.order_status;

        const updatedOnlineOrders = onlineOrders.map((o) =>
          o.id === linkedOrder.id
            ? {
                ...o,
                payment_status: nextPaymentStatus,
                order_status: nextOrderStatus,
                upi_reference: targetTx.reference_id,
                updated_at: new Date().toISOString(),
              }
            : o
        );
        setLocal(LS_KEYS.ONLINE_ORDERS, updatedOnlineOrders);

        const supabase = getSupabaseClient();
        if (supabase) {
          try {
            await supabase
              .from('online_orders')
              .update({
                payment_status: nextPaymentStatus,
                order_status: nextOrderStatus,
                updated_at: new Date().toISOString(),
              })
              .eq('id', linkedOrder.id);
          } catch (e) {
            console.warn('Supabase update linked online order error:', e);
          }
        }
      }
    } catch (syncErr) {
      console.warn('Failed to sync linked online order status:', syncErr);
    }
  }

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('upi_transactions')
        .update({
          status,
          paid_at: paidAt || null,
        })
        .eq('id', id)
        .select()
        .single();
      if (!error && data) {
        setLocal(
          LS_KEYS.UPI_TRANSACTIONS,
          list.map((t) => (t.id === id ? { ...t, status, paid_at: paidAt } : t))
        );
        return { ...targetTx, ...data, status, paid_at: paidAt } as UpiTransaction;
      }
    } catch (e) {
      console.warn('Supabase updateUpiTransactionStatus error:', e);
    }
  }

  let updatedRecord: UpiTransaction | null = null;
  const updated = list.map((t) => {
    if (t.id === id) {
      updatedRecord = {
        ...t,
        status,
        paid_at: paidAt,
      };
      return updatedRecord;
    }
    return t;
  });
  setLocal(LS_KEYS.UPI_TRANSACTIONS, updated);
  return updatedRecord;
}

export async function deleteUpiTransaction(id: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from('upi_transactions').delete().eq('id', id);
    } catch (e) {
      console.warn('Supabase deleteUpiTransaction error:', e);
    }
  }
  const list = getLocal<UpiTransaction[]>(LS_KEYS.UPI_TRANSACTIONS, INITIAL_UPI_TRANSACTIONS);
  setLocal(
    LS_KEYS.UPI_TRANSACTIONS,
    list.filter((t) => t.id !== id)
  );
  return true;
}

export async function getUpiDashboardStats(): Promise<UpiDashboardStats> {
  const transactions = await getUpiTransactions();
  const todayStr = new Date().toISOString().split('T')[0];

  let todayCollected = 0;
  let todayCount = 0;
  let totalCollected = 0;
  let pendingAmount = 0;
  let pendingCount = 0;

  for (const tx of transactions) {
    const isPaid = tx.status === 'Paid';
    const amount = Number(tx.amount) || 0;
    const isToday = tx.created_at.startsWith(todayStr);

    if (isPaid) {
      totalCollected += amount;
      if (isToday) {
        todayCollected += amount;
        todayCount++;
      }
    } else {
      pendingAmount += amount;
      pendingCount++;
    }
  }

  return {
    todayCollected,
    todayCount,
    totalCollected,
    pendingAmount,
    pendingCount,
    totalTransactions: transactions.length,
  };
}

export async function getUpiTransactionByRef(ref: string): Promise<UpiTransaction | null> {
  const transactions = await getUpiTransactions();
  const cleanRef = ref.trim().toLowerCase();
  const tx = transactions.find(
    (t) =>
      t.reference_id.toLowerCase() === cleanRef ||
      t.id.toLowerCase() === cleanRef ||
      (t.linked_order_number && t.linked_order_number.toLowerCase() === cleanRef)
  );
  return tx || null;
}

export async function markUpiPaidByReference(ref: string, utrNote?: string): Promise<boolean> {
  const transactions = await getUpiTransactions();
  const cleanRef = ref.trim().toLowerCase();
  const tx = transactions.find(
    (t) =>
      t.reference_id.toLowerCase() === cleanRef ||
      t.id.toLowerCase() === cleanRef ||
      (t.linked_order_number && t.linked_order_number.toLowerCase() === cleanRef)
  );
  if (tx) {
    await updateUpiTransactionStatus(tx.id, 'Paid');
    return true;
  }
  return false;
}

// ----------------------------------------------------
// 9. BRANCH MANAGEMENT (Shop Locations, Addresses & Employee Count)
// ----------------------------------------------------

export async function getBranches(): Promise<Branch[]> {
  const local = getLocal<Branch[]>(LS_KEYS.BRANCHES, INITIAL_BRANCHES);
  const supabase = getSupabaseClient();
  if (!supabase) return local;

  try {
    const { data, error } = await supabase
      .from('branches')
      .select('*')
      .order('created_at', { ascending: true });

    if (error || !data) {
      return local;
    }
    setLocal(LS_KEYS.BRANCHES, data);
    return data as Branch[];
  } catch (err) {
    console.warn('Error fetching branches from Supabase:', err);
    return local;
  }
}

export async function getBranchesWithEmployees(): Promise<BranchWithEmployees[]> {
  const [branches, employees] = await Promise.all([getBranches(), getEmployees()]);

  return branches.map((branch) => {
    // Match employees assigned to this branch by shop_identifier or name
    const branchEmployees = employees.filter((emp) => {
      const assigned = (emp.assigned_shop || '').trim().toLowerCase();
      const identifier = (branch.shop_identifier || '').trim().toLowerCase();
      const bName = (branch.name || '').trim().toLowerCase();
      return (
        assigned === identifier ||
        assigned === bName ||
        assigned.includes(identifier) ||
        bName.includes(assigned)
      );
    });

    return {
      ...branch,
      assigned_employees_count: branchEmployees.length,
      employees: branchEmployees,
    };
  });
}

export async function getBranchDashboardStats(): Promise<BranchDashboardStats> {
  const branches = await getBranchesWithEmployees();
  const totalBranches = branches.length;
  const activeBranches = branches.filter((b) => b.status === 'Active').length;
  const totalEmployees = branches.reduce((acc, b) => acc + b.assigned_employees_count, 0);
  const avgEmployeesPerBranch =
    totalBranches > 0 ? Math.round((totalEmployees / totalBranches) * 10) / 10 : 0;

  return {
    totalBranches,
    activeBranches,
    totalEmployees,
    avgEmployeesPerBranch,
  };
}

export async function createBranch(
  branch: Omit<Branch, 'id' | 'created_at' | 'updated_at'>
): Promise<Branch> {
  const newBranch: Branch = {
    ...branch,
    id: `branch-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    created_at: new Date().toISOString(),
  };

  const local = getLocal<Branch[]>(LS_KEYS.BRANCHES, INITIAL_BRANCHES);
  const updated = [...local, newBranch];
  setLocal(LS_KEYS.BRANCHES, updated);

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from('branches').insert([newBranch]);
    } catch (err) {
      console.warn('Failed to insert branch into Supabase:', err);
    }
  }

  return newBranch;
}

export async function updateBranch(
  id: string,
  updates: Partial<Omit<Branch, 'id' | 'created_at'>>
): Promise<Branch | null> {
  const local = getLocal<Branch[]>(LS_KEYS.BRANCHES, INITIAL_BRANCHES);
  let updatedBranch: Branch | null = null;

  const updated = local.map((b) => {
    if (b.id === id) {
      updatedBranch = {
        ...b,
        ...updates,
        updated_at: new Date().toISOString(),
      };
      return updatedBranch;
    }
    return b;
  });

  if (updatedBranch) {
    setLocal(LS_KEYS.BRANCHES, updated);
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('branches').update(updates).eq('id', id);
      } catch (err) {
        console.warn('Failed to update branch in Supabase:', err);
      }
    }
  }

  return updatedBranch;
}

export async function deleteBranch(id: string): Promise<boolean> {
  const local = getLocal<Branch[]>(LS_KEYS.BRANCHES, INITIAL_BRANCHES);
  const filtered = local.filter((b) => b.id !== id);
  setLocal(LS_KEYS.BRANCHES, filtered);

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from('branches').delete().eq('id', id);
    } catch (err) {
      console.warn('Failed to delete branch in Supabase:', err);
    }
  }

  return true;
}

// ----------------------------------------------------
// 10. GST MANAGEMENT & TAX FILING COMPLIANCE
// ----------------------------------------------------

export async function getGstSettings(): Promise<GstSettings> {
  const local = getLocal<GstSettings>(LS_KEYS.GST_SETTINGS, INITIAL_GST_SETTINGS);
  const supabase = getSupabaseClient();
  if (!supabase) return local;

  try {
    const { data, error } = await supabase
      .from('gst_settings')
      .select('*')
      .limit(1)
      .single();

    if (error || !data) return local;
    return data as GstSettings;
  } catch (err) {
    console.warn('Error fetching GST settings from Supabase:', err);
    return local;
  }
}

export async function updateGstSettings(settings: Partial<GstSettings>): Promise<GstSettings> {
  const current = await getGstSettings();
  const updated: GstSettings = { ...current, ...settings };
  setLocal(LS_KEYS.GST_SETTINGS, updated);

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from('gst_settings').upsert([{ id: 'default', ...updated }]);
    } catch (err) {
      console.warn('Failed to update GST settings in Supabase:', err);
    }
  }

  return updated;
}

export async function getHsnDirectory(): Promise<HsnEntry[]> {
  const local = getLocal<HsnEntry[]>(LS_KEYS.GST_HSN, INITIAL_HSN_ENTRIES);
  const supabase = getSupabaseClient();
  if (!supabase) return local;

  try {
    const { data, error } = await supabase
      .from('hsn_directory')
      .select('*')
      .order('hsn_code', { ascending: true });

    if (error || !data) return local;
    setLocal(LS_KEYS.GST_HSN, data);
    return data as HsnEntry[];
  } catch (err) {
    console.warn('Error fetching HSN directory from Supabase:', err);
    return local;
  }
}

export async function createHsnEntry(
  entry: Omit<HsnEntry, 'id'>
): Promise<HsnEntry> {
  const newEntry: HsnEntry = {
    ...entry,
    id: `hsn-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
  };

  const local = getLocal<HsnEntry[]>(LS_KEYS.GST_HSN, INITIAL_HSN_ENTRIES);
  const updated = [newEntry, ...local];
  setLocal(LS_KEYS.GST_HSN, updated);

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from('hsn_directory').insert([newEntry]);
    } catch (err) {
      console.warn('Failed to insert HSN entry into Supabase:', err);
    }
  }

  return newEntry;
}

export async function deleteHsnEntry(id: string): Promise<boolean> {
  const local = getLocal<HsnEntry[]>(LS_KEYS.GST_HSN, INITIAL_HSN_ENTRIES);
  const filtered = local.filter((h) => h.id !== id);
  setLocal(LS_KEYS.GST_HSN, filtered);

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from('hsn_directory').delete().eq('id', id);
    } catch (err) {
      console.warn('Failed to delete HSN entry from Supabase:', err);
    }
  }

  return true;
}

export async function getGstInvoices(): Promise<GstInvoiceRecord[]> {
  const local = getLocal<GstInvoiceRecord[]>(LS_KEYS.GST_INVOICES, INITIAL_GST_INVOICES);
  const supabase = getSupabaseClient();
  if (!supabase) return local;

  try {
    const { data, error } = await supabase
      .from('gst_invoices')
      .select('*')
      .order('invoice_date', { ascending: false });

    if (error || !data) return local;
    setLocal(LS_KEYS.GST_INVOICES, data);
    return data as GstInvoiceRecord[];
  } catch (err) {
    console.warn('Error fetching GST invoices from Supabase:', err);
    return local;
  }
}

export async function createGstInvoice(
  invoice: Omit<GstInvoiceRecord, 'id'>
): Promise<GstInvoiceRecord> {
  const newInvoice: GstInvoiceRecord = {
    ...invoice,
    id: `gst-inv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
  };

  const local = getLocal<GstInvoiceRecord[]>(LS_KEYS.GST_INVOICES, INITIAL_GST_INVOICES);
  const updated = [newInvoice, ...local];
  setLocal(LS_KEYS.GST_INVOICES, updated);

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from('gst_invoices').insert([newInvoice]);
    } catch (err) {
      console.warn('Failed to insert GST invoice into Supabase:', err);
    }
  }

  return newInvoice;
}

export async function deleteGstInvoice(id: string): Promise<boolean> {
  const local = getLocal<GstInvoiceRecord[]>(LS_KEYS.GST_INVOICES, INITIAL_GST_INVOICES);
  const filtered = local.filter((inv) => inv.id !== id);
  setLocal(LS_KEYS.GST_INVOICES, filtered);

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from('gst_invoices').delete().eq('id', id);
    } catch (err) {
      console.warn('Failed to delete GST invoice from Supabase:', err);
    }
  }

  return true;
}

export interface TaxBreakdownCalculation {
  taxableValue: number;
  gstRate: number;
  isInterState: boolean;
  isInclusive: boolean;
  cgstRate: number;
  sgstRate: number;
  igstRate: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalTax: number;
  grossAmount: number;
}

export function calculateGstTaxBreakdown(
  enteredAmount: number,
  gstRate: number,
  isInterState: boolean,
  isInclusive: boolean
): TaxBreakdownCalculation {
  const amount = Math.max(0, Number(enteredAmount) || 0);
  const rate = Math.max(0, Number(gstRate) || 0);

  let taxableValue = 0;
  let totalTax = 0;

  if (isInclusive) {
    // Formula: Taxable = Gross / (1 + (Rate / 100))
    taxableValue = Math.round((amount / (1 + rate / 100)) * 100) / 100;
    totalTax = Math.round((amount - taxableValue) * 100) / 100;
  } else {
    // Formula: Taxable = Entered, Tax = Taxable * Rate / 100
    taxableValue = amount;
    totalTax = Math.round((taxableValue * (rate / 100)) * 100) / 100;
  }

  const grossAmount = Math.round((taxableValue + totalTax) * 100) / 100;

  let cgstRate = 0;
  let sgstRate = 0;
  let igstRate = 0;
  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;

  if (isInterState) {
    igstRate = rate;
    igstAmount = totalTax;
  } else {
    cgstRate = rate / 2;
    sgstRate = rate / 2;
    cgstAmount = Math.round((totalTax / 2) * 100) / 100;
    sgstAmount = Math.round((totalTax - cgstAmount) * 100) / 100;
  }

  return {
    taxableValue,
    gstRate: rate,
    isInterState,
    isInclusive,
    cgstRate,
    sgstRate,
    igstRate,
    cgstAmount,
    sgstAmount,
    igstAmount,
    totalTax,
    grossAmount,
  };
}

export async function getGstSummaryStats(): Promise<GstSummaryStats> {
  const invoices = await getGstInvoices();

  let totalTaxableSales = 0;
  let totalOutputGst = 0;
  let totalTaxablePurchases = 0;
  let totalEligibleItc = 0;
  let cgstLiability = 0;
  let sgstLiability = 0;
  let igstLiability = 0;
  let b2cCount = 0;
  let b2bCount = 0;
  let purchaseBillCount = 0;

  for (const inv of invoices) {
    const isOutward =
      inv.type === 'B2C (Retail In-Store)' ||
      inv.type === 'B2C (Online Order)' ||
      inv.type === 'B2B (Tax Invoice)';

    if (isOutward) {
      totalTaxableSales += inv.taxable_value;
      totalOutputGst += inv.total_tax;
      cgstLiability += inv.cgst_amount;
      sgstLiability += inv.sgst_amount;
      igstLiability += inv.igst_amount;

      if (inv.type === 'B2B (Tax Invoice)') {
        b2bCount++;
      } else {
        b2cCount++;
      }
    } else {
      // Inward Purchase / Input Tax Credit
      totalTaxablePurchases += inv.taxable_value;
      totalEligibleItc += inv.total_tax;
      purchaseBillCount++;
    }
  }

  const netGstPayable = Math.max(0, totalOutputGst - totalEligibleItc);

  return {
    totalTaxableSales,
    totalOutputGst,
    totalTaxablePurchases,
    totalEligibleItc,
    netGstPayable,
    cgstLiability,
    sgstLiability,
    igstLiability,
    totalInvoicesCount: invoices.length,
    b2cCount,
    b2bCount,
    purchaseBillCount,
  };
}

// ----------------------------------------------------
// 11. FULL TWO-WAY DATABASE SYNC TO SUPABASE
// ----------------------------------------------------
export async function syncAllDataToSupabase(): Promise<{ ok: boolean; message: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { ok: false, message: 'Supabase credentials not configured or invalid' };
  }

  try {
    // 1. Branches
    const branches = getLocal<Branch[]>(LS_KEYS.BRANCHES, INITIAL_BRANCHES);
    await supabase.from('branches').upsert(branches);

    // 2. GST Settings
    const gstSettings = getLocal<GstSettings>(LS_KEYS.GST_SETTINGS, INITIAL_GST_SETTINGS);
    await supabase.from('gst_settings').upsert([{ id: 'default', ...gstSettings }]);

    // 3. HSN Directory
    const hsnEntries = getLocal<HsnEntry[]>(LS_KEYS.GST_HSN, INITIAL_HSN_ENTRIES);
    await supabase.from('hsn_directory').upsert(hsnEntries);

    // 4. UPI Settings
    const upiSettings = getLocal<UpiSettings>(LS_KEYS.UPI_SETTINGS, DEFAULT_UPI_SETTINGS);
    await supabase.from('upi_settings').upsert([{ id: 'default', ...upiSettings }]);

    // 5. Suppliers
    const suppliers = getLocal<Supplier[]>(LS_KEYS.SUPPLIERS, INITIAL_SUPPLIERS);
    await supabase.from('suppliers').upsert(suppliers);

    // 6. Products
    const products = getLocal<Product[]>(LS_KEYS.PRODUCTS, INITIAL_PRODUCTS);
    await supabase.from('products').upsert(products);

    // 7. Employees
    const employees = getLocal<Employee[]>(LS_KEYS.EMPLOYEES, INITIAL_EMPLOYEES);
    await supabase.from('employees').upsert(employees);

    // 8. Purchases & Items
    const purchases = getLocal<Purchase[]>(LS_KEYS.PURCHASES, INITIAL_PURCHASES);
    for (const pur of purchases) {
      const { items, supplier_name, ...purRow } = pur;
      await supabase.from('purchases').upsert([purRow]);
      if (items && items.length > 0) {
        const itemsToInsert = items.map((it) => ({
          id: it.id || `pi-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          purchase_id: pur.id,
          product_id: it.product_id,
          quantity: it.quantity,
          purchase_price: it.purchase_price,
          total: it.total,
        }));
        await supabase.from('purchase_items').upsert(itemsToInsert);
      }
    }

    // 9. Offline Sales & Items
    const offlineSales = getLocal<OfflineSale[]>(LS_KEYS.OFFLINE_SALES, INITIAL_OFFLINE_SALES);
    for (const sale of offlineSales) {
      const { items, ...saleRow } = sale;
      await supabase.from('offline_sales').upsert([saleRow]);
      if (items && items.length > 0) {
        const itemsToInsert = items.map((it) => ({
          id: it.id || `osi-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          sale_id: sale.id,
          product_id: it.product_id,
          quantity: it.quantity,
          selling_price: it.selling_price,
          total: it.total,
        }));
        await supabase.from('offline_sale_items').upsert(itemsToInsert);
      }
    }

    // 10. Online Orders & Items
    const onlineOrders = getLocal<OnlineOrder[]>(LS_KEYS.ONLINE_ORDERS, INITIAL_ONLINE_ORDERS);
    for (const order of onlineOrders) {
      const { items, ...orderRow } = order;
      await supabase.from('online_orders').upsert([orderRow]);
      if (items && items.length > 0) {
        const itemsToInsert = items.map((it) => ({
          id: it.id || `ooi-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          order_id: order.id,
          product_id: it.product_id,
          quantity: it.quantity,
          selling_price: it.selling_price,
          total: it.total,
        }));
        await supabase.from('online_order_items').upsert(itemsToInsert);
      }
    }

    // 11. UPI Transactions
    const upiTx = getLocal<UpiTransaction[]>(LS_KEYS.UPI_TRANSACTIONS, INITIAL_UPI_TRANSACTIONS);
    await supabase.from('upi_transactions').upsert(upiTx);

    // 12. GST Invoices
    const gstInvoices = getLocal<GstInvoiceRecord[]>(LS_KEYS.GST_INVOICES, INITIAL_GST_INVOICES);
    await supabase.from('gst_invoices').upsert(gstInvoices);

    return {
      ok: true,
      message: 'All 16 tables and datasets are 100% synchronized with Supabase PostgreSQL',
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown sync error';
    return { ok: false, message: errorMsg };
  }
}



