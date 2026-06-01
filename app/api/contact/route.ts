import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

/* ─── Validation helpers ─────────────────────────── */
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function isValidName(name: string): boolean {
  return name.trim().length >= 4;
}

function isValidMessage(msg: string): boolean {
  return msg.trim().length >= 1;
}

function isValidSubject(sub: string): boolean {
  return sub.trim().length >= 1;
}

// Create transporter outside handler for reuse
let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!transporter) {
    // Check if environment variables are set
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.error("❌ SMTP credentials missing! Check your .env.local file");
      throw new Error("SMTP configuration missing");
    }

    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
}

// Send email asynchronously
async function sendEmailAsync(
  name: string,
  email: string,
  subject: string,
  message: string
) {
  try {
    const transporterInstance = getTransporter();

    // Verify connection before sending
    await transporterInstance.verify();

    const info = await transporterInstance.sendMail({
      from: `"Aurexia Contact Form" <${process.env.SMTP_USER}>`,
      to: process.env.OWNER_EMAIL || process.env.SMTP_USER,
      replyTo: email.trim(),
      subject: `📬 Aurexia Contact: ${subject.substring(0, 50)}`,
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8"/>
          <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
          <title>New Contact Message</title>
          <style>
            body { margin: 0; padding: 0; background: #0a0a0a; font-family: 'Helvetica Neue', Arial, sans-serif; }
            .container { max-width: 600px; margin: 0 auto; background: #111111; border: 1px solid #1e1e1e; border-radius: 8px; overflow: hidden; }
            .header { background: #0f0f0f; border-bottom: 1px solid #1a1a1a; padding: 28px 32px; }
            .header h1 { margin: 0; font-size: 22px; font-weight: 300; color: #f5f0e8; }
            .header h1 em { font-style: italic; color: #b49150; }
            .header p { margin: 8px 0 0; font-size: 10px; letter-spacing: 4px; text-transform: uppercase; color: #b49150; }
            .body { padding: 32px; }
            .info-label { font-size: 9px; letter-spacing: 3px; text-transform: uppercase; color: #b49150; margin-bottom: 6px; font-weight: 500; }
            .info-value { font-size: 15px; color: #f5f0e8; font-weight: 300; margin-bottom: 20px; }
            .info-value a { color: #d4b87a; text-decoration: none; }
            .divider { height: 1px; background: linear-gradient(to right, rgba(180,145,80,0.4), transparent); margin: 20px 0; }
            .message-box { background: #0f0f0f; border: 1px solid #1a1a1a; border-left: 2px solid rgba(180,145,80,0.5); border-radius: 4px; padding: 20px; margin-top: 10px; }
            .message-box p { margin: 0; font-size: 14px; color: rgba(245,240,232,0.8); line-height: 1.8; white-space: pre-wrap; }
            .reply-btn { display: inline-block; margin-top: 28px; padding: 12px 28px; border: 1px solid rgba(180,145,80,0.5); border-radius: 4px; color: #b49150; font-size: 11px; letter-spacing: 3px; text-transform: uppercase; text-decoration: none; background: rgba(180,145,80,0.06); }
            .reply-btn:hover { background: rgba(180,145,80,0.12); border-color: rgba(180,145,80,0.8); }
            .footer { border-top: 1px solid #1a1a1a; padding: 16px 32px; background: #0f0f0f; }
            .footer p { margin: 0; font-size: 10px; color: rgba(245,240,232,0.25); }
          </style>
        </head>
        <body>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px;">
            <tr>
              <td align="center">
                <div class="container">
                  <div class="header">
                    <p>AUREXIA STORE</p>
                    <h1>New Contact <em>Message</em></h1>
                  </div>
                  <div class="body">
                    <div class="info-label">FULL NAME</div>
                    <div class="info-value">${escapeHtml(name)}</div>
                    
                    <div class="info-label">EMAIL ADDRESS</div>
                    <div class="info-value"><a href="mailto:${escapeHtml(
                      email
                    )}">${escapeHtml(email)}</a></div>
                    
                    <div class="info-label">SUBJECT</div>
                    <div class="info-value">${escapeHtml(subject)}</div>
                    
                    <div class="divider"></div>
                    
                    <div class="info-label">MESSAGE</div>
                    <div class="message-box">
                      <p>${escapeHtml(message).replace(/\n/g, "<br>")}</p>
                    </div>
                    
                    <div style="text-align:center;">
                      <a href="mailto:${escapeHtml(
                        email
                      )}?subject=Re: ${encodeURIComponent(
        subject
      )}" class="reply-btn">
                        Reply to ${escapeHtml(name.split(" ")[0])}
                      </a>
                    </div>
                  </div>
                  <div class="footer">
                    <p>Aurexia Store · Automated notification · ${new Date().toLocaleString(
                      "en-PK",
                      { timeZone: "Asia/Karachi" }
                    )}</p>
                  </div>
                </div>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
      text: `
AUREXIA STORE - New Contact Message
====================================

Name: ${name}
Email: ${email}
Subject: ${subject}

Message:
${message}

---
This is an automated notification from Aurexia Store.
Reply to this email to respond to ${name}.
      `,
    });

    console.log(`✅ Email sent successfully to: ${process.env.OWNER_EMAIL}`);
    console.log(`📧 Message ID: ${info.messageId}`);
  } catch (error) {
    console.error("❌ Background email sending error:", error);
  }
}

// Helper function to escape HTML
function escapeHtml(str: string): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/* ─── POST handler ───────────────────────────────── */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, subject, message } = body;

    console.log(`📬 Received contact request from: ${email}`);

    /* Server-side validation */
    const errors: Record<string, string> = {};
    if (!isValidName(name)) errors.name = "Name must be at least 4 characters";
    if (!isValidEmail(email))
      errors.email = "Please enter a valid email address";
    if (!isValidSubject(subject)) errors.subject = "Subject is required";
    if (!isValidMessage(message)) errors.message = "Message is required";

    if (Object.keys(errors).length > 0) {
      console.log("❌ Validation errors:", errors);
      return NextResponse.json({ success: false, errors }, { status: 400 });
    }

    // Send email in background (fire and forget)
    sendEmailAsync(name, email, subject, message);

    // Return success immediately to the user
    return NextResponse.json({
      success: true,
      message: "Your message has been sent successfully!",
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("❌ Contact API error:", errMsg);
    return NextResponse.json(
      { success: false, message: "Server error. Please try again later." },
      { status: 500 }
    );
  }
}
