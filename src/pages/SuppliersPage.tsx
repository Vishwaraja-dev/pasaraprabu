import React, { useState, useEffect } from 'react';
import {
  Building2,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  FileText,
  Trash2,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
  Copy,
  Check,
  MapPin,
  Phone,
  Calendar,
  Sparkles,
  Info,
  Filter,
} from 'lucide-react';
import { Supplier, Purchase } from '../types';
import {
  getSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  getPurchases,
} from '../lib/dataService';
import {
  verifyGstin,
  isValidGstinFormat,
  GstinVerificationResult,
  GSTIN_API_KEY,
} from '../lib/gstinService';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmptyState } from '../components/ui/EmptyState';

interface SuppliersPageProps {
  onNavigateToPurchases?: (supplierId?: string) => void;
}

export const SuppliersPage: React.FC<SuppliersPageProps> = ({ onNavigateToPurchases }) => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'verified' | 'unverified' | 'active'>('all');

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null);

  // Form State
  const [gstinInput, setGstinInput] = useState('');
  const [verifyingGstin, setVerifyingGstin] = useState(false);
  const [gstinError, setGstinError] = useState('');
  const [verificationData, setVerificationData] = useState<GstinVerificationResult | null>(null);

  const [formData, setFormData] = useState({
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

  const [copiedGstin, setCopiedGstin] = useState<string | null>(null);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sups, purs] = await Promise.all([getSuppliers(), getPurchases()]);
      setSuppliers(sups);
      setPurchases(purs);
    } catch (err) {
      console.error('Failed to load suppliers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handle live GST verification
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
        // Auto-fill form fields
        setFormData((prev) => ({
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
      setGstinError(err.message || 'Network error during GST verification.');
    } finally {
      setVerifyingGstin(false);
    }
  };

  const handleOpenAdd = () => {
    setGstinInput('');
    setGstinError('');
    setVerificationData(null);
    setFormError('');
    setFormData({
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
    setIsAddOpen(true);
  };

  const handleOpenEdit = (sup: Supplier) => {
    setSelectedSupplier(sup);
    setGstinInput(sup.gstin || '');
    setGstinError('');
    setFormError('');
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
    setFormData({
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
    setIsEditOpen(true);
  };

  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError('Supplier Name is required.');
      return;
    }
    if (!formData.contact_number.trim()) {
      setFormError('Contact Number is required.');
      return;
    }
    if (!formData.address.trim()) {
      setFormError('Registered Address is required.');
      return;
    }

    setSaving(true);
    setFormError('');

    try {
      const cleanGst = gstinInput.trim().toUpperCase();
      const isVerified = verificationData?.success && verificationData.gstin === cleanGst;

      const payload: Partial<Supplier> = {
        name: formData.name.trim(),
        legal_name: formData.legal_name.trim() || formData.name.trim(),
        trade_name: formData.trade_name.trim() || formData.name.trim(),
        contact_number: formData.contact_number.trim(),
        address: formData.address.trim(),
        city: formData.city.trim(),
        state_name: formData.state_name.trim(),
        state_code: formData.state_code.trim(),
        pincode: formData.pincode.trim(),
        notes: formData.notes.trim(),
        gstin: cleanGst || undefined,
        gst_status: formData.gst_status || 'Active',
        taxpayer_type: formData.taxpayer_type || 'Regular',
        registration_date: formData.registration_date || undefined,
        gst_verified: isVerified || (selectedSupplier?.gst_verified && selectedSupplier.gstin === cleanGst),
        verified_at: isVerified ? new Date().toISOString() : selectedSupplier?.verified_at,
      };

      if (isEditOpen && selectedSupplier) {
        await updateSupplier(selectedSupplier.id, payload);
        setIsEditOpen(false);
      } else {
        await createSupplier(payload as Omit<Supplier, 'id' | 'created_at'>);
        setIsAddOpen(false);
      }

      await loadData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save supplier details.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteSupplier(deleteTarget.id);
      setDeleteTarget(null);
      await loadData();
    } catch (err) {
      console.error('Delete supplier failed:', err);
    }
  };

  const handleCopyGstin = (gst: string) => {
    navigator.clipboard.writeText(gst);
    setCopiedGstin(gst);
    setTimeout(() => setCopiedGstin(null), 2000);
  };

  // Helper stats
  const totalSuppliersCount = suppliers.length;
  const verifiedCount = suppliers.filter((s) => s.gst_verified).length;
  const activeCount = suppliers.filter((s) => (s.gst_status || 'Active').toLowerCase() === 'active').length;

  const getSupplierPurchases = (supId: string) => purchases.filter((p) => p.supplier_id === supId);

  // Filters
  const filteredSuppliers = suppliers.filter((s) => {
    const q = search.toLowerCase();
    const matchesSearch =
      s.name.toLowerCase().includes(q) ||
      (s.legal_name || '').toLowerCase().includes(q) ||
      (s.gstin || '').toLowerCase().includes(q) ||
      s.contact_number.toLowerCase().includes(q) ||
      (s.city || '').toLowerCase().includes(q) ||
      (s.state_name || '').toLowerCase().includes(q);

    if (!matchesSearch) return false;

    if (statusFilter === 'verified') return !!s.gst_verified;
    if (statusFilter === 'unverified') return !s.gst_verified;
    if (statusFilter === 'active') return (s.gst_status || 'Active').toLowerCase() === 'active';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner / Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-r from-emerald-950 via-teal-900 to-slate-950 p-6 sm:p-8 text-white shadow-xl shadow-emerald-950/20 border border-emerald-800/40">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-500/30">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Live GSTIN Authentication Active
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Suppliers & Vendor Management
            </h1>
            <p className="text-sm text-emerald-100/80 leading-relaxed">
              Verify supplier GST numbers directly via live GSTIN registry authentication. Auto-populate
              legal trade names, registered tax addresses, filing states, and taxpayer status.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-emerald-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl shadow-lg shadow-emerald-950/30 transition-all transform active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              Add New Supplier
            </button>
          </div>
        </div>

        {/* Quick Stat Counter Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-emerald-800/50">
          <div className="bg-white/5 backdrop-blur-md rounded-xl p-3 border border-white/10">
            <span className="text-emerald-300/80 text-xs font-medium block">Total Suppliers</span>
            <span className="text-xl sm:text-2xl font-bold text-white">{totalSuppliersCount}</span>
          </div>
          <div className="bg-white/5 backdrop-blur-md rounded-xl p-3 border border-white/10">
            <span className="text-emerald-300/80 text-xs font-medium block">GST Authenticated</span>
            <span className="text-xl sm:text-2xl font-bold text-emerald-400">
              {verifiedCount}{' '}
              <span className="text-xs text-emerald-200/70 font-normal">
                ({totalSuppliersCount > 0 ? Math.round((verifiedCount / totalSuppliersCount) * 100) : 0}%)
              </span>
            </span>
          </div>
          <div className="bg-white/5 backdrop-blur-md rounded-xl p-3 border border-white/10">
            <span className="text-emerald-300/80 text-xs font-medium block">Active Taxpayers</span>
            <span className="text-xl sm:text-2xl font-bold text-white">{activeCount}</span>
          </div>
          <div className="bg-white/5 backdrop-blur-md rounded-xl p-3 border border-white/10">
            <span className="text-emerald-300/80 text-xs font-medium block">API Gateway</span>
            <span className="text-xs font-mono font-bold text-emerald-300 truncate block mt-1">
              gstinapi.in (Live)
            </span>
          </div>
        </div>
      </div>

      {/* Control Bar: Filters & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white/90 backdrop-blur-xl p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
              statusFilter === 'all'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            All Suppliers ({suppliers.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('verified')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 flex items-center gap-1 ${
              statusFilter === 'verified'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            GST Verified ({verifiedCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
              statusFilter === 'active'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Active Taxpayers
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('unverified')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
              statusFilter === 'unverified'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Unverified ({totalSuppliersCount - verifiedCount})
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, GSTIN, city..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
          />
        </div>
      </div>

      {/* Suppliers Grid */}
      {loading ? (
        <div className="p-12 text-center text-sm text-slate-500 flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
          Loading suppliers directory...
        </div>
      ) : filteredSuppliers.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No suppliers found"
          description="Add a new supplier with instant GST authentication or adjust your filter query."
          actionLabel="Add Supplier with GST"
          onAction={handleOpenAdd}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredSuppliers.map((sup) => {
            const supPurchases = getSupplierPurchases(sup.id);
            const totalPurchased = supPurchases.reduce(
              (acc, p) => acc + (Number(p.total_amount) || 0),
              0
            );
            const totalPaid = supPurchases.reduce(
              (acc, p) => acc + (Number(p.paid_amount) || 0),
              0
            );
            const totalPending = Math.max(0, totalPurchased - totalPaid);

            return (
              <div
                key={sup.id}
                className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:shadow-md hover:border-emerald-300 transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* Top Badge & Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center font-bold text-sm shrink-0">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-slate-900 text-base leading-snug truncate">
                          {sup.name}
                        </h3>
                        {sup.legal_name && sup.legal_name !== sup.name && (
                          <p className="text-2xs text-slate-500 truncate" title={sup.legal_name}>
                            Legal: {sup.legal_name}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* GSTIN Badge & Verification Status */}
                  <div className="mt-3.5 flex flex-wrap items-center gap-1.5">
                    {sup.gstin ? (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-xs font-mono font-bold text-slate-800">
                        <span>{sup.gstin}</span>
                        <button
                          type="button"
                          onClick={() => handleCopyGstin(sup.gstin!)}
                          title="Copy GSTIN"
                          className="text-slate-400 hover:text-slate-700 transition-colors"
                        >
                          {copiedGstin === sup.gstin ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    ) : (
                      <span className="text-2xs px-2 py-0.5 rounded bg-slate-100 text-slate-500 italic">
                        No GSTIN
                      </span>
                    )}

                    {sup.gst_verified ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        GST Verified ({sup.gst_status || 'Active'})
                      </span>
                    ) : sup.gstin ? (
                      <button
                        type="button"
                        onClick={() => {
                          handleOpenEdit(sup);
                        }}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
                      >
                        <AlertCircle className="w-3 h-3 text-amber-600" />
                        Verify GST
                      </button>
                    ) : null}

                    {sup.taxpayer_type && (
                      <span className="text-3xs font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                        {sup.taxpayer_type}
                      </span>
                    )}
                  </div>

                  {/* Address & Contact Info */}
                  <div className="mt-3 space-y-1 text-xs text-slate-600">
                    <div className="flex items-start gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                      <p className="line-clamp-2 text-slate-600">{sup.address}</p>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-mono">{sup.contact_number}</span>
                    </div>
                  </div>

                  {/* Financial Stats Summary Box */}
                  <div className="mt-4 p-2.5 bg-slate-50 rounded-xl border border-slate-100 grid grid-cols-3 gap-2 text-center text-xs">
                    <div>
                      <span className="text-2xs text-slate-400 font-medium block">Purchases</span>
                      <span className="font-bold text-slate-900">${totalPurchased.toFixed(0)}</span>
                    </div>
                    <div>
                      <span className="text-2xs text-slate-400 font-medium block">Paid</span>
                      <span className="font-bold text-emerald-600">${totalPaid.toFixed(0)}</span>
                    </div>
                    <div>
                      <span className="text-2xs text-slate-400 font-medium block">Pending</span>
                      <span
                        className={`font-bold ${
                          totalPending > 0 ? 'text-rose-600' : 'text-slate-400'
                        }`}
                      >
                        ${totalPending.toFixed(0)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="flex items-center justify-between pt-3.5 mt-3.5 border-t border-slate-100 text-xs">
                  <button
                    type="button"
                    onClick={() => setSelectedSupplier(sup)}
                    className="inline-flex items-center gap-1 font-semibold text-emerald-700 hover:text-emerald-800 transition-colors"
                  >
                    View Profile & GST <ChevronRight className="w-3.5 h-3.5" />
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(sup)}
                      className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                      title="Edit Supplier"
                    >
                      <FileText className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(sup)}
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

      {/* Add New Supplier Modal (with Live GSTIN Verification) */}
      <Modal
        isOpen={isAddOpen || isEditOpen}
        onClose={() => {
          setIsAddOpen(false);
          setIsEditOpen(false);
        }}
        title={isEditOpen ? 'Edit Supplier' : 'Add New Supplier'}
        subtitle="Authenticate supplier with real-time GSTIN Registry verification"
        maxWidth="2xl"
      >
        <form onSubmit={handleSaveSupplier} className="space-y-5 text-sm">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{formError}</span>
            </div>
          )}

          {/* GSTIN Verification Input Box */}
          <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                <label className="text-xs font-bold uppercase tracking-wider text-emerald-950">
                  GST Number Verification (GSTIN)
                </label>
              </div>
              <span className="text-3xs font-mono font-bold text-emerald-800 bg-emerald-200/60 px-2 py-0.5 rounded-full">
                Live Government API
              </span>
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
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
                  placeholder="e.g. 29AABCU9603R1ZJ"
                  className="w-full px-3.5 py-2.5 text-sm font-mono uppercase bg-white border border-emerald-300 rounded-xl focus:ring-2 focus:ring-emerald-500 text-slate-900 tracking-wider shadow-inner"
                />
              </div>

              <button
                type="button"
                disabled={verifyingGstin || !gstinInput.trim()}
                onClick={() => handleVerifyGstin()}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 rounded-xl transition-all shadow-xs shrink-0"
              >
                {verifyingGstin ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    Verify GSTIN
                  </>
                )}
              </button>
            </div>

            {/* Quick Test GSTIN Chips */}
            <div className="flex items-center gap-1.5 flex-wrap text-2xs text-emerald-900/80">
              <span className="font-semibold text-slate-500">Quick Test Samples:</span>
              <button
                type="button"
                onClick={() => {
                  setGstinInput('29AABCU9603R1ZJ');
                  handleVerifyGstin('29AABCU9603R1ZJ');
                }}
                className="px-2 py-0.5 rounded bg-white border border-emerald-200 hover:bg-emerald-100/70 font-mono text-emerald-800 transition-colors"
              >
                29AABCU9603R1ZJ (Ujjivan SFB)
              </button>
              <button
                type="button"
                onClick={() => {
                  setGstinInput('27AABCA1234D1ZM');
                  handleVerifyGstin('27AABCA1234D1ZM');
                }}
                className="px-2 py-0.5 rounded bg-white border border-emerald-200 hover:bg-emerald-100/70 font-mono text-emerald-800 transition-colors"
              >
                27AABCA1234D1ZM (Maharashtra)
              </button>
            </div>

            {/* Verification Error */}
            {gstinError && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{gstinError}</span>
              </div>
            )}

            {/* Verification Success Card */}
            {verificationData?.success && (
              <div className="p-3 bg-white rounded-xl border border-emerald-300 space-y-2 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Authenticated & Verified Record
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="px-2 py-0.5 rounded-full text-3xs font-bold uppercase bg-emerald-100 text-emerald-800">
                      {verificationData.status || 'Active'}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-3xs font-bold uppercase bg-teal-100 text-teal-800">
                      {verificationData.taxpayer_type || 'Regular'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-100">
                  <div>
                    <span className="text-3xs text-slate-400 uppercase font-semibold block">Legal Entity</span>
                    <span className="font-semibold text-slate-800">{verificationData.legal_name}</span>
                  </div>
                  <div>
                    <span className="text-3xs text-slate-400 uppercase font-semibold block">Trade Name</span>
                    <span className="font-semibold text-slate-800">{verificationData.trade_name}</span>
                  </div>
                  <div>
                    <span className="text-3xs text-slate-400 uppercase font-semibold block">State & Code</span>
                    <span className="text-slate-700 font-medium">
                      {verificationData.state_name} ({verificationData.state_code})
                    </span>
                  </div>
                  <div>
                    <span className="text-3xs text-slate-400 uppercase font-semibold block">PAN Number</span>
                    <span className="font-mono font-semibold text-slate-800">
                      {verificationData.pan || verificationData.gstin.substring(2, 12)}
                    </span>
                  </div>
                </div>

                <p className="text-3xs text-emerald-700/80 italic">
                  Details automatically populated into the supplier form below. You can make adjustments if necessary.
                </p>
              </div>
            )}
          </div>

          {/* Supplier Details Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Supplier Trade Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Apex Apparel & Textiles Co."
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Legal Registered Name
              </label>
              <input
                type="text"
                value={formData.legal_name}
                onChange={(e) => setFormData({ ...formData, legal_name: e.target.value })}
                placeholder="Official business name registered on GST"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Contact Phone Number *
              </label>
              <input
                type="tel"
                required
                value={formData.contact_number}
                onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
                placeholder="+91 98201 23456"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Taxpayer Type
              </label>
              <select
                value={formData.taxpayer_type}
                onChange={(e) => setFormData({ ...formData, taxpayer_type: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Regular">Regular Taxpayer</option>
                <option value="Composition">Composition Scheme</option>
                <option value="SEZ">Special Economic Zone (SEZ)</option>
                <option value="Casual">Casual Taxable Person</option>
                <option value="Other">Other / Unregistered</option>
              </select>
            </div>
          </div>

          {/* Registered Address */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Registered Principal Business Address *
            </label>
            <textarea
              required
              rows={2}
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Building, street, locality, district, state..."
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="e.g. Bengaluru"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">State</label>
              <input
                type="text"
                value={formData.state_name}
                onChange={(e) => setFormData({ ...formData, state_name: e.target.value })}
                placeholder="e.g. Karnataka"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Pincode</label>
              <input
                type="text"
                maxLength={6}
                value={formData.pincode}
                onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                placeholder="560095"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 font-mono"
              />
            </div>
          </div>

          {/* Payment Terms & Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Payment Terms & Vendor Notes
            </label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="e.g. Net 15 payment terms, offers 2% discount on UPI prompt settlement."
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => {
                setIsAddOpen(false);
                setIsEditOpen(false);
              }}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 rounded-xl shadow-xs transition-all flex items-center gap-1.5"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  {isEditOpen ? 'Update Supplier' : 'Save Supplier'}
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Supplier Profile & GST Certificate View Modal */}
      <Modal
        isOpen={!!selectedSupplier && !isEditOpen}
        onClose={() => setSelectedSupplier(null)}
        title={selectedSupplier?.name || 'Supplier Profile'}
        subtitle="Verified Tax Profile & Transaction Breakdown"
        maxWidth="2xl"
      >
        {selectedSupplier && (
          <div className="space-y-5 text-sm">
            {/* GST Verification Banner */}
            <div className="p-4 rounded-2xl bg-linear-to-r from-emerald-900 to-teal-900 text-white border border-emerald-700 shadow-md">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-3xs uppercase font-mono tracking-widest text-emerald-300 block">
                    Goods and Services Tax Identification (GSTIN)
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xl font-mono font-bold text-white tracking-wider">
                      {selectedSupplier.gstin || 'UNREGISTERED'}
                    </span>
                    {selectedSupplier.gstin && (
                      <button
                        type="button"
                        onClick={() => handleCopyGstin(selectedSupplier.gstin!)}
                        className="p-1 rounded bg-white/10 hover:bg-white/20 text-emerald-200 transition-colors"
                        title="Copy GSTIN"
                      >
                        {copiedGstin === selectedSupplier.gstin ? (
                          <Check className="w-3.5 h-3.5 text-emerald-300" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  {selectedSupplier.gst_verified ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-400 text-emerald-950">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Verified
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-400 text-amber-950">
                      Unverified
                    </span>
                  )}
                  <span className="block text-3xs text-emerald-200 mt-1">
                    Status: {selectedSupplier.gst_status || 'Active'}
                  </span>
                </div>
              </div>

              {/* Tax Meta Breakdown */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-emerald-700/70 text-xs">
                <div>
                  <span className="text-3xs text-emerald-300 uppercase block">Legal Name</span>
                  <span className="font-semibold text-white truncate block">
                    {selectedSupplier.legal_name || selectedSupplier.name}
                  </span>
                </div>
                <div>
                  <span className="text-3xs text-emerald-300 uppercase block">Taxpayer Scheme</span>
                  <span className="font-semibold text-white">
                    {selectedSupplier.taxpayer_type || 'Regular'}
                  </span>
                </div>
                <div>
                  <span className="text-3xs text-emerald-300 uppercase block">Jurisdiction</span>
                  <span className="font-semibold text-white">
                    {selectedSupplier.state_name || 'India'} ({selectedSupplier.state_code || '--'})
                  </span>
                </div>
                <div>
                  <span className="text-3xs text-emerald-300 uppercase block">Registered On</span>
                  <span className="font-semibold text-white">
                    {selectedSupplier.registration_date || 'Standard'}
                  </span>
                </div>
              </div>
            </div>

            {/* Address & Contact Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="text-3xs font-bold uppercase tracking-wider text-slate-400 block">
                  Registered Place of Business
                </span>
                <p className="text-xs text-slate-700 leading-relaxed font-medium">
                  {selectedSupplier.address}
                </p>
                {selectedSupplier.pincode && (
                  <p className="text-xs text-slate-500 font-mono">
                    PIN: {selectedSupplier.pincode}
                  </p>
                )}
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="text-3xs font-bold uppercase tracking-wider text-slate-400 block">
                  Contact Information & Terms
                </span>
                <p className="text-xs font-mono font-bold text-slate-800">
                  {selectedSupplier.contact_number}
                </p>
                {selectedSupplier.notes && (
                  <p className="text-xs text-slate-600 italic mt-1">
                    "{selectedSupplier.notes}"
                  </p>
                )}
              </div>
            </div>

            {/* Purchase History Section */}
            {(() => {
              const supPurchases = getSupplierPurchases(selectedSupplier.id);
              const totalPurchased = supPurchases.reduce(
                (acc, p) => acc + (Number(p.total_amount) || 0),
                0
              );
              const totalPaid = supPurchases.reduce(
                (acc, p) => acc + (Number(p.paid_amount) || 0),
                0
              );
              const totalPending = Math.max(0, totalPurchased - totalPaid);

              return (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Purchase History ({supPurchases.length} invoices)
                    </h4>
                    <span className="text-xs text-slate-500 font-medium">
                      Total: ${totalPurchased.toFixed(2)} • Pending: ${totalPending.toFixed(2)}
                    </span>
                  </div>

                  {supPurchases.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-4 text-center bg-slate-50 rounded-xl border border-slate-200">
                      No invoices recorded yet for this supplier.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {supPurchases.map((p) => (
                        <div
                          key={p.id}
                          className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between text-xs hover:border-slate-300 transition-colors"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-slate-900">
                                {p.invoice_number}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded text-3xs font-bold ${
                                  p.payment_status === 'Paid'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : p.payment_status === 'Partially Paid'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                {p.payment_status}
                              </span>
                            </div>
                            <span className="text-slate-500 text-2xs block mt-0.5">
                              Date: {p.purchase_date} • Mode: {p.payment_mode}
                            </span>
                          </div>

                          <div className="text-right">
                            <span className="font-bold text-slate-900 block">
                              ${Number(p.total_amount).toFixed(2)}
                            </span>
                            {Number(p.pending_amount) > 0 ? (
                              <span className="text-rose-600 font-semibold text-2xs block">
                                Bal: ${Number(p.pending_amount).toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-emerald-700 text-2xs block">Settled</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Modal Bottom Actions */}
            <div className="flex justify-between items-center pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => handleOpenEdit(selectedSupplier)}
                className="px-3.5 py-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-colors"
              >
                Edit Supplier Info
              </button>

              <button
                type="button"
                onClick={() => setSelectedSupplier(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Supplier"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? All associated historical records will remain intact.`}
        confirmLabel="Delete Supplier"
        isDestructive
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
};
