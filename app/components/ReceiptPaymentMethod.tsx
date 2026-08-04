// app/checkout/components/ReceiptPaymentMethod.tsx
// Shared UI for "pay manually, then upload receipt" methods: Bank Transfer & JazzCash.
// Order can only be placed once the receipt image has finished uploading successfully.
"use client";

import React, { useRef, useState } from "react";
import { uploadReceiptImage } from "@/lib/cloudinary"; // ✅ adjust path if your cloudinary.ts lives elsewhere

export type ManualMethod = "bank" | "jazzcash";

interface AccountDetails {
  label: string; // e.g. "UBL Bank" or "JazzCash"
  fields: { label: string; value: string }[];
  instructions: string;
}

// ⚠️ TODO: Replace the JazzCash number below with the real JazzCash account —
// a placeholder is used here because it wasn't provided. Update before going live.
const ACCOUNTS: Record<ManualMethod, AccountDetails> = {
  bank: {
    label: "Bank Transfer",
    fields: [
      { label: "Bank Name", value: "UBL Bank" },
      { label: "Account Title", value: "Husban Ahmad" },
      { label: "Account Number", value: "1227294348804" },
    ],
    instructions:
      "Payment bhejne ke baad receipt ki image WhatsApp par bhejna lazmi hai, taake hum aapka order time par deliver kar sakein.",
  },
  jazzcash: {
    label: "JazzCash",
    fields: [
      { label: "Account Title", value: "Husban Ahmad" },
      { label: "JazzCash Number", value: "03XX-XXXXXXX" }, // TODO: replace placeholder
    ],
    instructions:
      "Payment bhejne ke baad receipt ki image WhatsApp par bhejna lazmi hai, taake hum aapka order time par deliver kar sakein.",
  },
};

const WHATSAPP_NUMBER = "923001234567"; // TODO: confirm/replace with the real WhatsApp business number
const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_NUMBER}`;

interface ReceiptPaymentMethodProps {
  method: ManualMethod;
  orderNumber: string;
  displayTotal: string; // pre-formatted amount to show, e.g. "Rs 12,500"
  onPlaceOrder: (receiptUrl: string) => void;
  onError: (error: string) => void;
}

type UploadStatus = "idle" | "uploading" | "success" | "error";

export default function ReceiptPaymentMethod({
  method,
  orderNumber,
  displayTotal,
  onPlaceOrder,
  onError,
}: ReceiptPaymentMethodProps) {
  const account = ACCOUNTS[method];
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isPlacing, setIsPlacing] = useState(false);

  const handleCopy = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value.replace(/\s/g, ""));
      setCopiedField(label);
      setTimeout(() => setCopiedField(null), 1600);
    } catch {}
  };

  const uploadFile = async (file: File) => {
    setUploadStatus("uploading");
    setUploadError(null);
    setUploadedUrl(null);

    try {
      // ✅ Uploads straight to Cloudinary (same method already used for
      // product/review images), so it doesn't depend on any Supabase
      // bucket existing on the server.
      const url = await uploadReceiptImage(file);

      if (!url) {
        throw new Error("Upload failed. Please try again.");
      }

      setUploadedUrl(url);
      setUploadStatus("success");
    } catch (err) {
      console.error("Receipt upload error:", err);
      setUploadStatus("error");
      setUploadError(
        err instanceof Error ? err.message : "Upload failed. Please try again.",
      );
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setUploadStatus("error");
      setUploadError("Please upload an image file (JPG, PNG, etc.)");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setUploadStatus("error");
      setUploadError("Image is too large. Please keep it under 8MB.");
      return;
    }

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    uploadFile(file);
  };

  const handleRemove = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setUploadStatus("idle");
    setUploadedUrl(null);
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handlePlaceOrder = () => {
    if (uploadStatus !== "success" || !uploadedUrl) {
      onError("Please upload your payment receipt before placing the order.");
      return;
    }
    setIsPlacing(true);
    onPlaceOrder(uploadedUrl);
  };

  return (
    <div className="ps-manual-method">
      <div className="ps-manual-card">
        <div className="ps-manual-card-header">
          <span className="ps-manual-badge">{account.label}</span>
          <span className="ps-manual-amount">{displayTotal}</span>
        </div>

        <div className="ps-manual-fields">
          {account.fields.map((f) => (
            <div className="ps-manual-field-row" key={f.label}>
              <span className="ps-manual-field-label">{f.label}</span>
              <button
                type="button"
                className="ps-manual-field-value"
                onClick={() => handleCopy(f.label, f.value)}
                title="Tap to copy"
              >
                {f.value}
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <rect x="9" y="9" width="12" height="12" rx="2" />
                  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                </svg>
              </button>
              {copiedField === f.label && (
                <span className="ps-manual-copied">Copied</span>
              )}
            </div>
          ))}
        </div>

        <p className="ps-manual-instructions">{account.instructions}</p>

        <a
          href={WHATSAPP_LINK}
          target="_blank"
          rel="noopener noreferrer"
          className="ps-manual-whatsapp-link"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.85.5 3.58 1.36 5.07L2 22l5.2-1.36a9.9 9.9 0 004.84 1.24h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2zm0 18.03h-.01a8.2 8.2 0 01-4.18-1.14l-.3-.18-3.1.81.83-3.02-.2-.31a8.14 8.14 0 01-1.25-4.28c0-4.51 3.67-8.18 8.19-8.18 2.19 0 4.24.85 5.79 2.4a8.13 8.13 0 012.4 5.79c0 4.51-3.68 8.18-8.19 8.18zm4.49-6.13c-.25-.12-1.45-.72-1.68-.8-.22-.08-.39-.12-.55.12-.16.25-.63.8-.78.96-.14.16-.29.18-.53.06-.25-.12-1.04-.38-1.98-1.22-.73-.65-1.23-1.46-1.37-1.7-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.12-.15.16-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.55-1.33-.76-1.82-.2-.48-.4-.41-.55-.42h-.47c-.16 0-.43.06-.65.31-.22.25-.86.84-.86 2.04 0 1.21.88 2.37 1 2.53.12.16 1.73 2.64 4.2 3.7.59.25 1.04.4 1.4.52.59.19 1.12.16 1.54.1.47-.07 1.45-.59 1.65-1.16.21-.57.21-1.06.14-1.16-.06-.11-.22-.17-.47-.29z" />
          </svg>
          Send receipt on WhatsApp
        </a>
      </div>

      <div className="ps-upload-card">
        <div className="ps-upload-card-body">
          <span
            className="ps-manual-field-label"
            style={{ marginBottom: "0.7rem", display: "block" }}
          >
            Upload Payment Receipt <span style={{ color: "#0ea5e9" }}>*</span>
          </span>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="ps-upload-input"
            id={`receipt-upload-${method}`}
          />

          {!previewUrl && (
            <label
              htmlFor={`receipt-upload-${method}`}
              className="ps-upload-dropzone"
            >
              <span className="ps-upload-dropzone-icon">
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                >
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </span>
              <span>Tap to upload receipt screenshot</span>
              <span className="ps-upload-hint">JPG or PNG, up to 8MB</span>
            </label>
          )}

          {previewUrl && (
            <div className="ps-upload-preview">
              <div
                className={`ps-upload-preview-image-wrap ${
                  uploadStatus === "success"
                    ? "ps-upload-preview-image-wrap--success"
                    : ""
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewUrl} alt="Payment receipt preview" />
                {uploadStatus === "uploading" && (
                  <div className="ps-upload-preview-overlay">
                    <div className="co-spinner" />
                  </div>
                )}
                {uploadStatus === "success" && (
                  <div className="ps-upload-preview-check">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                )}
              </div>

              <div className="ps-upload-preview-meta">
                {uploadStatus === "uploading" && (
                  <span className="ps-upload-status ps-upload-status--pending">
                    Uploading receipt...
                  </span>
                )}
                {uploadStatus === "success" && (
                  <span className="ps-upload-status ps-upload-status--success">
                    Receipt uploaded successfully
                  </span>
                )}
                {uploadStatus === "error" && (
                  <span className="ps-upload-status ps-upload-status--error">
                    {uploadError}
                  </span>
                )}
                <button
                  type="button"
                  className="ps-upload-remove-btn"
                  onClick={handleRemove}
                >
                  Remove & upload again
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <button
        type="button"
        className="ps-manual-place-btn"
        disabled={uploadStatus !== "success" || isPlacing}
        onClick={handlePlaceOrder}
      >
        {isPlacing ? (
          <span className="co-spinner" style={{ width: 16, height: 16 }} />
        ) : uploadStatus === "success" ? (
          "Place Order"
        ) : (
          "Upload Receipt to Continue"
        )}
      </button>
    </div>
  );
}
