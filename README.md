<div align="center">
  <img width="180" height="180" alt="Pasara Logo" src="public/pasara.jpeg" style="border-radius: 24px; box-shadow: 0 10px 25px rgba(16,185,129,0.25);" />
  <h1>Pasara Management - Enterprise Multi-Branch Retail Suite</h1>
  <p>Production-Ready Inventory Control, Multi-Branch POS, GST Compliance, Online Orders & Unified UPI Payments</p>
</div>

---

## 🌟 Highlights & Capabilities

- **Brand Asset Integration**: Built-in crisp branding powered by the high-resolution logo from `assert/pasara.jpeg` displayed across the splash screen, navigation header, sidebar, and web icons.
- **Supabase Cloud Database & Storage**: Fully connected PostgreSQL schema covering **16 relational tables**, performance indexes, automatic `updated_at` triggers, and Row Level Security (RLS) policies.
- **Multi-Branch Operations**: Coordinate inventory and employees across multiple retail locations (`Shop 1`, `Shop 2`, `Shop 3`).
- **GST Verification & Tax Engine**: Supplier GSTIN lookup, state-aware CGST/SGST/IGST tax calculation, HSN code directory, and B2B/B2C invoice logs.
- **Dynamic UPI Payment Gateway**: Direct UPI QR code generation, WhatsApp/Instagram payment links, and auto-settlement reconciliation.
- **Resilient Fallback Mode**: Works seamlessly offline with local browser cache when Supabase is not connected.

---

## 🚀 Supabase PostgreSQL Database Setup

### Step 1: Create a Supabase Project
1. Log in to [Supabase](https://supabase.com).
2. Create a new project (e.g., `pasara-retail`).
3. Note your **Project URL** and **anon public API Key** under **Project Settings > API**.

### Step 2: Run the Production Schema Script
1. Navigate to your Supabase project's **SQL Editor**.
2. Click **New Query**.
3. Open [`supabase/schema.sql`](supabase/schema.sql) in this repository and paste the entire script into the SQL editor.
4. Click **Run**.
5. This script:
   - Provisions all **16 tables**: `branches`, `employees`, `suppliers`, `products`, `purchases`, `purchase_items`, `offline_sales`, `offline_sale_items`, `online_orders`, `online_order_items`, `returns`, `upi_settings`, `upi_transactions`, `gst_settings`, `hsn_directory`, and `gst_invoices`.
   - Creates storage buckets: `employee-documents`, `purchase-invoices`, `product-images`, and `shop-assets`.
   - Configures optimized performance indexes and Row Level Security (RLS) policies.
   - Inserts initial seed data for branches, GST settings, HSN catalog, products, and suppliers.

### Step 3: Configure Environment Variables
Copy `.env.example` to `.env` (or configure in the in-app Supabase Setup modal):

```env
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_ANON_KEY="your-anon-public-key"
```

You can also click the **Database** button in the app header at any time to enter and test your Supabase credentials directly with one-click verification.

---

## 🛠️ Local Development

```bash
# 1. Install dependencies
npm install --legacy-peer-deps

# 2. Start the development server
npm run dev

# 3. Build for production
npm run build

# 4. Preview production build
npm run preview
```

---

## 🔒 Security Best Practices

1. **Row Level Security (RLS)**: RLS is enabled on all tables in `supabase/schema.sql` to control anonymous and authenticated operations.
2. **Key Hygiene**: Use the public `anon` key on the client. Never expose the Supabase `service_role` secret key in frontend code or environment variables.
3. **Storage Isolation**: Dedicated storage buckets (`employee-documents`, `purchase-invoices`) are provisioned with policy constraints.
