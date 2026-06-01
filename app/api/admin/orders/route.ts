// app/api/admin/orders/route.ts
// ✅ COMPLETE — GET all orders + PATCH status/shipping + Auto Notifications
// WhatsApp (WaSender) + Email (Gmail SMTP via email.ts) → Customer + Owner
// Statuses: confirmed | processing | shipped | delivered | cancelled

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendWhatsAppMessage } from "@/lib/whatsapp";
import {
  sendStatusUpdateEmail,
  sendOwnerStatusAlert,
  sendOrderConfirmationEmail,
  sendOwnerOrderAlert,
} from "@/lib/email-smtp";

// ─── Supabase Client ──────────────────────────────────────────────────────────
function getClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

// ─── WHATSAPP MESSAGES ────────────────────────────────────────────────────────

function confirmedWhatsAppMsg(name: string, orderNumber: string): string {
  return `✅ *Order Confirmed — Tech4U*

Hello *${name}*! 🎉

Your order *${orderNumber}* has been confirmed!

We'll notify you as soon as we start processing it.

For any questions:
📧 info@tech4ru.com
🌐 tech4ru.com

Thank you for choosing Tech4U! ✨`;
}

function processingWhatsAppMsg(name: string, orderNumber: string): string {
  return `⚙️ *Order Processing — Tech4U*

Hello *${name}*!

Your order *${orderNumber}* is now being processed. Our team is preparing it for shipment.

We'll send you tracking details once it's shipped! 📦

For any questions:
📧 info@tech4ru.com
🌐 tech4ru.com

Thank you for your patience! 🙏`;
}

function shippedWhatsAppMsg(
  name: string,
  orderNumber: string,
  courierName: string,
  trackingNumber: string,
  estimatedDays: string,
  trackingUrl: string,
): string {
  return `🚚 *Your Order is Shipped — Tech4U*

Hello *${name}*! Great news! 🎉

━━━━━━━━━━━━━━━━━
📦 *Order:* ${orderNumber}
🏢 *Courier:* ${courierName}
📦 *Tracking No:* ${trackingNumber}
⏱ *Estimated Delivery:* ${estimatedDays}
━━━━━━━━━━━━━━━━━

${trackingUrl ? `🔗 *Track your parcel:*\n${trackingUrl}` : ""}

Your order is on its way! We'll update you when it's delivered.

For any questions:
📧 info@tech4ru.com
🌐 tech4ru.com

Thank you for choosing Tech4U! ✨`;
}

function deliveredWhatsAppMsg(name: string, orderNumber: string): string {
  return `✅ *Order Delivered — Tech4U* 🎉

Hello *${name}*!

Your order *${orderNumber}* has been successfully delivered! 📦

We hope you love your purchase! 🛍️

If you need anything:
📧 info@tech4ru.com
🌐 tech4ru.com

Thank you for shopping with Tech4U! ⭐`;
}

function cancelledWhatsAppMsg(name: string, orderNumber: string): string {
  return `❌ *Order Cancelled — Tech4U*

Hello *${name}*,

Your order *${orderNumber}* has been cancelled.

If you have any questions or need help:
📧 info@tech4ru.com
🌐 tech4ru.com

We hope to serve you again soon. 🙏`;
}

// ─── NOTIFICATION DISPATCHER ──────────────────────────────────────────────────
// Sends WhatsApp + Customer Email + Owner Email using Gmail SMTP (email.ts)

async function dispatchNotifications({
  status,
  customerEmail,
  customerPhone,
  customerName,
  orderNumber,
  courierName,
  courierCountry,
  customerCountry,
  estimatedDays,
  trackingNumber,
  courierTrackingUrl,
  shippingAddress,
  paymentMethod,
  subtotal,
  shippingCost,
  totalAmount,
  items,
}: {
  status: string;
  customerEmail: string;
  customerPhone?: string;
  customerName: string;
  orderNumber: string;
  courierName?: string;
  courierCountry?: string;
  customerCountry?: string;
  estimatedDays?: string;
  trackingNumber?: string;
  courierTrackingUrl?: string;
  shippingAddress?: string;
  paymentMethod?: string;
  subtotal?: number;
  shippingCost?: number;
  totalAmount?: number;
  items?: any[];
}): Promise<{
  whatsappSent: boolean;
  customerEmailSent: boolean;
  ownerEmailSent: boolean;
}> {
  // Owner emails list from env
  const ownerEmails = (process.env.OWNER_EMAILS || "tech4ruu@gmail.com")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);

  let whatsappMsg = "";
  let customerEmailSubject = "";
  let customerEmailHtml = "";
  let ownerEmailSubject = "";
  let ownerEmailHtml = "";

  if (status === "confirmed") {
    whatsappMsg = confirmedWhatsAppMsg(customerName, orderNumber);

    // Customer email via email.ts
    const [emailResult, ownerResult] = await Promise.all([
      sendOrderConfirmationEmail(
        customerEmail,
        orderNumber,
        customerName,
        items || [],
        totalAmount || 0,
        shippingAddress || "",
        paymentMethod || "N/A",
        "PKR",
        `PKR ${(totalAmount || 0).toLocaleString()}`,
        items?.map((item: any) => ({
          name: item.product_name || item.name || "Product",
          variant: item.variant_name,
          quantity: item.quantity,
          formattedPrice: `PKR ${(item.price * (item.pieces_per_unit || 1)).toLocaleString()}`,
        })) || [],
        customerCountry || "Pakistan",
      ),
      sendOwnerOrderAlert(
        orderNumber,
        customerName,
        customerEmail,
        customerPhone || "",
        items || [],
        totalAmount || 0,
        shippingAddress || "",
        paymentMethod || "N/A",
        "PKR",
        `PKR ${(totalAmount || 0).toLocaleString()}`,
        items?.map((item: any) => ({
          name: item.product_name || item.name || "Product",
          variant: item.variant_name,
          quantity: item.quantity,
          formattedPrice: `PKR ${(item.price * (item.pieces_per_unit || 1)).toLocaleString()}`,
        })) || [],
        customerCountry || "Pakistan",
      ),
    ]);

    return {
      whatsappSent: customerPhone
        ? await sendWhatsAppMessage(customerPhone, whatsappMsg)
        : false,
      customerEmailSent: emailResult,
      ownerEmailSent: ownerResult,
    };
  } else if (status === "processing") {
    whatsappMsg = processingWhatsAppMsg(customerName, orderNumber);

    const [emailResult, ownerResult] = await Promise.all([
      sendStatusUpdateEmail(
        customerEmail,
        customerName,
        orderNumber,
        "processing",
      ),
      sendOwnerStatusAlert(
        orderNumber,
        customerName,
        customerEmail,
        customerPhone || "",
        "shipped" as any, // Temporary - owner alert for processing
        "Order is being processed",
      ),
    ]);

    return {
      whatsappSent: customerPhone
        ? await sendWhatsAppMessage(customerPhone, whatsappMsg)
        : false,
      customerEmailSent: emailResult,
      ownerEmailSent: ownerResult,
    };
  } else if (status === "shipped") {
    const cn = courierName || "Courier";
    const tn = trackingNumber || "N/A";
    const ed = estimatedDays || "3–5 business days";
    const tu = courierTrackingUrl || "";

    whatsappMsg = shippedWhatsAppMsg(customerName, orderNumber, cn, tn, ed, tu);

    const [emailResult, ownerResult] = await Promise.all([
      sendStatusUpdateEmail(
        customerEmail,
        customerName,
        orderNumber,
        "shipped",
        tn,
        cn,
        tu,
        ed,
      ),
      sendOwnerStatusAlert(
        orderNumber,
        customerName,
        customerEmail,
        customerPhone || "",
        "shipped",
        `${cn} | Tracking: ${tn} | Est: ${ed}`,
      ),
    ]);

    return {
      whatsappSent: customerPhone
        ? await sendWhatsAppMessage(customerPhone, whatsappMsg)
        : false,
      customerEmailSent: emailResult,
      ownerEmailSent: ownerResult,
    };
  } else if (status === "delivered") {
    whatsappMsg = deliveredWhatsAppMsg(customerName, orderNumber);

    const [emailResult, ownerResult] = await Promise.all([
      sendStatusUpdateEmail(
        customerEmail,
        customerName,
        orderNumber,
        "delivered",
      ),
      sendOwnerStatusAlert(
        orderNumber,
        customerName,
        customerEmail,
        customerPhone || "",
        "delivered",
      ),
    ]);

    return {
      whatsappSent: customerPhone
        ? await sendWhatsAppMessage(customerPhone, whatsappMsg)
        : false,
      customerEmailSent: emailResult,
      ownerEmailSent: ownerResult,
    };
  } else if (status === "cancelled") {
    whatsappMsg = cancelledWhatsAppMsg(customerName, orderNumber);

    const [emailResult, ownerResult] = await Promise.all([
      sendStatusUpdateEmail(
        customerEmail,
        customerName,
        orderNumber,
        "cancelled",
      ),
      sendOwnerStatusAlert(
        orderNumber,
        customerName,
        customerEmail,
        customerPhone || "",
        "cancelled",
      ),
    ]);

    return {
      whatsappSent: customerPhone
        ? await sendWhatsAppMessage(customerPhone, whatsappMsg)
        : false,
      customerEmailSent: emailResult,
      ownerEmailSent: ownerResult,
    };
  }

  return {
    whatsappSent: false,
    customerEmailSent: false,
    ownerEmailSent: false,
  };
}

// ─── GET /api/admin/orders ────────────────────────────────────────────────────
export async function GET(_req: NextRequest) {
  try {
    const supabase = getClient();
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[API/orders] Error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ orders: data ?? [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─── PATCH /api/admin/orders ──────────────────────────────────────────────────
// Updates order status + shipping details, then fires notifications automatically
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      orderId,
      status,
      courier_name,
      courier_country,
      estimated_days,
      tracking_number,
      courier_tracking_url,
      shipped_at,
    } = body;

    if (!orderId) {
      return NextResponse.json(
        { error: "orderId is required" },
        { status: 400 },
      );
    }

    // ── Build DB update payload ──
    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (status !== undefined) updatePayload.status = status;
    if (courier_name !== undefined) updatePayload.courier_name = courier_name;
    if (courier_country !== undefined)
      updatePayload.courier_country = courier_country;
    if (estimated_days !== undefined)
      updatePayload.estimated_days = estimated_days;
    if (tracking_number !== undefined)
      updatePayload.tracking_number = tracking_number;
    if (courier_tracking_url !== undefined)
      updatePayload.courier_tracking_url = courier_tracking_url;
    if (shipped_at !== undefined) {
      updatePayload.shipped_at =
        shipped_at === "now" ? new Date().toISOString() : shipped_at;
    }
    // Auto-set shipped_at when status changes to shipped and not explicitly provided
    if (status === "shipped" && shipped_at === undefined) {
      updatePayload.shipped_at = new Date().toISOString();
    }

    if (Object.keys(updatePayload).length === 1) {
      return NextResponse.json(
        { error: "At least one field to update is required" },
        { status: 400 },
      );
    }

    const supabase = getClient();

    // ── Get order details BEFORE update (for notifications) ──
    const { data: orderData, error: fetchError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (fetchError) {
      console.warn(
        "[API/orders PATCH] Could not fetch order details:",
        fetchError.message,
      );
    }

    // ── Update the order in DB ──
    const { error: dbError } = await supabase
      .from("orders")
      .update(updatePayload)
      .eq("id", orderId);

    if (dbError) {
      console.error("[API/orders PATCH] DB Error:", dbError.message);
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    console.log(
      `✅ DB updated: Order ${orderData?.order_number ?? orderId} → ${status}`,
    );

    // ── Send notifications if status changed to a notifiable status ──
    const notifiableStatuses = [
      "confirmed",
      "processing",
      "shipped",
      "delivered",
      "cancelled",
    ];

    let whatsappSent = false;
    let customerEmailSent = false;
    let ownerEmailSent = false;

    if (status && notifiableStatuses.includes(status) && orderData?.email) {
      const customerName =
        `${orderData.first_name || ""} ${orderData.last_name || ""}`.trim() ||
        "Customer";

      // Build shipping address string
      const addressParts = [
        orderData.address,
        orderData.apartment,
        `${orderData.city}${orderData.zip ? ", " + orderData.zip : ""}`,
        orderData.country,
      ].filter(Boolean);
      const fullAddress = addressParts.join(", ");

      // Parse items if they are JSON string
      let items = orderData.items;
      if (typeof items === "string") {
        try {
          items = JSON.parse(items);
        } catch (e) {
          items = [];
        }
      }

      // Use newly provided values, fallback to existing DB values
      const finalCourierName = courier_name ?? orderData.courier_name;
      const finalCourierCountry = courier_country ?? orderData.courier_country;
      const finalTrackingNumber = tracking_number ?? orderData.tracking_number;
      const finalCourierUrl =
        courier_tracking_url ?? orderData.courier_tracking_url;
      const finalEstimatedDays = estimated_days ?? orderData.estimated_days;

      // Fire notifications using dispatchNotifications
      ({ whatsappSent, customerEmailSent, ownerEmailSent } =
        await dispatchNotifications({
          status,
          customerEmail: orderData.email,
          customerPhone: orderData.phone || "",
          customerName,
          orderNumber: orderData.order_number,
          courierName: finalCourierName,
          courierCountry: finalCourierCountry,
          customerCountry: orderData.country || "Pakistan",
          estimatedDays: finalEstimatedDays,
          trackingNumber: finalTrackingNumber,
          courierTrackingUrl: finalCourierUrl,
          shippingAddress: fullAddress,
          paymentMethod: orderData.payment_method,
          subtotal: orderData.subtotal,
          shippingCost: orderData.shipping_cost,
          totalAmount: orderData.total_amount,
          items: items,
        }));
    } else if (status && !notifiableStatuses.includes(status)) {
      console.log(
        `ℹ️ Status "${status}" is not in notifiable list — no notifications sent.`,
      );
    } else if (!orderData?.email) {
      console.warn(
        `⚠️ No customer email found for order ${orderId} — notifications skipped.`,
      );
    }

    return NextResponse.json({
      success: true,
      status,
      whatsappSent,
      emailSent: customerEmailSent,
      ownerEmailSent,
    });
  } catch (err: any) {
    console.error("[API/orders PATCH] Exception:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
