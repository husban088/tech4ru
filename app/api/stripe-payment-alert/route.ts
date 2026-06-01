// app/api/stripe-payment-alert/route.ts
// ✅ Stripe payment aate hi owner ko email jati hai
// ✅ Webhook ki zaroorat nahi — directly page.tsx se call hota hai
// ✅ GMAIL SMTP (tech4ruu@gmail.com) se bhejta hai
// ✅ Email jati hai: STRIPE_OWNER_EMAIL + OWNER_EMAIL dono ko
// ✅ Amount, currency, customer name, order number sab email mein hota hai

import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      orderNumber,
      customerName,
      customerEmail,
      amount,        // float e.g. 13.75
      currency,      // e.g. "aud"
      paymentIntentId,
    } = body;

    console.log("💳 stripe-payment-alert called:", {
      orderNumber,
      customerName,
      amount,
      currency,
    });

    // ── Gmail credentials ────────────────────────────────────────────────────
    const gmailUser = process.env.GMAIL_USER;
    const gmailPass = process.env.GMAIL_APP_PASSWORD;

    console.log("📧 GMAIL_USER:", gmailUser ?? "❌ MISSING");
    console.log("📧 GMAIL_APP_PASSWORD:", gmailPass ? `✅ (${gmailPass.length} chars)` : "❌ MISSING");
    console.log("📧 STRIPE_OWNER_EMAIL:", process.env.STRIPE_OWNER_EMAIL ?? "❌ MISSING");
    console.log("📧 OWNER_EMAIL:", process.env.OWNER_EMAIL ?? "❌ MISSING");

    if (!gmailUser || !gmailPass) {
      console.error("❌ Gmail credentials missing — email aborted");
      return NextResponse.json({ success: false, error: "Gmail not configured" });
    }

    // ── Transporter ──────────────────────────────────────────────────────────
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      requireTLS: true,
      auth: { user: gmailUser, pass: gmailPass },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 30000,
    });

    // ── Verify ───────────────────────────────────────────────────────────────
    try {
      await transporter.verify();
      console.log("✅ Gmail SMTP verified");
    } catch (err: any) {
      console.error("❌ Gmail SMTP verify failed:", err?.message);
      return NextResponse.json({ success: false, error: "SMTP verify failed" });
    }

    // ── Recipients — dono owners ko ─────────────────────────────────────────
    const recipientSet = new Set<string>();
    if (process.env.STRIPE_OWNER_EMAIL) recipientSet.add(process.env.STRIPE_OWNER_EMAIL.trim());
    if (process.env.OWNER_EMAIL) recipientSet.add(process.env.OWNER_EMAIL.trim());
    if (process.env.OWNER_EMAILS) {
      process.env.OWNER_EMAILS.split(",").forEach((e) => recipientSet.add(e.trim()));
    }
    if (recipientSet.size === 0) recipientSet.add(gmailUser);

    const recipients = [...recipientSet];
    console.log("📨 Sending to:", recipients.join(", "));

    // ── Currency formatting ──────────────────────────────────────────────────
    const currencySymbols: Record<string, string> = {
      usd: "$", gbp: "£", eur: "€", aud: "A$", cad: "C$",
      aed: "AED ", sar: "SAR ", inr: "₹", sgd: "S$", nzd: "NZ$",
    };
    const cur = (currency || "usd").toLowerCase();
    const symbol = currencySymbols[cur] ?? cur.toUpperCase() + " ";
    const formattedAmount = `${symbol}${Number(amount).toFixed(2)}`;
    const currencyUpper = cur.toUpperCase();
    const timeNow = new Date().toLocaleString("en-PK", { timeZone: "Asia/Karachi" });
    const stripeLink = paymentIntentId
      ? `https://dashboard.stripe.com/payments/${paymentIntentId}`
      : "https://dashboard.stripe.com/payments";

    // ── Subject — no emoji (inbox friendly) ─────────────────────────────────
    const subject = `Payment Received - ${formattedAmount} ${currencyUpper} - Order #${orderNumber}`;

    // ── HTML ─────────────────────────────────────────────────────────────────
    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
<div style="max-width:600px;margin:20px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">

  <!-- Header -->
  <div style="background:linear-gradient(135deg,#1a1a1a,#2d2d2d);padding:28px 32px;text-align:center;">
    <h1 style="color:#daa520;margin:0;font-size:24px;letter-spacing:3px;">TECH4U</h1>
    <p style="color:#888;margin:6px 0 0;font-size:12px;letter-spacing:1px;">STRIPE PAYMENT RECEIVED</p>
  </div>

  <!-- Green banner -->
  <div style="background:#d1fae5;padding:18px 32px;border-left:5px solid #10b981;text-align:center;">
    <p style="margin:0;color:#065f46;font-size:20px;font-weight:700;">
      Payment Successfully Received!
    </p>
  </div>

  <!-- Amount -->
  <div style="padding:24px 32px 0;text-align:center;">
    <p style="margin:0;color:#666;font-size:13px;text-transform:uppercase;letter-spacing:1px;">Amount Received</p>
    <p style="margin:4px 0 0;color:#10b981;font-size:48px;font-weight:900;letter-spacing:-1px;">${formattedAmount}</p>
    <p style="margin:0;color:#999;font-size:14px;">${currencyUpper}</p>
  </div>

  <!-- Details -->
  <div style="padding:24px 32px;">
    <table style="width:100%;border-collapse:collapse;">
      <tr style="border-bottom:1px solid #f0f0f0;">
        <td style="padding:13px 0;color:#666;font-size:14px;">Order Number</td>
        <td style="padding:13px 0;color:#1a1a1a;font-weight:700;font-size:14px;text-align:right;">#${orderNumber}</td>
      </tr>
      <tr style="border-bottom:1px solid #f0f0f0;">
        <td style="padding:13px 0;color:#666;font-size:14px;">Customer</td>
        <td style="padding:13px 0;color:#1a1a1a;font-size:14px;text-align:right;">${customerName || "N/A"}</td>
      </tr>
      <tr style="border-bottom:1px solid #f0f0f0;">
        <td style="padding:13px 0;color:#666;font-size:14px;">Customer Email</td>
        <td style="padding:13px 0;color:#1a1a1a;font-size:14px;text-align:right;">${customerEmail || "N/A"}</td>
      </tr>
      ${paymentIntentId ? `
      <tr style="border-bottom:1px solid #f0f0f0;">
        <td style="padding:13px 0;color:#666;font-size:14px;">Payment ID</td>
        <td style="padding:13px 0;color:#888;font-size:11px;font-family:monospace;text-align:right;">${paymentIntentId}</td>
      </tr>` : ""}
      <tr>
        <td style="padding:13px 0;color:#666;font-size:14px;">Time (PKT)</td>
        <td style="padding:13px 0;color:#1a1a1a;font-size:14px;text-align:right;">${timeNow}</td>
      </tr>
    </table>
  </div>

  <!-- Action box -->
  <div style="padding:0 32px 24px;">
    <div style="background:#fefce8;border:1px solid #fde68a;border-radius:10px;padding:16px;">
      <p style="margin:0;color:#92400e;font-size:13px;font-weight:700;">Action Required</p>
      <p style="margin:6px 0 0;color:#78350f;font-size:13px;">
        Process this order and update its status in your admin panel.
      </p>
    </div>
  </div>

  <!-- Stripe button -->
  <div style="padding:0 32px 32px;text-align:center;">
    <a href="${stripeLink}"
       style="display:inline-block;background:#635bff;color:#fff;padding:13px 32px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:700;letter-spacing:0.5px;">
      View in Stripe Dashboard
    </a>
  </div>

  <!-- Footer -->
  <div style="background:#f9f9f9;padding:16px 32px;text-align:center;border-top:1px solid #eee;">
    <p style="margin:0;color:#aaa;font-size:11px;">Tech4U Admin &bull; Stripe Live &bull; ${new Date().getFullYear()}</p>
  </div>
</div>
</body>
</html>`;

    // ── Send ─────────────────────────────────────────────────────────────────
    const info = await transporter.sendMail({
      from: `"Tech4U Payments" <${gmailUser}>`,
      to: recipients.join(","),
      subject,
      html,
    });

    console.log("✅ Stripe payment alert email sent!");
    console.log("   To:", info.accepted?.join(", "));
    console.log("   MessageID:", info.messageId);

    return NextResponse.json({ success: true, to: recipients });
  } catch (err: any) {
    console.error("❌ stripe-payment-alert crash:", err?.message || err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}