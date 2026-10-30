-- ==============================================================================
-- PASARA MULTI-BRANCH RETAIL MANAGEMENT SYSTEM
-- Production-Ready Supabase PostgreSQL Database Schema
-- Version: 2.5 (Production Hardened)
-- ==============================================================================
-- Instructions:
-- 1. Open your Supabase Dashboard: https://supabase.com/dashboard/project/_/sql
-- 2. Click "New Query"
-- 3. Paste this entire script and click "Run"
-- ==============================================================================

-- 1. Required PostgreSQL Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Timestamp Trigger Function
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- 3. CORE MULTI-BRANCH SYSTEM
-- ==============================================================================

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

CREATE TRIGGER set_timestamp_branches
BEFORE UPDATE ON branches
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- ==============================================================================
-- 4. EMPLOYEES
-- ==============================================================================

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

CREATE TRIGGER set_timestamp_employees
BEFORE UPDATE ON employees
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- ==============================================================================
-- 5. SUPPLIERS (With Integrated GST Verification & Address Details)
-- ==============================================================================

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

CREATE TRIGGER set_timestamp_suppliers
BEFORE UPDATE ON suppliers
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- ==============================================================================
-- 6. PRODUCTS & INVENTORY
-- ==============================================================================

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

CREATE TRIGGER set_timestamp_products
BEFORE UPDATE ON products
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- ==============================================================================
-- 7. PURCHASES & INVOICES
-- ==============================================================================

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

CREATE TRIGGER set_timestamp_purchases
BEFORE UPDATE ON purchases
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE TABLE IF NOT EXISTS purchase_items (
    id VARCHAR(100) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    purchase_id VARCHAR(100) NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
    product_id VARCHAR(100) NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    purchase_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (purchase_price >= 0),
    total NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (total >= 0)
);

-- ==============================================================================
-- 8. OFFLINE POS SALES
-- ==============================================================================

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

-- ==============================================================================
-- 9. ONLINE ORDERS (WhatsApp & Instagram)
-- ==============================================================================

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

CREATE TRIGGER set_timestamp_online_orders
BEFORE UPDATE ON online_orders
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE TABLE IF NOT EXISTS online_order_items (
    id VARCHAR(100) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    order_id VARCHAR(100) NOT NULL REFERENCES online_orders(id) ON DELETE CASCADE,
    product_id VARCHAR(100) NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    selling_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (selling_price >= 0),
    total NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (total >= 0)
);

-- ==============================================================================
-- 10. RETURNS & EXCHANGES
-- ==============================================================================

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

-- ==============================================================================
-- 11. UPI SETTINGS & UNIFIED TRANSACTIONS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS upi_settings (
    id VARCHAR(50) PRIMARY KEY DEFAULT 'default',
    upi_id VARCHAR(255) NOT NULL,
    payee_name VARCHAR(255) NOT NULL,
    shop_name VARCHAR(255),
    merchant_code VARCHAR(100),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER set_timestamp_upi_settings
BEFORE UPDATE ON upi_settings
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

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

-- ==============================================================================
-- 12. GST COMPLIANCE & INVOICING
-- ==============================================================================

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

CREATE TRIGGER set_timestamp_gst_settings
BEFORE UPDATE ON gst_settings
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

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

-- ==============================================================================
-- 13. PERFORMANCE INDEXES
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_shop ON products(shop);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_employees_shop ON employees(assigned_shop);
CREATE INDEX IF NOT EXISTS idx_suppliers_gstin ON suppliers(gstin);
CREATE INDEX IF NOT EXISTS idx_purchases_supplier ON purchases(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchases_date ON purchases(purchase_date);
CREATE INDEX IF NOT EXISTS idx_purchases_status ON purchases(payment_status);
CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase ON purchase_items(purchase_id);
CREATE INDEX IF NOT EXISTS idx_purchase_items_product ON purchase_items(product_id);
CREATE INDEX IF NOT EXISTS idx_offline_sales_number ON offline_sales(sale_number);
CREATE INDEX IF NOT EXISTS idx_offline_sales_date ON offline_sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_offline_sales_shop ON offline_sales(shop);
CREATE INDEX IF NOT EXISTS idx_offline_sale_items_sale ON offline_sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_offline_sale_items_product ON offline_sale_items(product_id);
CREATE INDEX IF NOT EXISTS idx_online_orders_number ON online_orders(order_number);
CREATE INDEX IF NOT EXISTS idx_online_orders_channel ON online_orders(sales_channel);
CREATE INDEX IF NOT EXISTS idx_online_orders_status ON online_orders(order_status);
CREATE INDEX IF NOT EXISTS idx_online_orders_payment ON online_orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_online_order_items_order ON online_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_returns_sale ON returns(sale_id);
CREATE INDEX IF NOT EXISTS idx_returns_product ON returns(product_id);
CREATE INDEX IF NOT EXISTS idx_upi_tx_reference ON upi_transactions(reference_id);
CREATE INDEX IF NOT EXISTS idx_upi_tx_status ON upi_transactions(status);
CREATE INDEX IF NOT EXISTS idx_upi_tx_created ON upi_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hsn_code ON hsn_directory(hsn_code);
CREATE INDEX IF NOT EXISTS idx_gst_invoices_number ON gst_invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_gst_invoices_date ON gst_invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_gst_invoices_gstin ON gst_invoices(party_gstin);

-- ==============================================================================
-- 14. SUPABASE STORAGE BUCKETS
-- ==============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES
  ('employee-documents', 'employee-documents', true),
  ('purchase-invoices', 'purchase-invoices', true),
  ('product-images', 'product-images', true),
  ('shop-assets', 'shop-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Storage bucket access policies
DROP POLICY IF EXISTS "Public employee-documents access" ON storage.objects;
CREATE POLICY "Public employee-documents access" ON storage.objects
FOR ALL USING (bucket_id = 'employee-documents') WITH CHECK (bucket_id = 'employee-documents');

DROP POLICY IF EXISTS "Public purchase-invoices access" ON storage.objects;
CREATE POLICY "Public purchase-invoices access" ON storage.objects
FOR ALL USING (bucket_id = 'purchase-invoices') WITH CHECK (bucket_id = 'purchase-invoices');

DROP POLICY IF EXISTS "Public product-images access" ON storage.objects;
CREATE POLICY "Public product-images access" ON storage.objects
FOR ALL USING (bucket_id = 'product-images') WITH CHECK (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Public shop-assets access" ON storage.objects;
CREATE POLICY "Public shop-assets access" ON storage.objects
FOR ALL USING (bucket_id = 'shop-assets') WITH CHECK (bucket_id = 'shop-assets');

-- ==============================================================================
-- 15. ROW LEVEL SECURITY (RLS) & ACCESS CONTROL
-- ==============================================================================

ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE offline_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE offline_sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE online_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE online_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE upi_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE upi_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE gst_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE hsn_directory ENABLE ROW LEVEL SECURITY;
ALTER TABLE gst_invoices ENABLE ROW LEVEL SECURITY;

-- Dynamic Policy Grant for all application tables (Allowing anon + authenticated access)
DO $$
DECLARE
    tbl text;
BEGIN
    FOR tbl IN
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name IN (
            'branches', 'employees', 'suppliers', 'products', 'purchases',
            'purchase_items', 'offline_sales', 'offline_sale_items',
            'online_orders', 'online_order_items', 'returns',
            'upi_settings', 'upi_transactions', 'gst_settings',
            'hsn_directory', 'gst_invoices'
          )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "allow_full_access_%I" ON %I;', tbl, tbl);
        EXECUTE format('CREATE POLICY "allow_full_access_%I" ON %I FOR ALL USING (true) WITH CHECK (true);', tbl, tbl);
    END LOOP;
END $$;

-- ==============================================================================
-- 16. INITIAL DEFAULT SEED DATA (Safe Idempotent Inserts)
-- ==============================================================================

-- 16.1 Branches
INSERT INTO branches (id, name, code, shop_identifier, address, city, state_zip, contact_number, manager_name, status, opening_hours, notes, capacity)
VALUES
  ('branch-001', 'Shop 1 - Downtown Flagship', 'BR-01', 'Shop 1', '142 Market Street, Commercial Arcade, Suite 101', 'Downtown Central', 'NY 10001', '+1 (555) 123-4567', 'Marcus Vance', 'Active', '9:00 AM - 9:30 PM (Mon-Sun)', 'Main flagship retail location with maximum in-store foot traffic and inventory distribution hub.', 10),
  ('branch-002', 'Shop 2 - Westside Mall Outlet', 'BR-02', 'Shop 2', '88 West Mall Road, Ground Floor, Unit 12B', 'Westside Shopping Hub', 'CA 90025', '+1 (555) 234-5678', 'Elena Rostova', 'Active', '10:00 AM - 10:00 PM (Mon-Sun)', 'High fashion & accessories retail store situated inside the premier regional shopping mall.', 8),
  ('branch-003', 'Shop 3 - Harbor Bay Terminal', 'BR-03', 'Shop 3', '500 Harbor Boulevard, Dockside Market Plaza', 'Harbor Bay Waterfront', 'WA 98101', '+1 (555) 345-6789', 'David Chen', 'Active', '9:30 AM - 8:30 PM (Mon-Sat)', 'Lifestyle and daily apparel retail branch catering to transit, commuters, and tourist footfall.', 6)
ON CONFLICT (id) DO NOTHING;

-- 16.2 GST Settings
INSERT INTO gst_settings (id, gstin, legal_name, trade_name, state_name, state_code, tax_scheme, default_hsn, default_gst_rate, filing_frequency, enable_e_invoicing, contact_email, contact_phone)
VALUES
  ('default', '27AAPCP9876M1Z8', 'Pasara Retail Operations Pvt. Ltd.', 'Pasara Multi-Store Retail', 'Maharashtra', '27', 'Regular', '6109', 12.00, 'Monthly', true, 'compliance@pasara.store', '+91 98201 12345')
ON CONFLICT (id) DO UPDATE SET
  gstin = EXCLUDED.gstin,
  legal_name = EXCLUDED.legal_name,
  trade_name = EXCLUDED.trade_name,
  state_name = EXCLUDED.state_name,
  state_code = EXCLUDED.state_code;

-- 16.3 HSN Directory
INSERT INTO hsn_directory (id, hsn_code, description, category, gst_rate, cgst_rate, sgst_rate, igst_rate)
VALUES
  ('hsn-01', '6109', 'T-shirts, singlets and other vests, knitted or crocheted of cotton', 'Apparel', 12.00, 6.00, 6.00, 12.00),
  ('hsn-02', '6203', 'Men''s or boys'' suits, jackets, blazers, trousers and shorts', 'Apparel', 12.00, 6.00, 6.00, 12.00),
  ('hsn-03', '6204', 'Women''s or girls'' suits, jackets, dresses, skirts and trousers', 'Apparel', 12.00, 6.00, 6.00, 12.00),
  ('hsn-04', '6403', 'Footwear with outer soles of rubber/leather and uppers of leather', 'Footwear', 18.00, 9.00, 9.00, 18.00),
  ('hsn-05', '4202', 'Trunks, suit-cases, executive-cases, brief-cases and leather bags', 'Accessories', 18.00, 9.00, 9.00, 18.00),
  ('hsn-06', '7117', 'Imitation jewellery, cufflinks, tie-pins, and wrist ornaments', 'Accessories', 18.00, 9.00, 9.00, 18.00)
ON CONFLICT (id) DO NOTHING;

-- 16.4 UPI Settings
INSERT INTO upi_settings (id, upi_id, payee_name, shop_name, merchant_code)
VALUES
  ('default', 'pasara@okhdfcbank', 'Pasara Retail Management', 'Pasara Stores Flagship', '5311')
ON CONFLICT (id) DO UPDATE SET
  upi_id = EXCLUDED.upi_id,
  payee_name = EXCLUDED.payee_name;

-- 16.5 Suppliers
INSERT INTO suppliers (id, name, legal_name, trade_name, gstin, gst_status, taxpayer_type, gst_verified, state_code, state_name, city, pincode, registration_date, contact_number, address, notes)
VALUES
  ('sup-101', 'Apex Apparel & Textiles Co.', 'Apex Apparel Private Limited', 'Apex Apparel & Textiles Co.', '27AABCA1234D1ZM', 'Active', 'Regular', true, '27', 'Maharashtra', 'Mumbai', '400013', '2018-04-12', '+91 98201 23456', '142 Industrial Ave, Suite 300, Lower Parel, Mumbai, Maharashtra - 400013', 'Primary supplier for cotton t-shirts, jeans, and hoodies. Payment terms: Net 15.'),
  ('sup-102', 'Ujjivan Small Finance Bank', 'Ujjivan Small Finance Bank Limited', 'Ujjivan Small Finance Bank Limited', '29AABCU9603R1ZJ', 'Active', 'Regular', true, '29', 'Karnataka', 'Bengaluru', '560095', '2017-06-29', '+91 80 4055 2000', 'Grape Garden, No. 27, 3rd A Cross, 18th Main, 6th Block, Koramangala, Bengaluru, Karnataka - 560095', 'Financial banking services & merchant vendor verified partner.'),
  ('sup-103', 'Urban Footwear Labs', 'Urban Footwear LLP', 'Urban Footwear Labs', '27AABFU7788P1ZZ', 'Active', 'Regular', true, '27', 'Maharashtra', 'Pune', '411028', '2020-09-15', '+91 98900 77889', '77 Magarpatta Cybercity, Tower 4, Hadapsar, Pune, Maharashtra - 411028', 'Footwear and athletic sneaker partner. Verified GST active.')
ON CONFLICT (id) DO NOTHING;

-- 16.6 Products
INSERT INTO products (id, name, sku, category, purchase_price, selling_price, current_stock, minimum_stock, shop)
VALUES
  ('prod-001', 'Classic Cotton Crewneck T-Shirt (Black, M)', 'TSH-CTN-BLK-M', 'T-Shirts', 280.00, 699.00, 48, 10, 'Shop 1'),
  ('prod-002', 'Classic Cotton Crewneck T-Shirt (White, L)', 'TSH-CTN-WHT-L', 'T-Shirts', 280.00, 699.00, 14, 10, 'Shop 1'),
  ('prod-003', 'Slim Fit Raw Indigo Denim Jeans (32)', 'JNS-RAW-IND-32', 'Jeans', 750.00, 1899.00, 6, 8, 'Shop 1'),
  ('prod-004', 'Heavyweight Oversized Fleece Hoodie (Grey, L)', 'HOD-FLC-GRY-L', 'Hoodies', 620.00, 1599.00, 0, 5, 'Shop 1'),
  ('prod-005', 'Breathable Performance Mesh Polo (Navy, M)', 'POL-MSH-NVY-M', 'Polos', 390.00, 999.00, 32, 10, 'Shop 2'),
  ('prod-006', 'Urban Streetwear Cargo Pants (Olive, 34)', 'CRG-PNT-OLV-34', 'Pants', 680.00, 1749.00, 18, 8, 'Shop 2'),
  ('prod-007', 'Full-Grain Leather Everyday Belt (Brown)', 'ACC-BLT-BRN-01', 'Accessories', 210.00, 599.00, 25, 6, 'Shop 3')
ON CONFLICT (id) DO NOTHING;

-- 16.7 Employees
INSERT INTO employees (id, name, age, contact_number, date_of_joining, assigned_shop, address_proof_filename)
VALUES
  ('emp-001', 'Alex Rivera', 28, '+1 (555) 234-8901', '2023-03-15', 'Shop 1', 'alex_rivera_id_proof.pdf'),
  ('emp-002', 'Priya Sharma', 24, '+1 (555) 345-6712', '2023-07-01', 'Shop 1', 'priya_sharma_passport.pdf'),
  ('emp-003', 'Jordan Hayes', 31, '+1 (555) 456-7823', '2022-11-10', 'Shop 2', 'jordan_hayes_license.pdf')
ON CONFLICT (id) DO NOTHING;

-- 16.8 Purchases & Line Items
INSERT INTO purchases (id, supplier_id, invoice_number, purchase_date, total_amount, paid_amount, pending_amount, payment_mode, payment_status, invoice_url, invoice_filename)
VALUES
  ('pur-001', 'sup-101', 'INV-APX-8821', CURRENT_DATE - 1, 1450.00, 1000.00, 450.00, 'Bank Transfer', 'Partially Paid', 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80', 'invoice_apx_8821.pdf'),
  ('pur-002', 'sup-102', 'INV-MFD-4412', CURRENT_DATE, 875.00, 875.00, 0.00, 'UPI', 'Paid', 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80', 'invoice_mfd_4412.pdf')
ON CONFLICT (id) DO NOTHING;

INSERT INTO purchase_items (id, purchase_id, product_id, quantity, purchase_price, total)
VALUES
  ('pi-1', 'pur-001', 'prod-001', 50, 18.00, 900.00),
  ('pi-2', 'pur-001', 'prod-007', 50, 11.00, 550.00),
  ('pi-3', 'pur-002', 'prod-004', 25, 35.00, 875.00)
ON CONFLICT (id) DO NOTHING;

-- 16.9 Offline POS Sales & Items
INSERT INTO offline_sales (id, sale_number, shop, customer_name, customer_phone, discount, total_amount, payment_method, sale_date, status)
VALUES
  ('sale-001', 'OFF-2026-0001', 'Shop 1', 'Sarah Jenkins', '+1 (555) 678-1122', 5.00, 83.00, 'Card', CURRENT_DATE, 'Completed'),
  ('sale-002', 'OFF-2026-0002', 'Shop 2', 'Liam Miller', '+1 (555) 789-2233', 0.00, 79.00, 'UPI', CURRENT_DATE, 'Completed')
ON CONFLICT (id) DO NOTHING;

INSERT INTO offline_sale_items (id, sale_id, product_id, quantity, selling_price, total)
VALUES
  ('osi-1', 'sale-001', 'prod-001', 1, 36.00, 36.00),
  ('osi-2', 'sale-001', 'prod-002', 1, 52.00, 52.00),
  ('osi-3', 'sale-002', 'prod-004', 1, 79.00, 79.00)
ON CONFLICT (id) DO NOTHING;

-- 16.10 Online Orders & Items
INSERT INTO online_orders (id, order_number, sales_channel, customer_name, customer_phone, customer_address, total_amount, payment_status, order_status, order_date)
VALUES
  ('ord-001', 'ONL-2026-0001', 'WhatsApp', 'Maya Lin', '+1 (555) 890-3344', '42 Pine St, Apt 3B, New York, NY 10001', 98.00, 'Paid', 'Processing', CURRENT_DATE),
  ('ord-002', 'ONL-2026-0002', 'Instagram', 'Carlos Ruiz', '+1 (555) 901-4455', '788 Maple Boulevard, Austin, TX 78701', 56.00, 'Pending', 'New', CURRENT_DATE),
  ('ord-003', 'ONL-2026-0003', 'Instagram', 'Chloe Bennett', '+1 (555) 912-5566', '120 Sunset Strip, Los Angeles, CA 90028', 34.00, 'Paid', 'Delivered', CURRENT_DATE - 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO online_order_items (id, order_id, product_id, quantity, selling_price, total)
VALUES
  ('ooi-1', 'ord-001', 'prod-003', 2, 49.00, 98.00),
  ('ooi-2', 'ord-002', 'prod-005', 2, 28.00, 56.00),
  ('ooi-3', 'ord-003', 'prod-006', 1, 34.00, 34.00)
ON CONFLICT (id) DO NOTHING;

-- 16.11 UPI Transactions
INSERT INTO upi_transactions (id, reference_id, amount, customer_name, customer_phone, delivery_address, note, status, upi_id, payee_name, channel, linked_order_number)
VALUES
  ('upi-tx-001', 'UPI-2026-0001', 1450.00, 'Rahul Sharma', '+91 98765 43210', '42 Pine St, Apt 3B, New York, NY 10001', 'Cotton Shirt & Denim Jeans', 'Paid', 'pasara@okhdfcbank', 'Pasara Retail Store', 'WhatsApp', 'ONL-2026-0001'),
  ('upi-tx-002', 'UPI-2026-0002', 499.00, 'Priya Patel', '+91 98111 22334', NULL, 'Leather Wallet', 'Paid', 'pasara@okhdfcbank', 'Pasara Retail Store', 'Instagram', 'ONL-2026-0003'),
  ('upi-tx-003', 'UPI-2026-0003', 850.00, 'Anil Kumar', '+91 98222 33445', NULL, 'Runner Sneakers', 'Not Paid', 'pasara@okhdfcbank', 'Pasara Retail Store', 'Counter', NULL)
ON CONFLICT (id) DO NOTHING;

-- 16.12 GST Invoices
INSERT INTO gst_invoices (id, invoice_number, invoice_date, type, party_name, party_gstin, place_of_supply, is_inter_state, hsn_code, taxable_value, gst_rate, cgst_amount, sgst_amount, igst_amount, total_tax, total_invoice_amount, payment_status, branch)
VALUES
  ('gst-inv-001', 'INV-2026-0891', CURRENT_DATE - 2, 'B2C (Retail In-Store)', 'Walk-in Retail Customer', NULL, '27-Maharashtra (Intra-State)', false, '6109', 3200.00, 12.00, 192.00, 192.00, 0.00, 384.00, 3584.00, 'Paid', 'Shop 1'),
  ('gst-inv-002', 'INV-2026-0892', CURRENT_DATE - 1, 'B2B (Tax Invoice)', 'Metro Corporate Uniforms Ltd', '27AABCM4567P1Z2', '27-Maharashtra (Intra-State)', false, '6203', 18500.00, 12.00, 1110.00, 1110.00, 0.00, 2220.00, 20720.00, 'Paid', 'Shop 1'),
  ('gst-inv-003', 'INV-2026-0893', CURRENT_DATE, 'B2C (Online Order)', 'Pooja Sharma (Bengaluru)', NULL, '29-Karnataka (Inter-State IGST)', true, '4202', 4500.00, 18.00, 0.00, 0.00, 810.00, 810.00, 5310.00, 'Paid', 'Shop 2'),
  ('gst-inv-004', 'BILL-SUP-4491', CURRENT_DATE - 5, 'Inward (Supplier Purchase)', 'Apex Apparel & Textiles Co.', '27AAECF5512B1Z6', '27-Maharashtra (Intra-State)', false, '6109', 28000.00, 12.00, 1680.00, 1680.00, 0.00, 3360.00, 31360.00, 'Paid', 'Shop 1'),
  ('gst-inv-005', 'BILL-SUP-4492', CURRENT_DATE - 3, 'Inward (Supplier Purchase)', 'Urban Footwear Labs', '27AABFU7788P1ZZ', '27-Maharashtra (Intra-State)', false, '6403', 16000.00, 18.00, 1440.00, 1440.00, 0.00, 2880.00, 18880.00, 'Paid', 'Shop 2')
ON CONFLICT (id) DO NOTHING;
