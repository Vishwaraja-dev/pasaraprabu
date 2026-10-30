/**
 * UPI & WhatsApp Sharing Utility
 * Handles dynamic UPI deep-links, web payment URLs, and QR code image sharing
 */

export interface ShareUpiParams {
  amount: number;
  payeeName: string;
  upiId: string;
  refId: string;
  customerPhone?: string;
  customerName?: string;
  note?: string;
  orderNumber?: string;
  canvasElement?: HTMLCanvasElement | null;
  svgElement?: SVGSVGElement | null;
}

export function buildUpiPaymentUri(params: {
  upiId: string;
  payeeName: string;
  amount: number;
  note?: string;
  refId?: string;
}): string {
  const { upiId, payeeName, amount, note, refId } = params;
  const tn = encodeURIComponent((note || refId || 'Payment').trim());
  const pa = encodeURIComponent(upiId.trim());
  const pn = encodeURIComponent(payeeName.trim());
  const am = Number(amount).toFixed(2);
  const tr = refId ? `&tr=${encodeURIComponent(refId.trim())}` : '';

  return `upi://pay?pa=${pa}&pn=${pn}&am=${am}&cu=INR&tn=${tn}${tr}`;
}

export function buildGPayDeepLink(params: {
  upiId: string;
  payeeName: string;
  amount: number;
  note?: string;
  refId?: string;
}): string {
  const { upiId, payeeName, amount, note, refId } = params;
  const tn = encodeURIComponent((note || refId || 'Payment').trim());
  const pa = encodeURIComponent(upiId.trim());
  const pn = encodeURIComponent(payeeName.trim());
  const am = Number(amount).toFixed(2);
  const tr = refId ? `&tr=${encodeURIComponent(refId.trim())}` : '';

  // tez:// is Google Pay's native Android/iOS intent scheme
  return `tez://upi/pay?pa=${pa}&pn=${pn}&am=${am}&cu=INR&tn=${tn}${tr}`;
}

export function buildCustomerPaymentUrl(params: {
  amount: number;
  payeeName: string;
  upiId: string;
  refId: string;
  note?: string;
  customerName?: string;
  orderNumber?: string;
}): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const searchParams = new URLSearchParams();
  searchParams.set('ref', params.refId);
  searchParams.set('am', Number(params.amount).toFixed(2));
  searchParams.set('pa', params.upiId.trim());
  searchParams.set('pn', params.payeeName.trim());
  if (params.note) searchParams.set('note', params.note.trim());
  if (params.customerName) searchParams.set('name', params.customerName.trim());
  if (params.orderNumber) searchParams.set('order', params.orderNumber.trim());

  return `${origin}/pay?${searchParams.toString()}`;
}

/**
 * Converts an SVG element into a PNG Blob using HTML5 Canvas
 */
export async function svgToPngBlob(svgElement: SVGSVGElement): Promise<Blob | null> {
  return new Promise((resolve) => {
    try {
      const svgString = new XMLSerializer().serializeToString(svgElement);
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const URL = window.URL || window.webkitURL || window;
      const blobURL = URL.createObjectURL(svgBlob);
      const image = new Image();

      image.onload = () => {
        const canvas = document.createElement('canvas');
        // Add white padding border for optimal QR scanning
        const padding = 32;
        const qrSize = 400;
        canvas.width = qrSize + padding * 2;
        canvas.height = qrSize + padding * 2 + 60; // Extra room for label
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }

        // White background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw QR
        ctx.drawImage(image, padding, padding, qrSize, qrSize);

        // Draw clean footer label
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 20px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Scan with Google Pay, PhonePe or Paytm', canvas.width / 2, canvas.height - 24);

        canvas.toBlob((blob) => {
          URL.revokeObjectURL(blobURL);
          resolve(blob);
        }, 'image/png');
      };

      image.onerror = () => {
        URL.revokeObjectURL(blobURL);
        resolve(null);
      };

      image.src = blobURL;
    } catch (e) {
      console.warn('Failed to convert SVG to PNG:', e);
      resolve(null);
    }
  });
}

/**
 * Downloads a PNG QR code file to the user's device
 */
export function downloadQrBlob(blob: Blob, filename = 'payment-qr.png') {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

/**
 * Main WhatsApp + QR Share function:
 * 1. Checks if Web Share API with files is supported (mobile browsers).
 *    If yes, shares the actual QR code PNG image file AND the message text to WhatsApp directly!
 * 2. If not (e.g. desktop web), downloads the QR image and launches WhatsApp Web with the rich link.
 */
export async function sharePaymentViaWhatsApp(params: ShareUpiParams): Promise<{
  sharedDirectly: boolean;
  downloadedQr: boolean;
}> {
  const {
    amount,
    payeeName,
    upiId,
    refId,
    customerPhone,
    customerName,
    note,
    orderNumber,
    canvasElement,
    svgElement,
  } = params;

  const upiUri = buildUpiPaymentUri({ upiId, payeeName, amount, note, refId });
  const paymentUrl = buildCustomerPaymentUrl({
    amount,
    payeeName,
    upiId,
    refId,
    note,
    customerName,
    orderNumber,
  });

  const formattedAmount = `₹${Number(amount).toFixed(2)}`;
  const orderRefText = orderNumber ? `Order #${orderNumber}` : `Ref: ${refId}`;

  const messageText = `🛍️ *PAYMENT REQUEST from ${payeeName}*
━━━━━━━━━━━━━━━━━━━━
${orderRefText}
${customerName ? `👤 *Customer:* ${customerName}\n` : ''}💵 *Amount to Pay:* ${formattedAmount}
${note ? `📝 *Note:* ${note}\n` : ''}
📲 *Pay in 1-Click with Google Pay / UPI:*
${upiUri}

🌐 *Online Invoice & QR Code:*
${paymentUrl}

━━━━━━━━━━━━━━━━━━━━
💡 *Auto Amount Fetch:*
• If you tap the link above on your phone, Google Pay will automatically open with the exact amount *${formattedAmount}* pre-filled!
• Or scan the attached QR code with Google Pay / PhonePe scanner to pay instantly.
━━━━━━━━━━━━━━━━━━━━
Thank you for your order! 🙏`;

  // Try to create a PNG file from the QR element
  let qrBlob: Blob | null = null;
  if (svgElement) {
    qrBlob = await svgToPngBlob(svgElement);
  } else if (canvasElement) {
    qrBlob = await new Promise<Blob | null>((resolve) =>
      canvasElement.toBlob((b) => resolve(b), 'image/png')
    );
  }

  // Attempt Web Share API with attached QR code file (supported on Android Chrome & iOS Safari)
  if (
    qrBlob &&
    typeof navigator !== 'undefined' &&
    navigator.share &&
    navigator.canShare
  ) {
    try {
      const qrFile = new File([qrBlob], `Payment-QR-${refId}.png`, { type: 'image/png' });
      if (navigator.canShare({ files: [qrFile] })) {
        await navigator.share({
          title: `Payment Request ${formattedAmount} - ${payeeName}`,
          text: messageText,
          files: [qrFile],
        });
        return { sharedDirectly: true, downloadedQr: false };
      }
    } catch (shareErr) {
      // User cancelled share dialog or fallback needed
      if ((shareErr as Error)?.name === 'AbortError') {
        return { sharedDirectly: false, downloadedQr: false };
      }
      console.warn('Web Share failed, falling back to wa.me link:', shareErr);
    }
  }

  // Fallback for Desktop & browsers without file sharing:
  // 1. Download the QR code so the merchant can easily drag/send it in WhatsApp
  let downloaded = false;
  if (qrBlob) {
    downloadQrBlob(qrBlob, `Payment-QR-${refId}.png`);
    downloaded = true;
  }

  // 2. Open WhatsApp with pre-filled message containing both Google Pay deep-link and web URL
  const cleanPhone = (customerPhone || '').replace(/[^0-9]/g, '');
  const waUrl = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageText)}`
    : `https://wa.me/?text=${encodeURIComponent(messageText)}`;

  window.open(waUrl, '_blank');

  return { sharedDirectly: false, downloadedQr: downloaded };
}
