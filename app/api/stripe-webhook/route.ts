// app/api/webhooks/stripe/route.ts
// ✅ payment_intent.succeeded → DB update + owner email
// ✅ payment_intent.payment_failed → DB update + owner email alert
// ✅ Idempotency — duplicate webhook ignore
// ✅ SMTP: GMAIL_USER (tech4ruu@gmail.com) se bhejta hai
// ✅ Email jata hai: STRIPE_OWNER_EMAIL + OWNER_EMAIL (dono ko)
// ✅ Raw body buffer — Vercel ke liye correct (body consumed once)
// ✅ Gmail SMTP port 587 (TLS) — port 465 kabhi kabhi Vercel pe block hota

import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";

// ── CRITICAL: Disable body parsing — Stripe signature verify ke liye raw body chahiye
export const config = {
  api: { bodyParser: false },
};

// ── Supabase ──────────────────────────────────────────────────────────────────
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );
}

// ── Email sender ──────────────────────────────────────────────────────────────
async function sendPaymentReceivedEmail(params: {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  amount: number;
  currency: string;
  paymentIntentId: string;
  status: "succeeded" | "failed";
}) {
  const {
    orderNumber,
    customerName,
    customerEmail,
    amount,
    currency,
    paymentIntentId,
    status,
  } = params;

  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;

  // ── Debug logs ─────────────────────────────────────────────────────────────
  console.log("📧 EMAIL DEBUG ─────────────────────────────────────");
  console.log(`  GMAIL_USER:         ${gmailUser ?? "❌ MISSING"}`);
  console.log(
    `  GMAIL_APP_PASSWORD: ${gmailPass ? `✅ (${gmailPass.length} chars)` : "❌ MISSING"}`,
  );
  console.log(
    `  STRIPE_OWNER_EMAIL: ${process.env.STRIPE_OWNER_EMAIL ?? "❌ MISSING"}`,
  );
  console.log(
    `  OWNER_EMAIL:        ${process.env.OWNER_EMAIL ?? "❌ MISSING"}`,
  );
  console.log("────────────────────────────────────────────────────");

  if (!gmailUser || !gmailPass) {
    console.error("❌ GMAIL credentials missing in env — email ABORTED");
    return false;
  }

  // ── Transporter — port 587 + STARTTLS (Vercel compatible) ─────────────────
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // STARTTLS (false = upgrade after connect)
    requireTLS: true,
    auth: { user: gmailUser, pass: gmailPass },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 30000,
  });

  // ── SMTP verify ────────────────────────────────────────────────────────────
  try {
    await transporter.verify();
    console.log("✅ Gmail SMTP connection verified OK");
  } catch (verifyErr: any) {
    console.error("❌ Gmail SMTP VERIFY FAILED:", verifyErr?.message);
    console.error(`   Code: ${verifyErr?.code}`);
    if (verifyErr?.code === "EAUTH") {
      console.error(
        "   ⚠️  App Password wrong — go to: https://myaccount.google.com/apppasswords",
      );
      console.error(
        "   ⚠️  2-Step Verification must be ON for App Passwords to work",
      );
    }
    return false;
  }

  // ── Recipients ─────────────────────────────────────────────────────────────
  // STRIPE_OWNER_EMAIL = shwaqas93@gmail.com (Stripe payment alerts)
  // OWNER_EMAIL = tech4ruu@gmail.com (general owner)
  // Both will receive Stripe payment emails
  const recipientSet = new Set<string>();
  if (process.env.STRIPE_OWNER_EMAIL)
    recipientSet.add(process.env.STRIPE_OWNER_EMAIL.trim());
  if (process.env.OWNER_EMAIL) recipientSet.add(process.env.OWNER_EMAIL.trim());
  if (process.env.OWNER_EMAILS) {
    process.env.OWNER_EMAILS.split(",").forEach((e) =>
      recipientSet.add(e.trim()),
    );
  }
  // Fallback if nothing set
  if (recipientSet.size === 0) recipientSet.add(gmailUser);

  const recipientList = [...recipientSet];
  console.log(`📨 Sending Stripe alert to: ${recipientList.join(", ")}`);

  // ── Currency formatting ────────────────────────────────────────────────────
  const currencySymbols: Record<string, string> = {
    usd: "$",
    gbp: "£",
    eur: "€",
    aud: "A$",
    cad: "C$",
    aed: "AED ",
    sar: "SAR ",
    inr: "₹",
    sgd: "S$",
    nzd: "NZ$",
  };
  const symbol =
    currencySymbols[currency.toLowerCase()] ?? currency.toUpperCase() + " ";
  const formattedAmount = `${symbol}${amount.toFixed(2)}`;
  const currencyUpper = currency.toUpperCase();
  const isSuccess = status === "succeeded";
  const timeNow = new Date().toLocaleString("en-PK", {
    timeZone: "Asia/Karachi",
  });

  // ── Subject ────────────────────────────────────────────────────────────────
  const subject = isSuccess
    ? `Payment Received - ${formattedAmount} ${currencyUpper} - Order #${orderNumber}`
    : `Payment FAILED - Order #${orderNumber}`;

  // ── HTML body ──────────────────────────────────────────────────────────────
  const htmlBody = isSuccess
    ? `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
<div style="max-width:600px;margin:20px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">

  <!-- Header -->
  <div style="background:linear-gradient(135deg,#1a1a1a,#2d2d2d);padding:28px 32px;text-align:center;">
    <h1 style="color:#daa520;margin:0;font-size:24px;letter-spacing:3px;">TECH4U</h1>
    <p style="color:#888;margin:6px 0 0;font-size:12px;letter-spacing:1px;">PAYMENT NOTIFICATION</p>
  </div>

  <!-- Success Banner -->
  <div style="background:#d1fae5;padding:18px 32px;border-left:5px solid #10b981;text-align:center;">
    <p style="margin:0;color:#065f46;font-size:20px;font-weight:700;">
      Payment Successfully Received!
    </p>
  </div>

  <!-- Amount Hero -->
  <div style="padding:24px 32px 0;text-align:center;">
    <p style="margin:0;color:#666;font-size:13px;text-transform:uppercase;letter-spacing:1px;">Amount Received</p>
    <p style="margin:4px 0 0;color:#10b981;font-size:42px;font-weight:900;letter-spacing:-1px;">${formattedAmount}</p>
    <p style="margin:0;color:#999;font-size:13px;">${currencyUpper}</p>
  </div>

  <!-- Details -->
  <div style="padding:24px 32px;">
    <table style="width:100%;border-collapse:collapse;">
      <tr style="border-bottom:1px solid #f0f0f0;">
        <td style="padding:12px 0;color:#666;font-size:14px;">Order Number</td>
        <td style="padding:12px 0;color:#1a1a1a;font-weight:700;font-size:14px;text-align:right;">#${orderNumber}</td>
      </tr>
      <tr style="border-bottom:1px solid #f0f0f0;">
        <td style="padding:12px 0;color:#666;font-size:14px;">Customer</td>
        <td style="padding:12px 0;color:#1a1a1a;font-size:14px;text-align:right;">${customerName}</td>
      </tr>
      <tr style="border-bottom:1px solid #f0f0f0;">
        <td style="padding:12px 0;color:#666;font-size:14px;">Email</td>
        <td style="padding:12px 0;color:#1a1a1a;font-size:14px;text-align:right;">${customerEmail}</td>
      </tr>
      <tr style="border-bottom:1px solid #f0f0f0;">
        <td style="padding:12px 0;color:#666;font-size:14px;">Payment ID</td>
        <td style="padding:12px 0;color:#888;font-size:11px;font-family:monospace;text-align:right;">${paymentIntentId}</td>
      </tr>
      <tr>
        <td style="padding:12px 0;color:#666;font-size:14px;">Time (PKT)</td>
        <td style="padding:12px 0;color:#1a1a1a;font-size:14px;text-align:right;">${timeNow}</td>
      </tr>
    </table>
  </div>

  <!-- Action Box -->
  <div style="padding:0 32px 24px;">
    <div style="background:#fefce8;border:1px solid #fde68a;border-radius:10px;padding:16px;">
      <p style="margin:0;color:#92400e;font-size:13px;font-weight:700;">Action Required</p>
      <p style="margin:6px 0 0;color:#78350f;font-size:13px;">
        Process this order and update its status in your admin panel.
      </p>
    </div>
  </div>

  <!-- Stripe Button -->
  <div style="padding:0 32px 32px;text-align:center;">
    <a href="https://dashboard.stripe.com/payments/${paymentIntentId}"
       style="display:inline-block;background:#635bff;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:700;">
      View in Stripe Dashboard
    </a>
  </div>

  <!-- Footer -->
  <div style="background:#f9f9f9;padding:16px 32px;text-align:center;border-top:1px solid #eee;">
    <p style="margin:0;color:#aaa;font-size:11px;">Tech4U Admin - Stripe Live - ${new Date().getFullYear()}</p>
  </div>
</div>
</body>
</html>`
    : `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
<div style="max-width:600px;margin:20px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
  <div style="background:linear-gradient(135deg,#1a1a1a,#2d2d2d);padding:28px 32px;text-align:center;">
    <h1 style="color:#daa520;margin:0;font-size:24px;letter-spacing:3px;">TECH4U</h1>
    <p style="color:#888;margin:6px 0 0;font-size:12px;">PAYMENT NOTIFICATION</p>
  </div>
  <div style="background:#fee2e2;padding:18px 32px;border-left:5px solid #ef4444;text-align:center;">
    <p style="margin:0;color:#991b1b;font-size:20px;font-weight:700;">Payment Failed</p>
  </div>
  <div style="padding:32px;">
    <table style="width:100%;border-collapse:collapse;">
      <tr style="border-bottom:1px solid #f0f0f0;">
        <td style="padding:12px 0;color:#666;font-size:14px;">Order Number</td>
        <td style="padding:12px 0;color:#1a1a1a;font-weight:700;font-size:14px;text-align:right;">#${orderNumber}</td>
      </tr>
      <tr style="border-bottom:1px solid #f0f0f0;">
        <td style="padding:12px 0;color:#666;font-size:14px;">Customer</td>
        <td style="padding:12px 0;color:#1a1a1a;font-size:14px;text-align:right;">${customerName}</td>
      </tr>
      <tr style="border-bottom:1px solid #f0f0f0;">
        <td style="padding:12px 0;color:#666;font-size:14px;">Email</td>
        <td style="padding:12px 0;color:#1a1a1a;font-size:14px;text-align:right;">${customerEmail}</td>
      </tr>
      <tr style="border-bottom:1px solid #f0f0f0;">
        <td style="padding:12px 0;color:#666;font-size:14px;">Payment ID</td>
        <td style="padding:12px 0;color:#888;font-size:11px;font-family:monospace;text-align:right;">${paymentIntentId}</td>
      </tr>
      <tr>
        <td style="padding:12px 0;color:#666;font-size:14px;">Time (PKT)</td>
        <td style="padding:12px 0;color:#1a1a1a;font-size:14px;text-align:right;">${timeNow}</td>
      </tr>
    </table>
    <div style="margin-top:20px;text-align:center;">
      <a href="https://dashboard.stripe.com/payments/${paymentIntentId}"
         style="display:inline-block;background:#ef4444;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:700;">
        View Failed Payment
      </a>
    </div>
  </div>
  <div style="background:#f9f9f9;padding:16px 32px;text-align:center;border-top:1px solid #eee;">
    <p style="margin:0;color:#aaa;font-size:11px;">Tech4U Admin - ${new Date().getFullYear()}</p>
  </div>
</div>
</body>
</html>`;

  // ── Send ───────────────────────────────────────────────────────────────────
  try {
    const info = await transporter.sendMail({
      from: `"Tech4U Payments" <${gmailUser}>`,
      to: recipientList.join(","),
      subject,
      html: htmlBody,
    });
    console.log("✅ STRIPE ALERT EMAIL SENT!");
    console.log(`   To: ${info.accepted?.join(", ")}`);
    console.log(`   Message-ID: ${info.messageId}`);
    return true;
  } catch (err: any) {
    console.error("❌ EMAIL SEND FAILED:", err?.code, err?.message);
    return false;
  }
}

// ── Webhook handler ───────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  // ✅ Read raw body as text — MUST be done before anything else
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  console.log("\n🔔 Stripe webhook received");
  console.log(`   Signature present: ${signature ? "✅ YES" : "❌ NO"}`);
  console.log(`   Body length: ${body.length} chars`);

  if (!signature) {
    console.error("❌ No stripe-signature header");
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("❌ STRIPE_WEBHOOK_SECRET not set in env");
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 },
    );
  }

  let event: any;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    console.log(
      `✅ Signature verified | Event: ${event.type} | ID: ${event.id}`,
    );
  } catch (err: any) {
    console.error("❌ Webhook signature FAILED:", err?.message);
    console.error(
      "   ⚠️  Check: STRIPE_WEBHOOK_SECRET in Vercel env must match Stripe dashboard",
    );
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = getSupabase();

  // ── Idempotency ───────────────────────────────────────────────────────────
  try {
    const { data: existing } = await supabase
      .from("stripe_webhook_events")
      .select("id")
      .eq("id", event.id)
      .single();

    if (existing) {
      console.log(`⚠️ Duplicate event ${event.id} — skipping`);
      return NextResponse.json({ received: true, duplicate: true });
    }

    await supabase.from("stripe_webhook_events").insert({
      id: event.id,
      type: event.type,
      data: event,
      processed_at: new Date().toISOString(),
    });
  } catch (dbErr: any) {
    // Table might not exist — non-critical, continue processing
    console.warn("⚠️ stripe_webhook_events table:", dbErr?.message);
  }

  // ── Events ────────────────────────────────────────────────────────────────
  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const pi = event.data.object as any;
        const orderNumber = pi.metadata?.orderNumber;
        const customerEmail = pi.metadata?.customerEmail || "";
        const customerName = pi.metadata?.customerName || "Customer";
        const amountReceived = pi.amount_received / 100;
        const currency = pi.currency;

        console.log(`\n✅ payment_intent.succeeded`);
        console.log(`   Order: #${orderNumber}`);
        console.log(`   Amount: ${amountReceived} ${currency.toUpperCase()}`);
        console.log(`   Customer: ${customerName} <${customerEmail}>`);
        console.log(`   PaymentIntent: ${pi.id}`);

        // ── DB update ──────────────────────────────────────────────────────
        if (orderNumber) {
          const { error: dbErr } = await supabase
            .from("orders")
            .update({
              payment_status: "paid",
              status: "confirmed",
              payment_id: pi.id,
              updated_at: new Date().toISOString(),
            })
            .eq("order_number", orderNumber);

          if (dbErr) console.error("❌ DB update error:", dbErr.message);
          else console.log(`✅ DB: Order #${orderNumber} → confirmed + paid`);
        } else {
          console.warn("⚠️ No orderNumber in metadata — DB not updated");
        }

        // ── Send email ─────────────────────────────────────────────────────
        const emailSent = await sendPaymentReceivedEmail({
          orderNumber: orderNumber || "N/A",
          customerName,
          customerEmail,
          amount: amountReceived,
          currency,
          paymentIntentId: pi.id,
          status: "succeeded",
        });
        console.log(`📧 Payment email: ${emailSent ? "✅ sent" : "❌ failed"}`);
        break;
      }

      case "payment_intent.payment_failed": {
        const pi = event.data.object as any;
        const orderNumber = pi.metadata?.orderNumber;
        const customerName = pi.metadata?.customerName || "Customer";
        const customerEmail = pi.metadata?.customerEmail || "";

        console.log(`\n❌ payment_intent.payment_failed`);
        console.log(`   Order: #${orderNumber}`);
        console.log(`   PaymentIntent: ${pi.id}`);

        if (orderNumber) {
          await supabase
            .from("orders")
            .update({
              payment_status: "failed",
              updated_at: new Date().toISOString(),
            })
            .eq("order_number", orderNumber);
        }

        await sendPaymentReceivedEmail({
          orderNumber: orderNumber || "N/A",
          customerName,
          customerEmail,
          amount: 0,
          currency: pi.currency || "usd",
          paymentIntentId: pi.id,
          status: "failed",
        });
        break;
      }

      case "charge.succeeded": {
        const charge = event.data.object as any;
        const orderNumber = charge.metadata?.orderNumber;
        if (orderNumber) {
          await supabase
            .from("orders")
            .update({
              payment_status: "paid",
              updated_at: new Date().toISOString(),
            })
            .eq("order_number", orderNumber);
          console.log(
            `✅ charge.succeeded → Order #${orderNumber} marked paid`,
          );
        }
        break;
      }

      default:
        console.log(`ℹ️ Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("❌ Webhook processing error:", err?.message);
    // Still return 200 so Stripe doesn't retry forever
    return NextResponse.json({ received: true, error: err.message });
  }
}
