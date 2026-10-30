import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import {
  INITIAL_BRANCHES,
  INITIAL_GST_SETTINGS,
  INITIAL_HSN_ENTRIES,
  INITIAL_GST_INVOICES,
  INITIAL_SUPPLIERS,
  INITIAL_PRODUCTS,
  INITIAL_EMPLOYEES,
  INITIAL_PURCHASES,
  INITIAL_OFFLINE_SALES,
  INITIAL_ONLINE_ORDERS,
} from '../src/lib/initialData';

dotenv.config();

const url = process.env.VITE_SUPABASE_URL || 'https://uwvexccoaywdpuwsjxuz.supabase.co';
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3dmV4Y2NvYXl3ZHB1d3NqeHV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMzODIyMDIsImV4cCI6MjEwODk1ODIwMn0.RHdA9UcuHbptpliRJqzqMy3yqpV_WGLD3WiUpP3wJqA';

const supabase = createClient(url, anonKey);

const INITIAL_UPI_TRANSACTIONS = [
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
    channel: 'Counter',
    created_at: new Date(Date.now() - 30 * 60000).toISOString(),
  },
];

async function syncAll() {
  console.log('🚀 Starting Full Database Sync to Supabase:', url);

  // 1. Branches
  console.log('1. Syncing Branches...');
  const { error: bErr } = await supabase.from('branches').upsert(INITIAL_BRANCHES);
  if (bErr) console.error('  Branches error:', bErr);
  else console.log(`  ✓ Synced ${INITIAL_BRANCHES.length} branches`);

  // 2. GST Settings
  console.log('2. Syncing GST Settings...');
  const { error: gstErr } = await supabase
    .from('gst_settings')
    .upsert([{ id: 'default', ...INITIAL_GST_SETTINGS }]);
  if (gstErr) console.error('  GST Settings error:', gstErr);
  else console.log('  ✓ Synced GST Settings');

  // 3. HSN Directory
  console.log('3. Syncing HSN Directory...');
  const { error: hsnErr } = await supabase.from('hsn_directory').upsert(INITIAL_HSN_ENTRIES);
  if (hsnErr) console.error('  HSN Directory error:', hsnErr);
  else console.log(`  ✓ Synced ${INITIAL_HSN_ENTRIES.length} HSN records`);

  // 4. UPI Settings
  console.log('4. Syncing UPI Settings...');
  const { error: upiErr } = await supabase.from('upi_settings').upsert([
    {
      id: 'default',
      upi_id: 'pasara@okhdfcbank',
      payee_name: 'Pasara Retail Management',
      shop_name: 'Pasara Stores Flagship',
      merchant_code: '5311',
    },
  ]);
  if (upiErr) console.error('  UPI Settings error:', upiErr);
  else console.log('  ✓ Synced UPI Settings');

  // 5. Suppliers
  console.log('5. Syncing Suppliers...');
  const { error: sErr } = await supabase.from('suppliers').upsert(INITIAL_SUPPLIERS);
  if (sErr) console.error('  Suppliers error:', sErr);
  else console.log(`  ✓ Synced ${INITIAL_SUPPLIERS.length} suppliers`);

  // 6. Products
  console.log('6. Syncing Products...');
  const { error: pErr } = await supabase.from('products').upsert(INITIAL_PRODUCTS);
  if (pErr) console.error('  Products error:', pErr);
  else console.log(`  ✓ Synced ${INITIAL_PRODUCTS.length} products`);

  // 7. Employees
  console.log('7. Syncing Employees...');
  const { error: eErr } = await supabase.from('employees').upsert(INITIAL_EMPLOYEES);
  if (eErr) console.error('  Employees error:', eErr);
  else console.log(`  ✓ Synced ${INITIAL_EMPLOYEES.length} employees`);

  // 8. Purchases & Items
  console.log('8. Syncing Purchases and Purchase Items...');
  for (const pur of INITIAL_PURCHASES) {
    const { items, supplier_name, ...purRow } = pur;
    const { error: purErr } = await supabase.from('purchases').upsert([purRow]);
    if (purErr) {
      console.error(`  Purchase ${pur.id} error:`, purErr);
    } else if (items && items.length > 0) {
      const itemsToInsert = items.map((it) => ({
        id: it.id,
        purchase_id: pur.id,
        product_id: it.product_id,
        quantity: it.quantity,
        purchase_price: it.purchase_price,
        total: it.total,
      }));
      const { error: piErr } = await supabase.from('purchase_items').upsert(itemsToInsert);
      if (piErr) console.error(`  Purchase items for ${pur.id} error:`, piErr);
    }
  }
  console.log(`  ✓ Synced ${INITIAL_PURCHASES.length} purchases and line items`);

  // 9. Offline Sales & Items
  console.log('9. Syncing Offline Sales and Items...');
  for (const sale of INITIAL_OFFLINE_SALES) {
    const { items, ...saleRow } = sale;
    const { error: saleErr } = await supabase.from('offline_sales').upsert([saleRow]);
    if (saleErr) {
      console.error(`  Sale ${sale.id} error:`, saleErr);
    } else if (items && items.length > 0) {
      const itemsToInsert = items.map((it) => ({
        id: it.id,
        sale_id: sale.id,
        product_id: it.product_id,
        quantity: it.quantity,
        selling_price: it.selling_price,
        total: it.total,
      }));
      const { error: siErr } = await supabase.from('offline_sale_items').upsert(itemsToInsert);
      if (siErr) console.error(`  Sale items for ${sale.id} error:`, siErr);
    }
  }
  console.log(`  ✓ Synced ${INITIAL_OFFLINE_SALES.length} offline sales and line items`);

  // 10. Online Orders & Items
  console.log('10. Syncing Online Orders and Items...');
  for (const order of INITIAL_ONLINE_ORDERS) {
    const { items, ...orderRow } = order;
    const { error: ordErr } = await supabase.from('online_orders').upsert([orderRow]);
    if (ordErr) {
      console.error(`  Order ${order.id} error:`, ordErr);
    } else if (items && items.length > 0) {
      const itemsToInsert = items.map((it) => ({
        id: it.id,
        order_id: order.id,
        product_id: it.product_id,
        quantity: it.quantity,
        selling_price: it.selling_price,
        total: it.total,
      }));
      const { error: oiErr } = await supabase.from('online_order_items').upsert(itemsToInsert);
      if (oiErr) console.error(`  Order items for ${order.id} error:`, oiErr);
    }
  }
  console.log(`  ✓ Synced ${INITIAL_ONLINE_ORDERS.length} online orders and line items`);

  // 11. UPI Transactions
  console.log('11. Syncing UPI Transactions...');
  const { error: upiTxErr } = await supabase.from('upi_transactions').upsert(INITIAL_UPI_TRANSACTIONS);
  if (upiTxErr) console.error('  UPI Transactions error:', upiTxErr);
  else console.log(`  ✓ Synced ${INITIAL_UPI_TRANSACTIONS.length} UPI transactions`);

  // 12. GST Invoices
  console.log('12. Syncing GST Invoices...');
  const { error: invErr } = await supabase.from('gst_invoices').upsert(INITIAL_GST_INVOICES);
  if (invErr) console.error('  GST Invoices error:', invErr);
  else console.log(`  ✓ Synced ${INITIAL_GST_INVOICES.length} GST invoices`);

  console.log('\n🎉 ALL DATA FULLY SYNCED TO SUPABASE SUCCESSFULLY!');
}

syncAll().catch((err) => {
  console.error('Fatal sync error:', err);
  process.exit(1);
});

