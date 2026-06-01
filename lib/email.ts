// lib/email.ts
// ✅ COMPLETE FIX - All exports properly defined
// ✅ Proper cart details with images, currency conversion, tracking links
// ✅ No ERC20 text anywhere

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);

const FROM = '"Tech4U" <orders@tech4ru.com>';
const REPLY_TO = "info@tech4ru.com";

// ─── Currency Conversion ──────────────────────────────────────────────────────
const PKR_RATES: Record<
  string,
  { symbol: string; rate: number; locale: string; code: string }
> = {
  Pakistan: { symbol: "₨", rate: 1, locale: "en-PK", code: "PKR" },
  "United States": { symbol: "$", rate: 0.0036, locale: "en-US", code: "USD" },
  "United Kingdom": { symbol: "£", rate: 0.0028, locale: "en-GB", code: "GBP" },
  Australia: { symbol: "A$", rate: 0.0055, locale: "en-AU", code: "AUD" },
  Canada: { symbol: "C$", rate: 0.0049, locale: "en-CA", code: "CAD" },
  "United Arab Emirates": {
    symbol: "د.إ",
    rate: 0.013,
    locale: "ar-AE",
    code: "AED",
  },
  Germany: { symbol: "€", rate: 0.0033, locale: "de-DE", code: "EUR" },
  France: { symbol: "€", rate: 0.0033, locale: "fr-FR", code: "EUR" },
  "Saudi Arabia": { symbol: "﷼", rate: 0.013, locale: "ar-SA", code: "SAR" },
};

function convertPrice(
  pkrAmount: number,
  country: string,
): { formatted: string; code: string; symbol: string; amount: number } {
  const cfg = PKR_RATES[country];
  if (!cfg || cfg.code === "PKR") {
    return {
      formatted: "₨ " + Math.round(pkrAmount).toLocaleString("en-PK"),
      code: "PKR",
      symbol: "₨",
      amount: pkrAmount,
    };
  }
  const converted = pkrAmount * cfg.rate;
  return {
    formatted: new Intl.NumberFormat(cfg.locale, {
      style: "currency",
      currency: cfg.code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(converted),
    code: cfg.code,
    symbol: cfg.symbol,
    amount: converted,
  };
}

// ─── Core sendEmail ─────────────────────────────────────────────────────────
async function sendEmail(
  to: string | string[],
  subject: string,
  html: string,
  text: string,
): Promise<boolean> {
  try {
    const toArray = Array.isArray(to) ? to : [to];
    const uid = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    const { data, error } = await resend.emails.send({
      from: FROM,
      to: toArray,
      replyTo: REPLY_TO,
      subject,
      html,
      text,
      headers: {
        "X-Entity-Ref-ID": `tech4u-${uid}`,
        "X-Mailer": "Tech4U/1.0",
      },
    });

    if (error) {
      console.error("Resend error:", JSON.stringify(error));
      return false;
    }

    console.log(
      `Email sent [${data?.id}] to ${toArray.join(", ")} | ${subject}`,
    );
    return true;
  } catch (err: any) {
    console.error("Email exception:", err?.message || err);
    return false;
  }
}

// ─── HTML Wrapper ─────────────────────────────────────────────────────────
function luxeWrap(content: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tech4U</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #0a0a0a;
      font-family: 'Georgia', 'Times New Roman', Times, serif;
      padding: 40px 20px;
    }
    .email-container {
      max-width: 620px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 24px;
      overflow: hidden;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    }
    .email-header {
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      padding: 32px 24px;
      text-align: center;
      border-bottom: 3px solid #daa520;
    }
    .email-header h1 {
      color: #daa520;
      font-size: 28px;
      letter-spacing: 2px;
      font-weight: 400;
      margin: 0;
      font-family: 'Georgia', serif;
    }
    .email-header p {
      color: rgba(255,255,255,0.7);
      font-size: 13px;
      margin-top: 8px;
      letter-spacing: 1px;
    }
    .email-body {
      padding: 32px 28px;
      background: #fff;
    }
    .greeting {
      margin-bottom: 28px;
      border-left: 3px solid #daa520;
      padding-left: 18px;
    }
    .greeting h2 {
      color: #1a1a2e;
      font-size: 20px;
      font-weight: 500;
      margin-bottom: 6px;
    }
    .greeting p {
      color: #555;
      font-size: 14px;
      line-height: 1.5;
    }
    .order-info {
      background: #f8f6f2;
      border-radius: 16px;
      padding: 20px;
      margin-bottom: 28px;
    }
    .order-info-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 0;
      border-bottom: 1px solid #e8e4dc;
    }
    .order-info-row:last-child {
      border-bottom: none;
    }
    .order-info-label {
      color: #666;
      font-size: 13px;
      letter-spacing: 0.5px;
    }
    .order-info-value {
      color: #1a1a2e;
      font-weight: 600;
      font-size: 14px;
    }
    .order-number {
      font-family: monospace;
      color: #daa520;
      font-weight: 700;
      font-size: 15px;
    }
    .items-title {
      font-size: 16px;
      font-weight: 600;
      color: #1a1a2e;
      margin: 28px 0 16px 0;
      letter-spacing: 1px;
      padding-bottom: 8px;
      border-bottom: 2px solid #daa520;
      display: inline-block;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;
    }
    .items-table th {
      text-align: left;
      padding: 12px 8px;
      color: #888;
      font-weight: 500;
      font-size: 11px;
      letter-spacing: 1px;
      border-bottom: 1px solid #eee;
    }
    .items-table td {
      padding: 16px 8px;
      border-bottom: 1px solid #f0f0f0;
      vertical-align: middle;
    }
    .product-cell {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .product-image {
      width: 60px;
      height: 60px;
      border-radius: 12px;
      object-fit: cover;
      background: #f5f5f5;
      border: 1px solid #eee;
    }
    .product-name {
      font-weight: 600;
      color: #1a1a2e;
      font-size: 14px;
    }
    .total-row {
      border-top: 2px solid #daa520;
    }
    .total-row td {
      padding-top: 16px;
      font-weight: 700;
      font-size: 16px;
    }
    .shipping-info {
      background: #f0f7ff;
      border-radius: 16px;
      padding: 20px;
      margin: 24px 0;
      border: 1px solid #d4e4fc;
    }
    .shipping-info h4 {
      color: #1a5ba0;
      font-size: 13px;
      letter-spacing: 1px;
      margin-bottom: 12px;
    }
    .tracking-link {
      display: inline-block;
      background: #daa520;
      color: #1a1a2e;
      padding: 12px 24px;
      border-radius: 40px;
      text-decoration: none;
      font-weight: 700;
      font-size: 14px;
      margin-top: 12px;
    }
    .footer {
      background: #f8f6f2;
      padding: 24px 28px;
      text-align: center;
      border-top: 1px solid #e8e4dc;
    }
    .footer-logo {
      font-size: 20px;
      color: #daa520;
      font-family: 'Georgia', serif;
      margin-bottom: 12px;
    }
    .footer-links {
      margin: 16px 0;
    }
    .footer-links a {
      color: #666;
      text-decoration: none;
      font-size: 12px;
      margin: 0 10px;
    }
    .footer-copyright {
      color: #999;
      font-size: 11px;
    }
    @media (max-width: 560px) {
      .email-body { padding: 24px 16px; }
      .product-image { width: 48px; height: 48px; }
      .product-name { font-size: 12px; }
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="email-header">
      <h1>TECH<span style="color:#fff">4U</span></h1>
      <p>LUXURY ESSENTIALS</p>
    </div>
    <div class="email-body">
      ${content}
    </div>
    <div class="footer">
      <div class="footer-logo">✦ TECH4U ✦</div>
      <div class="footer-links">
        <a href="https://tech4ru.com">Shop</a>
        <a href="https://tech4ru.com/contact">Contact</a>
        <a href="https://tech4ru.com/returns">Returns</a>
      </div>
      <div class="footer-copyright">© 2024 Tech4U — Luxury Redefined</div>
    </div>
  </div>
</body>
</html>`;
}

// ─── Helper functions ─────────────────────────────────────────────────────────
function buildItemRowsHtml(
  items: any[],
  country?: string,
): { html: string; subtotalFormatted: string } {
  let subtotalPKR = 0;

  const rowsHtml = items
    .map((item) => {
      const ppu = item.piecesPerUnit || 1;
      const itemTotalPKR = item.price * ppu * item.quantity;
      subtotalPKR += itemTotalPKR;

      const totalData = country
        ? convertPrice(itemTotalPKR, country)
        : { formatted: "₨ " + itemTotalPKR.toLocaleString("en-PK") };

      const itemImage =
        item.variant_image || item.product_image || item.image || null;
      const displayName = item.name || "Product";
      const variantText =
        item.variant && item.variant !== "Standard" ? ` (${item.variant})` : "";

      return `
      <tr>
        <td style="padding: 16px 8px; border-bottom: 1px solid #f0f0f0;">
          <div class="product-cell" style="display: flex; align-items: center; gap: 14px;">
            ${
              itemImage
                ? `<img src="${itemImage}" alt="${displayName}" class="product-image" style="width: 60px; height: 60px; border-radius: 12px; object-fit: cover;">`
                : `
              <div style="width: 60px; height: 60px; background: #f5f5f5; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: #ccc;">📦</div>
            `
            }
            <div>
              <div class="product-name" style="font-weight: 600; color: #1a1a2e;">${displayName}${variantText}</div>
              ${ppu > 1 ? `<div style="font-size: 11px; color: #888; margin-top: 4px;">${ppu} pieces per unit</div>` : ""}
            </div>
          </div>
        </td>
        <td style="padding: 16px 8px; border-bottom: 1px solid #f0f0f0; text-align: center; color: #555;">x${item.quantity}</td>
        <td style="padding: 16px 8px; border-bottom: 1px solid #f0f0f0; text-align: right; font-weight: 600; color: #1a1a2e;">${totalData.formatted}</td>
      </tr>
    `;
    })
    .join("");

  const totalData = country
    ? convertPrice(subtotalPKR, country)
    : { formatted: "₨ " + subtotalPKR.toLocaleString("en-PK") };

  return {
    html: rowsHtml,
    subtotalFormatted: totalData.formatted,
  };
}

function buildItemRowsPlain(items: any[], country?: string): string {
  return items
    .map((item) => {
      const ppu = item.piecesPerUnit || 1;
      const totalPrice = item.price * ppu * item.quantity;
      const price = country
        ? convertPrice(totalPrice, country).formatted
        : "₨ " + totalPrice.toLocaleString("en-PK");
      return `- ${item.name}${item.variant ? ` (${item.variant})` : ""} x${item.quantity}: ${price}`;
    })
    .join("\n");
}

// ============================================================
// 1. ORDER CONFIRMATION - Customer
// ============================================================
export async function sendOrderConfirmationEmail(
  customerEmail: string,
  orderNumber: string,
  customerName: string,
  items: any[],
  total: number,
  shippingAddress: string,
  paymentMethod: string,
  currencyCode: string = "PKR",
  formattedTotal?: string,
  formattedItems?: any[],
  customerCountry?: string,
): Promise<boolean> {
  const country = customerCountry || "Pakistan";
  const itemsList = items.length > 0 ? items : (formattedItems as any) || [];

  const { html: itemRowsHtml, subtotalFormatted } = buildItemRowsHtml(
    itemsList,
    country,
  );
  const displayTotal = country
    ? convertPrice(total, country).formatted
    : "₨ " + total.toLocaleString("en-PK");

  const addressHtml = shippingAddress.replace(/\n/g, "<br>");

  const content = `
    <div class="greeting">
      <h2>Order Confirmed, ${customerName}</h2>
      <p>Thank you for choosing Tech4U. Your order has been received and will be processed shortly.</p>
    </div>
    
    <div class="order-info">
      <div class="order-info-row">
        <span class="order-info-label">ORDER NUMBER</span>
        <span class="order-info-value order-number">${orderNumber}</span>
      </div>
      <div class="order-info-row">
        <span class="order-info-label">TOTAL AMOUNT</span>
        <span class="order-info-value">${displayTotal}</span>
      </div>
      <div class="order-info-row">
        <span class="order-info-label">PAYMENT METHOD</span>
        <span class="order-info-value">${paymentMethod === "card" ? "Credit/Debit Card" : paymentMethod === "paypal" ? "PayPal" : paymentMethod}</span>
      </div>
      <div class="order-info-row">
        <span class="order-info-label">SHIPPING ADDRESS</span>
        <span class="order-info-value" style="text-align: right; max-width: 60%;">${addressHtml}</span>
      </div>
    </div>
    
    <div class="items-title">ORDER SUMMARY</div>
    <table class="items-table" style="width: 100%; border-collapse: collapse;">
      <thead>
        <tr>
          <th style="text-align: left; padding: 12px 8px;">Product</th>
          <th style="text-align: center; padding: 12px 8px;">Qty</th>
          <th style="text-align: right; padding: 12px 8px;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemRowsHtml}
        <tr class="total-row">
          <td colspan="2" style="padding: 16px 8px; text-align: right; font-weight: 700;">GRAND TOTAL</td>
          <td style="padding: 16px 8px; text-align: right; font-weight: 700; font-size: 16px;">${displayTotal}</td>
        </tr>
      </tbody>
    </table>
    
    <div style="margin-top: 32px; padding: 20px; background: #f8f6f2; border-radius: 16px; text-align: center;">
      <p style="color: #555; font-size: 13px;">✨ Free shipping on all orders ✨</p>
      <p style="color: #999; font-size: 12px; margin-top: 8px;">You will receive updates when your order is processed and shipped.</p>
    </div>
  `;

  const text = `TECH4U - ORDER CONFIRMED\n\nHello ${customerName},\n\nYour order has been confirmed.\n\nOrder Number: ${orderNumber}\nTotal: ${displayTotal}\nPayment: ${paymentMethod}\nShip To: ${shippingAddress}\n\nItems Ordered:\n${buildItemRowsPlain(itemsList, country)}\n\nTotal: ${displayTotal}\n\nShipping: FREE\n\nThank you for shopping with Tech4U!`;

  return sendEmail(
    customerEmail,
    `Order Confirmed — ${orderNumber}`,
    luxeWrap(content),
    text,
  );
}

// ============================================================
// 2. OWNER ORDER ALERT
// ============================================================
export async function sendOwnerOrderAlert(
  orderNumber: string,
  customerName: string,
  customerEmail: string,
  customerPhone: string,
  items: any[],
  total: number,
  shippingAddress: string,
  paymentMethod: string,
  currencyCode: string = "PKR",
  formattedTotal?: string,
  formattedItems?: any[],
  customerCountry?: string,
): Promise<boolean> {
  const ownerEmails = (process.env.OWNER_EMAILS || "tech4ruu@gmail.com")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);

  const now = new Date().toLocaleString("en-PK", { timeZone: "Asia/Karachi" });
  const itemsList = items.length > 0 ? items : (formattedItems as any) || [];
  const displayTotal = "₨ " + Math.round(total).toLocaleString("en-PK");
  const itemRowsPlain = buildItemRowsPlain(itemsList, "Pakistan");

  const content = `
    <div class="greeting">
      <h2>🛍️ New Order Received</h2>
      <p style="color: #666;">${now} PKT</p>
    </div>
    
    <div class="order-info">
      <div class="order-info-row">
        <span class="order-info-label">ORDER NUMBER</span>
        <span class="order-info-value order-number">${orderNumber}</span>
      </div>
      <div class="order-info-row">
        <span class="order-info-label">TOTAL (PKR)</span>
        <span class="order-info-value">${displayTotal}</span>
      </div>
      <div class="order-info-row">
        <span class="order-info-label">PAYMENT METHOD</span>
        <span class="order-info-value">${paymentMethod}</span>
      </div>
      <div class="order-info-row">
        <span class="order-info-label">CUSTOMER</span>
        <span class="order-info-value">${customerName}</span>
      </div>
      <div class="order-info-row">
        <span class="order-info-label">COUNTRY</span>
        <span class="order-info-value">${customerCountry || "Pakistan"}</span>
      </div>
      <div class="order-info-row">
        <span class="order-info-label">EMAIL</span>
        <span class="order-info-value">${customerEmail}</span>
      </div>
      <div class="order-info-row">
        <span class="order-info-label">PHONE</span>
        <span class="order-info-value">${customerPhone}</span>
      </div>
      <div class="order-info-row">
        <span class="order-info-label">ADDRESS</span>
        <span class="order-info-value" style="text-align: right;">${shippingAddress}</span>
      </div>
    </div>
    
    <div class="items-title">ORDER ITEMS</div>
    <pre style="background: #f5f5f5; padding: 16px; border-radius: 12px; font-size: 12px; overflow-x: auto;">${itemRowsPlain}</pre>
    <p style="margin-top: 16px; font-weight: 700; text-align: right;">Total: ${displayTotal}</p>
  `;

  const text = `NEW ORDER RECEIVED - Tech4U\nTime: ${now} PKT\n\nOrder Number: ${orderNumber}\nTotal: ${displayTotal}\nPayment: ${paymentMethod}\n\nCustomer: ${customerName}\nCountry: ${customerCountry || "Pakistan"}\nEmail: ${customerEmail}\nPhone: ${customerPhone}\nAddress: ${shippingAddress}\n\nItems:\n${itemRowsPlain}\nTotal: ${displayTotal}`;

  return sendEmail(
    ownerEmails,
    `New Order ${orderNumber} — ${displayTotal}`,
    luxeWrap(content),
    text,
  );
}

// ============================================================
// 3. STATUS UPDATE EMAIL - Customer
// ============================================================
export async function sendStatusUpdateEmail(
  customerEmail: string,
  customerName: string,
  orderNumber: string,
  newStatus: "shipped" | "delivered" | "cancelled" | "confirmed" | "processing",
  trackingNumber?: string,
  courierName?: string,
  courierTrackingUrl?: string,
  estimatedDays?: string,
  items?: any[],
  formattedItems?: any[],
  displayTotal?: string,
  customerCountry?: string,
): Promise<boolean> {
  const country = customerCountry || "Pakistan";

  let statusTitle = "";
  let statusIcon = "";
  let statusColor = "";

  if (newStatus === "shipped") {
    statusTitle = "Order Shipped";
    statusIcon = "🚚";
    statusColor = "#daa520";
  } else if (newStatus === "delivered") {
    statusTitle = "Order Delivered";
    statusIcon = "✅";
    statusColor = "#22c55e";
  } else if (newStatus === "cancelled") {
    statusTitle = "Order Cancelled";
    statusIcon = "❌";
    statusColor = "#ef4444";
  } else if (newStatus === "confirmed") {
    statusTitle = "Order Confirmed";
    statusIcon = "✓";
    statusColor = "#daa520";
  } else {
    statusTitle = "Order Processing";
    statusIcon = "⚙️";
    statusColor = "#f59e0b";
  }

  let itemsHtml = "";
  let itemsPlain = "";
  let totalDisplayFormatted = displayTotal;

  if (items && items.length > 0) {
    const itemsList = items.length > 0 ? items : (formattedItems as any) || [];
    const { html: itemRowsHtml, subtotalFormatted } = buildItemRowsHtml(
      itemsList,
      country,
    );
    totalDisplayFormatted = subtotalFormatted;

    itemsHtml = `
      <div class="items-title">ORDER SUMMARY</div>
      <table class="items-table" style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr>
            <th style="text-align: left; padding: 12px 8px;">Product</th>
            <th style="text-align: center; padding: 12px 8px;">Qty</th>
            <th style="text-align: right; padding: 12px 8px;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemRowsHtml}
          <tr class="total-row">
            <td colspan="2" style="padding: 16px 8px; text-align: right; font-weight: 700;">TOTAL</td>
            <td style="padding: 16px 8px; text-align: right; font-weight: 700;">${totalDisplayFormatted}</td>
          </tr>
        </tbody>
      </table>
    `;
    itemsPlain = buildItemRowsPlain(itemsList, country);
  }

  let shippingInfoHtml = "";
  let shippingInfoPlain = "";
  if (newStatus === "shipped" && courierName && trackingNumber) {
    const trackUrl = courierTrackingUrl || "";
    shippingInfoHtml = `
      <div class="shipping-info">
        <h4>📦 SHIPPING DETAILS</h4>
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <span style="color: #666;">Courier:</span>
          <span style="font-weight: 600;">${courierName}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <span style="color: #666;">Tracking Number:</span>
          <span style="font-weight: 600; font-family: monospace;">${trackingNumber}</span>
        </div>
        ${
          estimatedDays
            ? `
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <span style="color: #666;">Est. Delivery:</span>
          <span style="font-weight: 600;">${estimatedDays}</span>
        </div>
        `
            : ""
        }
        ${trackUrl ? `<a href="${trackUrl}" class="tracking-link">🔗 Track Your Order</a>` : ""}
      </div>
    `;
    shippingInfoPlain = `\nShipping Details:\nCourier: ${courierName}\nTracking Number: ${trackingNumber}${estimatedDays ? `\nEst. Delivery: ${estimatedDays}` : ""}\n`;
  }

  const content = `
    <div class="greeting">
      <h2>${statusIcon} ${statusTitle}, ${customerName}</h2>
      <p>Order #${orderNumber}</p>
    </div>
    
    <div class="order-info">
      <div class="order-info-row">
        <span class="order-info-label">STATUS</span>
        <span class="order-info-value" style="color: ${statusColor};">${newStatus.toUpperCase()}</span>
      </div>
      <div class="order-info-row">
        <span class="order-info-label">ORDER NUMBER</span>
        <span class="order-info-value order-number">${orderNumber}</span>
      </div>
    </div>
    
    ${shippingInfoHtml}
    ${itemsHtml}
    
    <div style="margin-top: 24px; text-align: center;">
      <a href="https://tech4ru.com" style="color: #daa520; text-decoration: none; font-size: 13px;">Visit Tech4U →</a>
    </div>
  `;

  const subjects: Record<string, string> = {
    confirmed: `Order Confirmed — ${orderNumber}`,
    processing: `Order Processing — ${orderNumber}`,
    shipped: `Order Shipped — ${orderNumber}`,
    delivered: `Order Delivered — ${orderNumber}`,
    cancelled: `Order Cancelled — ${orderNumber}`,
  };

  const text = `${statusTitle.toUpperCase()} - Tech4U\n\nHello ${customerName},\n\nOrder #${orderNumber}\nStatus: ${newStatus.toUpperCase()}\n${shippingInfoPlain}\n${itemsPlain ? `\nOrder Summary:\n${itemsPlain}\n` : ""}\nThank you for shopping with Tech4U!`;

  return sendEmail(customerEmail, subjects[newStatus], luxeWrap(content), text);
}

// ============================================================
// 4. OWNER STATUS ALERT
// ============================================================
export async function sendOwnerStatusAlert(
  orderNumber: string,
  customerName: string,
  customerEmail: string,
  customerPhone: string,
  status: "shipped" | "delivered" | "cancelled" | "confirmed" | "processing",
  extraInfo?: string,
): Promise<boolean> {
  const ownerEmails = (process.env.OWNER_EMAILS || "tech4ruu@gmail.com")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);

  const statusLabel = status.toUpperCase();
  const now = new Date().toLocaleString("en-PK", { timeZone: "Asia/Karachi" });

  const content = `
    <div class="greeting">
      <h2>📋 ${statusLabel} — Admin Alert</h2>
      <p>${now} PKT</p>
    </div>
    
    <div class="order-info">
      <div class="order-info-row">
        <span class="order-info-label">ORDER</span>
        <span class="order-info-value">${orderNumber}</span>
      </div>
      <div class="order-info-row">
        <span class="order-info-label">STATUS</span>
        <span class="order-info-value">${statusLabel}</span>
      </div>
      <div class="order-info-row">
        <span class="order-info-label">CUSTOMER</span>
        <span class="order-info-value">${customerName}</span>
      </div>
      <div class="order-info-row">
        <span class="order-info-label">EMAIL</span>
        <span class="order-info-value">${customerEmail}</span>
      </div>
      <div class="order-info-row">
        <span class="order-info-label">PHONE</span>
        <span class="order-info-value">${customerPhone}</span>
      </div>
      ${extraInfo ? `<div class="order-info-row"><span class="order-info-label">INFO</span><span class="order-info-value">${extraInfo}</span></div>` : ""}
    </div>
  `;

  const text = `${statusLabel} - Tech4U Admin\nTime: ${now} PKT\n\nOrder: ${orderNumber}\nCustomer: ${customerName} | ${customerEmail} | ${customerPhone}\n${extraInfo ? `Info: ${extraInfo}` : ""}`;

  const subjects: Record<string, string> = {
    shipped: `Order ${orderNumber} Shipped`,
    delivered: `Order ${orderNumber} Delivered`,
    cancelled: `Order ${orderNumber} Cancelled`,
    confirmed: `Order ${orderNumber} Confirmed`,
    processing: `Order ${orderNumber} Processing`,
  };

  return sendEmail(ownerEmails, subjects[status], luxeWrap(content), text);
}
