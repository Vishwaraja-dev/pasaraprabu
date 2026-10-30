import React, { useState, useEffect, useRef } from 'react';
import {
  QrCode,
  DollarSign,
  CheckCircle2,
  XCircle,
  Share2,
  Maximize2,
  Copy,
  Check,
  Edit2,
  Plus,
  Search,
  Trash2,
  ArrowRight,
  TrendingUp,
  Clock,
  Sparkles,
  Phone,
  User,
  ShieldCheck,
  Receipt,
  Download,
  MessageCircle,
  Instagram,
  Store,
  ExternalLink,
  MapPin,
  Package,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import {
  UpiSettings,
  UpiTransaction,
  UpiPaymentStatus,
  UpiDashboardStats,
  UpiChannel,
  OnlineOrder,
} from '../types';
import {
  getUpiSettings,
  saveUpiSettings,
  getUpiTransactions,
  createUpiTransaction,
  updateUpiTransactionStatus,
  deleteUpiTransaction,
  getUpiDashboardStats,
  getOnlineOrders,
} from '../lib/dataService';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmptyState } from '../components/ui/EmptyState';
import { NavigationPage } from '../components/layout/Sidebar';
import {
  sharePaymentViaWhatsApp,
  buildCustomerPaymentUrl,
  buildUpiPaymentUri,
  svgToPngBlob,
  downloadQrBlob,
} from '../lib/upiShare';

interface UpiManagerPageProps {
  onNavigate?: (page: NavigationPage) => void;
}

export const UpiManagerPage: React.FC<UpiManagerPageProps> = ({ onNavigate }) => {
  const [settings, setSettings] = useState<UpiSettings>({
    upi_id: 'pasara@okhdfcbank',
    payee_name: 'Pasara Store',
    shop_name: 'Shop 1',
  });
  const [transactions, setTransactions] = useState<UpiTransaction[]>([]);
  const [pendingOnlineOrders, setPendingOnlineOrders] = useState<OnlineOrder[]>([]);
  const [stats, setStats] = useState<UpiDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Active QR generation form
  const [amountInput, setAmountInput] = useState<string>('500');
  const [channel, setChannel] = useState<UpiChannel>('WhatsApp');
  const [autoAddOnline, setAutoAddOnline] = useState<boolean>(true);
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [deliveryAddress, setDeliveryAddress] = useState<string>('');
  const [billNote, setBillNote] = useState<string>('WhatsApp Order');
  const [selectedLinkedOrderId, setSelectedLinkedOrderId] = useState<string>('');

  // Currently active generated transaction / feedback banner
  const [activeTx, setActiveTx] = useState<UpiTransaction | null>(null);
  const [createdOrderBanner, setCreatedOrderBanner] = useState<{
    orderNumber: string;
    channel: UpiChannel;
    amount: number;
  } | null>(null);

  // Modals
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isCustomerDisplayOpen, setIsCustomerDisplayOpen] = useState(false);
  const [viewTxModal, setViewTxModal] = useState<UpiTransaction | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UpiTransaction | null>(null);

  // Form states for settings
  const [tempUpiId, setTempUpiId] = useState('');
  const [tempPayeeName, setTempPayeeName] = useState('');
  const [tempShopName, setTempShopName] = useState('');

  // UI feedback states
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedUpiId, setCopiedUpiId] = useState(false);
  const [copiedIgNote, setCopiedIgNote] = useState(false);
  const [copiedCustomerLink, setCopiedCustomerLink] = useState(false);
  const [shareNotice, setShareNotice] = useState<string>('');
  const [isDownloadingQr, setIsDownloadingQr] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'All' | 'WhatsApp' | 'Instagram' | 'Counter' | 'Paid' | 'Not Paid'>('All');
  const [search, setSearch] = useState('');

  const qrRef = useRef<HTMLDivElement>(null);

  const loadData = async () => {
    setLoading(true);
    const [cfg, txs, st, orders] = await Promise.all([
      getUpiSettings(),
      getUpiTransactions(),
      getUpiDashboardStats(),
      getOnlineOrders(),
    ]);
    setSettings(cfg);
    setTransactions(txs);
    setStats(st);
    setPendingOnlineOrders(orders.filter((o) => o.payment_status === 'Pending'));
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute clean numeric amount
  const parsedAmount = Math.max(0, parseFloat(amountInput) || 0);

  // Construct valid standard UPI payment URI
  const upiPaymentUri = `upi://pay?pa=${encodeURIComponent(
    settings.upi_id.trim()
  )}&pn=${encodeURIComponent(
    settings.payee_name.trim()
  )}&am=${parsedAmount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(
    billNote.trim() || `${channel} Order`
  )}`;

  const openSettings = () => {
    setTempUpiId(settings.upi_id);
    setTempPayeeName(settings.payee_name);
    setTempShopName(settings.shop_name || 'Shop 1');
    setIsSettingsModalOpen(true);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempUpiId.trim() || !tempPayeeName.trim()) return;

    const updated = await saveUpiSettings({
      upi_id: tempUpiId.trim(),
      payee_name: tempPayeeName.trim(),
      shop_name: tempShopName.trim(),
    });
    setSettings(updated);
    setIsSettingsModalOpen(false);
  };

  // Handle selecting an existing pending order to pay via UPI QR
  const handleSelectExistingOrder = (orderId: string) => {
    setSelectedLinkedOrderId(orderId);
    if (!orderId) return;

    const ord = pendingOnlineOrders.find((o) => o.id === orderId);
    if (ord) {
      setAmountInput(String(ord.total_amount));
      setCustomerName(ord.customer_name);
      setCustomerPhone(ord.customer_phone);
      setDeliveryAddress(ord.customer_address || '');
      setChannel(ord.sales_channel);
      setBillNote(`${ord.order_number} - ${ord.items?.[0]?.product_name || 'Online Order'}`);
    }
  };

  const handleCreateTrackedTransaction = async (status: UpiPaymentStatus = 'Not Paid') => {
    if (parsedAmount <= 0) return;

    const linkedOrd = selectedLinkedOrderId
      ? pendingOnlineOrders.find((o) => o.id === selectedLinkedOrderId)
      : undefined;

    const newTx = await createUpiTransaction({
      amount: parsedAmount,
      channel,
      customer_name: customerName.trim() || undefined,
      customer_phone: customerPhone.trim() || undefined,
      delivery_address: deliveryAddress.trim() || undefined,
      note: billNote.trim() || `${channel} Order`,
      status,
      upi_id: settings.upi_id,
      payee_name: settings.payee_name,
      linked_order_id: linkedOrd?.id,
      linked_order_number: linkedOrd?.order_number,
      autoAddToOnlineOrders: autoAddOnline,
    });

    setActiveTx(newTx);

    if (channel === 'WhatsApp' || channel === 'Instagram') {
      setCreatedOrderBanner({
        orderNumber: newTx.linked_order_number || 'New Order',
        channel,
        amount: newTx.amount,
      });
    }

    await loadData();
  };

  const handleToggleStatus = async (txId: string, currentStatus: UpiPaymentStatus) => {
    const nextStatus: UpiPaymentStatus = currentStatus === 'Paid' ? 'Not Paid' : 'Paid';
    await updateUpiTransactionStatus(txId, nextStatus);
    if (activeTx?.id === txId) {
      setActiveTx((prev) => (prev ? { ...prev, status: nextStatus } : null));
    }
    await loadData();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteUpiTransaction(deleteTarget.id);
    if (activeTx?.id === deleteTarget.id) {
      setActiveTx(null);
    }
    setDeleteTarget(null);
    await loadData();
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(upiPaymentUri);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyUpiId = () => {
    navigator.clipboard.writeText(settings.upi_id);
    setCopiedUpiId(true);
    setTimeout(() => setCopiedUpiId(false), 2000);
  };

  const currentPayUrl = buildCustomerPaymentUrl({
    amount: parsedAmount,
    payeeName: settings.payee_name,
    upiId: settings.upi_id,
    refId: activeTx?.reference_id || `UPI-${Date.now().toString().slice(-4)}`,
    note: billNote,
    customerName,
    orderNumber: activeTx?.linked_order_number,
  });

  const handleCopyCustomerPaymentUrl = () => {
    navigator.clipboard.writeText(currentPayUrl);
    setCopiedCustomerLink(true);
    setTimeout(() => setCopiedCustomerLink(false), 2000);
  };

  const handleDownloadCurrentQr = async () => {
    const svgEl = qrRef.current?.querySelector('svg') as SVGSVGElement | null;
    if (!svgEl) return;
    setIsDownloadingQr(true);
    try {
      const blob = await svgToPngBlob(svgEl);
      if (blob) {
        downloadQrBlob(blob, `UPI-QR-${activeTx?.reference_id || 'Counter'}.png`);
        setShareNotice('QR code image downloaded! Ready to share or send in WhatsApp.');
        setTimeout(() => setShareNotice(''), 4000);
      }
    } catch (e) {
      console.warn('Download error:', e);
    } finally {
      setIsDownloadingQr(false);
    }
  };

  const handleShareWhatsApp = async (specificTx?: UpiTransaction) => {
    const tx = specificTx || activeTx;
    const amount = tx ? tx.amount : parsedAmount;
    const refId = tx?.reference_id || `UPI-${Date.now().toString().slice(-4)}`;
    const phone = tx?.customer_phone || customerPhone;
    const name = tx?.customer_name || customerName;
    const note = tx?.note || billNote;
    const orderNum = tx?.linked_order_number;

    const svgEl = qrRef.current?.querySelector('svg') as SVGSVGElement | null;

    const res = await sharePaymentViaWhatsApp({
      amount,
      payeeName: settings.payee_name,
      upiId: settings.upi_id,
      refId,
      customerPhone: phone,
      customerName: name,
      note,
      orderNumber: orderNum,
      svgElement: svgEl,
    });

    if (res.downloadedQr) {
      setShareNotice('QR Code image downloaded! You can attach it directly into your WhatsApp message.');
      setTimeout(() => setShareNotice(''), 5000);
    } else if (res.sharedDirectly) {
      setShareNotice('QR Code and Google Pay link shared directly to WhatsApp!');
      setTimeout(() => setShareNotice(''), 4000);
    }
  };

  const handleCopyInstagramNote = () => {
    const orderLabel = activeTx?.linked_order_number ? `Order #${activeTx.linked_order_number}` : 'Your Order';
    const igMessage = `Hey ${customerName || 'there'}! 👋
Here is your UPI payment link for ${orderLabel} (₹${parsedAmount.toFixed(2)}):

📲 Google Pay / UPI: ${upiPaymentUri}
🌐 Pay / Scan QR Online: ${currentPayUrl}

UPI ID: ${settings.upi_id}
Payee: ${settings.payee_name}

Amount of ₹${parsedAmount.toFixed(2)} is automatically pre-filled in Google Pay!
Please send a screenshot once paid so we can dispatch your parcel! 🛍️`;

    navigator.clipboard.writeText(igMessage);
    setCopiedIgNote(true);
    setTimeout(() => setCopiedIgNote(false), 2000);
  };

  // Quick preset amount additions
  const handleAddPreset = (val: number) => {
    setAmountInput((prev) => {
      const current = parseFloat(prev) || 0;
      return String(current + val);
    });
  };

  const filteredTransactions = transactions.filter((tx) => {
    let matchesFilter = true;
    if (statusFilter === 'Paid') matchesFilter = tx.status === 'Paid';
    else if (statusFilter === 'Not Paid') matchesFilter = tx.status === 'Not Paid';
    else if (statusFilter === 'WhatsApp') matchesFilter = tx.channel === 'WhatsApp';
    else if (statusFilter === 'Instagram') matchesFilter = tx.channel === 'Instagram';
    else if (statusFilter === 'Counter') matchesFilter = tx.channel === 'Counter' || !tx.channel;

    const q = search.toLowerCase();
    const matchesSearch =
      tx.reference_id.toLowerCase().includes(q) ||
      (tx.customer_name && tx.customer_name.toLowerCase().includes(q)) ||
      (tx.note && tx.note.toLowerCase().includes(q)) ||
      (tx.linked_order_number && tx.linked_order_number.toLowerCase().includes(q));

    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* 1. UPI DASHBOARD STATS OVERVIEW */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            UPI Payment & Channel Collections
          </h3>
          <span className="text-2xs text-slate-500 font-medium">Real-time collections & payment status</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-2xs font-semibold uppercase tracking-wider text-slate-500 block">
              Today's UPI Collected
            </span>
            <span className="text-2xl font-bold text-slate-900 mt-1 block tabular-nums">
              ₹{stats ? stats.todayCollected.toFixed(2) : '0.00'}
            </span>
            <span className="text-2xs text-slate-400 mt-0.5 block">
              {stats?.todayCount || 0} payments cleared today
            </span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-2xs font-semibold uppercase tracking-wider text-slate-500 block">
              Total UPI Collected
            </span>
            <span className="text-2xl font-bold text-emerald-700 mt-1 block tabular-nums">
              ₹{stats ? stats.totalCollected.toFixed(2) : '0.00'}
            </span>
            <span className="text-2xs text-slate-400 mt-0.5 block">Lifetime received volume</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-xs bg-amber-50/20">
            <span className="text-2xs font-semibold uppercase tracking-wider text-amber-800 block">
              Pending / Unpaid
            </span>
            <span className="text-2xl font-bold text-amber-700 mt-1 block tabular-nums">
              ₹{stats ? stats.pendingAmount.toFixed(2) : '0.00'}
            </span>
            <span className="text-2xs text-amber-700/80 mt-0.5 block">
              {stats?.pendingCount || 0} unpaid QR requests
            </span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-2xs font-semibold uppercase tracking-wider text-slate-500 block">
              Total QR Requests
            </span>
            <span className="text-2xl font-bold text-slate-900 mt-1 block tabular-nums">
              {stats?.totalTransactions || 0}
            </span>
            <span className="text-2xs text-slate-400 mt-0.5 block">Generated bills</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs col-span-2 sm:col-span-1">
            <span className="text-2xs font-semibold uppercase tracking-wider text-slate-500 block">
              Collection Success Rate
            </span>
            <span className="text-2xl font-bold text-slate-900 mt-1 block tabular-nums">
              {stats && stats.totalTransactions > 0
                ? `${(
                    ((stats.totalTransactions - stats.pendingCount) / stats.totalTransactions) *
                    100
                  ).toFixed(0)}%`
                : '100%'}
            </span>
            <span className="text-2xs text-slate-400 mt-0.5 block">Paid vs Generated</span>
          </div>
        </div>
      </section>

      {/* 2. FIXED UPI ID CONFIGURATION BAR */}
      <div className="bg-slate-900 text-white rounded-xl p-5 shadow-xs border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-lg bg-emerald-600 flex items-center justify-center text-white shrink-0 shadow-xs">
            <QrCode className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Fixed Business UPI ID
              </span>
              <span className="inline-flex items-center gap-1 text-3xs font-bold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                <ShieldCheck className="w-3 h-3 text-emerald-400" /> Auto-Price Dynamic QR
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="font-mono font-bold text-base sm:text-lg text-white tracking-wide">
                {settings.upi_id}
              </span>
              <button
                type="button"
                onClick={handleCopyUpiId}
                title="Copy UPI ID"
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                {copiedUpiId ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Payee: <span className="font-semibold text-slate-200">{settings.payee_name}</span> •{' '}
              {settings.shop_name || 'Main Shop'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={openSettings}
          className="inline-flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors shadow-xs shrink-0"
        >
          <Edit2 className="w-3.5 h-3.5" />
          Configure UPI ID
        </button>
      </div>

      {/* SUCCESS NOTIFICATION WHEN ORDER ADDED TO WHATSAPP / INSTAGRAM LIST */}
      {createdOrderBanner && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-200 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
              {createdOrderBanner.channel === 'WhatsApp' ? (
                <MessageCircle className="w-4 h-4" />
              ) : (
                <Instagram className="w-4 h-4" />
              )}
            </div>
            <div>
              <p className="text-sm font-bold text-emerald-950 flex items-center gap-2">
                <span>Added to {createdOrderBanner.channel} Orders List!</span>
                <span className="font-mono text-xs bg-emerald-200/70 text-emerald-900 px-2 py-0.5 rounded font-bold">
                  {createdOrderBanner.orderNumber}
                </span>
              </p>
              <p className="text-xs text-emerald-800 mt-0.5">
                Amount ₹{createdOrderBanner.amount.toFixed(2)} has been recorded into the {createdOrderBanner.channel} orders pipeline.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigate?.('online-sales')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
            >
              <span>View in Online Orders</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setCreatedOrderBanner(null)}
              className="text-xs text-emerald-800 hover:text-emerald-950 px-2 py-1"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* 3. DYNAMIC AMOUNT QR GENERATOR & REALTIME SCAN PANEL */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Input Form (7 cols) */}
        <div className="lg:col-span-7 bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
            <div>
              <h4 className="font-bold text-slate-900 text-base">Generate UPI QR Counter</h4>
              <p className="text-xs text-slate-500">
                Choose sales channel; amount auto-syncs with your online orders list.
              </p>
            </div>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 shrink-0">
              Live Auto-Price
            </span>
          </div>

          {/* CHANNEL SELECTION: WHATSAPP, INSTAGRAM, COUNTER */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Select Sales Channel *
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setChannel('WhatsApp');
                  setAutoAddOnline(true);
                  if (billNote === 'Counter purchase' || billNote === 'Instagram Order') {
                    setBillNote('WhatsApp Order');
                  }
                }}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  channel === 'WhatsApp'
                    ? 'border-emerald-600 bg-emerald-50/70 text-emerald-950 shadow-xs ring-1 ring-emerald-600'
                    : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className={`p-1.5 rounded-lg ${channel === 'WhatsApp' ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'}`}>
                    <MessageCircle className="w-4 h-4" />
                  </div>
                  {channel === 'WhatsApp' && (
                    <span className="w-2 h-2 rounded-full bg-emerald-600" />
                  )}
                </div>
                <div>
                  <div className="text-xs font-bold">WhatsApp</div>
                  <div className="text-3xs text-slate-500 mt-0.5">Adds to WA order list</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setChannel('Instagram');
                  setAutoAddOnline(true);
                  if (billNote === 'Counter purchase' || billNote === 'WhatsApp Order') {
                    setBillNote('Instagram Order');
                  }
                }}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  channel === 'Instagram'
                    ? 'border-purple-600 bg-purple-50/70 text-purple-950 shadow-xs ring-1 ring-purple-600'
                    : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className={`p-1.5 rounded-lg ${channel === 'Instagram' ? 'bg-purple-600 text-white' : 'bg-slate-200 text-slate-700'}`}>
                    <Instagram className="w-4 h-4" />
                  </div>
                  {channel === 'Instagram' && (
                    <span className="w-2 h-2 rounded-full bg-purple-600" />
                  )}
                </div>
                <div>
                  <div className="text-xs font-bold">Instagram</div>
                  <div className="text-3xs text-slate-500 mt-0.5">Adds to IG order list</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setChannel('Counter');
                  setAutoAddOnline(false);
                  if (billNote === 'WhatsApp Order' || billNote === 'Instagram Order') {
                    setBillNote('Counter purchase');
                  }
                }}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  channel === 'Counter'
                    ? 'border-slate-800 bg-slate-100 text-slate-900 shadow-xs ring-1 ring-slate-800'
                    : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className={`p-1.5 rounded-lg ${channel === 'Counter' ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-700'}`}>
                    <Store className="w-4 h-4" />
                  </div>
                  {channel === 'Counter' && (
                    <span className="w-2 h-2 rounded-full bg-slate-800" />
                  )}
                </div>
                <div>
                  <div className="text-xs font-bold">In-Store POS</div>
                  <div className="text-3xs text-slate-500 mt-0.5">Counter walk-in QR</div>
                </div>
              </button>
            </div>
          </div>

          {/* QUICK LINK TO EXISTING PENDING ONLINE ORDERS */}
          {pendingOnlineOrders.length > 0 && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-emerald-600" />
                  Link to Existing Pending Online Order (Optional)
                </label>
                {selectedLinkedOrderId && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedLinkedOrderId('');
                      setAmountInput('500');
                    }}
                    className="text-3xs text-rose-600 hover:underline font-semibold"
                  >
                    Clear Selection
                  </button>
                )}
              </div>
              <select
                value={selectedLinkedOrderId}
                onChange={(e) => handleSelectExistingOrder(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 font-medium focus:ring-1 focus:ring-emerald-600 outline-none"
              >
                <option value="">➕ Or create a new {channel} order directly below...</option>
                {pendingOnlineOrders.map((ord) => (
                  <option key={ord.id} value={ord.id}>
                    {ord.order_number} — {ord.customer_name} ({ord.sales_channel}) — ₹{ord.total_amount.toFixed(2)} [Pending]
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Large Amount Field */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Payment Amount (₹ INR) *
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-emerald-600">
                ₹
              </span>
              <input
                type="number"
                min="1"
                step="any"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                placeholder="0.00"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-2xl sm:text-3xl font-extrabold text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600 transition-colors tabular-nums"
              />
            </div>
          </div>

          {/* Quick preset chips */}
          <div className="space-y-1.5">
            <span className="text-3xs font-bold uppercase tracking-wider text-slate-500">
              Quick Add Amount
            </span>
            <div className="flex flex-wrap gap-2">
              {[50, 100, 200, 500, 1000, 2000].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleAddPreset(val)}
                  className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 transition-colors"
                >
                  +₹{val}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setAmountInput('0')}
                className="px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Customer & Note details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-400" /> Customer Name
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder={channel === 'WhatsApp' ? 'e.g. Maya Lin (WhatsApp)' : 'e.g. Rahul Sharma'}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-slate-400" /> WhatsApp / Contact Number
              </label>
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg font-mono focus:ring-1 focus:ring-emerald-600 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Bill Note / Ordered Product
              </label>
              <input
                type="text"
                value={billNote}
                onChange={(e) => setBillNote(e.target.value)}
                placeholder="e.g. Cotton Shirt (Black, L)"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" /> Delivery Address (Optional)
              </label>
              <input
                type="text"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                placeholder="e.g. 42 Pine St, Apt 3B, New York"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-600 focus:outline-none"
              />
            </div>
          </div>

          {/* CHECKBOX: AUTO-ADD TO ONLINE ORDERS */}
          {(channel === 'WhatsApp' || channel === 'Instagram') && (
            <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="auto_add_online"
                  checked={autoAddOnline}
                  onChange={(e) => setAutoAddOnline(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                />
                <label htmlFor="auto_add_online" className="text-xs font-medium text-emerald-950 cursor-pointer">
                  Auto-add this ₹{parsedAmount.toFixed(2)} amount to <strong>{channel} Order List</strong>
                </label>
              </div>
              <span className="text-3xs font-bold text-emerald-700 uppercase tracking-wide bg-emerald-100 px-2 py-0.5 rounded">
                Synced
              </span>
            </div>
          )}

          {/* Action buttons */}
          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => handleCreateTrackedTransaction('Not Paid')}
              disabled={parsedAmount <= 0}
              className="flex-1 min-w-[160px] inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 disabled:opacity-50 rounded-lg shadow-xs transition-colors"
            >
              <Receipt className="w-4 h-4 text-slate-500" />
              <span>
                {channel === 'Counter' ? 'Save Bill (Unpaid)' : `Add to ${channel} Orders (Pending)`}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleCreateTrackedTransaction('Paid')}
              disabled={parsedAmount <= 0}
              className="flex-1 min-w-[160px] inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg shadow-xs transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {channel === 'Counter' ? 'Record as Paid' : `Record as Paid in ${channel}`}
              </span>
            </button>
          </div>
        </div>

        {/* Right: Realtime Dynamic QR Preview & Customer Display (5 cols) */}
        <div className="lg:col-span-5 bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col items-center text-center space-y-4">
          <div className="w-full flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Live Dynamic QR
              </span>
              <span
                className={`text-3xs font-bold px-2 py-0.5 rounded-full ${
                  channel === 'WhatsApp'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : channel === 'Instagram'
                    ? 'bg-purple-50 text-purple-700 border border-purple-200'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                {channel} Mode
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsCustomerDisplayOpen(true)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg transition-colors"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              Customer Screen
            </button>
          </div>

          {/* The QR Code Container */}
          <div
            ref={qrRef}
            className="p-4 bg-white rounded-xl border-2 border-emerald-500/30 shadow-md flex flex-col items-center justify-center relative"
          >
            <QRCodeSVG
              value={upiPaymentUri}
              size={210}
              level="H"
              includeMargin={true}
            />

            {/* Price Badge Overlay */}
            <div className="mt-3 px-4 py-1.5 bg-emerald-600 text-white rounded-full font-bold text-sm tracking-wide shadow-xs flex items-center gap-1.5 tabular-nums">
              <span>Scan to Pay: ₹{parsedAmount.toFixed(2)}</span>
            </div>
          </div>

          {/* Payee Info */}
          <div className="space-y-1">
            <p className="font-bold text-slate-900 text-sm">{settings.payee_name}</p>
            <p className="text-xs font-mono text-emerald-700 font-semibold">{settings.upi_id}</p>
            <p className="text-2xs text-slate-400">
              Scan with Google Pay, PhonePe, Paytm, BHIM, or any UPI app
            </p>
          </div>

          {/* Quick Sharing & Status Toggle for Active Bill */}
          <div className="w-full pt-3 border-t border-slate-100 space-y-2">
            {activeTx && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                <div className="text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-slate-900">
                      {activeTx.reference_id}
                    </span>
                    {activeTx.linked_order_number && (
                      <span className="font-mono text-3xs font-semibold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded">
                        {activeTx.linked_order_number}
                      </span>
                    )}
                  </div>
                  <span className="text-2xs text-slate-400">
                    {activeTx.channel || 'Counter'} • ₹{activeTx.amount.toFixed(2)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleStatus(activeTx.id, activeTx.status)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeTx.status === 'Paid'
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs'
                      : 'bg-amber-100 text-amber-800 hover:bg-amber-200 border border-amber-300'
                  }`}
                >
                  {activeTx.status === 'Paid' ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Status: Paid
                    </>
                  ) : (
                    <>
                      <XCircle className="w-3.5 h-3.5" />
                      Status: Not Paid
                    </>
                  )}
                </button>
              </div>
            )}

            {shareNotice && (
              <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-semibold flex items-center justify-between text-left animate-in fade-in">
                <span>{shareNotice}</span>
                <button
                  type="button"
                  onClick={() => setShareNotice('')}
                  className="text-emerald-700 hover:text-emerald-950 font-bold ml-2"
                >
                  ✕
                </button>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleShareWhatsApp()}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
                  title="Sends QR image, Google Pay deep-link and web checkout URL"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Send on WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadCurrentQr}
                  disabled={isDownloadingQr}
                  className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition-colors border border-slate-300"
                  title="Download crisp QR PNG image to attach or save"
                >
                  <Download className="w-4 h-4 text-slate-600" />
                  <span>{isDownloadingQr ? 'Saving...' : 'Download QR'}</span>
                </button>
              </div>

              {channel === 'Instagram' && (
                <button
                  type="button"
                  onClick={handleCopyInstagramNote}
                  className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                >
                  <Instagram className="w-4 h-4" />
                  <span>{copiedIgNote ? 'Copied DM Note!' : 'Copy IG Message with Link'}</span>
                </button>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCopyCustomerPaymentUrl}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold border border-slate-300 shadow-xs transition-colors"
                  title="Copy customer checkout link with Google Pay button and QR"
                >
                  {copiedCustomerLink ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Share2 className="w-3.5 h-3.5 text-slate-500" />
                  )}
                  <span>{copiedCustomerLink ? 'Payment Link Copied!' : 'Copy Payment URL'}</span>
                </button>

                <a
                  href={currentPayUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold transition-colors"
                  title="Open live customer payment portal"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Preview Checkout</span>
                </a>
              </div>

              <div className="flex gap-2 pt-1 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg text-3xs font-medium border border-slate-200 transition-colors"
                >
                  {copiedLink ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-slate-400" />}
                  <span>{copiedLink ? 'URI Copied!' : 'Copy UPI URI'}</span>
                </button>

                {onNavigate && (
                  <button
                    type="button"
                    onClick={() => onNavigate('online-sales')}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg text-3xs font-medium border border-slate-200 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3 text-slate-400" />
                    <span>Go to Online Orders</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. TRANSACTION HISTORY TABLE WITH CHANNEL & PAID / NOT PAID FILTER */}
      <section className="space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {(['All', 'WhatsApp', 'Instagram', 'Counter', 'Paid', 'Not Paid'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  statusFilter === st
                    ? 'bg-slate-900 text-white shadow-xs font-bold'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search reference # or customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
            />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Loading UPI transactions...
            </div>
          ) : filteredTransactions.length === 0 ? (
            <EmptyState
              icon={QrCode}
              title="No UPI payment requests found"
              description="Enter a bill amount above to generate a dynamic auto-updating QR code for your customer."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4">Ref #</th>
                    <th className="py-3 px-4">Channel</th>
                    <th className="py-3 px-4">Customer Details</th>
                    <th className="py-3 px-4">Linked Order</th>
                    <th className="py-3 px-4 text-right">Amount (₹)</th>
                    <th className="py-3 px-4">Created Time</th>
                    <th className="py-3 px-4">Payment Status</th>
                    <th className="py-3 px-4 text-center">Toggle Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {tx.reference_id}
                      </td>
                      <td className="py-3 px-4">
                        {tx.channel === 'WhatsApp' ? (
                          <span className="inline-flex items-center gap-1 text-2xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <MessageCircle className="w-3 h-3" />
                            WhatsApp
                          </span>
                        ) : tx.channel === 'Instagram' ? (
                          <span className="inline-flex items-center gap-1 text-2xs font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                            <Instagram className="w-3 h-3" />
                            Instagram
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-2xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                            <Store className="w-3 h-3" />
                            Counter
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-900 block">
                          {tx.customer_name || 'Walk-in Customer'}
                        </span>
                        {tx.customer_phone && (
                          <span className="text-slate-400 font-mono text-3xs block">
                            {tx.customer_phone}
                          </span>
                        )}
                        {tx.note && <span className="text-slate-500 text-3xs block">{tx.note}</span>}
                      </td>
                      <td className="py-3 px-4">
                        {tx.linked_order_number ? (
                          <button
                            type="button"
                            onClick={() => onNavigate?.('online-sales')}
                            className="font-mono text-xs font-bold text-emerald-700 hover:text-emerald-900 hover:underline flex items-center gap-1"
                            title="Click to view in Online Orders list"
                          >
                            <span>{tx.linked_order_number}</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </button>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 text-sm tabular-nums">
                        ₹{Number(tx.amount).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {new Date(tx.created_at).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                        })}{' '}
                        •{' '}
                        {new Date(tx.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={tx.status} size="sm" />
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(tx.id, tx.status)}
                          className={`px-3 py-1 rounded-lg font-bold text-xs transition-colors shadow-2xs ${
                            tx.status === 'Paid'
                              ? 'bg-emerald-50 text-emerald-800 hover:bg-amber-50 hover:text-amber-800 border border-emerald-200'
                              : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs'
                          }`}
                          title="Click to toggle Paid / Not Paid"
                        >
                          {tx.status === 'Paid' ? 'Mark Unpaid' : 'Mark Paid ✓'}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleShareWhatsApp(tx)}
                            title="Share on WhatsApp with QR & Google Pay link"
                            className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-md transition-colors"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </button>
                          <a
                            href={buildCustomerPaymentUrl({
                              amount: tx.amount,
                              payeeName: tx.payee_name,
                              upiId: tx.upi_id,
                              refId: tx.reference_id,
                              note: tx.note,
                              customerName: tx.customer_name,
                              orderNumber: tx.linked_order_number,
                            })}
                            target="_blank"
                            rel="noreferrer"
                            title="Open Customer Checkout Page"
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                          <button
                            type="button"
                            onClick={() => setViewTxModal(tx)}
                            title="View QR & Receipt"
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                          >
                            <Receipt className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(tx)}
                            title="Delete Record"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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
      </section>

      {/* 5. FULLSCREEN / TABLET CUSTOMER SCAN SCREEN */}
      {isCustomerDisplayOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-between p-6 sm:p-12 text-white animate-in fade-in duration-200">
          <div className="w-full max-w-md flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-semibold tracking-wider uppercase text-emerald-400">
                Ready for Customer Scan ({channel})
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsCustomerDisplayOpen(false)}
              className="text-slate-400 hover:text-white px-3 py-1 rounded-lg bg-slate-800 text-xs font-semibold transition-colors"
            >
              Close Display ✕
            </button>
          </div>

          <div className="my-auto flex flex-col items-center text-center max-w-sm space-y-6">
            <div>
              <span className="text-slate-400 text-xs uppercase tracking-widest font-semibold block mb-1">
                Scan to Pay
              </span>
              <h2 className="text-2xl font-bold text-white tracking-tight">
                {settings.payee_name}
              </h2>
              <p className="text-sm font-mono text-emerald-400 mt-0.5">{settings.upi_id}</p>
            </div>

            {/* QR Card */}
            <div className="p-6 bg-white rounded-3xl shadow-2xl border-4 border-emerald-500/50 flex flex-col items-center justify-center">
              <QRCodeSVG
                value={upiPaymentUri}
                size={260}
                level="H"
                includeMargin={true}
              />
            </div>

            {/* Auto Updated Amount Banner */}
            <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Total Amount Due
              </span>
              <span className="text-4xl sm:text-5xl font-extrabold text-emerald-400 mt-1 block tracking-tight font-mono tabular-nums">
                ₹{parsedAmount.toFixed(2)}
              </span>
              {billNote && (
                <span className="text-xs text-slate-400 mt-1 block">{billNote}</span>
              )}
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Open <b>Google Pay</b>, <b>PhonePe</b>, <b>Paytm</b>, or any UPI app to scan. The
              amount is pre-filled automatically!
            </p>
          </div>

          <div className="w-full max-w-md flex justify-center text-slate-500 text-xs">
            <span>Powered by Pasara UPI Manager</span>
          </div>
        </div>
      )}

      {/* 6. SETTINGS MODAL: CONFIGURE FIXED UPI ID & PAYEE NAME */}
      <Modal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        title="Configure Store UPI ID"
        subtitle="This fixed UPI ID will be used for all QR payments and links"
        maxWidth="md"
      >
        <form onSubmit={handleSaveSettings} className="space-y-4 text-sm">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Your UPI ID (VPA) *
            </label>
            <input
              type="text"
              required
              value={tempUpiId}
              onChange={(e) => setTempUpiId(e.target.value)}
              placeholder="e.g. pasara@okhdfcbank, 9876543210@paytm"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-sm focus:ring-1 focus:ring-emerald-600 focus:outline-none"
            />
            <p className="text-2xs text-slate-400 mt-1">
              Payments sent to this UPI ID will be credited directly to your bank account.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Payee Business Name *
            </label>
            <input
              type="text"
              required
              value={tempPayeeName}
              onChange={(e) => setTempPayeeName(e.target.value)}
              placeholder="e.g. Pasara Retail Store"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-1 focus:ring-emerald-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Store Location / Shop Name
            </label>
            <input
              type="text"
              value={tempShopName}
              onChange={(e) => setTempShopName(e.target.value)}
              placeholder="Shop 1"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-1 focus:ring-emerald-600 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsSettingsModalOpen(false)}
              className="px-4 py-2 text-sm text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors"
            >
              Save & Apply UPI ID
            </button>
          </div>
        </form>
      </Modal>

      {/* 7. VIEW TRANSACTION QR & RECEIPT MODAL */}
      <Modal
        isOpen={!!viewTxModal}
        onClose={() => setViewTxModal(null)}
        title="UPI Payment Receipt"
        subtitle={`Ref: ${viewTxModal?.reference_id || ''}`}
        maxWidth="sm"
      >
        {viewTxModal && (
          <div className="space-y-4 text-xs">
            <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-xl border border-slate-200">
              <QRCodeSVG
                value={`upi://pay?pa=${encodeURIComponent(viewTxModal.upi_id)}&pn=${encodeURIComponent(
                  viewTxModal.payee_name
                )}&am=${Number(viewTxModal.amount).toFixed(2)}&cu=INR&tn=${encodeURIComponent(
                  viewTxModal.note || viewTxModal.reference_id
                )}`}
                size={180}
                level="H"
                includeMargin={true}
              />
              <span className="text-2xl font-bold font-mono text-slate-900 mt-3 tabular-nums">
                ₹{Number(viewTxModal.amount).toFixed(2)}
              </span>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Payment Status:</span>
                <StatusBadge status={viewTxModal.status} size="sm" />
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Sales Channel:</span>
                <span className="font-semibold text-slate-900">{viewTxModal.channel || 'Counter'}</span>
              </div>
              {viewTxModal.linked_order_number && (
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Linked Order:</span>
                  <span className="font-mono font-bold text-emerald-700">{viewTxModal.linked_order_number}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Customer:</span>
                <span className="font-semibold text-slate-900">
                  {viewTxModal.customer_name || 'Walk-in Customer'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">UPI ID:</span>
                <span className="font-mono text-slate-700 font-semibold">{viewTxModal.upi_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Created At:</span>
                <span className="text-slate-700">
                  {new Date(viewTxModal.created_at).toLocaleString()}
                </span>
              </div>
              {viewTxModal.paid_at && (
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Paid At:</span>
                  <span className="text-emerald-700 font-bold">
                    {new Date(viewTxModal.paid_at).toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  handleShareWhatsApp(viewTxModal);
                  setViewTxModal(null);
                }}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Send on WhatsApp</span>
              </button>
              <a
                href={buildCustomerPaymentUrl({
                  amount: viewTxModal.amount,
                  payeeName: viewTxModal.payee_name,
                  upiId: viewTxModal.upi_id,
                  refId: viewTxModal.reference_id,
                  note: viewTxModal.note,
                  customerName: viewTxModal.customer_name,
                  orderNumber: viewTxModal.linked_order_number,
                })}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Portal</span>
              </a>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => {
                  handleToggleStatus(viewTxModal.id, viewTxModal.status);
                  setViewTxModal(null);
                }}
                className="px-3 py-1.5 text-xs font-semibold bg-slate-100 text-slate-800 hover:bg-slate-200 rounded-lg transition-colors border border-slate-300"
              >
                Switch to {viewTxModal.status === 'Paid' ? 'Not Paid' : 'Paid'}
              </button>
              <button
                type="button"
                onClick={() => setViewTxModal(null)}
                className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 rounded-lg border border-slate-300 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Record Confirm */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Payment Record"
        message={`Are you sure you want to remove reference ${deleteTarget?.reference_id} for ₹${deleteTarget?.amount}?`}
        confirmLabel="Delete Record"
      />
    </div>
  );
};
