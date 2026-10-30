import React, { useState, useEffect } from 'react';
import {
  FileText,
  Calculator,
  Percent,
  Download,
  Plus,
  Search,
  CheckCircle2,
  Building,
  ArrowUpRight,
  ArrowDownLeft,
  Settings,
  X,
  Copy,
  Check,
  CreditCard,
  Layers,
  Calendar,
  AlertTriangle,
  Receipt,
  FileSpreadsheet,
} from 'lucide-react';
import {
  GstSettings,
  HsnEntry,
  GstInvoiceRecord,
  GstSummaryStats,
  GstInvoiceType,
} from '../types';
import {
  getGstSettings,
  updateGstSettings,
  getHsnDirectory,
  createHsnEntry,
  deleteHsnEntry,
  getGstInvoices,
  createGstInvoice,
  deleteGstInvoice,
  getGstSummaryStats,
  calculateGstTaxBreakdown,
  TaxBreakdownCalculation,
  getBranches,
} from '../lib/dataService';

export const GstManagerPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'calculator' | 'invoices' | 'hsn' | 'returns'>('overview');
  const [settings, setSettings] = useState<GstSettings | null>(null);
  const [invoices, setInvoices] = useState<GstInvoiceRecord[]>([]);
  const [hsnList, setHsnList] = useState<HsnEntry[]>([]);
  const [stats, setStats] = useState<GstSummaryStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedGstin, setCopiedGstin] = useState(false);

  // Filter state for invoices
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [invoiceTypeFilter, setInvoiceTypeFilter] = useState<'All' | 'Outward' | 'Inward' | 'B2B' | 'B2C'>('All');

  // Calculator State
  const [calcAmount, setCalcAmount] = useState<number>(2500);
  const [calcRate, setCalcRate] = useState<number>(12);
  const [calcIsInterState, setCalcIsInterState] = useState<boolean>(false);
  const [calcIsInclusive, setCalcIsInclusive] = useState<boolean>(false);
  const [calcResult, setCalcResult] = useState<TaxBreakdownCalculation | null>(null);
  const [copiedCalc, setCopiedCalc] = useState(false);

  // Modals
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isAddInvoiceModalOpen, setIsAddInvoiceModalOpen] = useState(false);
  const [isAddHsnModalOpen, setIsAddHsnModalOpen] = useState(false);

  // Settings form state
  const [settingsForm, setSettingsForm] = useState<Partial<GstSettings>>({});

  // New Invoice form state
  const [newInvoiceForm, setNewInvoiceForm] = useState({
    invoice_number: `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    invoice_date: new Date().toISOString().split('T')[0],
    type: 'B2C (Retail In-Store)' as GstInvoiceType,
    party_name: '',
    party_gstin: '',
    place_of_supply: '27-Maharashtra (Intra-State)',
    is_inter_state: false,
    hsn_code: '6109',
    taxable_value: 1000,
    gst_rate: 12,
    payment_status: 'Paid' as 'Paid' | 'Pending',
    branch: 'Shop 1',
  });

  // New HSN form state
  const [newHsnForm, setNewHsnForm] = useState({
    hsn_code: '',
    description: '',
    category: 'Apparel',
    gst_rate: 12,
  });

  // Available branches for dropdown
  const [availableBranches, setAvailableBranches] = useState<string[]>(['Shop 1', 'Shop 2', 'Shop 3']);

  useEffect(() => {
    loadAllData();
  }, []);

  // Update calculator when inputs change
  useEffect(() => {
    const res = calculateGstTaxBreakdown(calcAmount, calcRate, calcIsInterState, calcIsInclusive);
    setCalcResult(res);
  }, [calcAmount, calcRate, calcIsInterState, calcIsInclusive]);

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const [settingsData, invoicesData, hsnData, statsData, branchesData] = await Promise.all([
        getGstSettings(),
        getGstInvoices(),
        getHsnDirectory(),
        getGstSummaryStats(),
        getBranches(),
      ]);

      setSettings(settingsData);
      setSettingsForm(settingsData);
      setInvoices(invoicesData);
      setHsnList(hsnData);
      setStats(statsData);

      if (branchesData.length > 0) {
        setAvailableBranches(branchesData.map((b) => b.shop_identifier || b.name));
      }

      if (settingsData) {
        setCalcRate(settingsData.default_gst_rate || 12);
      }
    } catch (err) {
      console.error('Failed to load GST data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyGstin = () => {
    if (!settings?.gstin) return;
    navigator.clipboard.writeText(settings.gstin);
    setCopiedGstin(true);
    setTimeout(() => setCopiedGstin(false), 2000);
  };

  const handleCopyCalculation = () => {
    if (!calcResult) return;
    const text = `GST Tax Breakdown:
Taxable Value: ₹${calcResult.taxableValue.toLocaleString()}
GST Rate: ${calcResult.gstRate}% (${calcResult.isInterState ? 'IGST' : 'CGST + SGST'})
${
  calcResult.isInterState
    ? `IGST (${calcResult.igstRate}%): ₹${calcResult.igstAmount.toLocaleString()}`
    : `CGST (${calcResult.cgstRate}%): ₹${calcResult.cgstAmount.toLocaleString()}\nSGST (${calcResult.sgstRate}%): ₹${calcResult.sgstAmount.toLocaleString()}`
}
Total Tax: ₹${calcResult.totalTax.toLocaleString()}
Gross Total: ₹${calcResult.grossAmount.toLocaleString()}`;

    navigator.clipboard.writeText(text);
    setCopiedCalc(true);
    setTimeout(() => setCopiedCalc(false), 2000);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updated = await updateGstSettings(settingsForm);
      setSettings(updated);
      setIsSettingsModalOpen(false);
      await loadAllData();
    } catch (err) {
      console.error('Failed to save GST settings:', err);
    }
  };

  const handleSaveInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const taxCalc = calculateGstTaxBreakdown(
        newInvoiceForm.taxable_value,
        newInvoiceForm.gst_rate,
        newInvoiceForm.is_inter_state,
        false
      );

      await createGstInvoice({
        invoice_number: newInvoiceForm.invoice_number,
        invoice_date: newInvoiceForm.invoice_date,
        type: newInvoiceForm.type,
        party_name: newInvoiceForm.party_name || 'Walk-in Retail Customer',
        party_gstin: newInvoiceForm.party_gstin || undefined,
        place_of_supply: newInvoiceForm.place_of_supply,
        is_inter_state: newInvoiceForm.is_inter_state,
        hsn_code: newInvoiceForm.hsn_code,
        taxable_value: taxCalc.taxableValue,
        gst_rate: taxCalc.gstRate,
        cgst_amount: taxCalc.cgstAmount,
        sgst_amount: taxCalc.sgstAmount,
        igst_amount: taxCalc.igstAmount,
        total_tax: taxCalc.totalTax,
        total_invoice_amount: taxCalc.grossAmount,
        payment_status: newInvoiceForm.payment_status,
        branch: newInvoiceForm.branch,
      });

      setIsAddInvoiceModalOpen(false);
      // Reset form
      setNewInvoiceForm({
        invoice_number: `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        invoice_date: new Date().toISOString().split('T')[0],
        type: 'B2C (Retail In-Store)',
        party_name: '',
        party_gstin: '',
        place_of_supply: '27-Maharashtra (Intra-State)',
        is_inter_state: false,
        hsn_code: '6109',
        taxable_value: 1000,
        gst_rate: 12,
        payment_status: 'Paid',
        branch: availableBranches[0] || 'Shop 1',
      });
      await loadAllData();
    } catch (err) {
      console.error('Failed to save GST invoice:', err);
    }
  };

  const handleSaveHsn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHsnForm.hsn_code.trim()) return;

    try {
      const halfRate = newHsnForm.gst_rate / 2;
      await createHsnEntry({
        hsn_code: newHsnForm.hsn_code.trim(),
        description: newHsnForm.description.trim() || 'General merchandise item',
        category: newHsnForm.category,
        gst_rate: newHsnForm.gst_rate,
        cgst_rate: halfRate,
        sgst_rate: halfRate,
        igst_rate: newHsnForm.gst_rate,
      });

      setIsAddHsnModalOpen(false);
      setNewHsnForm({
        hsn_code: '',
        description: '',
        category: 'Apparel',
        gst_rate: 12,
      });
      await loadAllData();
    } catch (err) {
      console.error('Failed to save HSN entry:', err);
    }
  };

  const handleDeleteInvoice = async (id: string) => {
    try {
      await deleteGstInvoice(id);
      await loadAllData();
    } catch (err) {
      console.error('Error deleting invoice:', err);
    }
  };

  const handleDeleteHsn = async (id: string) => {
    try {
      await deleteHsnEntry(id);
      await loadAllData();
    } catch (err) {
      console.error('Error deleting HSN:', err);
    }
  };

  const handleExportCsv = () => {
    if (invoices.length === 0) return;
    const headers = [
      'Invoice Number',
      'Date',
      'Type',
      'Party Name',
      'GSTIN',
      'Place of Supply',
      'HSN',
      'Taxable Value (INR)',
      'GST Rate %',
      'CGST (INR)',
      'SGST (INR)',
      'IGST (INR)',
      'Total Tax (INR)',
      'Invoice Total (INR)',
      'Status',
      'Branch',
    ];

    const rows = invoices.map((inv) => [
      inv.invoice_number,
      inv.invoice_date,
      `"${inv.type}"`,
      `"${inv.party_name}"`,
      inv.party_gstin || 'N/A',
      `"${inv.place_of_supply}"`,
      inv.hsn_code || '',
      inv.taxable_value,
      `${inv.gst_rate}%`,
      inv.cgst_amount,
      inv.sgst_amount,
      inv.igst_amount,
      inv.total_tax,
      inv.total_invoice_amount,
      inv.payment_status,
      inv.branch || '',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Pasara_GST_Ledger_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered invoices
  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      inv.invoice_number.toLowerCase().includes(invoiceSearch.toLowerCase()) ||
      inv.party_name.toLowerCase().includes(invoiceSearch.toLowerCase()) ||
      (inv.party_gstin && inv.party_gstin.toLowerCase().includes(invoiceSearch.toLowerCase())) ||
      (inv.hsn_code && inv.hsn_code.includes(invoiceSearch));

    let matchesType = true;
    if (invoiceTypeFilter === 'Outward') {
      matchesType = inv.type !== 'Inward (Supplier Purchase)';
    } else if (invoiceTypeFilter === 'Inward') {
      matchesType = inv.type === 'Inward (Supplier Purchase)';
    } else if (invoiceTypeFilter === 'B2B') {
      matchesType = inv.type === 'B2B (Tax Invoice)';
    } else if (invoiceTypeFilter === 'B2C') {
      matchesType = inv.type.startsWith('B2C');
    }

    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Top Header & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mb-1">
            <span>Finance & Compliance</span>
            <span>/</span>
            <span className="text-emerald-700 font-semibold">GST Management Tools</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
              <FileText className="w-6 h-6 text-emerald-600" />
              GST Compliance & Tax Center
            </h1>
            {settings?.gstin && (
              <button
                type="button"
                onClick={handleCopyGstin}
                title="Click to copy GSTIN"
                className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 border border-slate-300 text-xs font-mono text-slate-700 transition-colors"
              >
                <span>GSTIN: {settings.gstin}</span>
                {copiedGstin ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                )}
              </button>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            Compute output GST liabilities, claim eligible Input Tax Credit (ITC), lookup HSN tax slabs, and prepare GSTR filings.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsSettingsModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-medium transition-colors shadow-xs"
          >
            <Settings className="w-4 h-4 text-slate-500" />
            <span>GST Profile</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAddInvoiceModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-sm font-medium shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New Tax Invoice</span>
          </button>
        </div>
      </div>

      {/* Primary GST Financial Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Output GST (Sales Liability) */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Output GST (Liability)</span>
            <span className="p-1.5 rounded-md bg-rose-50 text-rose-600">
              <ArrowUpRight className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 tabular-nums">
            ₹{stats ? stats.totalOutputGst.toLocaleString('en-IN') : '0'}
          </div>
          <div className="mt-1 text-xs text-slate-500 flex items-center justify-between">
            <span>Sales Base: ₹{stats ? stats.totalTaxableSales.toLocaleString('en-IN') : '0'}</span>
            <span className="font-medium text-slate-700">({(stats?.b2cCount || 0) + (stats?.b2bCount || 0)} Bills)</span>
          </div>
        </div>

        {/* Input Tax Credit (ITC from Purchases) */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Eligible ITC (Credit)</span>
            <span className="p-1.5 rounded-md bg-emerald-50 text-emerald-600">
              <ArrowDownLeft className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-700 tabular-nums">
            ₹{stats ? stats.totalEligibleItc.toLocaleString('en-IN') : '0'}
          </div>
          <div className="mt-1 text-xs text-slate-500 flex items-center justify-between">
            <span>Purchases: ₹{stats ? stats.totalTaxablePurchases.toLocaleString('en-IN') : '0'}</span>
            <span className="font-medium text-slate-700">({stats?.purchaseBillCount || 0} Bills)</span>
          </div>
        </div>

        {/* Net Tax Payable (Output - ITC) */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Net GST Payable</span>
            <span className="p-1.5 rounded-md bg-blue-50 text-blue-600">
              <Receipt className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 tabular-nums">
            ₹{stats ? stats.netGstPayable.toLocaleString('en-IN') : '0'}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {stats && stats.netGstPayable === 0 ? (
              <span className="text-emerald-600 font-medium">Excess ITC Available</span>
            ) : (
              <span>Output Tax minus Eligible ITC</span>
            )}
          </div>
        </div>

        {/* Tax Breakdown Balance */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Tax Type Balances</span>
            <span className="p-1.5 rounded-md bg-purple-50 text-purple-600">
              <Layers className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 space-y-1 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>CGST (Central):</span>
              <strong className="text-slate-900 font-mono">₹{stats ? stats.cgstLiability.toLocaleString('en-IN') : 0}</strong>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>SGST (State):</span>
              <strong className="text-slate-900 font-mono">₹{stats ? stats.sgstLiability.toLocaleString('en-IN') : 0}</strong>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>IGST (Inter-State):</span>
              <strong className="text-slate-900 font-mono">₹{stats ? stats.igstLiability.toLocaleString('en-IN') : 0}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="border-b border-slate-200 bg-white rounded-t-xl px-4 pt-2 flex items-center justify-between overflow-x-auto shadow-xs">
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`px-3.5 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'overview'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Tax Summary</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('calculator')}
            className={`px-3.5 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'calculator'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Calculator className="w-4 h-4" />
            <span>Interactive GST Calculator</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('invoices')}
            className={`px-3.5 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'invoices'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>Invoices & ITC Ledger ({invoices.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('hsn')}
            className={`px-3.5 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'hsn'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Percent className="w-4 h-4" />
            <span>HSN & Tax Slabs ({hsnList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('returns')}
            className={`px-3.5 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'returns'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>GSTR-1 & 3B Filing Worksheet</span>
          </button>
        </div>

        {activeTab === 'invoices' && (
          <button
            type="button"
            onClick={handleExportCsv}
            className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-md border border-slate-200 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        )}
      </div>

      {/* Tab 1: Overview & Return Filing Status */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Actions & Compliance Status */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  GST Compliance & Filing Calendar
                </h3>
                <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                  {settings?.tax_scheme || 'Regular'} Scheme
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/50">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 uppercase">GSTR-1 (Outward Supplies)</span>
                    <span className="text-2xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Auto-Computed
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Details of all B2C in-store counter receipts & B2B corporate tax invoices.
                  </p>
                  <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-slate-200">
                    <span className="text-slate-500">Total Taxable Outward:</span>
                    <strong className="text-slate-900 font-mono">₹{stats?.totalTaxableSales.toLocaleString('en-IN')}</strong>
                  </div>
                </div>

                <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/50">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 uppercase">GSTR-3B (Monthly Summary)</span>
                    <span className="text-2xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      Worksheet Ready
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Consolidated tax liability return with input credit offset calculation.
                  </p>
                  <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-slate-200">
                    <span className="text-slate-500">Net Tax Due:</span>
                    <strong className="text-emerald-700 font-mono">₹{stats?.netGstPayable.toLocaleString('en-IN')}</strong>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span>Next GSTR-3B Due Date: <strong className="text-slate-900">20th of next month</strong></span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('returns')}
                  className="font-semibold text-emerald-700 hover:text-emerald-800 hover:underline flex items-center gap-1"
                >
                  View GSTR Filing Worksheet &rarr;
                </button>
              </div>
            </div>

            {/* Recent Tax Invoices Preview */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-emerald-600" />
                  Recent Tax Invoices & ITC Bills
                </h3>
                <button
                  type="button"
                  onClick={() => setActiveTab('invoices')}
                  className="text-xs font-semibold text-emerald-700 hover:underline"
                >
                  View All ({invoices.length}) &rarr;
                </button>
              </div>

              <div className="divide-y divide-slate-100">
                {invoices.slice(0, 4).map((inv) => (
                  <div key={inv.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50/60 transition-colors">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                          inv.type === 'Inward (Supplier Purchase)'
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-emerald-50 text-emerald-700'
                        }`}
                      >
                        {inv.type === 'Inward (Supplier Purchase)' ? 'ITC' : 'INV'}
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-900 flex items-center gap-2">
                          <span>{inv.invoice_number}</span>
                          <span className="text-2xs font-normal text-slate-400 font-mono">({inv.invoice_date})</span>
                        </div>
                        <div className="text-2xs text-slate-500 mt-0.5">
                          {inv.party_name} • {inv.type}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-bold text-slate-900 font-mono">
                        ₹{inv.total_invoice_amount.toLocaleString('en-IN')}
                      </div>
                      <div className="text-2xs text-slate-500">
                        Tax: ₹{inv.total_tax.toLocaleString('en-IN')} ({inv.gst_rate}%)
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Registered Business Entity Profile */}
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Building className="w-4 h-4 text-emerald-600" />
                  GSTIN Store Profile
                </h3>
                <button
                  type="button"
                  onClick={() => setIsSettingsModalOpen(true)}
                  className="text-xs text-emerald-700 hover:underline font-medium"
                >
                  Edit
                </button>
              </div>

              <div className="mt-3.5 space-y-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-2xs uppercase tracking-wide">GST Identification No.</span>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="font-mono font-bold text-slate-900 text-sm">{settings?.gstin || 'Not Configured'}</span>
                    <button
                      type="button"
                      onClick={handleCopyGstin}
                      className="text-slate-400 hover:text-slate-700"
                    >
                      {copiedGstin ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 block text-2xs uppercase tracking-wide">Legal Entity Name</span>
                  <span className="font-semibold text-slate-800">{settings?.legal_name}</span>
                </div>

                <div>
                  <span className="text-slate-400 block text-2xs uppercase tracking-wide">Trade Name</span>
                  <span className="text-slate-700">{settings?.trade_name}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                  <div>
                    <span className="text-slate-400 block text-2xs uppercase">State Code</span>
                    <span className="font-semibold text-slate-800">{settings?.state_code} - {settings?.state_name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-2xs uppercase">Filing Frequency</span>
                    <span className="font-semibold text-slate-800">{settings?.filing_frequency}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                  <div>
                    <span className="text-slate-400 block text-2xs uppercase">Default HSN</span>
                    <span className="font-mono font-semibold text-slate-800">{settings?.default_hsn}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-2xs uppercase">Default Rate</span>
                    <span className="font-semibold text-slate-800">{settings?.default_gst_rate}%</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveTab('calculator')}
                  className="w-full py-2 px-3 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Calculator className="w-3.5 h-3.5" />
                  Launch Tax Calculator Tool
                </button>
              </div>
            </div>

            {/* Quick Slabs Reference */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                Retail Tax Slabs Matrix
              </h3>
              <div className="space-y-2 text-xs">
                {[
                  { slab: '0% (Exempt)', items: 'Unpackaged raw farm produce, fresh handloom', color: 'bg-slate-100 text-slate-700' },
                  { slab: '5% GST', items: 'Woven cotton fabrics, yarns, select essentials', color: 'bg-blue-50 text-blue-700' },
                  { slab: '12% GST', items: 'Readymade garments, apparel under ₹1000, accessories', color: 'bg-emerald-50 text-emerald-700' },
                  { slab: '18% GST', items: 'Footwear, handbags, premium apparel, retail services', color: 'bg-purple-50 text-purple-700' },
                  { slab: '28% GST', items: 'Luxury goods, commercial electronics & air conditioners', color: 'bg-amber-50 text-amber-700' },
                ].map((s) => (
                  <div key={s.slab} className="p-2 rounded-lg border border-slate-100 flex items-start gap-2.5">
                    <span className={`text-2xs font-bold px-2 py-0.5 rounded shrink-0 ${s.color}`}>
                      {s.slab}
                    </span>
                    <span className="text-2xs text-slate-600 leading-tight">{s.items}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Interactive GST Calculator & Reverse Tax Breakdown */}
      {activeTab === 'calculator' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-5">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Calculator className="w-5 h-5 text-emerald-600" />
                Live GST Tax Calculator
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Calculate forward tax additions or reverse GST extraction from maximum retail price (MRP).
              </p>
            </div>

            {/* Input Amount */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Invoice / Item Amount (₹)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">₹</span>
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={calcAmount}
                  onChange={(e) => setCalcAmount(parseFloat(e.target.value) || 0)}
                  className="w-full pl-8 pr-4 py-2.5 text-lg font-bold font-mono text-slate-900 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none transition-colors"
                />
              </div>
            </div>

            {/* Tax Slab Selection */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                GST Tax Slab Rate (%)
              </label>
              <div className="grid grid-cols-5 gap-2">
                {[0, 5, 12, 18, 28].map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => setCalcRate(rate)}
                    className={`py-2 px-2 text-center rounded-lg text-sm font-bold transition-colors ${
                      calcRate === rate
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {rate}%
                  </button>
                ))}
              </div>
            </div>

            {/* Supply Mode (Intra vs Inter) */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCalcIsInterState(false)}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  !calcIsInterState
                    ? 'border-emerald-500 bg-emerald-50/50 text-emerald-950 font-semibold'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="text-xs font-bold">Intra-State Supply</div>
                <div className="text-2xs text-slate-500 mt-0.5">CGST (50%) + SGST (50%)</div>
              </button>

              <button
                type="button"
                onClick={() => setCalcIsInterState(true)}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  calcIsInterState
                    ? 'border-emerald-500 bg-emerald-50/50 text-emerald-950 font-semibold'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="text-xs font-bold">Inter-State Supply</div>
                <div className="text-2xs text-slate-500 mt-0.5">IGST (100% Integrated)</div>
              </button>
            </div>

            {/* Calculation Mode: Inclusive vs Exclusive */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setCalcIsInclusive(false)}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  !calcIsInclusive
                    ? 'border-emerald-500 bg-emerald-50/50 text-emerald-950 font-semibold'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="text-xs font-bold">GST Exclusive</div>
                <div className="text-2xs text-slate-500 mt-0.5">Add GST on top of base</div>
              </button>

              <button
                type="button"
                onClick={() => setCalcIsInclusive(true)}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  calcIsInclusive
                    ? 'border-emerald-500 bg-emerald-50/50 text-emerald-950 font-semibold'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="text-xs font-bold">GST Inclusive (MRP)</div>
                <div className="text-2xs text-slate-500 mt-0.5">Extract tax component</div>
              </button>
            </div>
          </div>

          {/* Calculator Output Card */}
          <div className="lg:col-span-6 bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Tax Calculation Breakdown
                </span>
                <span className="text-2xs px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                  {calcIsInclusive ? 'Inclusive Extraction' : 'Exclusive Addition'}
                </span>
              </div>

              {calcResult && (
                <div className="mt-5 space-y-4">
                  {/* Base Amount */}
                  <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-500 block">Base Taxable Value</span>
                      <span className="text-xs text-slate-400">Value before GST application</span>
                    </div>
                    <span className="text-xl font-bold font-mono text-slate-900 tabular-nums">
                      ₹{calcResult.taxableValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {/* Tax Lines */}
                  <div className="space-y-2 text-xs">
                    {!calcResult.isInterState ? (
                      <>
                        <div className="flex items-center justify-between p-2.5 rounded-md border border-slate-100">
                          <span className="text-slate-600 font-medium">CGST ({calcResult.cgstRate}%):</span>
                          <span className="font-mono font-bold text-slate-900">
                            ₹{calcResult.cgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-2.5 rounded-md border border-slate-100">
                          <span className="text-slate-600 font-medium">SGST ({calcResult.sgstRate}%):</span>
                          <span className="font-mono font-bold text-slate-900">
                            ₹{calcResult.sgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center justify-between p-2.5 rounded-md border border-slate-100">
                        <span className="text-slate-600 font-medium">IGST ({calcResult.igstRate}%):</span>
                        <span className="font-mono font-bold text-slate-900">
                          ₹{calcResult.igstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between p-2.5 rounded-md bg-amber-50/50 border border-amber-200">
                      <span className="text-amber-900 font-semibold">Total GST Tax Component:</span>
                      <span className="font-mono font-bold text-amber-900">
                        ₹{calcResult.totalTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  {/* Gross Total */}
                  <div className="p-4 rounded-xl bg-emerald-600 text-white shadow-md flex items-center justify-between">
                    <div>
                      <span className="text-xs uppercase tracking-wider text-emerald-100 block">Total Final Invoice Amount</span>
                      <span className="text-2xs text-emerald-200">Base + GST Tax Total</span>
                    </div>
                    <span className="text-2xl font-black font-mono tracking-tight tabular-nums">
                      ₹{calcResult.grossAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-5 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={handleCopyCalculation}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg flex items-center gap-1.5 transition-colors"
              >
                {copiedCalc ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                <span>{copiedCalc ? 'Copied Breakdown!' : 'Copy Tax Note'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Invoices & Tax Ledger Table */}
      {activeTab === 'invoices' && (
        <div className="space-y-4">
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by invoice #, customer/supplier name, GSTIN, HSN..."
                value={invoiceSearch}
                onChange={(e) => setInvoiceSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none transition-colors"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto">
              {(['All', 'Outward', 'Inward', 'B2B', 'B2C'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setInvoiceTypeFilter(tab)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                    invoiceTypeFilter === tab
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Invoice / Date</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Party & GSTIN</th>
                    <th className="py-3 px-4">HSN</th>
                    <th className="py-3 px-4 text-right">Taxable (₹)</th>
                    <th className="py-3 px-4 text-right">GST Rate</th>
                    <th className="py-3 px-4 text-right">Tax (₹)</th>
                    <th className="py-3 px-4 text-right">Total (₹)</th>
                    <th className="py-3 px-4 text-center">Branch</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-500">
                        No GST invoices found matching your criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredInvoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4">
                          <span className="font-mono font-bold text-slate-900 block">{inv.invoice_number}</span>
                          <span className="text-2xs text-slate-400">{inv.invoice_date}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`text-2xs font-semibold px-2 py-0.5 rounded-full inline-block ${
                              inv.type === 'Inward (Supplier Purchase)'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : inv.type === 'B2B (Tax Invoice)'
                                ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            {inv.type}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-medium text-slate-800 block line-clamp-1">{inv.party_name}</span>
                          {inv.party_gstin && (
                            <span className="text-2xs font-mono text-slate-400 block">{inv.party_gstin}</span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600">
                          {inv.hsn_code || '—'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-medium text-slate-900">
                          ₹{inv.taxable_value.toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="font-bold text-slate-700">{inv.gst_rate}%</span>
                          <div className="text-2xs text-slate-400">
                            {inv.is_inter_state ? 'IGST' : 'CGST+SGST'}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900">
                          ₹{inv.total_tax.toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                          ₹{inv.total_invoice_amount.toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="text-2xs font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                            {inv.branch || 'Shop 1'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteInvoice(inv.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                            title="Delete Invoice"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: HSN Directory & Rate Master */}
      {activeTab === 'hsn' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">HSN & SAC Tax Directory</h2>
              <p className="text-xs text-slate-500">
                Official Harmonized System Nomenclature (HSN) tariff directory for clothing, textiles, footwear, and accessories.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsAddHsnModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Custom HSN Code</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {hsnList.map((entry) => (
              <div key={entry.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                      HSN {entry.hsn_code}
                    </span>
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      {entry.gst_rate}% GST
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 font-medium leading-relaxed">{entry.description}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-2xs text-slate-500">
                  <span>Category: <strong className="text-slate-800">{entry.category}</strong></span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono">CGST: {entry.cgst_rate}% • SGST: {entry.sgst_rate}%</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteHsn(entry.id)}
                      className="text-slate-400 hover:text-rose-600 p-0.5 rounded"
                      title="Delete HSN"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 5: GSTR-1 & GSTR-3B Filing Worksheet */}
      {activeTab === 'returns' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Form GSTR-3B: Monthly Tax Return Worksheet
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Legal return filing worksheet summarizing outward taxable supplies, input tax credits, and cash payment liabilities.
                </p>
              </div>

              <button
                type="button"
                onClick={handleExportCsv}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Return Summary (CSV)</span>
              </button>
            </div>

            {/* Table 3.1: Details of Outward Supplies */}
            <div className="mt-6 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                3.1 Details of Outward Supplies and inward supplies liable to reverse charge
              </h3>

              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-4">Nature of Supplies</th>
                      <th className="py-2.5 px-4 text-right">Total Taxable Value (₹)</th>
                      <th className="py-2.5 px-4 text-right">Integrated Tax (₹)</th>
                      <th className="py-2.5 px-4 text-right">Central Tax (₹)</th>
                      <th className="py-2.5 px-4 text-right">State/UT Tax (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    <tr>
                      <td className="py-2.5 px-4 font-sans font-medium text-slate-800">
                        (a) Outward taxable supplies (other than zero rated, nil rated and exempted)
                      </td>
                      <td className="py-2.5 px-4 text-right font-bold text-slate-900">
                        ₹{stats?.totalTaxableSales.toLocaleString('en-IN')}
                      </td>
                      <td className="py-2.5 px-4 text-right text-slate-700">
                        ₹{stats?.igstLiability.toLocaleString('en-IN')}
                      </td>
                      <td className="py-2.5 px-4 text-right text-slate-700">
                        ₹{stats?.cgstLiability.toLocaleString('en-IN')}
                      </td>
                      <td className="py-2.5 px-4 text-right text-slate-700">
                        ₹{stats?.sgstLiability.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Table 4: Eligible ITC */}
            <div className="mt-6 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                4. Eligible Input Tax Credit (ITC) Available
              </h3>

              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-4">Details</th>
                      <th className="py-2.5 px-4 text-right">Integrated Tax (₹)</th>
                      <th className="py-2.5 px-4 text-right">Central Tax (₹)</th>
                      <th className="py-2.5 px-4 text-right">State/UT Tax (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    <tr>
                      <td className="py-2.5 px-4 font-sans font-medium text-slate-800">
                        (A) ITC Available (whether in full or part) - All other ITC from supplier purchases
                      </td>
                      <td className="py-2.5 px-4 text-right text-emerald-700 font-bold">
                        ₹{Math.round((stats?.totalEligibleItc || 0) * 0.4).toLocaleString('en-IN')}
                      </td>
                      <td className="py-2.5 px-4 text-right text-emerald-700 font-bold">
                        ₹{Math.round((stats?.totalEligibleItc || 0) * 0.3).toLocaleString('en-IN')}
                      </td>
                      <td className="py-2.5 px-4 text-right text-emerald-700 font-bold">
                        ₹{Math.round((stats?.totalEligibleItc || 0) * 0.3).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Net Payment Due Box */}
            <div className="mt-6 p-4 rounded-xl bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <span className="text-xs text-slate-400 uppercase tracking-wider block">Net Balance Tax to be paid in Cash</span>
                <span className="text-2xs text-slate-400">Total Output Tax minus Total Available ITC</span>
              </div>
              <div className="text-2xl font-black font-mono text-emerald-400 tabular-nums">
                ₹{stats?.netGstPayable.toLocaleString('en-IN')}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">GST Registration Profile</h2>
                <p className="text-xs text-slate-500 mt-0.5">Configure your store GSTIN and taxpayer parameters.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsSettingsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  15-Digit GSTIN Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 27AAPCP9876M1Z8"
                  value={settingsForm.gstin || ''}
                  onChange={(e) => setSettingsForm({ ...settingsForm, gstin: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-600 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Legal Registered Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Pasara Retail Operations Pvt. Ltd."
                    value={settingsForm.legal_name || ''}
                    onChange={(e) => setSettingsForm({ ...settingsForm, legal_name: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-600 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Trade Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Pasara Multi-Store Retail"
                    value={settingsForm.trade_name || ''}
                    onChange={(e) => setSettingsForm({ ...settingsForm, trade_name: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-600 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Registered State</label>
                  <input
                    type="text"
                    placeholder="e.g. Maharashtra"
                    value={settingsForm.state_name || ''}
                    onChange={(e) => setSettingsForm({ ...settingsForm, state_name: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-600 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">2-Digit State Code</label>
                  <input
                    type="text"
                    placeholder="e.g. 27"
                    value={settingsForm.state_code || ''}
                    onChange={(e) => setSettingsForm({ ...settingsForm, state_code: e.target.value })}
                    className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-600 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tax Scheme</label>
                  <select
                    value={settingsForm.tax_scheme || 'Regular'}
                    onChange={(e) => setSettingsForm({ ...settingsForm, tax_scheme: e.target.value as 'Regular' | 'Composition' })}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-600 outline-none"
                  >
                    <option value="Regular">Regular Taxpayer (ITC Eligible)</option>
                    <option value="Composition">Composition Scheme (1% Turnover)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Filing Frequency</label>
                  <select
                    value={settingsForm.filing_frequency || 'Monthly'}
                    onChange={(e) => setSettingsForm({ ...settingsForm, filing_frequency: e.target.value as 'Monthly' | 'Quarterly' })}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-600 outline-none"
                  >
                    <option value="Monthly">Monthly (GSTR-1 + 3B)</option>
                    <option value="Quarterly">Quarterly (QRMP Scheme)</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsSettingsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
                >
                  Save GST Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Tax Invoice Modal */}
      {isAddInvoiceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Record GST Tax Invoice / Bill</h2>
                <p className="text-xs text-slate-500 mt-0.5">Generate compliant tax record for GSTR ledger.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddInvoiceModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveInvoice} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Invoice Number</label>
                  <input
                    type="text"
                    required
                    value={newInvoiceForm.invoice_number}
                    onChange={(e) => setNewInvoiceForm({ ...newInvoiceForm, invoice_number: e.target.value })}
                    className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-600 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Invoice Date</label>
                  <input
                    type="date"
                    required
                    value={newInvoiceForm.invoice_date}
                    onChange={(e) => setNewInvoiceForm({ ...newInvoiceForm, invoice_date: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-600 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Transaction Type</label>
                <select
                  value={newInvoiceForm.type}
                  onChange={(e) => setNewInvoiceForm({ ...newInvoiceForm, type: e.target.value as GstInvoiceType })}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-600 outline-none"
                >
                  <option value="B2C (Retail In-Store)">B2C (In-Store Retail Sales)</option>
                  <option value="B2C (Online Order)">B2C (Online WhatsApp / Web Order)</option>
                  <option value="B2B (Tax Invoice)">B2B (Corporate / Bulk Tax Invoice)</option>
                  <option value="Inward (Supplier Purchase)">Inward (Supplier Bill / ITC Credit)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Party / Customer Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Walk-in Customer or Supplier"
                    value={newInvoiceForm.party_name}
                    onChange={(e) => setNewInvoiceForm({ ...newInvoiceForm, party_name: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-600 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Party GSTIN (if B2B)</label>
                  <input
                    type="text"
                    placeholder="Optional for B2C"
                    value={newInvoiceForm.party_gstin}
                    onChange={(e) => setNewInvoiceForm({ ...newInvoiceForm, party_gstin: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-600 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Taxable Base (₹)</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={newInvoiceForm.taxable_value}
                    onChange={(e) => setNewInvoiceForm({ ...newInvoiceForm, taxable_value: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-600 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">GST Rate (%)</label>
                  <select
                    value={newInvoiceForm.gst_rate}
                    onChange={(e) => setNewInvoiceForm({ ...newInvoiceForm, gst_rate: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-600 outline-none"
                  >
                    <option value={0}>0%</option>
                    <option value={5}>5%</option>
                    <option value={12}>12%</option>
                    <option value={18}>18%</option>
                    <option value={28}>28%</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Store Branch</label>
                  <select
                    value={newInvoiceForm.branch}
                    onChange={(e) => setNewInvoiceForm({ ...newInvoiceForm, branch: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-600 outline-none"
                  >
                    {availableBranches.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="is_inter_state"
                  checked={newInvoiceForm.is_inter_state}
                  onChange={(e) => setNewInvoiceForm({ ...newInvoiceForm, is_inter_state: e.target.checked })}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="is_inter_state" className="text-xs text-slate-700 font-medium">
                  Inter-State Supply (Charge IGST instead of CGST+SGST)
                </label>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddInvoiceModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
                >
                  Save Tax Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Custom HSN Modal */}
      {isAddHsnModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">Add HSN Code</h2>
              <button
                type="button"
                onClick={() => setIsAddHsnModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveHsn} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">HSN / SAC Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 6109"
                  value={newHsnForm.hsn_code}
                  onChange={(e) => setNewHsnForm({ ...newHsnForm, hsn_code: e.target.value })}
                  className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Goods / Services Description</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cotton polo shirts and knitwear"
                  value={newHsnForm.description}
                  onChange={(e) => setNewHsnForm({ ...newHsnForm, description: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-600 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={newHsnForm.category}
                    onChange={(e) => setNewHsnForm({ ...newHsnForm, category: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-600 outline-none"
                  >
                    <option value="Apparel">Apparel</option>
                    <option value="Footwear">Footwear</option>
                    <option value="Accessories">Accessories</option>
                    <option value="Textiles">Textiles</option>
                    <option value="Services">Services</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">GST Rate (%)</label>
                  <select
                    value={newHsnForm.gst_rate}
                    onChange={(e) => setNewHsnForm({ ...newHsnForm, gst_rate: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-600 outline-none"
                  >
                    <option value={0}>0%</option>
                    <option value={5}>5%</option>
                    <option value={12}>12%</option>
                    <option value={18}>18%</option>
                    <option value={28}>28%</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddHsnModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg"
                >
                  Add HSN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
