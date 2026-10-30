import React, { useState, useEffect } from 'react';
import {
  Truck,
  Plus,
  Search,
  FileText,
  Upload,
  ExternalLink,
  DollarSign,
  AlertCircle,
  Eye,
  Trash2,
  Calendar,
  Building2,
  CheckCircle,
  Clock,
  ChevronRight,
  Package,
  ShieldCheck,
  Sparkles,
  Copy,
  Check,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import {
  verifyGstin,
  isValidGstinFormat,
  GstinVerificationResult,
} from '../lib/gstinService';
import {
  Supplier,
  Purchase,
  Product,
  PaymentMode,
  PurchasePaymentStatus,
} from '../types';
import {
  getSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  getPurchases,
  createPurchase,
  deletePurchase,
  getProducts,
  uploadDocument,
} from '../lib/dataService';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmptyState } from '../components/ui/EmptyState';

const PAYMENT_MODES: PaymentMode[] = ['Cash', 'UPI', 'Bank Transfer', 'Card', 'Other'];
const PAYMENT_STATUSES: PurchasePaymentStatus[] = ['Paid', 'Partially Paid', 'Pending'];

export const PurchasesPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'purchases' | 'suppliers'>('purchases');
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals
  const [isAddPurchaseOpen, setIsAddPurchaseOpen] = useState(false);
  const [isAddSupplierOpen, setIsAddSupplierOpen] = useState(false);
  const [isEditSupplierOpen, setIsEditSupplierOpen] = useState(false);
  const [supplierDetailsTarget, setSupplierDetailsTarget] = useState<Supplier | null>(null);
  const [purchaseDetailsTarget, setPurchaseDetailsTarget] = useState<Purchase | null>(null);
  const [deleteTargetPurchase, setDeleteTargetPurchase] = useState<Purchase | null>(null);
  const [deleteTargetSupplier, setDeleteTargetSupplier] = useState<Supplier | null>(null);

  // Supplier Form & GST Verification State
  const [gstinInput, setGstinInput] = useState('');
  const [verifyingGstin, setVerifyingGstin] = useState(false);
  const [gstinError, setGstinError] = useState('');
  const [verificationData, setVerificationData] = useState<GstinVerificationResult | null>(null);
  const [copiedGstin, setCopiedGstin] = useState<string | null>(null);

  const [supplierForm, setSupplierForm] = useState({
    name: '',
    legal_name: '',
    trade_name: '',
    contact_number: '',
    address: '',
    city: '',
    state_name: '',
    state_code: '',
    pincode: '',
    gst_status: 'Active',
    taxpayer_type: 'Regular',
    registration_date: '',
    notes: '',
  });

  // Purchase Form
  const [purchaseForm, setPurchaseForm] = useState({
    supplier_id: '',
    invoice_number: '',
    purchase_date: new Date().toISOString().split('T')[0],
    payment_mode: 'Bank Transfer' as PaymentMode,
    payment_status: 'Paid' as PurchasePaymentStatus,
    paid_amount: 0,
    invoice_url: '',
    invoice_filename: '',
    items: [
      {
        product_id: '',
        quantity: 1,
        purchase_price: 0,
        total: 0,
      },
    ],
  });
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const loadAll = async () => {
    setLoading(true);
    const [sup, pur, prod] = await Promise.all([
      getSuppliers(),
      getPurchases(),
      getProducts(),
    ]);
    setSuppliers(sup);
    setPurchases(pur);
    setProducts(prod);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

  // Purchase Form Calculations
  const calculatedTotalAmount = purchaseForm.items.reduce(
    (sum, it) => sum + (Number(it.total) || 0),
    0
  );
  const calculatedPending = Math.max(0, calculatedTotalAmount - (Number(purchaseForm.paid_amount) || 0));

  const openNewPurchase = () => {
    const defaultSup = suppliers[0]?.id || '';
    const defaultProd = products[0]?.id || '';
    const defaultPrice = products[0]?.purchase_price || 0;

    setPurchaseForm({
      supplier_id: defaultSup,
      invoice_number: `INV-${Date.now().toString().slice(-4)}`,
      purchase_date: new Date().toISOString().split('T')[0],
      payment_mode: 'Bank Transfer',
      payment_status: 'Paid',
      paid_amount: defaultPrice,
      invoice_url: '',
      invoice_filename: '',
      items: [
        {
          product_id: defaultProd,
          quantity: 10,
          purchase_price: defaultPrice,
          total: defaultPrice * 10,
        },
      ],
    });
    setInvoiceFile(null);
    setErrorMsg('');
    setIsAddPurchaseOpen(true);
  };

  const handleItemChange = (index: number, field: string, val: any) => {
    const updated = [...purchaseForm.items];
    const current = { ...updated[index], [field]: val };

    if (field === 'product_id') {
      const p = products.find((prod) => prod.id === val);
      if (p) {
        current.purchase_price = p.purchase_price;
        current.total = current.purchase_price * current.quantity;
      }
    } else if (field === 'quantity' || field === 'purchase_price') {
      const q = field === 'quantity' ? Number(val) : current.quantity;
      const pr = field === 'purchase_price' ? Number(val) : current.purchase_price;
      current.total = q * pr;
    }

    updated[index] = current;
    const newTotal = updated.reduce((s, it) => s + (it.total || 0), 0);

    setPurchaseForm((prev) => ({
      ...prev,
      items: updated,
      // If payment status was Paid, keep paid_amount synced with new total
      paid_amount: prev.payment_status === 'Paid' ? newTotal : prev.paid_amount,
    }));
  };

  const addItemRow = () => {
    const defaultProd = products[0]?.id || '';
    const defaultPrice = products[0]?.purchase_price || 0;
    setPurchaseForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          product_id: defaultProd,
          quantity: 1,
          purchase_price: defaultPrice,
          total: defaultPrice,
        },
      ],
    }));
  };

  const removeItemRow = (idx: number) => {
    if (purchaseForm.items.length <= 1) return;
    setPurchaseForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== idx),
    }));
  };

  const handleSavePurchase = async () => {
    if (!purchaseForm.supplier_id) {
      setErrorMsg('Please select a supplier.');
      return;
    }
    if (!purchaseForm.invoice_number.trim()) {
      setErrorMsg('Invoice number is required.');
      return;
    }
    if (purchaseForm.items.length === 0) {
      setErrorMsg('At least one item is required.');
      return;
    }

    try {
      setUploading(true);
      let invoiceUrl = purchaseForm.invoice_url;
      let invoiceFilename = purchaseForm.invoice_filename;

      if (invoiceFile) {
        const uploadRes = await uploadDocument(invoiceFile, 'purchase-invoices');
        invoiceUrl = uploadRes.url;
        invoiceFilename = uploadRes.filename;
      }

      const totalAmt = calculatedTotalAmount;
      const paidAmt = Number(purchaseForm.paid_amount) || 0;
      const pendingAmt = Math.max(0, totalAmt - paidAmt);

      let status = purchaseForm.payment_status;
      if (paidAmt >= totalAmt && totalAmt > 0) {
        status = 'Paid';
      } else if (paidAmt > 0 && paidAmt < totalAmt) {
        status = 'Partially Paid';
      } else if (paidAmt === 0) {
        status = 'Pending';
      }

      const supplierObj = suppliers.find((s) => s.id === purchaseForm.supplier_id);

      await createPurchase({
        supplier_id: purchaseForm.supplier_id,
        supplier_name: supplierObj?.name,
        invoice_number: purchaseForm.invoice_number.trim(),
        purchase_date: purchaseForm.purchase_date,
        total_amount: totalAmt,
        paid_amount: paidAmt,
        pending_amount: pendingAmt,
        payment_mode: purchaseForm.payment_mode,
        payment_status: status,
        invoice_url: invoiceUrl,
        invoice_filename: invoiceFilename,
        items: purchaseForm.items.map((it) => {
          const pr = products.find((p) => p.id === it.product_id);
          return {
            product_id: it.product_id,
            product_name: pr?.name || 'Product',
            quantity: Number(it.quantity),
            purchase_price: Number(it.purchase_price),
            total: Number(it.total),
          };
        }),
      });

      setIsAddPurchaseOpen(false);
      await loadAll();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save purchase.';
      setErrorMsg(msg);
    } finally {
      setUploading(false);
    }
  };

  // Supplier Add / Edit & GSTIN Handling
  const handleVerifyGstin = async (gstToVerify?: string) => {
    const targetGstin = (gstToVerify || gstinInput).trim().toUpperCase();
    if (!targetGstin) {
      setGstinError('Please enter a 15-character GST number.');
      return;
    }

    setVerifyingGstin(true);
    setGstinError('');

    try {
      const res = await verifyGstin(targetGstin);
      if (res.success) {
        setVerificationData(res);
        setSupplierForm((prev) => ({
          ...prev,
          name: res.trade_name || res.legal_name || prev.name || 'New Supplier',
          legal_name: res.legal_name || prev.legal_name,
          trade_name: res.trade_name || prev.trade_name,
          address: res.address || prev.address,
          city: res.city || prev.city,
          state_name: res.state_name || prev.state_name,
          state_code: res.state_code || prev.state_code,
          pincode: res.pincode || prev.pincode,
          gst_status: res.status || 'Active',
          taxpayer_type: res.taxpayer_type || 'Regular',
          registration_date: res.registration_date || prev.registration_date,
        }));
      } else {
        setGstinError(res.message || 'Unable to authenticate this GSTIN.');
      }
    } catch (err: any) {
      setGstinError(err?.message || 'Error during GST verification.');
    } finally {
      setVerifyingGstin(false);
    }
  };

  const openNewSupplier = () => {
    setGstinInput('');
    setGstinError('');
    setVerificationData(null);
    setSupplierForm({
      name: '',
      legal_name: '',
      trade_name: '',
      contact_number: '+91 ',
      address: '',
      city: '',
      state_name: '',
      state_code: '',
      pincode: '',
      gst_status: 'Active',
      taxpayer_type: 'Regular',
      registration_date: '',
      notes: '',
    });
    setErrorMsg('');
    setIsAddSupplierOpen(true);
  };

  const openEditSupplier = (sup: Supplier) => {
    setSupplierDetailsTarget(sup);
    setGstinInput(sup.gstin || '');
    setGstinError('');
    if (sup.gst_verified && sup.gstin) {
      setVerificationData({
        success: true,
        gstin: sup.gstin,
        legal_name: sup.legal_name,
        trade_name: sup.trade_name,
        status: sup.gst_status,
        taxpayer_type: sup.taxpayer_type,
        address: sup.address,
        city: sup.city,
        state_name: sup.state_name,
        pincode: sup.pincode,
      });
    } else {
      setVerificationData(null);
    }
    setSupplierForm({
      name: sup.name,
      legal_name: sup.legal_name || '',
      trade_name: sup.trade_name || '',
      contact_number: sup.contact_number,
      address: sup.address,
      city: sup.city || '',
      state_name: sup.state_name || '',
      state_code: sup.state_code || '',
      pincode: sup.pincode || '',
      gst_status: sup.gst_status || 'Active',
      taxpayer_type: sup.taxpayer_type || 'Regular',
      registration_date: sup.registration_date || '',
      notes: sup.notes || '',
    });
    setErrorMsg('');
    setIsEditSupplierOpen(true);
  };

  const handleSaveSupplier = async (isEditing: boolean) => {
    if (!supplierForm.name.trim()) {
      setErrorMsg('Supplier name is required.');
      return;
    }
    if (!supplierForm.contact_number.trim()) {
      setErrorMsg('Contact number is required.');
      return;
    }
    if (!supplierForm.address.trim()) {
      setErrorMsg('Address is required.');
      return;
    }

    try {
      const cleanGst = gstinInput.trim().toUpperCase();
      const isVerified = verificationData?.success && verificationData.gstin === cleanGst;

      const payload: Partial<Supplier> = {
        name: supplierForm.name.trim(),
        legal_name: supplierForm.legal_name.trim() || supplierForm.name.trim(),
        trade_name: supplierForm.trade_name.trim() || supplierForm.name.trim(),
        contact_number: supplierForm.contact_number.trim(),
        address: supplierForm.address.trim(),
        city: supplierForm.city.trim(),
        state_name: supplierForm.state_name.trim(),
        state_code: supplierForm.state_code.trim(),
        pincode: supplierForm.pincode.trim(),
        notes: supplierForm.notes.trim(),
        gstin: cleanGst || undefined,
        gst_status: supplierForm.gst_status || 'Active',
        taxpayer_type: supplierForm.taxpayer_type || 'Regular',
        registration_date: supplierForm.registration_date || undefined,
        gst_verified: isVerified || (supplierDetailsTarget?.gst_verified && supplierDetailsTarget.gstin === cleanGst),
        verified_at: isVerified ? new Date().toISOString() : supplierDetailsTarget?.verified_at,
      };

      if (isEditing && supplierDetailsTarget) {
        await updateSupplier(supplierDetailsTarget.id, payload);
        setIsEditSupplierOpen(false);
      } else {
        await createSupplier(payload as Omit<Supplier, 'id' | 'created_at'>);
        setIsAddSupplierOpen(false);
      }
      await loadAll();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save supplier.';
      setErrorMsg(msg);
    }
  };

  // Filtered views
  const filteredPurchases = purchases.filter((p) => {
    const sName = p.supplier_name?.toLowerCase() || '';
    const inv = p.invoice_number.toLowerCase();
    const q = search.toLowerCase();
    return sName.includes(q) || inv.includes(q);
  });

  const filteredSuppliers = suppliers.filter((s) => {
    const q = search.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.contact_number.includes(q);
  });

  // Calculate stats for a specific supplier history view
  const getSupplierPurchases = (supId: string) => {
    return purchases.filter((p) => p.supplier_id === supId);
  };

  return (
    <div className="space-y-6">
      {/* Tab bar + Action Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white/80 backdrop-blur-xl p-4 rounded-2xl border border-white/80 shadow-xs">
        <div className="flex items-center gap-2 border-b sm:border-b-0 pb-2 sm:pb-0">
          <button
            type="button"
            onClick={() => setActiveTab('purchases')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'purchases'
                ? 'bg-emerald-600 text-white shadow-xs font-bold'
                : 'text-emerald-900/80 hover:text-emerald-950 hover:bg-emerald-100/60'
            }`}
          >
            Purchases & Invoices ({purchases.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('suppliers')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'suppliers'
                ? 'bg-emerald-600 text-white shadow-xs font-bold'
                : 'text-emerald-900/80 hover:text-emerald-950 hover:bg-emerald-100/60'
            }`}
          >
            Suppliers ({suppliers.length})
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-600" />
            <input
              type="text"
              placeholder={activeTab === 'purchases' ? 'Search invoice or supplier...' : 'Search supplier...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-white/90 border border-emerald-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-emerald-950"
            />
          </div>

          {activeTab === 'purchases' ? (
            <button
              type="button"
              onClick={openNewPurchase}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs shadow-emerald-600/20 transition-colors shrink-0"
            >
              <Plus className="w-4 h-4" />
              Record Purchase
            </button>
          ) : (
            <button
              type="button"
              onClick={openNewSupplier}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs shadow-emerald-600/20 transition-colors shrink-0"
            >
              <Plus className="w-4 h-4" />
              Add Supplier
            </button>
          )}
        </div>
      </div>

      {/* PURCHASES TAB */}
      {activeTab === 'purchases' && (
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/85 shadow-lg shadow-emerald-950/5 overflow-hidden">
          {loading ? (
            <div className="py-16 text-center text-sm text-emerald-800/60">Loading purchases...</div>
          ) : filteredPurchases.length === 0 ? (
            <EmptyState
              icon={Truck}
              title="No purchases found"
              description="Record your stock inward purchases to automatically increase inventory levels."
              actionLabel="Record First Purchase"
              onAction={openNewPurchase}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-emerald-50/70 border-b border-emerald-100 text-xs font-bold text-emerald-950 uppercase tracking-wider">
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Supplier</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Total Amount</th>
                    <th className="py-3 px-4">Paid / Pending</th>
                    <th className="py-3 px-4">Payment Status</th>
                    <th className="py-3 px-4">Invoice Doc</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-100/60 text-emerald-950">
                  {filteredPurchases.map((pur) => (
                    <tr key={pur.id} className="hover:bg-emerald-50/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-950">
                        {pur.invoice_number}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-emerald-950">
                        {pur.supplier_name || 'Supplier'}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-emerald-800/80">{pur.purchase_date}</td>
                      <td className="py-3.5 px-4 font-extrabold text-emerald-950">
                        ${Number(pur.total_amount).toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-xs">
                        <span className="text-emerald-700 font-bold">
                          ${Number(pur.paid_amount).toFixed(2)}
                        </span>
                        {Number(pur.pending_amount) > 0 ? (
                          <span className="text-rose-600 block font-medium">
                            Pending: ${Number(pur.pending_amount).toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-emerald-800/50 block font-medium">Cleared</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={pur.payment_status} size="sm" />
                        <span className="block text-2xs text-emerald-800/60 font-medium mt-0.5">
                          {pur.payment_mode}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {pur.invoice_url ? (
                          <a
                            href={pur.invoice_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-emerald-700 hover:text-emerald-950 font-medium bg-emerald-50/80 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200 transition-colors"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Invoice</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-xs text-emerald-800/40 italic">No file</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setPurchaseDetailsTarget(pur)}
                            title="View Purchase Breakdown"
                            className="p-1.5 text-emerald-700 hover:text-emerald-950 hover:bg-emerald-100/70 rounded-lg transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTargetPurchase(pur)}
                            title="Delete Purchase"
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SUPPLIERS TAB */}
      {activeTab === 'suppliers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredSuppliers.map((sup) => {
            const supPurchases = getSupplierPurchases(sup.id);
            const totalPurchased = supPurchases.reduce((s, p) => s + (Number(p.total_amount) || 0), 0);
            const totalPaid = supPurchases.reduce((s, p) => s + (Number(p.paid_amount) || 0), 0);
            const totalPending = Math.max(0, totalPurchased - totalPaid);

            return (
              <div
                key={sup.id}
                className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/85 p-5 shadow-xs hover:shadow-md hover:border-emerald-300/80 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm border border-emerald-200">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-emerald-950 text-base truncate">{sup.name}</h4>
                        {sup.legal_name && sup.legal_name !== sup.name && (
                          <p className="text-3xs text-emerald-800/70 truncate">{sup.legal_name}</p>
                        )}
                        <p className="text-xs font-mono text-emerald-800/80">{sup.contact_number}</p>
                      </div>
                    </div>
                  </div>

                  {/* GST Badge */}
                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                    {sup.gstin ? (
                      <span className="text-2xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-100/70 text-emerald-900 border border-emerald-200/80">
                        {sup.gstin}
                      </span>
                    ) : (
                      <span className="text-3xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 italic">
                        No GST
                      </span>
                    )}

                    {sup.gst_verified ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-3xs font-semibold bg-emerald-100 text-emerald-800">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        GST Verified
                      </span>
                    ) : sup.gstin ? (
                      <button
                        type="button"
                        onClick={() => openEditSupplier(sup)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-3xs font-semibold bg-amber-100 text-amber-800 hover:bg-amber-200"
                      >
                        Verify GST
                      </button>
                    ) : null}

                    {sup.state_name && (
                      <span className="text-3xs px-1.5 py-0.5 rounded bg-white/70 text-emerald-900/70 font-medium">
                        {sup.state_name}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-emerald-900/80 mt-2.5 line-clamp-2">{sup.address}</p>
                  {sup.notes && (
                    <p className="text-xs text-emerald-800/60 italic mt-1 line-clamp-1">
                      Note: {sup.notes}
                    </p>
                  )}

                  {/* Financial stats box */}
                  <div className="mt-4 p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 grid grid-cols-3 gap-2 text-center text-xs">
                    <div>
                      <span className="text-emerald-800/60 block text-2xs uppercase font-medium">Purchases</span>
                      <span className="font-bold text-emerald-950">${totalPurchased.toFixed(0)}</span>
                    </div>
                    <div>
                      <span className="text-emerald-800/60 block text-2xs uppercase font-medium">Paid</span>
                      <span className="font-bold text-emerald-700">${totalPaid.toFixed(0)}</span>
                    </div>
                    <div>
                      <span className="text-emerald-800/60 block text-2xs uppercase font-medium">Pending</span>
                      <span
                        className={`font-bold ${
                          totalPending > 0 ? 'text-rose-600' : 'text-emerald-800/40'
                        }`}
                      >
                        ${totalPending.toFixed(0)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 mt-4 border-t border-emerald-100/80 text-xs">
                  <button
                    type="button"
                    onClick={() => setSupplierDetailsTarget(sup)}
                    className="inline-flex items-center gap-1 font-semibold text-emerald-700 hover:text-emerald-950 transition-colors"
                  >
                    View History ({supPurchases.length}) <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEditSupplier(sup)}
                      className="p-1.5 text-emerald-700 hover:text-emerald-950 hover:bg-emerald-100/70 rounded-lg transition-colors"
                      title="Edit Supplier"
                    >
                      <FileText className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTargetSupplier(sup)}
                      className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Delete Supplier"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Record Purchase Modal */}
      <Modal
        isOpen={isAddPurchaseOpen}
        onClose={() => setIsAddPurchaseOpen(false)}
        title="Record Stock Purchase"
        subtitle="Stock will automatically increase for all added items"
        maxWidth="2xl"
      >
        <div className="space-y-4 text-sm">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Supplier *</label>
              <select
                value={purchaseForm.supplier_id}
                onChange={(e) =>
                  setPurchaseForm({ ...purchaseForm, supplier_id: e.target.value })
                }
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select Supplier</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Invoice Number *
              </label>
              <input
                type="text"
                required
                value={purchaseForm.invoice_number}
                onChange={(e) =>
                  setPurchaseForm({ ...purchaseForm, invoice_number: e.target.value })
                }
                placeholder="INV-9921"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Purchase Date *
              </label>
              <input
                type="date"
                required
                value={purchaseForm.purchase_date}
                onChange={(e) =>
                  setPurchaseForm({ ...purchaseForm, purchase_date: e.target.value })
                }
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Product Items Breakdown */}
          <div className="space-y-2 border rounded-xl p-3 bg-slate-50/70 border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Purchased Products (Auto-Increases Stock)
              </span>
              <button
                type="button"
                onClick={addItemRow}
                className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
              >
                <Plus className="w-3.5 h-3.5" /> Add Product Row
              </button>
            </div>

            <div className="space-y-2 mt-2">
              {purchaseForm.items.map((row, idx) => (
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
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.shop})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="w-20">
                    <input
                      type="number"
                      min={1}
                      value={row.quantity}
                      onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                      placeholder="Qty"
                      className="w-full p-1.5 border border-slate-200 rounded text-center"
                    />
                  </div>
                  <div className="w-24">
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={row.purchase_price}
                      onChange={(e) => handleItemChange(idx, 'purchase_price', e.target.value)}
                      placeholder="Price"
                      className="w-full p-1.5 border border-slate-200 rounded text-right"
                    />
                  </div>
                  <div className="w-20 text-right font-bold text-slate-800">
                    ${Number(row.total).toFixed(2)}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItemRow(idx)}
                    disabled={purchaseForm.items.length <= 1}
                    className="p-1 text-slate-400 hover:text-rose-600 disabled:opacity-30"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2 text-sm font-bold text-slate-900">
              Total Purchase Amount: ${calculatedTotalAmount.toFixed(2)}
            </div>
          </div>

          {/* Payment & Invoices */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Payment Mode *
              </label>
              <select
                value={purchaseForm.payment_mode}
                onChange={(e) =>
                  setPurchaseForm({
                    ...purchaseForm,
                    payment_mode: e.target.value as PaymentMode,
                  })
                }
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
              >
                {PAYMENT_MODES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Paid Amount ($)
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={purchaseForm.paid_amount}
                onChange={(e) =>
                  setPurchaseForm({ ...purchaseForm, paid_amount: Number(e.target.value) })
                }
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Pending Balance ($)
              </label>
              <input
                type="text"
                readOnly
                value={`$${calculatedPending.toFixed(2)}`}
                className={`w-full px-3 py-2 border rounded-lg text-sm font-bold ${
                  calculatedPending > 0
                    ? 'bg-rose-50 border-rose-200 text-rose-700'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                }`}
              />
            </div>
          </div>

          {/* Invoice Document Upload (Supabase Storage) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Supplier Invoice Document (Supabase Storage bucket: purchase-invoices)
            </label>
            <div className="border border-dashed border-slate-300 rounded-xl p-3 text-center bg-slate-50/50 hover:bg-white transition-colors">
              <input
                type="file"
                id="invoice_upload"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setInvoiceFile(e.target.files[0]);
                  }
                }}
                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                className="hidden"
              />
              <label
                htmlFor="invoice_upload"
                className="cursor-pointer flex items-center justify-center gap-2 text-xs font-medium text-emerald-950"
              >
                <Upload className="w-4 h-4 text-emerald-600" />
                <span>
                  {invoiceFile ? invoiceFile.name : 'Select Supplier Invoice PDF or Image'}
                </span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-emerald-100">
            <button
              type="button"
              onClick={() => setIsAddPurchaseOpen(false)}
              className="px-4 py-2 text-sm text-emerald-900 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSavePurchase}
              disabled={uploading}
              className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs shadow-emerald-600/20 transition-colors"
            >
              {uploading ? 'Recording...' : 'Record Purchase & Increase Stock'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Add / Edit Supplier Modal */}
      <Modal
        isOpen={isAddSupplierOpen || isEditSupplierOpen}
        onClose={() => {
          setIsAddSupplierOpen(false);
          setIsEditSupplierOpen(false);
        }}
        title={isEditSupplierOpen ? 'Edit Supplier' : 'Add New Supplier'}
        subtitle="Authenticate and manage supplier contact and GST details"
        maxWidth="lg"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSaveSupplier(isEditSupplierOpen);
          }}
          className="space-y-4 text-sm"
        >
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* GSTIN Verification Box */}
          <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                <label className="text-xs font-bold uppercase tracking-wider text-emerald-950">
                  GST Verification (GSTIN API)
                </label>
              </div>
              <span className="text-3xs font-mono font-bold text-emerald-800 bg-emerald-200/60 px-2 py-0.5 rounded-full">
                gak_3e172e47...
              </span>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                maxLength={15}
                value={gstinInput}
                onChange={(e) => {
                  const val = e.target.value.toUpperCase();
                  setGstinInput(val);
                  if (val.length === 15 && isValidGstinFormat(val)) {
                    handleVerifyGstin(val);
                  }
                }}
                placeholder="Enter 15-digit GSTIN (e.g. 29AABCU9603R1ZJ)"
                className="w-full px-3 py-2 text-xs sm:text-sm font-mono uppercase bg-white border border-emerald-300 rounded-xl focus:ring-2 focus:ring-emerald-500 text-slate-900 tracking-wider"
              />
              <button
                type="button"
                disabled={verifyingGstin || !gstinInput.trim()}
                onClick={() => handleVerifyGstin()}
                className="inline-flex items-center gap-1 px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 rounded-xl transition-all shrink-0"
              >
                {verifyingGstin ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    Verify
                  </>
                )}
              </button>
            </div>

            {gstinError && (
              <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {gstinError}
              </div>
            )}

            {verificationData?.success && (
              <div className="p-2.5 bg-white rounded-lg border border-emerald-300 text-xs space-y-1">
                <div className="flex items-center justify-between font-bold text-emerald-800">
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Verified: {verificationData.legal_name}</span>
                  </div>
                  <span className="text-3xs uppercase bg-emerald-100 px-2 py-0.5 rounded-full">
                    {verificationData.status || 'Active'}
                  </span>
                </div>
                <div className="text-3xs text-slate-500">
                  State: {verificationData.state_name} ({verificationData.state_code}) • Taxpayer: {verificationData.taxpayer_type || 'Regular'}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Supplier Trade Name *
              </label>
              <input
                type="text"
                required
                value={supplierForm.name}
                onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                placeholder="e.g. Apex Apparel & Textiles Co."
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Legal Registered Name
              </label>
              <input
                type="text"
                value={supplierForm.legal_name}
                onChange={(e) => setSupplierForm({ ...supplierForm, legal_name: e.target.value })}
                placeholder="Official business name"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Contact Number *
              </label>
              <input
                type="tel"
                required
                value={supplierForm.contact_number}
                onChange={(e) =>
                  setSupplierForm({ ...supplierForm, contact_number: e.target.value })
                }
                placeholder="+91 98201 23456"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Taxpayer Type
              </label>
              <select
                value={supplierForm.taxpayer_type}
                onChange={(e) => setSupplierForm({ ...supplierForm, taxpayer_type: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Regular">Regular Taxpayer</option>
                <option value="Composition">Composition Scheme</option>
                <option value="SEZ">Special Economic Zone</option>
                <option value="Other">Other / Unregistered</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Registered Business Address *
            </label>
            <textarea
              required
              rows={2}
              value={supplierForm.address}
              onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })}
              placeholder="Full address of supplier warehouse or office..."
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
              <input
                type="text"
                value={supplierForm.city}
                onChange={(e) => setSupplierForm({ ...supplierForm, city: e.target.value })}
                placeholder="City"
                className="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">State</label>
              <input
                type="text"
                value={supplierForm.state_name}
                onChange={(e) => setSupplierForm({ ...supplierForm, state_name: e.target.value })}
                placeholder="State"
                className="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Pincode</label>
              <input
                type="text"
                value={supplierForm.pincode}
                onChange={(e) => setSupplierForm({ ...supplierForm, pincode: e.target.value })}
                placeholder="Pincode"
                className="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Payment Terms & Notes
            </label>
            <textarea
              rows={2}
              value={supplierForm.notes}
              onChange={(e) => setSupplierForm({ ...supplierForm, notes: e.target.value })}
              placeholder="e.g. Net 15 payment terms, offers 2% discount on UPI prompt settlement."
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setIsAddSupplierOpen(false);
                setIsEditSupplierOpen(false);
              }}
              className="px-4 py-2 text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs shadow-emerald-600/20 transition-colors"
            >
              {isEditSupplierOpen ? 'Update Supplier' : 'Save Supplier'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Supplier History Modal */}
      <Modal
        isOpen={!!supplierDetailsTarget && !isEditSupplierOpen}
        onClose={() => setSupplierDetailsTarget(null)}
        title={supplierDetailsTarget?.name || 'Supplier Details'}
        subtitle="Purchase history, payments & pending balances"
        maxWidth="2xl"
      >
        {supplierDetailsTarget && (
          <div className="space-y-5 text-sm">
            {/* Quick stats banner */}
            {(() => {
              const supPurchases = getSupplierPurchases(supplierDetailsTarget.id);
              const totalPurchased = supPurchases.reduce(
                (s, p) => s + (Number(p.total_amount) || 0),
                0
              );
              const totalPaid = supPurchases.reduce((s, p) => s + (Number(p.paid_amount) || 0), 0);
              const totalPending = Math.max(0, totalPurchased - totalPaid);

              return (
                <>
                  <div className="grid grid-cols-4 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 text-center">
                    <div>
                      <span className="text-2xs text-slate-400 uppercase font-semibold block">
                        Total Purchases
                      </span>
                      <span className="text-base font-bold text-slate-900">
                        {supPurchases.length}
                      </span>
                    </div>
                    <div>
                      <span className="text-2xs text-slate-400 uppercase font-semibold block">
                        Total Amount
                      </span>
                      <span className="text-base font-bold text-slate-900">
                        ${totalPurchased.toFixed(2)}
                      </span>
                    </div>
                    <div>
                      <span className="text-2xs text-slate-400 uppercase font-semibold block">
                        Total Paid
                      </span>
                      <span className="text-base font-bold text-emerald-700">
                        ${totalPaid.toFixed(2)}
                      </span>
                    </div>
                    <div>
                      <span className="text-2xs text-slate-400 uppercase font-semibold block">
                        Total Pending
                      </span>
                      <span
                        className={`text-base font-bold ${
                          totalPending > 0 ? 'text-rose-600' : 'text-slate-400'
                        }`}
                      >
                        ${totalPending.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h5 className="font-semibold text-slate-800 text-xs uppercase tracking-wider mb-2">
                      Purchase History
                    </h5>
                    {supPurchases.length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-4 text-center">
                        No purchases recorded yet for this supplier.
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {supPurchases.map((p) => (
                          <div
                            key={p.id}
                            className="p-3 bg-white rounded-lg border border-slate-200 flex items-center justify-between text-xs"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-slate-900">
                                  {p.invoice_number}
                                </span>
                                <StatusBadge status={p.payment_status} size="sm" />
                              </div>
                              <span className="text-slate-500 mt-0.5 block">
                                Date: {p.purchase_date} • Mode: {p.payment_mode}
                              </span>
                            </div>

                            <div className="text-right">
                              <span className="font-bold text-slate-900 text-sm block">
                                ${Number(p.total_amount).toFixed(2)}
                              </span>
                              {Number(p.pending_amount) > 0 ? (
                                <span className="text-rose-600 font-semibold text-2xs block">
                                  Pending: ${Number(p.pending_amount).toFixed(2)}
                                </span>
                              ) : (
                                <span className="text-emerald-700 text-2xs block">Paid</span>
                              )}
                              {p.invoice_url && (
                                <a
                                  href={p.invoice_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-2xs text-emerald-700 hover:text-emerald-950 font-semibold inline-flex items-center gap-0.5 mt-0.5"
                                >
                                  Invoice Doc <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              );
            })()}

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSupplierDetailsTarget(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Purchase Details Modal */}
      <Modal
        isOpen={!!purchaseDetailsTarget}
        onClose={() => setPurchaseDetailsTarget(null)}
        title="Purchase Breakdown"
        subtitle={`Invoice: ${purchaseDetailsTarget?.invoice_number || ''}`}
        maxWidth="md"
      >
        {purchaseDetailsTarget && (
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Supplier:</span>
                <span className="font-semibold text-slate-900">
                  {purchaseDetailsTarget.supplier_name || 'Supplier'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Date:</span>
                <span className="font-medium text-slate-800">
                  {purchaseDetailsTarget.purchase_date}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Status:</span>
                <StatusBadge status={purchaseDetailsTarget.payment_status} size="sm" />
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Mode:</span>
                <span className="font-medium text-slate-800">
                  {purchaseDetailsTarget.payment_mode}
                </span>
              </div>
            </div>

            <div>
              <span className="font-bold text-slate-700 uppercase tracking-wider block mb-2">
                Purchased Items
              </span>
              <div className="space-y-1.5 border rounded-lg p-2 bg-slate-50/50">
                {purchaseDetailsTarget.items?.map((it, idx) => (
                  <div key={idx} className="flex justify-between items-center py-1 border-b border-slate-100 last:border-0">
                    <div>
                      <span className="font-semibold text-slate-800 block">
                        {it.product_name || 'Product'}
                      </span>
                      <span className="text-slate-400 text-2xs">
                        {it.quantity} units @ ${Number(it.purchase_price).toFixed(2)}
                      </span>
                    </div>
                    <span className="font-bold text-slate-900">${Number(it.total).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200/70 flex justify-between items-center font-bold text-emerald-950 text-sm">
              <span>Total Invoice Amount:</span>
              <span>${Number(purchaseDetailsTarget.total_amount).toFixed(2)}</span>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setPurchaseDetailsTarget(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Purchase Confirm */}
      <ConfirmDialog
        isOpen={!!deleteTargetPurchase}
        onClose={() => setDeleteTargetPurchase(null)}
        onConfirm={async () => {
          if (deleteTargetPurchase) {
            await deletePurchase(deleteTargetPurchase.id);
            setDeleteTargetPurchase(null);
            await loadAll();
          }
        }}
        title="Delete Purchase Record"
        message={`Are you sure you want to delete invoice ${deleteTargetPurchase?.invoice_number}?`}
        confirmLabel="Delete Purchase"
      />

      {/* Delete Supplier Confirm */}
      <ConfirmDialog
        isOpen={!!deleteTargetSupplier}
        onClose={() => setDeleteTargetSupplier(null)}
        onConfirm={async () => {
          if (deleteTargetSupplier) {
            await deleteSupplier(deleteTargetSupplier.id);
            setDeleteTargetSupplier(null);
            await loadAll();
          }
        }}
        title="Delete Supplier"
        message={`Are you sure you want to delete "${deleteTargetSupplier?.name}"? Related purchases will be affected.`}
        confirmLabel="Delete Supplier"
      />
    </div>
  );
};
