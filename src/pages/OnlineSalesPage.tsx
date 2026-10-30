import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Plus,
  Search,
  MessageCircle,
  Instagram,
  ShoppingBag,
  ExternalLink,
  Edit2,
  Eye,
  Trash2,
  XCircle,
  RotateCcw,
  MapPin,
  Phone,
  CheckCircle,
  QrCode,
} from 'lucide-react';
import {
  OnlineOrder,
  Product,
  SalesChannel,
  OnlinePaymentStatus,
  OnlineOrderStatus,
} from '../types';
import {
  getOnlineOrders,
  createOnlineOrder,
  updateOnlineOrder,
  deleteOnlineOrder,
  getProducts,
  adjustProductStock,
  getUpiSettings,
} from '../lib/dataService';
import { sharePaymentViaWhatsApp, buildCustomerPaymentUrl } from '../lib/upiShare';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { NavigationPage } from '../components/layout/Sidebar';

const CHANNELS: SalesChannel[] = ['WhatsApp', 'Instagram'];
const PAYMENT_STATUSES: OnlinePaymentStatus[] = ['Pending', 'Paid', 'Failed', 'Refunded'];
const ORDER_STATUSES: OnlineOrderStatus[] = [
  'New',
  'Confirmed',
  'Processing',
  'Packed',
  'Shipped',
  'Delivered',
  'Cancelled',
  'Returned',
];

interface OnlineSalesPageProps {
  onNavigate?: (page: NavigationPage) => void;
}

export const OnlineSalesPage: React.FC<OnlineSalesPageProps> = ({ onNavigate }) => {
  const [orders, setOrders] = useState<OnlineOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Filters
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [viewOrderTarget, setViewOrderTarget] = useState<OnlineOrder | null>(null);
  const [currentOrder, setCurrentOrder] = useState<OnlineOrder | null>(null);
  const [deleteTargetOrder, setDeleteTargetOrder] = useState<OnlineOrder | null>(null);

  // Form State
  const [orderForm, setOrderForm] = useState({
    sales_channel: 'WhatsApp' as SalesChannel,
    customer_name: '',
    customer_phone: '',
    customer_address: '',
    payment_status: 'Pending' as OnlinePaymentStatus,
    order_status: 'New' as OnlineOrderStatus,
    order_date: new Date().toISOString().split('T')[0],
    items: [
      {
        product_id: '',
        quantity: 1,
        selling_price: 0,
        total: 0,
      },
    ],
  });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    const [ord, prod] = await Promise.all([getOnlineOrders(), getProducts()]);
    setOrders(ord);
    setProducts(prod);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const openAddModal = () => {
    const firstProd = products[0];
    setOrderForm({
      sales_channel: 'WhatsApp',
      customer_name: '',
      customer_phone: '',
      customer_address: '',
      payment_status: 'Pending',
      order_status: 'New',
      order_date: new Date().toISOString().split('T')[0],
      items: [
        {
          product_id: firstProd?.id || '',
          quantity: 1,
          selling_price: firstProd?.selling_price || 0,
          total: firstProd?.selling_price || 0,
        },
      ],
    });
    setFormError('');
    setIsAddModalOpen(true);
  };

  const openEditModal = (o: OnlineOrder) => {
    setCurrentOrder(o);
    setOrderForm({
      sales_channel: o.sales_channel,
      customer_name: o.customer_name,
      customer_phone: o.customer_phone,
      customer_address: o.customer_address,
      payment_status: o.payment_status,
      order_status: o.order_status,
      order_date: o.order_date,
      items: o.items.map((it) => ({
        product_id: it.product_id,
        quantity: it.quantity,
        selling_price: it.selling_price,
        total: it.total,
      })),
    });
    setFormError('');
    setIsEditModalOpen(true);
  };

  const handleItemChange = (idx: number, field: string, val: any) => {
    const updated = [...orderForm.items];
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
    setOrderForm((prev) => ({ ...prev, items: updated }));
  };

  const addOrderItemRow = () => {
    const prod = products[0];
    setOrderForm((prev) => ({
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

  const removeOrderItemRow = (idx: number) => {
    if (orderForm.items.length <= 1) return;
    setOrderForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== idx),
    }));
  };

  const calculatedTotal = orderForm.items.reduce((s, it) => s + (Number(it.total) || 0), 0);

  const handleSaveOrder = async (isEditing: boolean) => {
    if (!orderForm.customer_name.trim()) {
      setFormError('Customer name is required.');
      return;
    }
    if (!orderForm.customer_phone.trim()) {
      setFormError('Customer phone is required.');
      return;
    }
    if (!orderForm.customer_address.trim()) {
      setFormError('Customer delivery address is required.');
      return;
    }

    try {
      setSubmitting(true);
      if (isEditing && currentOrder) {
        await updateOnlineOrder(currentOrder.id, {
          customer_name: orderForm.customer_name.trim(),
          customer_phone: orderForm.customer_phone.trim(),
          customer_address: orderForm.customer_address.trim(),
          payment_status: orderForm.payment_status,
          order_status: orderForm.order_status,
        });
        setIsEditModalOpen(false);
      } else {
        await createOnlineOrder({
          sales_channel: orderForm.sales_channel,
          customer_name: orderForm.customer_name.trim(),
          customer_phone: orderForm.customer_phone.trim(),
          customer_address: orderForm.customer_address.trim(),
          total_amount: calculatedTotal,
          payment_status: orderForm.payment_status,
          order_status: orderForm.order_status,
          order_date: orderForm.order_date,
          items: orderForm.items.map((it) => {
            const p = products.find((prod) => prod.id === it.product_id);
            return {
              product_id: it.product_id,
              product_name: p?.name || 'Item',
              quantity: it.quantity,
              selling_price: it.selling_price,
              total: it.total,
            };
          }),
        });
        setIsAddModalOpen(false);
      }
      await loadAll();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to save order.';
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickStatusChange = async (orderId: string, newStatus: OnlineOrderStatus) => {
    await updateOnlineOrder(orderId, { order_status: newStatus });
    await loadAll();
  };

  const handleQuickPaymentChange = async (orderId: string, newPayment: OnlinePaymentStatus) => {
    await updateOnlineOrder(orderId, { payment_status: newPayment });
    await loadAll();
  };

  const handleShareOrderOnWhatsApp = async (ord: OnlineOrder) => {
    const settings = await getUpiSettings();
    await sharePaymentViaWhatsApp({
      amount: ord.total_amount,
      payeeName: settings.payee_name,
      upiId: settings.upi_id,
      refId: ord.upi_reference || ord.order_number,
      customerPhone: ord.customer_phone,
      customerName: ord.customer_name,
      note: `${ord.order_number} - ${ord.items?.[0]?.product_name || 'Online Order'}`,
      orderNumber: ord.order_number,
    });
  };

  // Channel & Status Counts
  const whatsAppCount = orders.filter((o) => o.sales_channel === 'WhatsApp').length;
  const instagramCount = orders.filter((o) => o.sales_channel === 'Instagram').length;
  const paidCount = orders.filter((o) => o.payment_status === 'Paid').length;
  const pendingPaymentCount = orders.filter((o) => o.payment_status === 'Pending').length;
  const processingCount = orders.filter((o) => o.order_status === 'Processing').length;
  const deliveredCount = orders.filter((o) => o.order_status === 'Delivered').length;
  const cancelledCount = orders.filter((o) => o.order_status === 'Cancelled').length;

  // Filtered orders
  const filteredOrders = orders.filter((o) => {
    const q = search.toLowerCase();
    const matchesSearch =
      o.order_number.toLowerCase().includes(q) ||
      o.customer_name.toLowerCase().includes(q) ||
      o.customer_phone.includes(q);

    const matchesChannel = channelFilter === 'all' || o.sales_channel === channelFilter;
    const matchesPayment = paymentFilter === 'all' || o.payment_status === paymentFilter;
    const matchesStatus = orderStatusFilter === 'all' || o.order_status === orderStatusFilter;

    return matchesSearch && matchesChannel && matchesPayment && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Quick Overview Badges Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
        <button
          type="button"
          onClick={() => {
            setChannelFilter('WhatsApp');
            setPaymentFilter('all');
            setOrderStatusFilter('all');
          }}
          className={`p-3 rounded-2xl border text-left backdrop-blur-xl transition-all ${
            channelFilter === 'WhatsApp'
              ? 'bg-emerald-500/15 border-emerald-400 ring-2 ring-emerald-500/30 font-bold'
              : 'bg-white/80 border-white/80 hover:border-emerald-300 shadow-xs'
          }`}
        >
          <div className="flex items-center gap-1.5 text-emerald-700 text-xs font-semibold">
            <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
            <span>WhatsApp</span>
          </div>
          <span className="text-base font-extrabold text-emerald-950 mt-1 block">
            {whatsAppCount} orders
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setChannelFilter('Instagram');
            setPaymentFilter('all');
            setOrderStatusFilter('all');
          }}
          className={`p-3 rounded-2xl border text-left backdrop-blur-xl transition-all ${
            channelFilter === 'Instagram'
              ? 'bg-fuchsia-500/15 border-fuchsia-400 ring-2 ring-fuchsia-500/30 font-bold'
              : 'bg-white/80 border-white/80 hover:border-emerald-300 shadow-xs'
          }`}
        >
          <div className="flex items-center gap-1.5 text-fuchsia-700 text-xs font-semibold">
            <Instagram className="w-3.5 h-3.5" />
            <span>Instagram</span>
          </div>
          <span className="text-base font-extrabold text-emerald-950 mt-1 block">
            {instagramCount} orders
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setPaymentFilter('Paid');
            setChannelFilter('all');
            setOrderStatusFilter('all');
          }}
          className={`p-3 rounded-2xl border text-left backdrop-blur-xl transition-all ${
            paymentFilter === 'Paid'
              ? 'bg-emerald-500/15 border-emerald-400 ring-2 ring-emerald-500/30 font-bold'
              : 'bg-white/80 border-white/80 hover:border-emerald-300 shadow-xs'
          }`}
        >
          <span className="text-2xs uppercase tracking-wider text-emerald-800/60 font-semibold block">
            Paid Orders
          </span>
          <span className="text-base font-extrabold text-emerald-700 mt-1 block">{paidCount}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setPaymentFilter('Pending');
            setChannelFilter('all');
            setOrderStatusFilter('all');
          }}
          className={`p-3 rounded-2xl border text-left backdrop-blur-xl transition-all ${
            paymentFilter === 'Pending'
              ? 'bg-rose-500/15 border-rose-300 ring-2 ring-rose-500/20 font-bold'
              : 'bg-white/80 border-white/80 hover:border-rose-300 shadow-xs'
          }`}
        >
          <span className="text-2xs uppercase tracking-wider text-rose-700/70 font-semibold block">
            Pending Pay
          </span>
          <span className="text-base font-extrabold text-rose-600 mt-1 block">
            {pendingPaymentCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setOrderStatusFilter('Processing');
            setChannelFilter('all');
            setPaymentFilter('all');
          }}
          className={`p-3 rounded-2xl border text-left backdrop-blur-xl transition-all ${
            orderStatusFilter === 'Processing'
              ? 'bg-teal-500/15 border-teal-400 ring-2 ring-teal-500/20 font-bold'
              : 'bg-white/80 border-white/80 hover:border-emerald-300 shadow-xs'
          }`}
        >
          <span className="text-2xs uppercase tracking-wider text-teal-800/70 font-semibold block">
            Processing
          </span>
          <span className="text-base font-extrabold text-teal-800 mt-1 block">
            {processingCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setOrderStatusFilter('Delivered');
            setChannelFilter('all');
            setPaymentFilter('all');
          }}
          className={`p-3 rounded-2xl border text-left backdrop-blur-xl transition-all ${
            orderStatusFilter === 'Delivered'
              ? 'bg-emerald-500/15 border-emerald-400 ring-2 ring-emerald-500/30 font-bold'
              : 'bg-white/80 border-white/80 hover:border-emerald-300 shadow-xs'
          }`}
        >
          <span className="text-2xs uppercase tracking-wider text-emerald-800/70 font-semibold block">
            Delivered
          </span>
          <span className="text-base font-extrabold text-emerald-700 mt-1 block">{deliveredCount}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setOrderStatusFilter('Cancelled');
            setChannelFilter('all');
            setPaymentFilter('all');
          }}
          className={`p-3 rounded-2xl border text-left backdrop-blur-xl transition-all ${
            orderStatusFilter === 'Cancelled'
              ? 'bg-slate-200/80 border-slate-400 ring-2 ring-slate-400/20 font-bold'
              : 'bg-white/80 border-white/80 hover:border-slate-300 shadow-xs'
          }`}
        >
          <span className="text-2xs uppercase tracking-wider text-slate-500 font-semibold block">
            Cancelled
          </span>
          <span className="text-base font-bold text-slate-500 mt-1 block">{cancelledCount}</span>
        </button>
      </div>

      {/* Filter and Action Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-white/80 backdrop-blur-xl p-4 rounded-2xl border border-white/80 shadow-xs">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-600" />
            <input
              type="text"
              placeholder="Search order #, customer or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-white/90 border border-emerald-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-emerald-950"
            />
          </div>

          <select
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value)}
            className="text-xs bg-white/90 border border-emerald-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-emerald-500 text-emerald-950 font-medium"
          >
            <option value="all">All Channels</option>
            <option value="WhatsApp">WhatsApp</option>
            <option value="Instagram">Instagram</option>
          </select>

          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="text-xs bg-white/90 border border-emerald-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-emerald-500 text-emerald-950 font-medium"
          >
            <option value="all">All Payment Statuses</option>
            {PAYMENT_STATUSES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          <select
            value={orderStatusFilter}
            onChange={(e) => setOrderStatusFilter(e.target.value)}
            className="text-xs bg-white/90 border border-emerald-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-emerald-500 text-emerald-950 font-medium"
          >
            <option value="all">All Delivery Statuses</option>
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs shadow-emerald-600/20 transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          Create Online Order
        </button>
      </div>

      {/* Orders Table */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/85 shadow-lg shadow-emerald-950/5 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-sm text-emerald-800/60">Loading online orders...</div>
        ) : filteredOrders.length === 0 ? (
          <EmptyState
            icon={Smartphone}
            title="No online orders found"
            description="Manually record orders received via WhatsApp DM or Instagram Direct."
            actionLabel="Create Order"
            onAction={openAddModal}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-emerald-50/70 border-b border-emerald-100 text-xs font-bold text-emerald-950 uppercase tracking-wider">
                  <th className="py-3 px-4">Order #</th>
                  <th className="py-3 px-4">Channel</th>
                  <th className="py-3 px-4">Customer Details</th>
                  <th className="py-3 px-4">Order Date</th>
                  <th className="py-3 px-4 text-center">Items Qty</th>
                  <th className="py-3 px-4 text-right">Total Amount</th>
                  <th className="py-3 px-4">Payment</th>
                  <th className="py-3 px-4">Delivery Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-100/60 text-emerald-950">
                {filteredOrders.map((ord) => {
                  const totalQty = ord.items?.reduce((tot, it) => tot + it.quantity, 0) || 0;
                  return (
                    <tr key={ord.id} className="hover:bg-emerald-50/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-950">
                        <div>{ord.order_number}</div>
                        {ord.upi_reference && (
                          <span className="inline-flex items-center gap-1 text-3xs font-mono font-semibold text-emerald-800 bg-emerald-100/80 border border-emerald-300 px-1.5 py-0.5 rounded mt-0.5">
                            <QrCode className="w-2.5 h-2.5 text-emerald-600" />
                            {ord.upi_reference}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={ord.sales_channel} size="sm" />
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-emerald-950 block">
                          {ord.customer_name}
                        </span>
                        <span className="text-emerald-800/70 font-mono text-xs block">
                          {ord.customer_phone}
                        </span>
                        <span className="text-emerald-800/60 text-2xs truncate max-w-[180px] block">
                          {ord.customer_address}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-emerald-800/80">{ord.order_date}</td>
                      <td className="py-3.5 px-4 text-center font-extrabold text-emerald-950">
                        {totalQty}
                      </td>
                      <td className="py-3.5 px-4 text-right font-extrabold text-emerald-950">
                        ₹{Number(ord.total_amount).toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4">
                        <select
                          value={ord.payment_status}
                          onChange={(e) =>
                            handleQuickPaymentChange(ord.id, e.target.value as OnlinePaymentStatus)
                          }
                          className="text-xs font-semibold py-1 px-2 border border-emerald-200/80 rounded-lg bg-white/90 text-emerald-950 focus:ring-2 focus:ring-emerald-500"
                        >
                          {PAYMENT_STATUSES.map((p) => (
                            <option key={p} value={p}>
                              {p}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3.5 px-4">
                        <select
                          value={ord.order_status}
                          onChange={(e) =>
                            handleQuickStatusChange(ord.id, e.target.value as OnlineOrderStatus)
                          }
                          className="text-xs font-semibold py-1 px-2 border border-emerald-200/80 rounded-lg bg-white/90 text-emerald-950 focus:ring-2 focus:ring-emerald-500"
                        >
                          {ORDER_STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          {ord.payment_status === 'Pending' && (
                            <button
                              type="button"
                              onClick={() => handleShareOrderOnWhatsApp(ord)}
                              title="Send WhatsApp Payment Link & QR Code (Google Pay Auto-Fetch)"
                              className="p-1.5 text-emerald-700 hover:text-emerald-950 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
                            >
                              <MessageCircle className="w-4 h-4 text-emerald-600" />
                            </button>
                          )}
                          {onNavigate && ord.payment_status === 'Pending' && (
                            <button
                              type="button"
                              onClick={() => onNavigate('upi-manager')}
                              title="Collect via UPI QR Counter"
                              className="p-1.5 text-emerald-700 hover:text-emerald-950 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
                            >
                              <QrCode className="w-4 h-4 text-emerald-600" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setViewOrderTarget(ord)}
                            title="View Full Order & Address"
                            className="p-1.5 text-emerald-700 hover:text-emerald-950 hover:bg-emerald-100/70 rounded-lg transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(ord)}
                            title="Edit Order"
                            className="p-1.5 text-emerald-700 hover:text-emerald-950 hover:bg-emerald-100/70 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {ord.order_status !== 'Cancelled' && ord.order_status !== 'Returned' && (
                            <button
                              type="button"
                              onClick={() => handleQuickStatusChange(ord.id, 'Cancelled')}
                              title="Cancel Order & Restore Stock"
                              className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setDeleteTargetOrder(ord)}
                            title="Delete Order Record"
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
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

      {/* Create / Edit Online Order Modal */}
      <Modal
        isOpen={isAddModalOpen || isEditModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setIsEditModalOpen(false);
        }}
        title={isEditModalOpen ? 'Edit Online Order' : 'Create Online Order'}
        subtitle="Manage WhatsApp or Instagram direct client order"
        maxWidth="2xl"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSaveOrder(isEditModalOpen);
          }}
          className="space-y-4 text-sm"
        >
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Sales Channel *
              </label>
              <select
                disabled={isEditModalOpen}
                value={orderForm.sales_channel}
                onChange={(e) =>
                  setOrderForm({ ...orderForm, sales_channel: e.target.value as SalesChannel })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold"
              >
                {CHANNELS.map((ch) => (
                  <option key={ch} value={ch}>
                    {ch}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Order Date *
              </label>
              <input
                type="date"
                required
                value={orderForm.order_date}
                onChange={(e) => setOrderForm({ ...orderForm, order_date: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Payment Status *
              </label>
              <select
                value={orderForm.payment_status}
                onChange={(e) =>
                  setOrderForm({
                    ...orderForm,
                    payment_status: e.target.value as OnlinePaymentStatus,
                  })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold"
              >
                {PAYMENT_STATUSES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Delivery Status *
              </label>
              <select
                value={orderForm.order_status}
                onChange={(e) =>
                  setOrderForm({
                    ...orderForm,
                    order_status: e.target.value as OnlineOrderStatus,
                  })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold"
              >
                {ORDER_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Customer Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Customer Name *
              </label>
              <input
                type="text"
                required
                value={orderForm.customer_name}
                onChange={(e) => setOrderForm({ ...orderForm, customer_name: e.target.value })}
                placeholder="e.g. Maya Lin"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Customer Phone / WhatsApp *
              </label>
              <input
                type="tel"
                required
                value={orderForm.customer_phone}
                onChange={(e) => setOrderForm({ ...orderForm, customer_phone: e.target.value })}
                placeholder="+1 (555) 890-3344"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Customer Shipping Address *
            </label>
            <textarea
              required
              rows={2}
              value={orderForm.customer_address}
              onChange={(e) => setOrderForm({ ...orderForm, customer_address: e.target.value })}
              placeholder="Apartment, Street address, City, State, ZIP code..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
            />
          </div>

          {/* Order Items */}
          {!isEditModalOpen && (
            <div className="border rounded-xl p-3 bg-slate-50/70 border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Ordered Products (Reduces stock on order)
                </span>
                <button
                  type="button"
                  onClick={addOrderItemRow}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-950"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Product
                </button>
              </div>

              <div className="space-y-2 mt-2">
                {orderForm.items.map((row, idx) => {
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
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.shop}) - ₹{Number(p.selling_price).toFixed(2)} (Stock: {p.current_stock})
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

                      <div className="w-24 text-right font-medium text-slate-700">
                        ₹{Number(row.selling_price).toFixed(2)}
                      </div>

                      <div className="w-24 text-right font-bold text-slate-900">
                        ₹{Number(row.total).toFixed(2)}
                      </div>

                      <button
                        type="button"
                        onClick={() => removeOrderItemRow(idx)}
                        disabled={orderForm.items.length <= 1}
                        className="p-1 text-slate-400 hover:text-rose-600 disabled:opacity-30"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end pt-2 text-sm font-bold text-slate-900">
                Total Order Amount: ₹{calculatedTotal.toFixed(2)}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-3 border-t border-emerald-100">
            <button
              type="button"
              onClick={() => {
                setIsAddModalOpen(false);
                setIsEditModalOpen(false);
              }}
              className="px-4 py-2 text-sm text-emerald-900 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs shadow-emerald-600/20 transition-colors"
            >
              {submitting ? 'Saving...' : isEditModalOpen ? 'Update Order' : 'Create Order & Deduct Stock'}
            </button>
          </div>
        </form>
      </Modal>

      {/* View Full Order Details Modal */}
      <Modal
        isOpen={!!viewOrderTarget}
        onClose={() => setViewOrderTarget(null)}
        title="Online Order Details"
        subtitle={`Order: ${viewOrderTarget?.order_number || ''} via ${viewOrderTarget?.sales_channel}`}
        maxWidth="md"
      >
        {viewOrderTarget && (
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div>
                <span className="text-slate-400 text-2xs block">Channel</span>
                <StatusBadge status={viewOrderTarget.sales_channel} size="sm" />
              </div>
              <div>
                <span className="text-slate-400 text-2xs block">Payment</span>
                <StatusBadge status={viewOrderTarget.payment_status} size="sm" />
              </div>
              <div>
                <span className="text-slate-400 text-2xs block">Delivery</span>
                <StatusBadge status={viewOrderTarget.order_status} size="sm" />
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg space-y-1.5">
              <span className="font-bold text-slate-700 uppercase tracking-wider block">
                Customer & Shipping
              </span>
              <div className="flex items-center gap-1.5 text-slate-800 font-semibold text-sm">
                <span>{viewOrderTarget.customer_name}</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-600 font-mono">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>{viewOrderTarget.customer_phone}</span>
              </div>
              <div className="flex items-start gap-1.5 text-slate-600">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                <span>{viewOrderTarget.customer_address}</span>
              </div>
            </div>

            <div>
              <span className="font-bold text-slate-700 uppercase tracking-wider block mb-2">
                Order Items
              </span>
              <div className="space-y-1.5 border rounded-lg p-2.5 bg-slate-50/50">
                {viewOrderTarget.items?.map((it, idx) => (
                  <div key={idx} className="flex justify-between items-center py-1 border-b border-slate-100 last:border-0">
                    <div>
                      <span className="font-semibold text-slate-800 block">
                        {it.product_name || 'Product'}
                      </span>
                      <span className="text-slate-400 text-2xs">
                        {it.quantity} x ₹{Number(it.selling_price).toFixed(2)}
                      </span>
                    </div>
                    <span className="font-bold text-slate-900">₹{Number(it.total).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200/70 flex justify-between items-center text-sm font-bold text-emerald-950">
              <span>Total Order Value:</span>
              <span>₹{Number(viewOrderTarget.total_amount).toFixed(2)}</span>
            </div>

            {viewOrderTarget.upi_reference && (
              <div className="p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-lg flex items-center justify-between text-xs">
                <span className="text-emerald-800 font-medium flex items-center gap-1.5">
                  <QrCode className="w-3.5 h-3.5 text-emerald-600" />
                  UPI Payment Reference:
                </span>
                <span className="font-mono font-bold text-emerald-950">{viewOrderTarget.upi_reference}</span>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-200">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleShareOrderOnWhatsApp(viewOrderTarget)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Send on WhatsApp</span>
                </button>
                <a
                  href={`/pay?ref=${encodeURIComponent(
                    viewOrderTarget.upi_reference || viewOrderTarget.order_number
                  )}&am=${viewOrderTarget.total_amount}&order=${encodeURIComponent(
                    viewOrderTarget.order_number
                  )}&customer=${encodeURIComponent(viewOrderTarget.customer_name)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                  <span>View Customer Checkout</span>
                </a>
              </div>

              <button
                type="button"
                onClick={() => setViewOrderTarget(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Online Order Confirm */}
      <ConfirmDialog
        isOpen={!!deleteTargetOrder}
        onClose={() => setDeleteTargetOrder(null)}
        onConfirm={async () => {
          if (deleteTargetOrder) {
            await deleteOnlineOrder(deleteTargetOrder.id);
            setDeleteTargetOrder(null);
            await loadAll();
          }
        }}
        title="Delete Online Order"
        message={`Are you sure you want to delete order ${deleteTargetOrder?.order_number} for ${deleteTargetOrder?.customer_name}? This removes it from order history and does not change product stock.`}
        confirmLabel="Delete Order"
      />
    </div>
  );
};
