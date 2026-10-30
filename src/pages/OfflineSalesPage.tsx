import React, { useState, useEffect } from 'react';
import {
  Store,
  Plus,
  Search,
  ShoppingCart,
  Receipt,
  RotateCcw,
  ArrowRightLeft,
  Trash2,
  Calendar,
  CheckCircle,
  Eye,
  Percent,
} from 'lucide-react';
import {
  OfflineSale,
  Product,
  ShopId,
  SHOPS,
  OfflinePaymentMethod,
  ReturnRecord,
} from '../types';
import {
  getOfflineSales,
  createOfflineSale,
  deleteOfflineSale,
  getProducts,
  createReturnRecord,
  getReturns,
} from '../lib/dataService';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

const PAYMENT_METHODS: OfflinePaymentMethod[] = ['Cash', 'UPI', 'Card'];

export const OfflineSalesPage: React.FC = () => {
  const [sales, setSales] = useState<OfflineSale[]>([]);
  const [returns, setReturns] = useState<ReturnRecord[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [shopFilter, setShopFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'sales' | 'returns'>('sales');

  // New Sale Modal State
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
  const [saleForm, setSaleForm] = useState({
    shop: 'Shop 1' as ShopId,
    customer_name: '',
    customer_phone: '',
    discount: 0,
    payment_method: 'Cash' as OfflinePaymentMethod,
    sale_date: new Date().toISOString().split('T')[0],
    items: [
      {
        product_id: '',
        quantity: 1,
        selling_price: 0,
        total: 0,
      },
    ],
  });
  const [saleError, setSaleError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Return / Exchange Modal State
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [returnType, setReturnType] = useState<'Return' | 'Exchange'>('Return');
  const [returnForm, setReturnForm] = useState({
    sale_id: '',
    product_id: '',
    replacement_product_id: '',
    quantity: 1,
    reason: '',
  });
  const [returnError, setReturnError] = useState('');

  // Receipt / View Sale Modal
  const [viewSaleTarget, setViewSaleTarget] = useState<OfflineSale | null>(null);

  // Delete Sale Confirmation
  const [deleteTargetSale, setDeleteTargetSale] = useState<OfflineSale | null>(null);

  const loadAll = async () => {
    setLoading(true);
    const [salesData, prodData, returnData] = await Promise.all([
      getOfflineSales(),
      getProducts(),
      getReturns(),
    ]);
    setSales(salesData);
    setProducts(prodData);
    setReturns(returnData);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const openNewSale = () => {
    const defaultShopProducts = products.filter((p) => p.shop === 'Shop 1');
    const firstProd = defaultShopProducts[0] || products[0];

    setSaleForm({
      shop: 'Shop 1',
      customer_name: '',
      customer_phone: '',
      discount: 0,
      payment_method: 'Cash',
      sale_date: new Date().toISOString().split('T')[0],
      items: [
        {
          product_id: firstProd?.id || '',
          quantity: 1,
          selling_price: firstProd?.selling_price || 0,
          total: firstProd?.selling_price || 0,
        },
      ],
    });
    setSaleError('');
    setIsSaleModalOpen(true);
  };

  const handleShopChange = (newShop: ShopId) => {
    // When shop changes, update available product selection
    const shopProds = products.filter((p) => p.shop === newShop);
    const firstProd = shopProds[0] || products[0];

    setSaleForm((prev) => ({
      ...prev,
      shop: newShop,
      items: [
        {
          product_id: firstProd?.id || '',
          quantity: 1,
          selling_price: firstProd?.selling_price || 0,
          total: firstProd?.selling_price || 0,
        },
      ],
    }));
  };

  const handleItemChange = (idx: number, field: string, val: any) => {
    const updated = [...saleForm.items];
    const row = { ...updated[idx], [field]: val };

    if (field === 'product_id') {
      const p = products.find((prod) => prod.id === val);
      if (p) {
        row.selling_price = p.selling_price;
        row.total = row.selling_price * row.quantity;
      }
    } else if (field === 'quantity') {
      row.quantity = Math.max(1, Number(val));
      row.total = row.selling_price * row.quantity;
    }

    updated[idx] = row;
    setSaleForm((prev) => ({ ...prev, items: updated }));
  };

  const addSaleItemRow = () => {
    const shopProds = products.filter((p) => p.shop === saleForm.shop);
    const prod = shopProds[0] || products[0];
    setSaleForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          product_id: prod?.id || '',
          quantity: 1,
          selling_price: prod?.selling_price || 0,
          total: prod?.selling_price || 0,
        },
      ],
    }));
  };

  const removeSaleItemRow = (idx: number) => {
    if (saleForm.items.length <= 1) return;
    setSaleForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== idx),
    }));
  };

  // Pricing calculations
  const rawSubtotal = saleForm.items.reduce((s, it) => s + (Number(it.total) || 0), 0);
  const discountAmount = Number(saleForm.discount) || 0;
  const netTotal = Math.max(0, rawSubtotal - discountAmount);

  const handleCompleteSale = async () => {
    if (!saleForm.customer_name.trim()) {
      setSaleError('Customer name is required.');
      return;
    }
    if (!saleForm.customer_phone.trim()) {
      setSaleError('Customer phone is required.');
      return;
    }
    if (saleForm.items.length === 0) {
      setSaleError('Please add at least one product.');
      return;
    }

    // Check stock availability
    for (const it of saleForm.items) {
      const p = products.find((prod) => prod.id === it.product_id);
      if (p && p.current_stock < it.quantity) {
        setSaleError(
          `Insufficient stock for "${p.name}". Available: ${p.current_stock}, Requested: ${it.quantity}`
        );
        return;
      }
    }

    try {
      setSubmitting(true);
      await createOfflineSale({
        shop: saleForm.shop,
        customer_name: saleForm.customer_name.trim(),
        customer_phone: saleForm.customer_phone.trim(),
        discount: discountAmount,
        total_amount: netTotal,
        payment_method: saleForm.payment_method,
        sale_date: saleForm.sale_date,
        status: 'Completed',
        items: saleForm.items.map((it) => {
          const prod = products.find((p) => p.id === it.product_id);
          return {
            product_id: it.product_id,
            product_name: prod?.name || 'Item',
            quantity: it.quantity,
            selling_price: it.selling_price,
            total: it.total,
          };
        }),
      });

      setIsSaleModalOpen(false);
      await loadAll();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to record sale.';
      setSaleError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Return / Exchange Handlers
  const openReturnModal = () => {
    const firstSale = sales[0];
    const firstItem = firstSale?.items[0];

    setReturnType('Return');
    setReturnForm({
      sale_id: firstSale?.sale_number || '',
      product_id: firstItem?.product_id || '',
      replacement_product_id: products[0]?.id || '',
      quantity: 1,
      reason: 'Defective piece / wrong size',
    });
    setReturnError('');
    setIsReturnModalOpen(true);
  };

  const handleProcessReturn = async () => {
    if (!returnForm.sale_id) {
      setReturnError('Please select a previous sale.');
      return;
    }
    if (!returnForm.product_id) {
      setReturnError('Please select the returned product.');
      return;
    }
    if (returnType === 'Exchange' && !returnForm.replacement_product_id) {
      setReturnError('Please select replacement product for exchange.');
      return;
    }
    if (!returnForm.reason.trim()) {
      setReturnError('Please state the reason for return/exchange.');
      return;
    }

    try {
      setSubmitting(true);
      const prod = products.find((p) => p.id === returnForm.product_id);
      const repProd = products.find((p) => p.id === returnForm.replacement_product_id);

      await createReturnRecord({
        sale_id: returnForm.sale_id,
        sale_type: 'offline',
        product_id: returnForm.product_id,
        product_name: prod?.name,
        replacement_product_id:
          returnType === 'Exchange' ? returnForm.replacement_product_id : undefined,
        replacement_product_name: returnType === 'Exchange' ? repProd?.name : undefined,
        quantity: Number(returnForm.quantity),
        return_type: returnType,
        reason: returnForm.reason.trim(),
      });

      setIsReturnModalOpen(false);
      await loadAll();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to record return.';
      setReturnError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredSales = sales.filter((s) => {
    const q = search.toLowerCase();
    const matchesSearch =
      s.sale_number.toLowerCase().includes(q) ||
      s.customer_name.toLowerCase().includes(q) ||
      s.customer_phone.includes(q);
    const matchesShop = shopFilter === 'all' || s.shop === shopFilter;
    return matchesSearch && matchesShop;
  });

  return (
    <div className="space-y-6">
      {/* Action / Navigation Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white/80 backdrop-blur-xl p-4 rounded-2xl border border-white/80 shadow-xs">
        <div className="flex items-center gap-2 border-b sm:border-b-0 pb-2 sm:pb-0">
          <button
            type="button"
            onClick={() => setActiveTab('sales')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'sales'
                ? 'bg-emerald-600 text-white shadow-xs font-bold'
                : 'text-emerald-900/80 hover:text-emerald-950 hover:bg-emerald-100/60'
            }`}
          >
            Offline In-Store Sales ({sales.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('returns')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'returns'
                ? 'bg-emerald-600 text-white shadow-xs font-bold'
                : 'text-emerald-900/80 hover:text-emerald-950 hover:bg-emerald-100/60'
            }`}
          >
            Returns & Exchanges ({returns.length})
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-600" />
            <input
              type="text"
              placeholder="Search sale # or customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-white/90 border border-emerald-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-emerald-950"
            />
          </div>

          <select
            value={shopFilter}
            onChange={(e) => setShopFilter(e.target.value)}
            className="text-xs bg-white/90 border border-emerald-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-emerald-500 text-emerald-950 font-medium"
          >
            <option value="all">All Shops</option>
            {SHOPS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          {activeTab === 'sales' ? (
            <button
              type="button"
              onClick={openNewSale}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs shadow-emerald-600/20 transition-colors shrink-0"
            >
              <Plus className="w-4 h-4" />
              New Offline Sale
            </button>
          ) : (
            <button
              type="button"
              onClick={openReturnModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs shadow-emerald-600/20 transition-colors shrink-0"
            >
              <RotateCcw className="w-4 h-4" />
              Record Return / Exchange
            </button>
          )}
        </div>
      </div>

      {/* SALES TAB */}
      {activeTab === 'sales' && (
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/85 shadow-lg shadow-emerald-950/5 overflow-hidden">
          {loading ? (
            <div className="py-16 text-center text-sm text-emerald-800/60">Loading sales records...</div>
          ) : filteredSales.length === 0 ? (
            <EmptyState
              icon={Store}
              title="No offline sales recorded"
              description="Record walk-in physical customer sales to automatically reduce stock."
              actionLabel="Record Sale"
              onAction={openNewSale}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-emerald-50/70 border-b border-emerald-100 text-xs font-bold text-emerald-950 uppercase tracking-wider">
                    <th className="py-3 px-4">Sale / Order #</th>
                    <th className="py-3 px-4">Shop</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4 text-center">Items Qty</th>
                    <th className="py-3 px-4 text-right">Discount</th>
                    <th className="py-3 px-4 text-right">Total Amount</th>
                    <th className="py-3 px-4">Payment</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-100/60 text-emerald-950">
                  {filteredSales.map((s) => {
                    const totalQty = s.items?.reduce((tot, it) => tot + it.quantity, 0) || 0;
                    return (
                      <tr key={s.id} className="hover:bg-emerald-50/40 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-emerald-950">
                          {s.sale_number}
                        </td>
                        <td className="py-3.5 px-4">
                          <StatusBadge status={s.shop} size="sm" />
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-semibold text-emerald-950 block">
                            {s.customer_name}
                          </span>
                          <span className="text-emerald-800/60 font-mono text-xs">
                            {s.customer_phone}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-xs text-emerald-800/80">{s.sale_date}</td>
                        <td className="py-3.5 px-4 text-center font-extrabold text-emerald-950">
                          {totalQty}
                        </td>
                        <td className="py-3.5 px-4 text-right text-xs text-rose-600 font-medium">
                          {s.discount > 0 ? `-$${Number(s.discount).toFixed(2)}` : '—'}
                        </td>
                        <td className="py-3.5 px-4 text-right font-extrabold text-emerald-950">
                          ${Number(s.total_amount).toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 text-xs">
                          <span className="font-semibold bg-emerald-100/70 border border-emerald-200/70 px-2 py-0.5 rounded-lg text-emerald-900">
                            {s.payment_method}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <StatusBadge status={s.status} size="sm" />
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setViewSaleTarget(s)}
                              className="inline-flex items-center gap-1 text-xs text-emerald-700 hover:text-emerald-950 font-semibold bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200 transition-colors"
                            >
                              <Receipt className="w-3.5 h-3.5" />
                              <span>View Bill</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTargetSale(s)}
                              title="Delete Sale Record"
                              className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* RETURNS & EXCHANGES TAB */}
      {activeTab === 'returns' && (
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/85 shadow-lg shadow-emerald-950/5 overflow-hidden">
          {returns.length === 0 ? (
            <EmptyState
              icon={RotateCcw}
              title="No returns or exchanges recorded"
              description="Record product returns (restores inventory) or exchanges (adjusts return and replacement stock)."
              actionLabel="Record Return / Exchange"
              onAction={openReturnModal}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-emerald-50/70 border-b border-emerald-100 text-xs font-bold text-emerald-950 uppercase tracking-wider">
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Reference Sale #</th>
                    <th className="py-3 px-4">Returned Product</th>
                    <th className="py-3 px-4 text-center">Qty Returned</th>
                    <th className="py-3 px-4">Replacement Product</th>
                    <th className="py-3 px-4">Reason</th>
                    <th className="py-3 px-4">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-100/60 text-emerald-950">
                  {returns.map((r) => (
                    <tr key={r.id} className="hover:bg-emerald-50/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <StatusBadge status={r.return_type} size="sm" />
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-950">
                        {r.sale_id}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-emerald-950">
                        {r.product_name || 'Product'}
                      </td>
                      <td className="py-3.5 px-4 text-center font-extrabold text-emerald-700">
                        +{r.quantity}
                      </td>
                      <td className="py-3.5 px-4">
                        {r.return_type === 'Exchange' ? (
                          <span className="text-xs font-semibold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-lg border border-emerald-200">
                            {r.replacement_product_name || 'Replacement Product'}
                          </span>
                        ) : (
                          <span className="text-emerald-800/40 text-xs italic">N/A (Refund/Return)</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-emerald-900/80 max-w-xs truncate">
                        {r.reason}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-emerald-800/60">
                        {new Date(r.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Record Physical Offline Sale Modal */}
      <Modal
        isOpen={isSaleModalOpen}
        onClose={() => setIsSaleModalOpen(false)}
        title="Record In-Store Offline Sale"
        subtitle="Stock automatically decreases when the sale is recorded"
        maxWidth="2xl"
      >
        <div className="space-y-4 text-sm">
          {saleError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
              {saleError}
            </div>
          )}

          {/* Shop & Customer Info */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Shop Location *
              </label>
              <select
                value={saleForm.shop}
                onChange={(e) => handleShopChange(e.target.value as ShopId)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-indigo-500"
              >
                {SHOPS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Customer Name *
              </label>
              <input
                type="text"
                required
                value={saleForm.customer_name}
                onChange={(e) => setSaleForm({ ...saleForm, customer_name: e.target.value })}
                placeholder="e.g. Sarah Jenkins"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Customer Contact # *
              </label>
              <input
                type="tel"
                required
                value={saleForm.customer_phone}
                onChange={(e) => setSaleForm({ ...saleForm, customer_phone: e.target.value })}
                placeholder="+1 (555) 000-0000"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 font-mono"
              />
            </div>
          </div>

          {/* Products in the sale */}
          <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/70 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Cart Items (from {saleForm.shop})
              </span>
              <button
                type="button"
                onClick={addSaleItemRow}
                className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
              >
                <Plus className="w-3.5 h-3.5" /> Add Another Item
              </button>
            </div>

            <div className="space-y-2 mt-2">
              {saleForm.items.map((row, idx) => {
                const prod = products.find((p) => p.id === row.product_id);
                return (
                  <div
                    key={idx}
                    className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200 text-xs"
                  >
                    <div className="flex-1">
                      <select
                        value={row.product_id}
                        onChange={(e) => handleItemChange(idx, 'product_id', e.target.value)}
                        className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded font-medium"
                      >
                        <option value="">Select Product</option>
                        {products
                          .filter((p) => p.shop === saleForm.shop)
                          .map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} (Stock: {p.current_stock}) - ${Number(p.selling_price).toFixed(2)}
                            </option>
                          ))}
                      </select>
                      {prod && (
                        <span className="text-2xs text-slate-400 block mt-0.5">
                          In stock: {prod.current_stock} units
                        </span>
                      )}
                    </div>

                    <div className="w-20">
                      <input
                        type="number"
                        min={1}
                        max={prod ? prod.current_stock : 999}
                        value={row.quantity}
                        onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                        placeholder="Qty"
                        className="w-full p-1.5 border border-slate-200 rounded text-center"
                      />
                    </div>

                    <div className="w-24 text-right font-medium text-slate-700">
                      ${Number(row.selling_price).toFixed(2)}
                    </div>

                    <div className="w-24 text-right font-bold text-slate-900">
                      ${Number(row.total).toFixed(2)}
                    </div>

                    <button
                      type="button"
                      onClick={() => removeSaleItemRow(idx)}
                      disabled={saleForm.items.length <= 1}
                      className="p-1 text-slate-400 hover:text-rose-600 disabled:opacity-30"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Calculations Breakdown */}
            <div className="pt-2 border-t border-slate-200/80 flex flex-col items-end gap-1 text-xs">
              <div className="flex justify-between w-48 text-slate-600">
                <span>Subtotal:</span>
                <span>${rawSubtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between w-48 text-slate-600 items-center">
                <span>Discount ($):</span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={saleForm.discount}
                  onChange={(e) =>
                    setSaleForm({ ...saleForm, discount: Number(e.target.value) })
                  }
                  className="w-20 p-1 border border-slate-300 rounded text-right text-xs"
                />
              </div>
              <div className="flex justify-between w-48 text-base font-bold text-slate-900 pt-1 border-t border-slate-200">
                <span>Total Amount:</span>
                <span>${netTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Payment Method & Date */}
          <div className="grid grid-cols-2 gap-4 pt-1">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Payment Method *
              </label>
              <select
                value={saleForm.payment_method}
                onChange={(e) =>
                  setSaleForm({
                    ...saleForm,
                    payment_method: e.target.value as OfflinePaymentMethod,
                  })
                }
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Sale Date *</label>
              <input
                type="date"
                required
                value={saleForm.sale_date}
                onChange={(e) => setSaleForm({ ...saleForm, sale_date: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-emerald-100">
            <button
              type="button"
              onClick={() => setIsSaleModalOpen(false)}
              className="px-4 py-2 text-sm text-emerald-900 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={handleCompleteSale}
              className="px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs shadow-emerald-600/20 transition-colors"
            >
              {submitting ? 'Recording...' : 'Complete Sale & Reduce Stock'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Return / Exchange Modal */}
      <Modal
        isOpen={isReturnModalOpen}
        onClose={() => setIsReturnModalOpen(false)}
        title="Record Return or Exchange"
        subtitle="Stock levels will be automatically synchronized"
        maxWidth="lg"
      >
        <div className="space-y-4 text-sm">
          {returnError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
              {returnError}
            </div>
          )}

          {/* Toggle Type */}
          <div className="flex p-1 bg-emerald-50/70 border border-emerald-100 rounded-xl">
            <button
              type="button"
              onClick={() => setReturnType('Return')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                returnType === 'Return'
                  ? 'bg-emerald-600 text-white shadow-xs font-bold'
                  : 'text-emerald-900/80 hover:text-emerald-950'
              }`}
            >
              Return (Restores Product Stock)
            </button>
            <button
              type="button"
              onClick={() => setReturnType('Exchange')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                returnType === 'Exchange'
                  ? 'bg-emerald-600 text-white shadow-xs font-bold'
                  : 'text-emerald-900/80 hover:text-emerald-950'
              }`}
            >
              Exchange (Return item & Swap with replacement)
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Previous Sale *
            </label>
            <select
              value={returnForm.sale_id}
              onChange={(e) => setReturnForm({ ...returnForm, sale_id: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            >
              <option value="">Select Sale</option>
              {sales.map((s) => (
                <option key={s.id} value={s.sale_number}>
                  {s.sale_number} - {s.customer_name} ({s.shop}) - ${Number(s.total_amount).toFixed(2)}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Returned Product *
              </label>
              <select
                value={returnForm.product_id}
                onChange={(e) => setReturnForm({ ...returnForm, product_id: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              >
                <option value="">Select Product</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Quantity Returned *
              </label>
              <input
                type="number"
                min={1}
                value={returnForm.quantity}
                onChange={(e) =>
                  setReturnForm({ ...returnForm, quantity: Math.max(1, Number(e.target.value)) })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>
          </div>

          {returnType === 'Exchange' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Replacement Product (Given to customer) *
              </label>
              <select
                value={returnForm.replacement_product_id}
                onChange={(e) =>
                  setReturnForm({ ...returnForm, replacement_product_id: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              >
                <option value="">Select Replacement</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (Stock: {p.current_stock})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Reason for Return / Exchange *
            </label>
            <input
              type="text"
              required
              value={returnForm.reason}
              onChange={(e) => setReturnForm({ ...returnForm, reason: e.target.value })}
              placeholder="e.g. Size mismatch, defective stitching, customer preference"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-emerald-100">
            <button
              type="button"
              onClick={() => setIsReturnModalOpen(false)}
              className="px-4 py-2 text-sm text-emerald-900 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={handleProcessReturn}
              className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs shadow-emerald-600/20 transition-colors"
            >
              {submitting ? 'Processing...' : 'Confirm Return & Sync Stock'}
            </button>
          </div>
        </div>
      </Modal>

      {/* View Bill / Receipt Modal */}
      <Modal
        isOpen={!!viewSaleTarget}
        onClose={() => setViewSaleTarget(null)}
        title="Physical Sale Receipt"
        subtitle={`Order: ${viewSaleTarget?.sale_number || ''}`}
        maxWidth="md"
      >
        {viewSaleTarget && (
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Shop Location:</span>
                <span className="font-semibold text-slate-900">{viewSaleTarget.shop}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Customer:</span>
                <span className="font-semibold text-slate-900">
                  {viewSaleTarget.customer_name} ({viewSaleTarget.customer_phone})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Sale Date:</span>
                <span className="font-medium text-slate-800">{viewSaleTarget.sale_date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment:</span>
                <span className="font-semibold text-slate-800">
                  {viewSaleTarget.payment_method}
                </span>
              </div>
            </div>

            <div>
              <span className="font-bold text-slate-700 uppercase tracking-wider block mb-2">
                Purchased Items
              </span>
              <div className="space-y-1.5 border rounded-lg p-2.5 bg-slate-50/50">
                {viewSaleTarget.items?.map((it, idx) => (
                  <div key={idx} className="flex justify-between items-center py-1 border-b border-slate-100 last:border-0">
                    <div>
                      <span className="font-semibold text-slate-800 block">
                        {it.product_name || 'Product'}
                      </span>
                      <span className="text-slate-400 text-2xs">
                        {it.quantity} x ${Number(it.selling_price).toFixed(2)}
                      </span>
                    </div>
                    <span className="font-bold text-slate-900">${Number(it.total).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200/70 flex justify-between items-center text-sm font-bold text-emerald-950">
              <span>Total Paid:</span>
              <span>${Number(viewSaleTarget.total_amount).toFixed(2)}</span>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setViewSaleTarget(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Offline Sale Confirm */}
      <ConfirmDialog
        isOpen={!!deleteTargetSale}
        onClose={() => setDeleteTargetSale(null)}
        onConfirm={async () => {
          if (deleteTargetSale) {
            await deleteOfflineSale(deleteTargetSale.id);
            setDeleteTargetSale(null);
            await loadAll();
          }
        }}
        title="Delete Offline Sale"
        message={`Are you sure you want to delete sale ${deleteTargetSale?.sale_number} for ${deleteTargetSale?.customer_name}? This removes it from order history and does not change product stock.`}
        confirmLabel="Delete Sale"
      />
    </div>
  );
};
