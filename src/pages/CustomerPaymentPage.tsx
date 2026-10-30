import React, { useState, useEffect, useRef } from 'react';
import {
  CheckCircle2,
  ShieldCheck,
  Smartphone,
  Copy,
  Check,
  Download,
  Share2,
  ExternalLink,
  ArrowLeft,
  Store,
  Clock,
  Receipt,
  Sparkles,
  Info,
  CreditCard,
  Building,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { PasaraLogo } from '../components/common/PasaraLogo';
import {
  buildUpiPaymentUri,
  buildGPayDeepLink,
  svgToPngBlob,
  downloadQrBlob,
} from '../lib/upiShare';
import {
  getUpiSettings,
  getUpiTransactionByRef,
  markUpiPaidByReference,
  getUpiTransactions,
} from '../lib/dataService';
import { UpiTransaction } from '../types';

interface CustomerPaymentPageProps {
  onBackToAdmin?: () => void;
}

export const CustomerPaymentPage: React.FC<CustomerPaymentPageProps> = ({ onBackToAdmin }) => {
  const [params, setParams] = useState({
    ref: '',
    am: '500.00',
    pa: 'pasara@okhdfcbank',
    pn: 'Pasara Store',
    note: 'Online Order',
    name: '',
    order: '',
  });

  const [txRecord, setTxRecord] = useState<UpiTransaction | null>(null);
  const [isPaid, setIsPaid] = useState<boolean>(false);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showUtrModal, setShowUtrModal] = useState(false);
  const [utrNumber, setUtrNumber] = useState('');
  const [confirmingPayment, setConfirmingPayment] = useState(false);
  const [downloadingQr, setDownloadingQr] = useState(false);

  const svgRef = useRef<SVGSVGElement>(null);

  // Parse URL search params
  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    const ref = search.get('ref') || search.get('pay') || search.get('id') || 'UPI-INV-001';
    const am = search.get('am') || search.get('amount') || '500.00';
    const pa = search.get('pa') || search.get('upi') || 'pasara@okhdfcbank';
    const pn = search.get('pn') || search.get('name') || 'Pasara Store';
    const note = search.get('note') || search.get('desc') || 'Order Payment';
    const customerName = search.get('customer') || search.get('name') || '';
    const orderNumber = search.get('order') || '';

    setParams({
      ref,
      am: parseFloat(am) > 0 ? parseFloat(am).toFixed(2) : '500.00',
      pa,
      pn,
      note,
      name: customerName,
      order: orderNumber,
    });

    // Attempt to load settings or existing transaction record
    (async () => {
      try {
        const [settings, matchedTx] = await Promise.all([
          getUpiSettings(),
          ref ? getUpiTransactionByRef(ref) : Promise.resolve(null),
        ]);

        if (matchedTx) {
          setTxRecord(matchedTx);
          setIsPaid(matchedTx.status === 'Paid');
          setParams((prev) => ({
            ...prev,
            am: Number(matchedTx.amount).toFixed(2),
            pa: matchedTx.upi_id || settings.upi_id,
            pn: matchedTx.payee_name || settings.payee_name,
            note: matchedTx.note || prev.note,
            name: matchedTx.customer_name || prev.name,
            order: matchedTx.linked_order_number || prev.order,
          }));
        } else if (settings) {
          // If no specific pa/pn provided in URL, fallback to merchant settings
          setParams((prev) => ({
            ...prev,
            pa: prev.pa === 'pasara@okhdfcbank' ? settings.upi_id : prev.pa,
            pn: prev.pn === 'Pasara Store' ? settings.payee_name : prev.pn,
          }));
        }
      } catch (err) {
        console.warn('Error fetching transaction info for checkout:', err);
      }
    })();
  }, []);

  const parsedAmount = parseFloat(params.am) || 0;

  // The official standard UPI payment URI
  const upiPaymentUri = buildUpiPaymentUri({
    upiId: params.pa,
    payeeName: params.pn,
    amount: parsedAmount,
    note: params.note || params.ref,
    refId: params.ref,
  });

  // App-specific intent deep-links
  const gpayDeepLink = buildGPayDeepLink({
    upiId: params.pa,
    payeeName: params.pn,
    amount: parsedAmount,
    note: params.note || params.ref,
    refId: params.ref,
  });

  const phonepeDeepLink = `phonepe://upi/pay?pa=${encodeURIComponent(params.pa)}&pn=${encodeURIComponent(
    params.pn
  )}&am=${parsedAmount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(params.note || params.ref)}`;

  const paytmDeepLink = `paytmmp://upi/pay?pa=${encodeURIComponent(params.pa)}&pn=${encodeURIComponent(
    params.pn
  )}&am=${parsedAmount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(params.note || params.ref)}`;

  // Google Pay click handler with seamless fallback to standard UPI
  const handlePayGooglePay = () => {
    // Attempt gpay/tez intent URI, then standard upi://
    window.location.href = gpayDeepLink;
    setTimeout(() => {
      window.location.href = upiPaymentUri;
    }, 600);
  };

  const handleCopyUpiId = () => {
    navigator.clipboard.writeText(params.pa);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleCopyPaymentLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleDownloadQr = async () => {
    if (!svgRef.current) return;
    setDownloadingQr(true);
    try {
      const blob = await svgToPngBlob(svgRef.current);
      if (blob) {
        downloadQrBlob(blob, `UPI-Payment-${params.ref || 'QR'}.png`);
      }
    } catch (e) {
      console.warn('Download error:', e);
    } finally {
      setDownloadingQr(false);
    }
  };

  const handleConfirmPaid = async () => {
    setConfirmingPayment(true);
    try {
      if (params.ref) {
        await markUpiPaidByReference(params.ref, utrNumber.trim() || undefined);
      }
      setIsPaid(true);
      setShowUtrModal(false);
    } catch (e) {
      console.warn('Error confirming payment:', e);
    } finally {
      setConfirmingPayment(false);
    }
  };

  const handleShareConfirmationToMerchant = () => {
    const text = `✅ *PAYMENT COMPLETED*\nShop: ${params.pn}\nAmount: ₹${parsedAmount.toFixed(2)}\nRef / Order: ${params.order || params.ref}\n${utrNumber ? `UTR / Txn ID: ${utrNumber}\n` : ''}Status: Paid via UPI Google Pay\n\nPlease verify and dispatch!`;
    const cleanPhone = (txRecord?.customer_phone || '').replace(/[^0-9]/g, '');
    const waUrl = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-slate-100 flex flex-col antialiased selection:bg-emerald-500 selection:text-white">
      {/* Top Header Navigation */}
      <header className="border-b border-slate-800/80 bg-slate-900/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <PasaraLogo size="sm" />
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-sm font-bold text-white tracking-tight">{params.pn}</h1>
                <span className="text-3xs px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-mono font-bold">Pasara</span>
              </div>
              <div className="flex items-center gap-1.5 text-3xs text-emerald-400 font-semibold">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                <span>NPCI Verified UPI Merchant</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onBackToAdmin && (
              <button
                type="button"
                onClick={onBackToAdmin}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Store Admin</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleCopyPaymentLink}
              title="Copy checkout link"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-700/60 transition-colors"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Payment Checkout Container */}
      <main className="flex-1 max-w-lg w-full mx-auto p-4 sm:p-6 flex flex-col justify-center">
        {/* Payment Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden backdrop-blur-xl">
          {/* Ambient Glow */}
          <div className="absolute -top-20 -right-20 w-44 h-44 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 w-44 h-44 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Payment Status Banner */}
          {isPaid ? (
            <div className="mb-6 p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-center animate-in fade-in zoom-in-95 duration-300">
              <div className="inline-flex p-2 rounded-full bg-emerald-500 text-slate-950 mb-2">
                <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
              </div>
              <h2 className="text-lg font-bold text-emerald-400">Payment Completed!</h2>
              <p className="text-xs text-slate-300 mt-1">
                Your payment of <strong className="text-white font-mono">₹{parsedAmount.toFixed(2)}</strong> has been verified.
              </p>
              {utrNumber && (
                <div className="mt-2 text-3xs font-mono text-emerald-300/80 bg-emerald-950/60 py-1 px-2.5 rounded-lg inline-block border border-emerald-800/50">
                  UTR: {utrNumber}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center mb-6">
              <span className="text-3xs uppercase tracking-widest text-slate-400 font-bold block mb-1">
                Amount to Pay
              </span>
              <div className="text-4xl sm:text-5xl font-black text-white tracking-tight tabular-nums flex items-center justify-center gap-1 font-mono">
                <span className="text-emerald-400">₹</span>
                <span>{parsedAmount.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-center gap-2 mt-2 text-xs text-slate-400">
                <span className="font-mono text-slate-300 bg-slate-800/80 px-2.5 py-0.5 rounded-full border border-slate-700/60">
                  {params.order ? `Order #${params.order}` : `Ref: ${params.ref}`}
                </span>
                {params.name && (
                  <span className="text-slate-300 font-medium">• For: {params.name}</span>
                )}
              </div>
              {params.note && (
                <p className="text-xs text-slate-400 mt-1.5 italic line-clamp-1">
                  "{params.note}"
                </p>
              )}
            </div>
          )}

          {/* GOOGLE PAY 1-CLICK INSTANT PAY BUTTON (HIGHLIGHTED) */}
          {!isPaid && (
            <div className="space-y-3 mb-6">
              <button
                type="button"
                onClick={handlePayGooglePay}
                className="w-full py-4 px-5 rounded-2xl font-bold text-base text-slate-950 bg-gradient-to-r from-emerald-400 via-emerald-300 to-teal-300 hover:from-emerald-300 hover:to-teal-200 active:scale-[0.99] transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  {/* Google Pay Style G Badge */}
                  <div className="w-8 h-8 rounded-full bg-slate-950 text-white flex items-center justify-center font-bold text-xs shadow-inner">
                    <span className="text-blue-400">G</span>
                    <span className="text-emerald-400">P</span>
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-extrabold text-slate-950 leading-tight">
                      Pay ₹{parsedAmount.toFixed(2)} with Google Pay
                    </div>
                    <div className="text-3xs text-slate-800 font-medium">
                      Direct 1-tap UPI • Auto-fills exact amount
                    </div>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-slate-900 group-hover:translate-x-0.5 transition-transform" />
              </button>

              {/* Other Indian UPI Apps (PhonePe, Paytm, Any UPI) */}
              <div className="grid grid-cols-3 gap-2">
                <a
                  href={phonepeDeepLink}
                  className="py-2.5 px-2 rounded-xl bg-slate-800/90 hover:bg-slate-800 text-slate-200 text-center text-xs font-semibold border border-purple-500/30 hover:border-purple-400 transition-all flex flex-col items-center gap-0.5"
                >
                  <span className="text-purple-400 font-bold text-2xs">PhonePe</span>
                  <span className="text-3xs text-slate-400">Pay ₹{parsedAmount.toFixed(0)}</span>
                </a>

                <a
                  href={paytmDeepLink}
                  className="py-2.5 px-2 rounded-xl bg-slate-800/90 hover:bg-slate-800 text-slate-200 text-center text-xs font-semibold border border-cyan-500/30 hover:border-cyan-400 transition-all flex flex-col items-center gap-0.5"
                >
                  <span className="text-cyan-400 font-bold text-2xs">Paytm</span>
                  <span className="text-3xs text-slate-400">Pay ₹{parsedAmount.toFixed(0)}</span>
                </a>

                <a
                  href={upiPaymentUri}
                  className="py-2.5 px-2 rounded-xl bg-slate-800/90 hover:bg-slate-800 text-slate-200 text-center text-xs font-semibold border border-slate-700 hover:border-slate-600 transition-all flex flex-col items-center gap-0.5"
                >
                  <span className="text-emerald-400 font-bold text-2xs">BHIM / Any</span>
                  <span className="text-3xs text-slate-400">Other UPI</span>
                </a>
              </div>
            </div>
          )}

          {/* DYNAMIC QR CODE CARD */}
          <div className="p-5 rounded-2xl bg-white text-slate-900 flex flex-col items-center text-center shadow-lg relative">
            <div className="text-2xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
              <span>Or Scan with Google Pay Scanner</span>
            </div>

            {/* Render Crisp High-Res QR SVG */}
            <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-xs">
              <QRCodeSVG
                ref={svgRef}
                value={upiPaymentUri}
                size={210}
                level="H"
                includeMargin={true}
              />
            </div>

            {/* Dynamic Amount Pre-fill Banner */}
            <div className="mt-3 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-full text-xs font-bold text-emerald-800 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>Scanning automatically fetches: ₹{parsedAmount.toFixed(2)}</span>
            </div>

            <p className="text-3xs text-slate-500 mt-2 max-w-xs">
              Open <strong>Google Pay</strong>, <strong>PhonePe</strong>, or <strong>Paytm</strong> on your phone and point the scanner at this QR code.
            </p>

            {/* Download QR & Save */}
            <button
              type="button"
              onClick={handleDownloadQr}
              disabled={downloadingQr}
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-950 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{downloadingQr ? 'Saving QR...' : 'Download QR Image'}</span>
            </button>
          </div>

          {/* MERCHANT UPI DETAILS & COPY ACTION */}
          <div className="mt-4 p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between text-xs">
            <div className="overflow-hidden mr-2">
              <span className="text-3xs uppercase tracking-wider text-slate-400 font-semibold block">
                Payee UPI ID
              </span>
              <span className="font-mono font-bold text-emerald-400 truncate block">
                {params.pa}
              </span>
            </div>
            <button
              type="button"
              onClick={handleCopyUpiId}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-medium text-2xs transition-colors shrink-0"
            >
              {copiedUpi ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy ID</span>
                </>
              )}
            </button>
          </div>

          {/* CUSTOMER CONFIRMATION ACTIONS */}
          <div className="mt-6 pt-5 border-t border-slate-800 flex flex-col gap-2.5">
            {!isPaid ? (
              <button
                type="button"
                onClick={() => setShowUtrModal(true)}
                className="w-full py-3 px-4 rounded-xl font-semibold text-xs text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>I have completed this payment</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleShareConfirmationToMerchant}
                className="w-full py-3 px-4 rounded-xl font-bold text-xs text-slate-950 bg-emerald-400 hover:bg-emerald-300 transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <Share2 className="w-4 h-4" />
                <span>Send Payment Receipt to Store on WhatsApp</span>
              </button>
            )}
          </div>
        </div>

        {/* NPCI / Security Footer */}
        <div className="mt-6 text-center space-y-1.5">
          <div className="inline-flex items-center gap-1.5 text-2xs text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>256-Bit Encrypted • Direct Bank-to-Bank UPI Settlement</span>
          </div>
          <p className="text-3xs text-slate-400">
            Supported by Unified Payments Interface (UPI) • National Payments Corporation of India (NPCI)
          </p>
        </div>
      </main>

      {/* MODAL: CUSTOMER CONFIRM PAYMENT / ENTER UTR */}
      {showUtrModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl text-slate-100 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-white mb-1">Confirm UPI Payment</h3>
            <p className="text-xs text-slate-400 mb-4">
              Did you complete the ₹{parsedAmount.toFixed(2)} payment via Google Pay or UPI?
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-2xs uppercase tracking-wider text-slate-400 font-semibold mb-1">
                  12-Digit UPI Ref / UTR Number (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 423456789012"
                  value={utrNumber}
                  onChange={(e) => setUtrNumber(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-lg text-white font-mono focus:border-emerald-500 outline-none"
                />
                <span className="text-3xs text-slate-400 mt-1 block">
                  Found in your Google Pay transaction details
                </span>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUtrModal(false)}
                  className="flex-1 py-2 px-3 rounded-lg text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmPaid}
                  disabled={confirmingPayment}
                  className="flex-1 py-2 px-3 rounded-lg text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 transition-colors"
                >
                  {confirmingPayment ? 'Verifying...' : 'Yes, I Paid ✓'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
