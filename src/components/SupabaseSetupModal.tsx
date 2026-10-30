import React, { useState, useEffect } from 'react';
import { Database, CheckCircle, AlertCircle, Copy, Check, ExternalLink, HardDrive, RefreshCw } from 'lucide-react';
import { Modal } from './ui/Modal';
import { getSupabaseConfig, saveSupabaseConfig, checkSupabaseConnection } from '../lib/supabase';
import { syncAllDataToSupabase } from '../lib/dataService';

interface SupabaseSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseSetupModal: React.FC<SupabaseSetupModalProps> = ({ isOpen, onClose }) => {
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const config = getSupabaseConfig();
      setUrl(config.url || '');
      setAnonKey(config.anonKey || '');
      handleCheck();
    }
  }, [isOpen]);

  const handleCheck = async () => {
    setTesting(true);
    const res = await checkSupabaseConnection();
    setStatus(res);
    setTesting(false);
  };

  const handleSyncAll = async () => {
    setSyncing(true);
    setSyncResult(null);
    const res = await syncAllDataToSupabase();
    setSyncResult(res.message);
    setSyncing(false);
    handleCheck();
  };

  const handleSave = () => {
    saveSupabaseConfig({
      url: url.trim(),
      anonKey: anonKey.trim(),
    });
  };

  const handleCopySql = () => {
    const sqlScript = `-- PASARA MULTI-BRANCH RETAIL MANAGEMENT SYSTEM
-- Production-Ready Supabase PostgreSQL Schema (All 16 Tables + Storage + Seed)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Timestamp update trigger
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. Branches
CREATE TABLE IF NOT EXISTS branches (
    id VARCHAR(100) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    shop_identifier VARCHAR(50) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    state_zip VARCHAR(100),
    contact_number VARCHAR(50) NOT NULL,
    manager_name VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Under Maintenance')),
    opening_hours VARCHAR(100),
    notes TEXT,
    capacity INTEGER DEFAULT 0 CHECK (capacity >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Employees
CREATE TABLE IF NOT EXISTS employees (
    id VARCHAR(100) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name VARCHAR(255) NOT NULL,
    age INTEGER NOT NULL CHECK (age >= 16),
    contact_number VARCHAR(50) NOT NULL,
    date_of_joining DATE NOT NULL,
    address_proof_url TEXT,
    address_proof_filename VARCHAR(255),
    assigned_shop VARCHAR(50) NOT NULL DEFAULT 'Shop 1',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Suppliers (with GST verification)
CREATE TABLE IF NOT EXISTS suppliers (
    id VARCHAR(100) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name VARCHAR(255) NOT NULL,
    contact_number VARCHAR(50) NOT NULL,
    address TEXT NOT NULL,
    notes TEXT,
    gstin VARCHAR(50),
    legal_name VARCHAR(255),
    trade_name VARCHAR(255),
    gst_status VARCHAR(50) DEFAULT 'Active',
    taxpayer_type VARCHAR(50) DEFAULT 'Regular',
    registration_date DATE,
    state_code VARCHAR(10),
    state_name VARCHAR(100),
    city VARCHAR(100),
    pincode VARCHAR(20),
    gst_verified BOOLEAN DEFAULT false,
    verified_at TIMESTAMPTZ,
    address_details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Products & Inventory
CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(100) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(100) NOT NULL UNIQUE,
    category VARCHAR(100) NOT NULL,
    purchase_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (purchase_price >= 0),
    selling_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (selling_price >= 0),
    current_stock INTEGER NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
    minimum_stock INTEGER NOT NULL DEFAULT 5 CHECK (minimum_stock >= 0),
    shop VARCHAR(50) NOT NULL DEFAULT 'Shop 1',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Purchases & Items
CREATE TABLE IF NOT EXISTS purchases (
    id VARCHAR(100) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    supplier_id VARCHAR(100) NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    invoice_number VARCHAR(100) NOT NULL,
    purchase_date DATE NOT NULL,
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (total_amount >= 0),
    paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (paid_amount >= 0),
    pending_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (pending_amount >= 0),
    payment_mode VARCHAR(50) NOT NULL DEFAULT 'Cash',
    payment_status VARCHAR(50) NOT NULL DEFAULT 'Pending' CHECK (payment_status IN ('Paid', 'Partially Paid', 'Pending')),
    invoice_url TEXT,
    invoice_filename VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchase_items (
    id VARCHAR(100) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    purchase_id VARCHAR(100) NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
    product_id VARCHAR(100) NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    purchase_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (purchase_price >= 0),
    total NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (total >= 0)
);

-- 6. Offline Sales
CREATE TABLE IF NOT EXISTS offline_sales (
    id VARCHAR(100) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    sale_number VARCHAR(100) NOT NULL UNIQUE,
    shop VARCHAR(50) NOT NULL DEFAULT 'Shop 1',
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50) NOT NULL,
    discount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (discount >= 0),
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (total_amount >= 0),
    payment_method VARCHAR(50) NOT NULL DEFAULT 'Cash' CHECK (payment_method IN ('Cash', 'UPI', 'Card')),
    sale_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Completed' CHECK (status IN ('Completed', 'Returned', 'Exchanged')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS offline_sale_items (
    id VARCHAR(100) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    sale_id VARCHAR(100) NOT NULL REFERENCES offline_sales(id) ON DELETE CASCADE,
    product_id VARCHAR(100) NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    selling_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (selling_price >= 0),
    total NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (total >= 0)
);

-- 7. Online Orders
CREATE TABLE IF NOT EXISTS online_orders (
    id VARCHAR(100) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    order_number VARCHAR(100) NOT NULL UNIQUE,
    sales_channel VARCHAR(50) NOT NULL CHECK (sales_channel IN ('Instagram', 'WhatsApp')),
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50) NOT NULL,
    customer_address TEXT NOT NULL,
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (total_amount >= 0),
    payment_status VARCHAR(50) NOT NULL DEFAULT 'Pending' CHECK (payment_status IN ('Pending', 'Paid', 'Failed', 'Refunded')),
    order_status VARCHAR(50) NOT NULL DEFAULT 'New',
    order_date DATE NOT NULL,
    upi_reference VARCHAR(100),
    upi_transaction_id VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS online_order_items (
    id VARCHAR(100) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    order_id VARCHAR(100) NOT NULL REFERENCES online_orders(id) ON DELETE CASCADE,
    product_id VARCHAR(100) NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    selling_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (selling_price >= 0),
    total NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (total >= 0)
);

-- 8. Returns
CREATE TABLE IF NOT EXISTS returns (
    id VARCHAR(100) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    sale_id VARCHAR(100) NOT NULL,
    sale_type VARCHAR(50) NOT NULL DEFAULT 'offline' CHECK (sale_type IN ('offline', 'online')),
    product_id VARCHAR(100) NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    replacement_product_id VARCHAR(100) REFERENCES products(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    return_type VARCHAR(50) NOT NULL DEFAULT 'Return' CHECK (return_type IN ('Return', 'Exchange')),
    reason TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. UPI Settings & Transactions
CREATE TABLE IF NOT EXISTS upi_settings (
    id VARCHAR(50) PRIMARY KEY DEFAULT 'default',
    upi_id VARCHAR(255) NOT NULL,
    payee_name VARCHAR(255) NOT NULL,
    shop_name VARCHAR(255),
    merchant_code VARCHAR(100),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS upi_transactions (
    id VARCHAR(100) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    reference_id VARCHAR(100) NOT NULL UNIQUE,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    customer_name VARCHAR(255),
    customer_phone VARCHAR(50),
    delivery_address TEXT,
    note TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'Not Paid' CHECK (status IN ('Paid', 'Not Paid')),
    upi_id VARCHAR(255) NOT NULL,
    payee_name VARCHAR(255) NOT NULL,
    channel VARCHAR(50) DEFAULT 'Counter',
    linked_order_id VARCHAR(100),
    linked_order_number VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    paid_at TIMESTAMPTZ
);

-- 10. GST Settings, HSN & Invoices
CREATE TABLE IF NOT EXISTS gst_settings (
    id VARCHAR(50) PRIMARY KEY DEFAULT 'default',
    gstin VARCHAR(50) NOT NULL,
    legal_name VARCHAR(255) NOT NULL,
    trade_name VARCHAR(255) NOT NULL,
    state_name VARCHAR(100) NOT NULL,
    state_code VARCHAR(10) NOT NULL,
    tax_scheme VARCHAR(50) NOT NULL DEFAULT 'Regular' CHECK (tax_scheme IN ('Regular', 'Composition')),
    default_hsn VARCHAR(20) NOT NULL DEFAULT '6109',
    default_gst_rate NUMERIC(5, 2) NOT NULL DEFAULT 12.00,
    filing_frequency VARCHAR(50) NOT NULL DEFAULT 'Monthly' CHECK (filing_frequency IN ('Monthly', 'Quarterly')),
    enable_e_invoicing BOOLEAN NOT NULL DEFAULT true,
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hsn_directory (
    id VARCHAR(100) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    hsn_code VARCHAR(50) NOT NULL UNIQUE,
    description TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,
    gst_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00 CHECK (gst_rate >= 0),
    cgst_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00 CHECK (cgst_rate >= 0),
    sgst_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00 CHECK (sgst_rate >= 0),
    igst_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00 CHECK (igst_rate >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gst_invoices (
    id VARCHAR(100) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    invoice_number VARCHAR(100) NOT NULL UNIQUE,
    invoice_date DATE NOT NULL,
    type VARCHAR(100) NOT NULL,
    party_name VARCHAR(255) NOT NULL,
    party_gstin VARCHAR(50),
    place_of_supply VARCHAR(100) NOT NULL,
    is_inter_state BOOLEAN NOT NULL DEFAULT false,
    hsn_code VARCHAR(50),
    taxable_value NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (taxable_value >= 0),
    gst_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00 CHECK (gst_rate >= 0),
    cgst_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (cgst_amount >= 0),
    sgst_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (sgst_amount >= 0),
    igst_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (igst_amount >= 0),
    total_tax NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (total_tax >= 0),
    total_invoice_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (total_invoice_amount >= 0),
    payment_status VARCHAR(50) NOT NULL DEFAULT 'Pending' CHECK (payment_status IN ('Paid', 'Pending')),
    branch VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Storage Buckets
INSERT INTO storage.buckets (id, name, public) VALUES
  ('employee-documents', 'employee-documents', true),
  ('purchase-invoices', 'purchase-invoices', true),
  ('product-images', 'product-images', true),
  ('shop-assets', 'shop-assets', true)
ON CONFLICT (id) DO NOTHING;

-- 12. Row Level Security & Policies
DO $$
DECLARE tbl text;
BEGIN
  FOR tbl IN SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'
    AND table_name IN ('branches', 'employees', 'suppliers', 'products', 'purchases', 'purchase_items', 'offline_sales', 'offline_sale_items', 'online_orders', 'online_order_items', 'returns', 'upi_settings', 'upi_transactions', 'gst_settings', 'hsn_directory', 'gst_invoices')
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "allow_full_access_%I" ON %I;', tbl, tbl);
    EXECUTE format('CREATE POLICY "allow_full_access_%I" ON %I FOR ALL USING (true) WITH CHECK (true);', tbl, tbl);
  END LOOP;
END $$;
`;
    navigator.clipboard.writeText(sqlScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Supabase Database & Storage Connection"
      subtitle="Connect Supabase PostgreSQL and Supabase Storage for permanent cloud persistence"
      maxWidth="2xl"
    >
      <div className="space-y-6 text-sm">
        {/* Connection status banner */}
        <div
          className={`p-4 rounded-xl border flex items-center justify-between ${
            status?.ok
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}
        >
          <div className="flex items-center gap-3">
            {status?.ok ? (
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            )}
            <div>
              <p className="font-semibold text-sm">
                {status?.ok ? 'Connected to Supabase PostgreSQL' : 'Local Fallback Storage Active'}
              </p>
              <p className="text-xs opacity-90 mt-0.5">
                {status?.message || 'Using browser persistent storage with initial seed data'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSyncAll}
              disabled={syncing || !status?.ok}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-2xs transition-colors disabled:opacity-50"
              title="Force upload and synchronize all local data to Supabase"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync All Data'}
            </button>
            <button
              type="button"
              onClick={handleCheck}
              disabled={testing}
              className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-lg shadow-2xs hover:bg-slate-50 transition-colors"
            >
              {testing ? 'Testing...' : 'Test Connection'}
            </button>
          </div>
        </div>

        {syncResult && (
          <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{syncResult}</span>
          </div>
        )}

        {/* Credentials Form */}
        <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <h4 className="font-semibold text-slate-800 flex items-center gap-2">
            <Database className="w-4 h-4 text-indigo-600" />
            Supabase Project Credentials
          </h4>
          <p className="text-xs text-slate-500">
            You can configure your Supabase URL & Anon Key below, or specify them as{' '}
            <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-800">
              VITE_SUPABASE_URL
            </code>{' '}
            and{' '}
            <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-800">
              VITE_SUPABASE_ANON_KEY
            </code>{' '}
            in your environment.
          </p>

          <div>
            <label className="block text-xs font-semibold text-emerald-950 mb-1">
              Supabase Project URL
            </label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://xyzcompany.supabase.co"
              className="w-full px-3 py-2 text-sm bg-white/90 border border-emerald-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-emerald-950"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-emerald-950 mb-1">
              Supabase Anon Public API Key
            </label>
            <input
              type="password"
              value={anonKey}
              onChange={(e) => setAnonKey(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              className="w-full px-3 py-2 text-sm bg-white/90 border border-emerald-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-emerald-950"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl transition-colors shadow-xs shadow-emerald-600/20"
            >
              Save & Apply Credentials
            </button>
          </div>
        </div>

        {/* Database setup copy script */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-emerald-600" />
              <span className="font-bold text-emerald-950 text-xs uppercase tracking-wider">
                Supabase SQL Setup Script
              </span>
            </div>
            <button
              type="button"
              onClick={handleCopySql}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl border border-emerald-200 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'SQL Copied!' : 'Copy SQL Schema'}
            </button>
          </div>
          <p className="text-xs text-emerald-800/70 leading-relaxed">
            Copy and paste this script into your Supabase Dashboard under <b>SQL Editor &gt; New Query</b>.
            It provisions all 16 relational tables (<code className="text-emerald-700 font-semibold">branches</code>,{' '}
            <code className="text-emerald-700 font-semibold">employees</code>, <code className="text-emerald-700 font-semibold">suppliers</code>,{' '}
            <code className="text-emerald-700 font-semibold">products</code>, <code className="text-emerald-700 font-semibold">purchases</code>,{' '}
            <code className="text-emerald-700 font-semibold">offline_sales</code>, <code className="text-emerald-700 font-semibold">online_orders</code>,{' '}
            <code className="text-emerald-700 font-semibold">returns</code>, <code className="text-emerald-700 font-semibold">upi_settings</code>,{' '}
            <code className="text-emerald-700 font-semibold">upi_transactions</code>, <code className="text-emerald-700 font-semibold">gst_settings</code>,{' '}
            <code className="text-emerald-700 font-semibold">hsn_directory</code>, <code className="text-emerald-700 font-semibold">gst_invoices</code>),
            configures Row Level Security (RLS) policies, and creates storage buckets (<code className="text-emerald-700 font-semibold">employee-documents</code>,{' '}
            <code className="text-emerald-700 font-semibold">purchase-invoices</code>, <code className="text-emerald-700 font-semibold">product-images</code>,{' '}
            <code className="text-emerald-700 font-semibold">shop-assets</code>).
          </p>
        </div>

        <div className="border-t border-emerald-100 pt-4 flex justify-between items-center text-xs text-emerald-800/60">
          <span>No user account or login is required. All operations are direct.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-950 font-semibold rounded-xl border border-emerald-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};
