// app/terms/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import "./terms.css";

export default function TermsOfService() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
  }, []);

  const lastUpdated = "May 5, 2026";

  return (
    <div className="tos-root">
      {/* Ambient Effects */}
      <div className="tos-ambient" aria-hidden="true" />
      <div className="tos-grain" aria-hidden="true" />
      <div className="tos-lines" aria-hidden="true">
        {[...Array(5)].map((_, i) => (
          <span key={i} />
        ))}
      </div>
      <div className="tos-corner tos-corner--tl" aria-hidden="true" />
      <div className="tos-corner tos-corner--tr" aria-hidden="true" />

      <div className={`tos-container ${visible ? "visible" : ""}`}>
        {/* Header */}
        <div className="tos-header">
          <div className="tos-eyebrow">
            <span className="tos-ey-line" />
            Legal Agreement
            <span className="tos-ey-line" />
          </div>
          <h1 className="tos-title">
            Terms of <em>Service</em>
          </h1>
          <p className="tos-last-updated">Last Updated: {lastUpdated}</p>
          <p className="tos-subtitle">
            By using Tech4U, you agree to these terms. Please read them
            carefully.
          </p>
        </div>

        {/* Content Sections */}
        <div className="tos-content">
          <div className="tos-section">
            <div className="tos-section-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
            </div>
            <h2 className="tos-section-title">1. Acceptance of Terms</h2>
            <div className="tos-section-content">
              <p>
                By accessing or using the Tech4U website, you agree to be bound
                by these Terms of Service and all applicable laws and
                regulations. If you do not agree with any of these terms, you
                are prohibited from using or accessing this site.
              </p>
            </div>
          </div>

          <div className="tos-section">
            <div className="tos-section-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
            </div>
            <h2 className="tos-section-title">2. Orders & Purchases</h2>
            <div className="tos-section-content">
              <p>
                By placing an order through our website, you represent that you
                are at least 18 years old and that the information you provide
                is accurate and complete.
              </p>
              <ul>
                <li>All orders are subject to acceptance and availability</li>
                <li>We reserve the right to refuse or cancel any order</li>
                <li>Prices may change without notice</li>
                <li>
                  Payment must be completed before order processing begins
                </li>
              </ul>
            </div>
          </div>

          <div className="tos-section">
            <div className="tos-section-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path d="M20 12v6a2 2 0 01-2 2H6a2 2 0 01-2-2v-6" />
                <path d="M12 2v12m-4-4l4 4 4-4" />
              </svg>
            </div>
            <h2 className="tos-section-title">3. Pricing & Payment</h2>
            <div className="tos-section-content">
              <p>
                All prices are displayed in your local currency based on your
                detected location. We accept payments via Stripe (credit/debit
                cards) and PayPal. Payment must be made in full at the time of
                purchase.
              </p>
            </div>
          </div>

          <div className="tos-section">
            <div className="tos-section-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path d="M3 5a2 2 0 012-2h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                <path d="M9 9l6 6m0-6l-6 6" />
              </svg>
            </div>
            <h2 className="tos-section-title">4. Shipping & Delivery</h2>
            <div className="tos-section-content">
              <p>
                We offer free shipping on all orders. Delivery times vary by
                location but typically take 3-5 business days for domestic
                orders and 7-14 business days for international orders. You will
                receive tracking information via WhatsApp once your order ships.
              </p>
            </div>
          </div>

          <div className="tos-section">
            <div className="tos-section-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path d="M12 8v4l3 3M12 2a10 10 0 100 20 10 10 0 000-20z" />
              </svg>
            </div>
            <h2 className="tos-section-title">5. Returns & Refunds</h2>
            <div className="tos-section-content">
              <p>
                We offer a 30-day return policy. To be eligible for a return:
              </p>
              <ul>
                <li>Items must be unused and in original packaging</li>
                <li>Return shipping costs are the customer's responsibility</li>
                <li>Refunds are processed within 7-10 business days</li>
                <li>Contact our support team to initiate a return</li>
              </ul>
            </div>
          </div>

          <div className="tos-section">
            <div className="tos-section-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83" />
              </svg>
            </div>
            <h2 className="tos-section-title">6. Intellectual Property</h2>
            <div className="tos-section-content">
              <p>
                All content on this website, including text, graphics, logos,
                images, and software, is the property of Tech4U and is protected
                by copyright laws. You may not reproduce, distribute, or create
                derivative works without our express written permission.
              </p>
            </div>
          </div>

          <div className="tos-section">
            <div className="tos-section-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path d="M3 11h18M3 7h18M3 15h18M3 19h18" />
              </svg>
            </div>
            <h2 className="tos-section-title">7. User Accounts</h2>
            <div className="tos-section-content">
              <p>
                You are responsible for maintaining the confidentiality of your
                account credentials. You agree to accept responsibility for all
                activities that occur under your account. Notify us immediately
                of any unauthorized use.
              </p>
            </div>
          </div>

          <div className="tos-section">
            <div className="tos-section-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4l3 3" />
              </svg>
            </div>
            <h2 className="tos-section-title">8. Limitation of Liability</h2>
            <div className="tos-section-content">
              <p>
                To the maximum extent permitted by law, Tech4U shall not be
                liable for any indirect, incidental, special, consequential, or
                punitive damages arising from your use of the website or
                products purchased through it.
              </p>
            </div>
          </div>

          <div className="tos-section">
            <div className="tos-section-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path d="M17 8l4 4-4 4M7 8l-4 4 4 4" />
                <path d="M12 4v16" />
              </svg>
            </div>
            <h2 className="tos-section-title">9. Modifications to Terms</h2>
            <div className="tos-section-content">
              <p>
                We reserve the right to modify these Terms at any time. Changes
                become effective immediately upon posting. Your continued use of
                the website constitutes acceptance of the modified terms.
              </p>
            </div>
          </div>

          <div className="tos-section">
            <div className="tos-section-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="tos-section-title">10. Contact Information</h2>
            <div className="tos-section-content">
              <p>
                If you have any questions about these Terms, please contact us:
              </p>
              <p>
                <strong>Email:</strong> info@tech4ru.com
                <br />
                <strong>Phone:</strong> +49 1578 2101282
                <br />
                <strong>Address:</strong> Adelaide, Australia
              </p>
            </div>
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="tos-footer-nav">
          <Link href="/" className="tos-back-link">
            ← Back to Home
          </Link>
          <Link href="/privacy" className="tos-privacy-link">
            Privacy Policy →
          </Link>
        </div>
      </div>
    </div>
  );
}
