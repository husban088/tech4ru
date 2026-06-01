// app/privacy/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import "./privacy.css";

export default function PrivacyPolicy() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
  }, []);

  const lastUpdated = "May 5, 2026";

  return (
    <div className="pp-root">
      {/* Ambient Effects */}
      <div className="pp-ambient" aria-hidden="true" />
      <div className="pp-grain" aria-hidden="true" />
      <div className="pp-lines" aria-hidden="true">
        {[...Array(5)].map((_, i) => (
          <span key={i} />
        ))}
      </div>
      <div className="pp-corner pp-corner--tl" aria-hidden="true" />
      <div className="pp-corner pp-corner--tr" aria-hidden="true" />

      <div className={`pp-container ${visible ? "visible" : ""}`}>
        {/* Header */}
        <div className="pp-header">
          <div className="pp-eyebrow">
            <span className="pp-ey-line" />
            Legal
            <span className="pp-ey-line" />
          </div>
          <h1 className="pp-title">
            Privacy <em>Policy</em>
          </h1>
          <p className="pp-last-updated">Last Updated: {lastUpdated}</p>
          <p className="pp-subtitle">
            Your privacy is our priority. Read how we collect, use, and protect
            your information.
          </p>
        </div>

        {/* Content Sections */}
        <div className="pp-content">
          <div className="pp-section">
            <div className="pp-section-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
            </div>
            <h2 className="pp-section-title">Information We Collect</h2>
            <div className="pp-section-content">
              <p>
                At Tech4U, we collect information to provide better services to
                our customers. We collect information in the following ways:
              </p>
              <ul>
                <li>
                  <strong>Personal Information:</strong> Name, email address,
                  phone number, shipping address, and payment information when
                  you place an order.
                </li>
                <li>
                  <strong>Account Information:</strong> Email and password if
                  you create an account with us.
                </li>
                <li>
                  <strong>Usage Data:</strong> How you interact with our
                  website, products viewed, and browsing behavior.
                </li>
                <li>
                  <strong>Device Information:</strong> IP address, browser type,
                  and device identifiers.
                </li>
              </ul>
            </div>
          </div>

          <div className="pp-section">
            <div className="pp-section-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
            </div>
            <h2 className="pp-section-title">How We Use Your Information</h2>
            <div className="pp-section-content">
              <p>We use the information we collect to:</p>
              <ul>
                <li>Process and fulfill your orders</li>
                <li>
                  Send order confirmations and shipping updates via email and
                  WhatsApp
                </li>
                <li>Communicate with you about your account or transactions</li>
                <li>Improve our website, products, and services</li>
                <li>Personalize your shopping experience</li>
                <li>Detect and prevent fraud</li>
                <li>Comply with legal obligations</li>
              </ul>
            </div>
          </div>

          <div className="pp-section">
            <div className="pp-section-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path d="M22 12h-4l-3 9-4-18-3 9H2" />
              </svg>
            </div>
            <h2 className="pp-section-title">Information Sharing</h2>
            <div className="pp-section-content">
              <p>
                We do not sell your personal information. We may share your
                information with:
              </p>
              <ul>
                <li>
                  <strong>Service Providers:</strong> Payment processors
                  (Stripe, PayPal), shipping carriers, and email/SMS
                  notification services.
                </li>
                <li>
                  <strong>Legal Requirements:</strong> When required by law or
                  to protect our rights.
                </li>
                <li>
                  <strong>Business Transfers:</strong> In connection with a
                  merger, acquisition, or sale of assets.
                </li>
              </ul>
            </div>
          </div>

          <div className="pp-section">
            <div className="pp-section-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
            </div>
            <h2 className="pp-section-title">Data Security</h2>
            <div className="pp-section-content">
              <p>
                We implement industry-standard security measures to protect your
                personal information, including:
              </p>
              <ul>
                <li>SSL/TLS encryption for all data transmission</li>
                <li>PCI DSS compliance for payment processing</li>
                <li>Regular security audits and vulnerability assessments</li>
                <li>Secure storage with restricted access</li>
              </ul>
              <p>
                While we strive to protect your information, no method of
                transmission over the internet is 100% secure.
              </p>
            </div>
          </div>

          <div className="pp-section">
            <div className="pp-section-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path d="M20 12v6a2 2 0 01-2 2H6a2 2 0 01-2-2v-6M12 2v12m-4-4l4 4 4-4" />
              </svg>
            </div>
            <h2 className="pp-section-title">Your Rights</h2>
            <div className="pp-section-content">
              <p>
                Depending on your location, you may have the following rights:
              </p>
              <ul>
                <li>Access your personal information</li>
                <li>Correct inaccurate information</li>
                <li>Request deletion of your data</li>
                <li>Opt out of marketing communications</li>
                <li>Withdraw consent where applicable</li>
              </ul>
              <p>
                To exercise these rights, contact us at{" "}
                <strong>info@tech4ru.com</strong>.
              </p>
            </div>
          </div>

          <div className="pp-section">
            <div className="pp-section-icon">
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
            <h2 className="pp-section-title">Cookies & Tracking</h2>
            <div className="pp-section-content">
              <p>
                We use cookies and similar tracking technologies to enhance your
                browsing experience, analyze site traffic, and personalize
                content. You can control cookie settings through your browser
                preferences.
              </p>
            </div>
          </div>

          <div className="pp-section">
            <div className="pp-section-icon">
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
            <h2 className="pp-section-title">Changes to This Policy</h2>
            <div className="pp-section-content">
              <p>
                We may update this Privacy Policy from time to time. We will
                notify you of any material changes by posting the new policy on
                this page and updating the "Last Updated" date.
              </p>
            </div>
          </div>

          <div className="pp-section pp-contact-section">
            <div className="pp-contact-card">
              <div className="pp-contact-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3>Contact Us</h3>
              <p>
                If you have any questions about this Privacy Policy, please
                contact us:
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
        <div className="pp-footer-nav">
          <Link href="/" className="pp-back-link">
            ← Back to Home
          </Link>
          <Link href="/terms" className="pp-terms-link">
            Terms of Service →
          </Link>
        </div>
      </div>
    </div>
  );
}
