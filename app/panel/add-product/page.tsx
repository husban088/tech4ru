"use client";

import {
  BulkPricingManager,
  BulkPricingTier,
} from "@/app/components/BulkPricingManager";
import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import PanelNavbar from "@/app/components/PanelNavbar";
import {
  supabase,
  ProductVariant,
  VariantImage,
  ProductFAQ,
} from "@/lib/supabase";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { useCurrency } from "../../context/CurrencyContext";
import { convertPriceToPKR, convertPriceFromPKR } from "@/lib/panelCurrency";
import ProductDescription from "@/app/components/ProductDescription";
import "../panel.css";
import "./add-product.css";

type Toast = {
  id: number;
  type: "success" | "error" | "info";
  title: string;
  msg: string;
  exiting?: boolean;
};

type Mode = "simple" | "detailed";

type FAQ = {
  id?: string;
  question: string;
  answer: string;
  display_order: number;
};

type StockStatus = "in_stock" | "out_of_stock" | "low_stock";

const COLOR_SUGGESTIONS = [
  "Black",
  "White",
  "Red",
  "Blue",
  "Green",
  "Yellow",
  "Gold",
  "Silver",
  "Rose Gold",
  "Pink",
  "Purple",
  "Orange",
  "Brown",
  "Grey",
  "Navy Blue",
  "Beige",
];
const SIZE_SUGGESTIONS = [
  "XS",
  "S",
  "M",
  "L",
  "XL",
  "XXL",
  "28mm",
  "32mm",
  "36mm",
  "40mm",
  "42mm",
  "44mm",
];
const MATERIAL_SUGGESTIONS = [
  "Plastic",
  "Metal",
  "Stainless Steel",
  "Titanium",
  "Aluminum",
  "Fabric",
  "Leather",
  "Silicone",
  "Glass",
  "Ceramic",
  "Wood",
  "Gold Plated",
  "Carbon Fiber",
];
const CAPACITY_SUGGESTIONS = [
  "100ml",
  "200ml",
  "300ml",
  "500ml",
  "1L",
  "2L",
  "50mAh",
  "100mAh",
  "500mAh",
  "1000mAh",
  "2000mAh",
  "5000mAh",
  "10000mAh",
  "65W",
  "100W",
];

const TABS = [
  {
    id: "chargers",
    label: "Chargers",
    category: "Accessories",
    sub: "Chargers",
  },
  { id: "cables", label: "Cables", category: "Accessories", sub: "Cables" },
  {
    id: "phone-holders",
    label: "Phone Holders",
    category: "Accessories",
    sub: "Phone Holders",
  },
  {
    id: "tech-gadgets",
    label: "Tech Gadgets",
    category: "Accessories",
    sub: "Tech Gadgets",
  },
  {
    id: "smart-accessories",
    label: "Smart Accessories",
    category: "Accessories",
    sub: "Smart Accessories",
  },
  {
    id: "men-watches",
    label: "Men Watches",
    category: "Watches",
    sub: "Men Watches",
  },
  {
    id: "women-watches",
    label: "Women Watches",
    category: "Watches",
    sub: "Women Watches",
  },
  {
    id: "smart-watches",
    label: "Smart Watches",
    category: "Watches",
    sub: "Smart Watches",
  },
  {
    id: "luxury-watches",
    label: "Luxury Watches",
    category: "Watches",
    sub: "Luxury Watches",
  },
  {
    id: "car-accessories",
    label: "Car Accessories",
    category: "Automotive",
    sub: "Car Accessories",
  },
  {
    id: "car-cleaning",
    label: "Car Cleaning",
    category: "Automotive",
    sub: "Car Cleaning Tools",
  },
  {
    id: "interior-auto",
    label: "Interior Auto",
    category: "Automotive",
    sub: "Interior Accessories",
  },
  {
    id: "wall-decor",
    label: "Wall Decor",
    category: "Home Decor",
    sub: "Wall Decor",
  },
  {
    id: "lighting",
    label: "Lighting",
    category: "Home Decor",
    sub: "Lighting",
  },
  {
    id: "kitchen",
    label: "Kitchen",
    category: "Home Decor",
    sub: "Kitchen Essentials",
  },
  {
    id: "storage",
    label: "Storage",
    category: "Home Decor",
    sub: "Storage & Organizers",
  },
];

// ─── Toast ────────────────────────────────────────────────────────────────────
function ToastContainer({
  toasts,
  onRemove,
}: {
  toasts: Toast[];
  onRemove: (id: number) => void;
}) {
  return (
    <div className="ap-toast-wrap">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`ap-toast ap-toast--${t.type}${
            t.exiting ? " exiting" : ""
          }`}
        >
          <div className="ap-toast-icon">
            {t.type === "success" && (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
            {t.type === "error" && (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            )}
            {t.type === "info" && (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
              </svg>
            )}
          </div>
          <div className="ap-toast-body">
            <p className="ap-toast-title">{t.title}</p>
            <p className="ap-toast-msg">{t.msg}</p>
          </div>
          <button className="ap-toast-close" onClick={() => onRemove(t.id)}>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── Stock Status ─────────────────────────────────────────────────────────────
function StockStatusSelector({
  value,
  onChange,
  lowStockThreshold,
  onThresholdChange,
}: {
  value: StockStatus;
  onChange: (status: StockStatus) => void;
  lowStockThreshold: number | null;
  onThresholdChange: (threshold: number | null) => void;
}) {
  const uniqueId = useRef(`stock_${Date.now()}_${Math.random()}`).current;
  return (
    <div>
      <div className="ap-stock-radio-group">
        {(["in_stock", "out_of_stock", "low_stock"] as StockStatus[]).map(
          (s) => (
            <div
              key={s}
              className={`ap-stock-radio-option ${
                value === s
                  ? s === "in_stock"
                    ? "active-in-stock"
                    : s === "out_of_stock"
                      ? "active-out-stock"
                      : "active-low-stock"
                  : ""
              }`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onChange(s);
              }}
            >
              <input
                type="radio"
                name={uniqueId}
                checked={value === s}
                readOnly
              />
              <span>
                {s === "in_stock"
                  ? "In Stock"
                  : s === "out_of_stock"
                    ? "Out of Stock"
                    : "Low Stock Alert"}
              </span>
            </div>
          ),
        )}
      </div>
      {value === "low_stock" && (
        <div className="ap-low-stock-threshold">
          <label>Alert when quantity reaches:</label>
          <input
            type="number"
            min="1"
            value={lowStockThreshold || ""}
            onChange={(e) =>
              onThresholdChange(
                e.target.value ? parseInt(e.target.value) : null,
              )
            }
            placeholder="e.g., 5"
          />
          <span>units or less</span>
        </div>
      )}
    </div>
  );
}

// ─── FAQ Builder ──────────────────────────────────────────────────────────────
function FAQBuilder({
  faqs,
  setFaqs,
}: {
  faqs: FAQ[];
  setFaqs: (v: FAQ[]) => void;
}) {
  const addFAQ = () =>
    setFaqs([
      ...faqs,
      { question: "", answer: "", display_order: faqs.length },
    ]);
  const removeFAQ = (i: number) => setFaqs(faqs.filter((_, idx) => idx !== i));
  const updateQ = (i: number, v: string) => {
    const n = [...faqs];
    n[i] = { ...n[i], question: v };
    setFaqs(n);
  };
  const updateA = (i: number, v: string) => {
    const n = [...faqs];
    n[i] = { ...n[i], answer: v };
    setFaqs(n);
  };

  if (faqs.length === 0) {
    return (
      <div className="ap-faq-section">
        <div className="ap-faq-empty">
          <p>No FAQs added yet.</p>
        </div>
        <button type="button" className="ap-add-faq-btn" onClick={addFAQ}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>{" "}
          Add FAQ
        </button>
      </div>
    );
  }
  return (
    <div className="ap-faq-section">
      <div className="ap-faq-list">
        {faqs.map((faq, i) => (
          <div key={i} className="ap-faq-item">
            <div className="ap-faq-header">
              <input
                type="text"
                className="ap-faq-question-input"
                value={faq.question}
                onChange={(e) => updateQ(i, e.target.value)}
                placeholder={`Question ${i + 1}...`}
              />
              <button
                type="button"
                className="ap-faq-remove-btn"
                onClick={() => removeFAQ(i)}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="ap-faq-answer-section">
              <textarea
                className="ap-faq-answer-input"
                value={faq.answer}
                onChange={(e) => updateA(i, e.target.value)}
                placeholder="Write your answer here..."
                rows={2}
              />
            </div>
          </div>
        ))}
      </div>
      <button type="button" className="ap-add-faq-btn" onClick={addFAQ}>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>{" "}
        Add Another FAQ
      </button>
    </div>
  );
}

// ─── Multi Image Uploader (used in Simple Mode) ───────────────────────────────
function MultiImageUploader({
  images,
  onImagesChange,
  onError,
  maxImages = 20,
}: {
  images: string[];
  onImagesChange: (imgs: string[]) => void;
  onError: (msg: string) => void;
  maxImages?: number;
}) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (images.length + files.length > maxImages) {
      onError(`Maximum ${maxImages} images allowed`);
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    setUploading(true);
    const newUrls: string[] = [];
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith("image/")) {
          onError(`"${file.name}" is not an image file`);
          continue;
        }
        try {
          const url = await uploadToCloudinary(file);
          newUrls.push(url);
        } catch (err) {
          onError(`Failed to upload ${file.name}`);
        }
      }
      onImagesChange([...images, ...newUrls]);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const removeImage = (index: number) =>
    onImagesChange(images.filter((_, i) => i !== index));

  return (
    <div className="ap-variant-images">
      <div className="ap-variant-image-list">
        {images.map((img, idx) => (
          <div key={idx} className="ap-variant-image-item">
            <img src={img} alt={`Image ${idx + 1}`} />
            <button
              type="button"
              className="ap-variant-image-remove"
              onClick={() => removeImage(idx)}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        ))}
        {images.length < maxImages && (
          <button
            type="button"
            className="ap-variant-image-add"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <div
                className="ap-spinner"
                style={{ width: "20px", height: "20px" }}
              />
            ) : (
              <>+ Add Image</>
            )}
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          style={{ display: "none" }}
        />
      </div>
      {images.length > 0 && (
        <div className="ap-image-count">
          {images.length} / {maxImages} images
        </div>
      )}
    </div>
  );
}

// ─── Single Image Uploader (used per variant in Detailed Mode) ────────────────
// ✅ Sirf EK image upload hogi — variant ki thumbnail
function SingleImageUploader({
  image,
  onImageChange,
  onError,
}: {
  image: string | null;
  onImageChange: (url: string | null) => void;
  onError: (msg: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      onError(`"${file.name}" is not an image file`);
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    setUploading(true);
    try {
      const url = await uploadToCloudinary(file);
      onImageChange(url);
    } catch (err) {
      onError(`Failed to upload ${file.name}`);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        flexWrap: "wrap",
      }}
    >
      {image ? (
        <div
          style={{
            position: "relative",
            width: "80px",
            height: "80px",
            flexShrink: 0,
          }}
        >
          <img
            src={image}
            alt="Variant"
            style={{
              width: "80px",
              height: "80px",
              objectFit: "cover",
              borderRadius: "8px",
              border: "2px solid rgba(218,165,32,0.3)",
            }}
          />
          <button
            type="button"
            onClick={() => onImageChange(null)}
            style={{
              position: "absolute",
              top: "-6px",
              right: "-6px",
              width: "20px",
              height: "20px",
              borderRadius: "50%",
              background: "#ef4444",
              border: "none",
              color: "#fff",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "11px",
              fontWeight: 700,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          style={{
            width: "80px",
            height: "80px",
            border: "2px dashed rgba(218,165,32,0.4)",
            borderRadius: "8px",
            background: "rgba(218,165,32,0.04)",
            cursor: uploading ? "default" : "pointer",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "4px",
            color: "#8b6914",
            fontFamily: "var(--ap-sans)",
            fontSize: "0.65rem",
            fontWeight: 600,
            letterSpacing: "0.05em",
            transition: "all 0.2s",
          }}
        >
          {uploading ? (
            <div
              className="ap-spinner"
              style={{ width: "18px", height: "18px" }}
            />
          ) : (
            <>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                width="20"
                height="20"
              >
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <span>Add Image</span>
            </>
          )}
        </button>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        style={{ display: "none" }}
      />
      <div
        style={{
          fontFamily: "var(--ap-sans)",
          fontSize: "0.7rem",
          color: "#888",
          lineHeight: 1.5,
        }}
      >
        <p style={{ margin: 0, fontWeight: 600, color: "#8b6914" }}>
          Variant Image
        </p>
        <p style={{ margin: 0 }}>1 image per variant</p>
        <p style={{ margin: 0, color: "#aaa" }}>Auto-added to main gallery</p>
      </div>
    </div>
  );
}

// ─── Video Uploader ───────────────────────────────────────────────────────────
// Cloudinary pe video upload — images folder ke saath hi save hogi (resource_type: video)
function VideoUploader({
  videoUrl,
  onVideoChange,
  onError,
}: {
  videoUrl: string | null;
  onVideoChange: (url: string | null) => void;
  onError: (msg: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Video format check
    const validTypes = [
      "video/mp4",
      "video/webm",
      "video/ogg",
      "video/mov",
      "video/quicktime",
      "video/avi",
      "video/x-msvideo",
    ];
    if (!validTypes.includes(file.type) && !file.type.startsWith("video/")) {
      onError(
        `"${file.name}" is not a valid video file. Use MP4, WebM, or MOV.`,
      );
      if (fileRef.current) fileRef.current.value = "";
      return;
    }

    // Size check: max 100MB
    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
      onError(`Video file is too large. Maximum size is 100MB.`);
      if (fileRef.current) fileRef.current.value = "";
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", uploadPreset!);
      formData.append("resource_type", "video");
      formData.append("folder", "products/videos");

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`,
        {
          method: "POST",
          body: formData,
        },
      );

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(
          errData?.error?.message || `Upload failed (${response.status})`,
        );
      }

      const data = await response.json();
      onVideoChange(data.secure_url);
    } catch (err: any) {
      onError(err.message || `Failed to upload video: ${file.name}`);
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="ap-video-uploader">
      {videoUrl ? (
        <div className="ap-video-preview">
          <video
            src={videoUrl}
            controls
            className="ap-video-player"
            preload="metadata"
          />
          <button
            type="button"
            className="ap-video-remove"
            onClick={() => onVideoChange(null)}
            title="Remove video"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
          <div className="ap-video-url-badge">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              width="12"
              height="12"
            >
              <path d="M22.54 6.42A2.78 2.78 0 0 0 20.7 4.55C19.12 4 12 4 12 4s-7.12 0-8.7.55A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.3 19.45C4.88 20 12 20 12 20s7.12 0 8.7-.55a2.78 2.78 0 0 0 1.84-1.87A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z" />
              <polygon
                points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02"
                fill="currentColor"
              />
            </svg>
            Video uploaded ✓
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="ap-video-upload-btn"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <div className="ap-video-uploading">
              <div
                className="ap-spinner"
                style={{ width: "28px", height: "28px" }}
              />
              <span>Uploading video...</span>
              <span
                style={{ fontSize: "0.65rem", color: "#8b6914", opacity: 0.7 }}
              >
                Large files may take a moment
              </span>
            </div>
          ) : (
            <div className="ap-video-upload-inner">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                width="32"
                height="32"
              >
                <path d="M22.54 6.42A2.78 2.78 0 0 0 20.7 4.55C19.12 4 12 4 12 4s-7.12 0-8.7.55A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.3 19.45C4.88 20 12 20 12 20s7.12 0 8.7-.55a2.78 2.78 0 0 0 1.84-1.87A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z" />
                <polygon
                  points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02"
                  fill="currentColor"
                />
              </svg>
              <span className="ap-video-upload-title">
                Click to Upload Product Video
              </span>
              <span className="ap-video-upload-sub">
                MP4, WebM, MOV · Max 100MB · Saved to Cloudinary
              </span>
            </div>
          )}
        </button>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="video/mp4,video/webm,video/ogg,video/mov,video/quicktime,video/avi,video/*"
        onChange={handleFileSelect}
        style={{ display: "none" }}
      />
    </div>
  );
}

// ─── Color Map ────────────────────────────────────────────────────────────────
const COLOR_MAP: Record<string, { bg: string; text: string; border: string }> =
  {
    black: { bg: "#1a1a1a", text: "#ffffff", border: "#444" },
    white: { bg: "#f5f5f5", text: "#111111", border: "#ccc" },
    red: { bg: "#dc2626", text: "#ffffff", border: "#b91c1c" },
    blue: { bg: "#2563eb", text: "#ffffff", border: "#1d4ed8" },
    green: { bg: "#16a34a", text: "#ffffff", border: "#15803d" },
    yellow: { bg: "#eab308", text: "#111111", border: "#ca8a04" },
    gold: { bg: "#d97706", text: "#ffffff", border: "#b45309" },
    silver: { bg: "#9ca3af", text: "#111111", border: "#6b7280" },
    "rose gold": { bg: "#e879a8", text: "#ffffff", border: "#db2777" },
    pink: { bg: "#ec4899", text: "#ffffff", border: "#db2777" },
    purple: { bg: "#9333ea", text: "#ffffff", border: "#7e22ce" },
    orange: { bg: "#f97316", text: "#ffffff", border: "#ea580c" },
    brown: { bg: "#92400e", text: "#ffffff", border: "#78350f" },
    grey: { bg: "#6b7280", text: "#ffffff", border: "#4b5563" },
    gray: { bg: "#6b7280", text: "#ffffff", border: "#4b5563" },
    "navy blue": { bg: "#1e3a8a", text: "#ffffff", border: "#1e40af" },
    navy: { bg: "#1e3a8a", text: "#ffffff", border: "#1e40af" },
    beige: { bg: "#d4b896", text: "#111111", border: "#b8956a" },
  };

function getColorStyle(colorName: string) {
  const key = colorName.toLowerCase().trim();
  return (
    COLOR_MAP[key] || {
      bg: "rgba(139,105,20,0.15)",
      text: "#8b6914",
      border: "rgba(139,105,20,0.3)",
    }
  );
}

function getAttributeTypeLabel(type: string) {
  const labels: Record<string, string> = {
    color: "🎨 Color",
    size: "📐 Size",
    material: "🧱 Material",
    capacity: "⚡ Capacity",
  };
  return labels[type] || type.charAt(0).toUpperCase() + type.slice(1);
}

// ─── VariantFormItem ──────────────────────────────────────────────────────────
// ✅ CHANGED: images state → single image (string | null)
// ✅ onUpdate mein variantImage pass hota hai
// ✅ onVariantImageChange callback se parent (DetailedModeForm) ko batata hai
function VariantFormItem({
  attributeType,
  attributeValue,
  onUpdate,
  onRemove,
  onError,
  currencyRate,
  currencyCode,
  currencySymbol,
  isFirstItem,
  onVariantImageChange,
}: {
  attributeType: string;
  attributeValue: string;
  onUpdate: (data: any) => void;
  onRemove: () => void;
  onError: (msg: string) => void;
  currencyRate: number;
  currencyCode: string;
  currencySymbol: string;
  isFirstItem?: boolean;
  // ✅ NEW: jab variant image change ho toh parent ko batao
  onVariantImageChange?: (
    attributeValue: string,
    imageUrl: string | null,
  ) => void;
}) {
  const [priceDisplay, setPriceDisplay] = useState("");
  const [originalPriceDisplay, setOriginalPriceDisplay] = useState("");
  const [description, setDescription] = useState("");
  const [descriptionImages, setDescriptionImages] = useState<string[]>([]);
  const [stockStatus, setStockStatus] = useState<StockStatus>("in_stock");
  const [lowStockThreshold, setLowStockThreshold] = useState<number | null>(
    null,
  );
  // ✅ CHANGED: Multiple images → single image
  const [variantImage, setVariantImage] = useState<string | null>(null);
  const [bulkTiers, setBulkTiers] = useState<BulkPricingTier[]>([]);
  const expandedRef = useRef(isFirstItem !== false);
  const [, forceUpdate] = useState(0);
  const expanded = expandedRef.current;
  const toggleExpanded = () => {
    expandedRef.current = !expandedRef.current;
    forceUpdate((n) => n + 1);
  };

  const onUpdateRef = useRef(onUpdate);
  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  const getStockValue = (): number => {
    if (stockStatus === "out_of_stock") return 0;
    if (stockStatus === "low_stock") return lowStockThreshold || 5;
    return 999999;
  };

  const getPriceInPKRFast = (displayPrice: string): number => {
    const priceNum = parseFloat(displayPrice) || 0;
    if (currencyCode === "PKR") return priceNum;
    return Math.round((priceNum / currencyRate) * 100) / 100;
  };

  const handleDescriptionChange = (
    newValue: string,
    imagesInDesc: string[],
  ) => {
    setDescription(newValue);
    setDescriptionImages(imagesInDesc);
    onUpdateRef.current({
      attributeType,
      attributeValue,
      pricePKR: getPriceInPKRFast(priceDisplay),
      priceDisplay,
      originalPricePKR: originalPriceDisplay
        ? getPriceInPKRFast(originalPriceDisplay)
        : null,
      originalPriceDisplay,
      description: newValue,
      descriptionImages: imagesInDesc,
      stock: getStockValue(),
      lowStockThreshold: stockStatus === "low_stock" ? lowStockThreshold : null,
      // ✅ variant image array — single image as array for DB compatibility
      images: variantImage ? [variantImage] : [],
      variantImage,
      stockStatus,
      // tier_price is ALREADY in PKR — do not convert again
      bulkPricingTiers: bulkTiers,
      displayCurrency: currencyCode,
    });
  };

  // ✅ Handle single image change — notify parent too
  const handleVariantImageChange = (url: string | null) => {
    setVariantImage(url);
    if (onVariantImageChange) {
      onVariantImageChange(attributeValue, url);
    }
  };

  useEffect(() => {
    const pricePKR = getPriceInPKRFast(priceDisplay);
    const originalPricePKR = originalPriceDisplay
      ? getPriceInPKRFast(originalPriceDisplay)
      : null;
    onUpdateRef.current({
      attributeType,
      attributeValue,
      pricePKR,
      priceDisplay,
      originalPricePKR,
      originalPriceDisplay,
      description,
      descriptionImages,
      stock: getStockValue(),
      lowStockThreshold: stockStatus === "low_stock" ? lowStockThreshold : null,
      images: variantImage ? [variantImage] : [],
      variantImage,
      stockStatus,
      // tier_price is ALREADY in PKR — do not convert again
      bulkPricingTiers: bulkTiers,
      displayCurrency: currencyCode,
    });
  }, [
    priceDisplay,
    originalPriceDisplay,
    description,
    descriptionImages,
    stockStatus,
    lowStockThreshold,
    variantImage,
    bulkTiers,
    currencyRate,
    currencyCode,
    attributeType,
    attributeValue,
  ]);

  const currentUnitPrice = parseFloat(priceDisplay) || 0;
  const getSymbol = () => currencySymbol || currencyCode;
  const getStatusLabel = () => {
    if (stockStatus === "out_of_stock") return "Out of Stock";
    if (stockStatus === "low_stock")
      return `Low Stock (Alert: ${lowStockThreshold || 5})`;
    const stockVal = getStockValue();
    if (stockVal === 999999) return "In Stock (Unlimited)";
    return `In Stock (${stockVal} pcs)`;
  };
  const colorStyle =
    attributeType === "color" ? getColorStyle(attributeValue) : null;

  return (
    <div className="ap-variant-form-item">
      <div className="ap-variant-form-header" onClick={toggleExpanded}>
        <span
          style={{
            fontFamily: "var(--ap-sans)",
            fontSize: "0.6rem",
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "#8b6914",
            background: "rgba(139,105,20,0.12)",
            border: "1px solid rgba(139,105,20,0.25)",
            borderRadius: "4px",
            padding: "2px 7px",
            flexShrink: 0,
          }}
        >
          {getAttributeTypeLabel(attributeType)}
        </span>

        {colorStyle ? (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: colorStyle.bg,
              color: colorStyle.text,
              border: `1.5px solid ${colorStyle.border}`,
              borderRadius: "6px",
              padding: "3px 10px 3px 6px",
              fontFamily: "var(--ap-sans)",
              fontSize: "0.78rem",
              fontWeight: 700,
              letterSpacing: "0.04em",
              flexShrink: 0,
            }}
          >
            <span
              style={{
                width: "12px",
                height: "12px",
                borderRadius: "50%",
                background: colorStyle.bg,
                border: `2px solid ${colorStyle.text}`,
                flexShrink: 0,
                display: "inline-block",
              }}
            />
            {attributeValue}
          </span>
        ) : (
          <span
            style={{
              fontFamily: "var(--ap-sans)",
              fontSize: "0.82rem",
              fontWeight: 700,
              color: "#1a1a1a",
              background: "rgba(0,0,0,0.07)",
              border: "1.5px solid rgba(0,0,0,0.15)",
              borderRadius: "6px",
              padding: "3px 10px",
              flexShrink: 0,
            }}
          >
            {attributeValue}
          </span>
        )}

        <span
          className="ap-variant-form-badge"
          style={{ background: "rgba(245,158,11,0.1)", color: "#f59e0b" }}
        >
          {getStatusLabel()}
        </span>
        {bulkTiers.length > 0 && (
          <span
            className="ap-variant-form-badge"
            style={{ background: "rgba(34,197,94,0.1)", color: "#22c55e" }}
          >
            {bulkTiers.length} Bulk Tiers
          </span>
        )}
        {/* ✅ Single variant image badge */}
        {variantImage && (
          <span
            className="ap-variant-form-badge"
            style={{ background: "rgba(99,102,241,0.1)", color: "#6366f1" }}
          >
            ✅ 1 Image
          </span>
        )}
        {descriptionImages.length > 0 && (
          <span
            className="ap-variant-form-badge"
            style={{ background: "rgba(139,105,20,0.1)", color: "#8b6914" }}
          >
            📷 {descriptionImages.length} Desc Images
          </span>
        )}

        <span
          style={{
            marginLeft: "auto",
            color: "#8b6914",
            fontSize: "0.75rem",
            flexShrink: 0,
            transition: "transform 0.2s",
            transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
          }}
        >
          ▼
        </span>

        <button
          type="button"
          className="ap-variant-form-remove"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div
        className="ap-variant-form-body"
        style={{ display: expanded ? "flex" : "none" }}
      >
        <div className="ap-row">
          <div className="ap-field">
            <label className="ap-label">Sale Price ({getSymbol()})</label>
            <input
              type="number"
              step="0.01"
              className="ap-input"
              value={priceDisplay}
              onChange={(e) => setPriceDisplay(e.target.value)}
              placeholder="0"
            />
          </div>
          <div className="ap-field">
            <label className="ap-label">Original Price ({getSymbol()})</label>
            <input
              type="number"
              step="0.01"
              className="ap-input"
              value={originalPriceDisplay}
              onChange={(e) => setOriginalPriceDisplay(e.target.value)}
              placeholder="0"
            />
          </div>
        </div>

        <div className="ap-field">
          <label className="ap-label">Stock Status</label>
          <StockStatusSelector
            value={stockStatus}
            onChange={setStockStatus}
            lowStockThreshold={lowStockThreshold}
            onThresholdChange={setLowStockThreshold}
          />
        </div>

        {/* ✅ CHANGED: Single Image Uploader (1 image per variant) */}
        <div className="ap-field">
          <label className="ap-label">
            Variant Image
            <span
              style={{
                color: "#888",
                fontWeight: 400,
                marginLeft: "6px",
                textTransform: "none",
                letterSpacing: 0,
                fontSize: "0.65rem",
              }}
            >
              (1 image — auto-added to main gallery)
            </span>
          </label>
          <SingleImageUploader
            image={variantImage}
            onImageChange={handleVariantImageChange}
            onError={onError}
          />
        </div>

        {currentUnitPrice > 0 && (
          <BulkPricingManager
            unitPrice={currentUnitPrice}
            tiers={bulkTiers}
            onTiersChange={setBulkTiers}
            onError={onError}
          />
        )}
      </div>
    </div>
  );
}

// ─── Attribute Selector ───────────────────────────────────────────────────────
function AttributeSelector({
  label,
  type,
  values,
  setValues,
  suggestions,
  variants,
  setVariants,
  onError,
  currencyRate,
  currencyCode,
  currencySymbol,
  onVariantImageChange,
}: {
  label: string;
  type: string;
  values: string[];
  setValues: (v: string[]) => void;
  suggestions: string[];
  variants: any[];
  setVariants: (v: any[] | ((prev: any[]) => any[])) => void;
  onError: (msg: string) => void;
  currencyRate: number;
  currencyCode: string;
  currencySymbol: string;
  onVariantImageChange?: (
    attributeValue: string,
    imageUrl: string | null,
  ) => void;
}) {
  const [inputValue, setInputValue] = useState("");

  const addValue = (value: string) => {
    const trimmed = value.trim();
    if (trimmed && !values.includes(trimmed)) {
      setValues([...values, trimmed]);
      const newVariant = {
        attributeType: type,
        attributeValue: trimmed,
        priceDisplay: "",
        originalPriceDisplay: "",
        description: "",
        descriptionImages: [],
        stock: 999999,
        lowStockThreshold: null,
        images: [],
        variantImage: null,
        stockStatus: "in_stock" as StockStatus,
        bulkPricingTiers: [],
      };
      setVariants((prev: any[]) => [...prev, newVariant]);
    }
    setInputValue("");
  };

  const removeValue = (valueToRemove: string) => {
    setValues(values.filter((v) => v !== valueToRemove));
    setVariants((prev: any[]) =>
      prev.filter((v) => v.attributeValue !== valueToRemove),
    );
  };

  const updateVariant = useCallback(
    (index: number, data: any) => {
      setVariants((prev: any[]) => {
        const newVariants = [...prev];
        if (newVariants[index])
          newVariants[index] = { ...newVariants[index], ...data };
        return newVariants;
      });
    },
    [setVariants],
  );

  const filteredSuggestions = suggestions.filter(
    (s) =>
      !values.includes(s) && s.toLowerCase().includes(inputValue.toLowerCase()),
  );

  return (
    <div className="ap-attribute-section">
      <div className="ap-attribute-header">
        <label className="ap-label">{label}</label>
        <div className="ap-attribute-input-wrap">
          <input
            type="text"
            className="ap-input"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addValue(inputValue)}
            placeholder={`Add ${label.toLowerCase()}...`}
          />
          <button
            type="button"
            className="ap-attribute-add"
            onClick={() => addValue(inputValue)}
          >
            Add
          </button>
        </div>
        {filteredSuggestions.length > 0 && (
          <div className="ap-attribute-suggestions">
            {filteredSuggestions.map((s) => (
              <button key={s} type="button" onClick={() => addValue(s)}>
                + {s}
              </button>
            ))}
          </div>
        )}
      </div>
      {values.length > 0 && (
        <div className="ap-variant-forms-container">
          {values.map((value, idx) => {
            const variant = variants.find((v) => v.attributeValue === value);
            if (!variant) return null;
            return (
              <VariantFormItem
                key={`${type}-${value}`}
                attributeType={type}
                attributeValue={value}
                onUpdate={(data) => updateVariant(idx, data)}
                onRemove={() => removeValue(value)}
                onError={onError}
                currencyRate={currencyRate}
                currencyCode={currencyCode}
                currencySymbol={currencySymbol}
                isFirstItem={idx === 0}
                onVariantImageChange={onVariantImageChange}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── DB Helpers ───────────────────────────────────────────────────────────────
async function dbInsert(
  supabaseUrl: string,
  supabaseKey: string,
  table: string,
  body: object,
) {
  const res = await fetch(`${supabaseUrl}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      Prefer: "return=representation",
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    const errMsg = Array.isArray(data)
      ? data[0]?.message
      : data?.message || data?.error || JSON.stringify(data);
    throw new Error(`${table} insert failed (${res.status}): ${errMsg}`);
  }
  return Array.isArray(data) ? data[0] : data;
}

async function dbInsertMany(
  supabaseUrl: string,
  supabaseKey: string,
  table: string,
  body: object[],
) {
  const res = await fetch(`${supabaseUrl}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      Prefer: "return=minimal",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    console.error(`${table} bulk insert error:`, data);
  }
}

// ─── Simple Mode Form ─────────────────────────────────────────────────────────
function SimpleModeForm({
  tab,
  onSuccess,
  onError,
  router,
}: {
  tab: (typeof TABS)[0];
  onSuccess: () => void;
  onError: (msg: string) => void;
  router: any;
}) {
  const { currency } = useCurrency();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [descriptionImages, setDescriptionImages] = useState<string[]>([]);
  const [brand, setBrand] = useState("");
  const [priceDisplay, setPriceDisplay] = useState("");
  const [originalPriceDisplay, setOriginalPriceDisplay] = useState("");
  const [condition, setCondition] = useState("new");
  const [isFeatured, setIsFeatured] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [stockStatus, setStockStatus] = useState<StockStatus>("in_stock");
  const [lowStockThreshold, setLowStockThreshold] = useState<number | null>(
    null,
  );
  const [images, setImages] = useState<string[]>([]);
  const [productVideo, setProductVideo] = useState<string | null>(null);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [bulkTiers, setBulkTiers] = useState<BulkPricingTier[]>([]);
  const [uploading, setUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleDescriptionChange = (
    newValue: string,
    imagesInDesc: string[],
  ) => {
    setDescription(newValue);
    setDescriptionImages(imagesInDesc);
  };

  const handleImageUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (images.length + files.length > 20) {
      onError("Maximum 20 images allowed");
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    setUploading(true);
    const newUrls: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith("image/")) {
        onError(`"${file.name}" is not an image file`);
        continue;
      }
      try {
        const url = await uploadToCloudinary(file);
        newUrls.push(url);
      } catch (err) {
        onError(`Failed to upload ${file.name}`);
      }
    }
    setImages([...images, ...newUrls]);
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const removeImage = (index: number) =>
    setImages(images.filter((_, i) => i !== index));

  const getStockValue = (): number => {
    if (stockStatus === "out_of_stock") return 0;
    if (stockStatus === "low_stock") return lowStockThreshold || 5;
    return 999999;
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setDescriptionImages([]);
    setBrand("");
    setPriceDisplay("");
    setOriginalPriceDisplay("");
    setImages([]);
    setProductVideo(null);
    setFaqs([]);
    setBulkTiers([]);
    setLowStockThreshold(null);
    setStockStatus("in_stock");
  };

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!name.trim()) {
      onError("Product name is required");
      return;
    }
    if (!priceDisplay || parseFloat(priceDisplay) <= 0) {
      onError("Sale price is required and must be greater than 0");
      return;
    }
    if (isSubmitting) {
      onError("Product is already being saved...");
      return;
    }
    setIsSubmitting(true);
    console.log("🚀 Starting product save...");
    try {
      const currentCurrency = currency;
      const currentRate = currency.rate;
      const priceNum = parseFloat(priceDisplay);
      const originalPriceNum = parseFloat(originalPriceDisplay) || 0;
      let pricePKR = priceNum;
      let originalPricePKR: number | null =
        originalPriceNum > 0 ? originalPriceNum : null;
      if (currentCurrency.code !== "PKR" && currentRate > 0) {
        pricePKR = Number((priceNum / currentRate).toFixed(2));
        if (originalPricePKR)
          originalPricePKR = Number(
            (originalPriceNum / currentRate).toFixed(2),
          );
      }
      console.log("📦 Inserting product...");
      const productData = await dbInsert(supabaseUrl, supabaseKey, "products", {
        name: name.trim(),
        description: description || null,
        description_images: descriptionImages,
        category: tab.category,
        subcategory: tab.sub,
        brand: brand.trim() || null,
        condition,
        is_featured: isFeatured,
        is_active: isActive,
        // ✅ FIX: price aur original_price products table mein save karo
        price: pricePKR,
        original_price: originalPricePKR,
        // ✅ FIX: images field products table mein nahi hota — hataya
        // images variant_images table mein alag se save hongi
        currency_code: currentCurrency.code,
        stock: getStockValue(),
        video_url: productVideo || null,
      });
      console.log("✅ Product inserted:", productData.id);
      console.log("📦 Inserting variant...");
      const variantData = await dbInsert(
        supabaseUrl,
        supabaseKey,
        "product_variants",
        {
          product_id: productData.id,
          attribute_type: "standard",
          attribute_value: "Standard",
          price: pricePKR,
          original_price: originalPricePKR,
          description_rich: description || null,
          description_images: descriptionImages,
          description: description ? description.substring(0, 500) : null,
          stock: getStockValue(),
          low_stock_threshold:
            stockStatus === "low_stock" ? lowStockThreshold : null,
          is_active: true,
          // ✅ FIX: currency fields add karo
          currency_code: currentCurrency.code,
          base_price_pkr: pricePKR,
          base_original_price_pkr: originalPricePKR,
        },
      );
      console.log("✅ Variant inserted:", variantData.id);
      console.log("✅ Product saved successfully!");
      resetForm();
      onSuccess();
      if (images.length > 0) {
        dbInsertMany(
          supabaseUrl,
          supabaseKey,
          "variant_images",
          images.map((url, idx) => ({
            variant_id: variantData.id,
            image_url: url,
            display_order: idx,
          })),
        ).catch((err) => console.error("Image insert error:", err));
      }
      const validTiers = bulkTiers.filter(
        (t) => t.min_quantity && t.tier_price > 0,
      );
      if (validTiers.length > 0) {
        dbInsertMany(
          supabaseUrl,
          supabaseKey,
          "bulk_pricing_tiers",
          validTiers.map((t) => ({
            variant_id: variantData.id,
            min_quantity: t.min_quantity,
            max_quantity: t.max_quantity,
            // tier_price is ALREADY stored in PKR inside BulkPricingManager
            // DO NOT divide by rate again — that would give wrong (tiny) values
            tier_price: t.tier_price,
            discount_percentage: t.discount_percentage,
            discount_price: t.discount_price ?? null,
          })),
        ).catch((err) => console.error("Tier insert error:", err));
      }
      const validFaqs = faqs.filter((f) => f.question.trim());
      if (validFaqs.length > 0) {
        dbInsertMany(
          supabaseUrl,
          supabaseKey,
          "product_faqs",
          validFaqs.map((f, idx) => ({
            product_id: productData.id,
            question: f.question.trim(),
            answer: f.answer.trim() || null,
            display_order: idx,
          })),
        ).catch((err) => console.error("FAQ insert error:", err));
      }
      setTimeout(() => {
        window.location.href = "/panel";
      }, 1500);
    } catch (err: any) {
      console.error("❌ Submit error:", err);
      onError(
        err.message || "Failed to save product. Check console for details.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="ap-form-grid-simple">
        <div>
          <div className="ap-card">
            <div className="ap-card-header">
              <div className="ap-card-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              </div>
              <h3 className="ap-card-title">Basic Product Information</h3>
            </div>
            <div className="ap-card-body">
              <div className="ap-field">
                <label className="ap-label">Product Name *</label>
                <input
                  className="ap-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="ap-row">
                <div className="ap-field">
                  <label className="ap-label">
                    Sale Price ({currency.symbol}) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="ap-input"
                    value={priceDisplay}
                    onChange={(e) => setPriceDisplay(e.target.value)}
                    placeholder="0"
                    required
                  />
                </div>
                <div className="ap-field">
                  <label className="ap-label">
                    Original Price ({currency.symbol})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="ap-input"
                    value={originalPriceDisplay}
                    onChange={(e) => setOriginalPriceDisplay(e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="ap-field">
                <ProductDescription
                  value={description}
                  onChange={handleDescriptionChange}
                  existingImages={descriptionImages}
                  maxImages={20}
                />
              </div>
              <div className="ap-row">
                <div className="ap-field">
                  <label className="ap-label">Brand</label>
                  <input
                    className="ap-input"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                  />
                </div>
                <div className="ap-field">
                  <label className="ap-label">Condition</label>
                  <select
                    className="ap-select"
                    value={condition}
                    onChange={(e) => setCondition(e.target.value)}
                  >
                    <option value="new">New</option>
                    <option value="used">Used</option>
                    <option value="refurbished">Refurbished</option>
                  </select>
                </div>
              </div>
              <div className="ap-field">
                <label className="ap-label">Stock Status</label>
                <StockStatusSelector
                  value={stockStatus}
                  onChange={setStockStatus}
                  lowStockThreshold={lowStockThreshold}
                  onThresholdChange={setLowStockThreshold}
                />
              </div>
              {parseFloat(priceDisplay) > 0 && (
                <div className="ap-field">
                  <label className="ap-label">
                    Bulk Pricing (Quantity Discounts)
                  </label>
                  <BulkPricingManager
                    unitPrice={parseFloat(priceDisplay) || 0}
                    tiers={bulkTiers}
                    onTiersChange={setBulkTiers}
                    onError={onError}
                  />
                </div>
              )}
              <div style={{ display: "flex", gap: "1.5rem" }}>
                <label className="ap-check-wrap">
                  <input
                    type="checkbox"
                    checked={isFeatured}
                    onChange={(e) => setIsFeatured(e.target.checked)}
                  />
                  <span className="ap-check-label">Featured</span>
                </label>
                <label className="ap-check-wrap">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                  />
                  <span className="ap-check-label">Active</span>
                </label>
              </div>
            </div>
          </div>
          <div className="ap-card">
            <div className="ap-card-header">
              <div className="ap-card-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <h3 className="ap-card-title">FAQs</h3>
            </div>
            <div className="ap-card-body">
              <FAQBuilder faqs={faqs} setFaqs={setFaqs} />
            </div>
          </div>
        </div>
        <div>
          <div className="ap-card">
            <div className="ap-card-header">
              <div className="ap-card-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
              </div>
              <h3 className="ap-card-title">Product Images (Max 20)</h3>
            </div>
            <div className="ap-card-body">
              <div
                className="ap-img-upload"
                onClick={() => !uploading && fileRef.current?.click()}
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => handleImageUpload(e.target.files)}
                  style={{ display: "none" }}
                />
                <div className="ap-img-upload-icon">
                  {uploading ? (
                    <div className="ap-spinner" />
                  ) : (
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                  )}
                </div>
                <p className="ap-img-upload-title">
                  {uploading ? "Uploading..." : "Click to Upload Images"}
                </p>
                <p className="ap-img-upload-sub">
                  JPG, PNG, WEBP (Max 20 images)
                </p>
              </div>
              {images.length > 0 && (
                <div className="ap-img-previews">
                  {images.map((url, i) => (
                    <div key={i} className="ap-img-thumb">
                      <img src={url} alt={`Product ${i + 1}`} />
                      <button
                        type="button"
                        className="ap-img-thumb-remove"
                        onClick={() => removeImage(i)}
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>
                  ))}
                  <div className="ap-image-count">
                    {images.length} / 20 images
                  </div>
                </div>
              )}
            </div>
          </div>
          {/* ─── Video Upload Card ─── */}
          <div className="ap-card">
            <div className="ap-card-header">
              <div className="ap-card-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M22.54 6.42A2.78 2.78 0 0 0 20.7 4.55C19.12 4 12 4 12 4s-7.12 0-8.7.55A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.3 19.45C4.88 20 12 20 12 20s7.12 0 8.7-.55a2.78 2.78 0 0 0 1.84-1.87A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z" />
                  <polygon
                    points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02"
                    fill="currentColor"
                  />
                </svg>
              </div>
              <h3 className="ap-card-title">Product Video (Optional)</h3>
            </div>
            <div className="ap-card-body">
              <VideoUploader
                videoUrl={productVideo}
                onVideoChange={setProductVideo}
                onError={onError}
              />
            </div>
          </div>
          <div className="ap-card">
            <div className="ap-card-header">
              <div className="ap-card-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h3 className="ap-card-title">Summary</h3>
            </div>
            <div className="ap-card-body">
              <button
                type="submit"
                className="ap-submit-btn"
                disabled={isSubmitting}
                style={{ opacity: isSubmitting ? 0.7 : 1 }}
              >
                {isSubmitting ? (
                  <>
                    <div
                      className="ap-spinner"
                      style={{
                        width: "16px",
                        height: "16px",
                        marginRight: "8px",
                      }}
                    />{" "}
                    Saving...
                  </>
                ) : (
                  <>
                    Save Product in {currency.symbol}{" "}
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}

// ─── Detailed Mode Form ───────────────────────────────────────────────────────
function DetailedModeForm({
  tab,
  onSuccess,
  onError,
  router,
}: {
  tab: (typeof TABS)[0];
  onSuccess: () => void;
  onError: (msg: string) => void;
  router: any;
}) {
  const { currency } = useCurrency();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [descriptionImages, setDescriptionImages] = useState<string[]>([]);
  const [brand, setBrand] = useState("");
  const [condition, setCondition] = useState("new");
  const [isFeatured, setIsFeatured] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [colors, setColors] = useState<string[]>([]);
  const [sizes, setSizes] = useState<string[]>([]);
  const [materials, setMaterials] = useState<string[]>([]);
  const [capacities, setCapacities] = useState<string[]>([]);
  const [colorVariants, setColorVariants] = useState<any[]>([]);
  const [sizeVariants, setSizeVariants] = useState<any[]>([]);
  const [materialVariants, setMaterialVariants] = useState<any[]>([]);
  const [capacityVariants, setCapacityVariants] = useState<any[]>([]);

  // ✅ MAIN IMAGES — 20 tak images, variant images auto-sync hongi
  const [mainImages, setMainImages] = useState<string[]>([]);
  // ✅ Track karo ki kon si variant image kahan hai main gallery mein
  // { attributeValue: imageUrl } map
  const variantImageMapRef = useRef<Record<string, string>>({});

  // ✅ Product Video
  const [productVideo, setProductVideo] = useState<string | null>(null);

  const mainImagesUploading = useRef(false);
  const mainFileRef = useRef<HTMLInputElement>(null);
  const [mainUploading, setMainUploading] = useState(false);

  const handleDescriptionChange = (
    newValue: string,
    imagesInDesc: string[],
  ) => {
    setDescription(newValue);
    setDescriptionImages(imagesInDesc);
  };

  // ✅ Jab koi variant image change ho — main gallery update karo
  const handleVariantImageChange = useCallback(
    (attributeValue: string, imageUrl: string | null) => {
      setMainImages((prevMainImages) => {
        const oldUrl = variantImageMapRef.current[attributeValue];
        let newImages = [...prevMainImages];

        // Purani variant image hata do main gallery se
        if (oldUrl) {
          newImages = newImages.filter((img) => img !== oldUrl);
        }

        // Nayi image add karo (agar hai toh)
        if (imageUrl) {
          // Duplicate check
          if (!newImages.includes(imageUrl)) {
            if (newImages.length < 20) {
              newImages = [...newImages, imageUrl];
            } else {
              // Agar 20 se zyada hain toh add nahi hoga — error show nahi karte kyunki
              // user khud main gallery se manage kar sakta hai
            }
          }
          variantImageMapRef.current[attributeValue] = imageUrl;
        } else {
          // Image remove ki toh map se bhi hata do
          delete variantImageMapRef.current[attributeValue];
        }

        return newImages;
      });
    },
    [],
  );

  // ✅ Main images mein manually add karna
  const handleMainImageUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (mainImages.length + files.length > 20) {
      onError("Maximum 20 images allowed in main gallery");
      if (mainFileRef.current) mainFileRef.current.value = "";
      return;
    }
    setMainUploading(true);
    const newUrls: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith("image/")) {
        onError(`"${file.name}" is not an image file`);
        continue;
      }
      try {
        const url = await uploadToCloudinary(file);
        newUrls.push(url);
      } catch (err) {
        onError(`Failed to upload ${file.name}`);
      }
    }
    setMainImages((prev) => [...prev, ...newUrls]);
    setMainUploading(false);
    if (mainFileRef.current) mainFileRef.current.value = "";
  };

  const removeMainImage = (index: number) => {
    const urlToRemove = mainImages[index];
    setMainImages(mainImages.filter((_, i) => i !== index));
    // Agar yeh kisi variant ki image thi toh map se bhi hata do
    const map = variantImageMapRef.current;
    for (const key of Object.keys(map)) {
      if (map[key] === urlToRemove) {
        delete map[key];
        break;
      }
    }
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setDescriptionImages([]);
    setBrand("");
    setColors([]);
    setSizes([]);
    setMaterials([]);
    setCapacities([]);
    setColorVariants([]);
    setSizeVariants([]);
    setMaterialVariants([]);
    setCapacityVariants([]);
    setFaqs([]);
    setMainImages([]);
    setProductVideo(null);
    variantImageMapRef.current = {};
  };

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!name.trim()) {
      onError("Product name is required");
      return;
    }
    const allVariants = [
      ...colorVariants,
      ...sizeVariants,
      ...materialVariants,
      ...capacityVariants,
    ];
    if (allVariants.length === 0) {
      onError("Please add at least one attribute");
      return;
    }
    let hasValidPrice = false;
    for (const v of allVariants) {
      const priceVal = parseFloat(v.priceDisplay);
      if (!isNaN(priceVal) && priceVal > 0) {
        hasValidPrice = true;
        break;
      }
    }
    if (!hasValidPrice) {
      onError("Please set a valid price for at least one variant");
      return;
    }
    if (isSubmitting) {
      onError("Product is already being saved...");
      return;
    }
    setIsSubmitting(true);
    console.log("🚀 Starting detailed product save...");

    try {
      const currentCurrency = currency;
      const currentRate = currency.rate;

      // ✅ FIX: Pehle sab variants ki prices calculate karo
      // Products table mein minimum price save karni hai
      const allVariantPricesRaw = allVariants
        .map((v) => parseFloat(v.priceDisplay))
        .filter((p) => !isNaN(p) && p > 0);
      const allOriginalPricesRaw = allVariants
        .map((v) => parseFloat(v.originalPriceDisplay))
        .filter((p) => !isNaN(p) && p > 0);

      const minPriceDisplay =
        allVariantPricesRaw.length > 0 ? Math.min(...allVariantPricesRaw) : 0;
      const minOriginalPriceDisplay =
        allOriginalPricesRaw.length > 0 ? Math.min(...allOriginalPricesRaw) : 0;

      // PKR mein convert karo
      let minPricePKR = minPriceDisplay;
      let minOriginalPricePKR: number | null =
        minOriginalPriceDisplay > 0 ? minOriginalPriceDisplay : null;
      if (currentCurrency.code !== "PKR" && currentRate > 0) {
        minPricePKR = Number((minPriceDisplay / currentRate).toFixed(2));
        if (minOriginalPricePKR)
          minOriginalPricePKR = Number(
            (minOriginalPriceDisplay / currentRate).toFixed(2),
          );
      }

      // ✅ Product mein mainImages save ho — yeh poori gallery hai
      console.log("📦 Inserting product...");
      const productData = await dbInsert(supabaseUrl, supabaseKey, "products", {
        name: name.trim(),
        description: description || null,
        description_images: descriptionImages,
        category: tab.category,
        subcategory: tab.sub,
        brand: brand.trim() || null,
        condition,
        is_featured: isFeatured,
        is_active: isActive,
        // ✅ FIX: price aur original_price products table mein save karo
        price: minPricePKR,
        original_price: minOriginalPricePKR,
        currency_code: currentCurrency.code,
        // ✅ Main images (variant images + manually added images)
        main_images: mainImages,
        video_url: productVideo || null,
      });
      console.log("✅ Product inserted:", productData.id);

      // ✅ Variants insert karo
      for (const variant of allVariants) {
        const priceNum = parseFloat(variant.priceDisplay);
        if (isNaN(priceNum) || priceNum <= 0) continue;
        const originalPriceNum = variant.originalPriceDisplay
          ? parseFloat(variant.originalPriceDisplay)
          : 0;
        let pricePKR = priceNum;
        let originalPricePKR: number | null =
          originalPriceNum > 0 ? originalPriceNum : null;
        if (currentCurrency.code !== "PKR" && currentRate > 0) {
          pricePKR = Number((priceNum / currentRate).toFixed(2));
          if (originalPricePKR)
            originalPricePKR = Number(
              (originalPriceNum / currentRate).toFixed(2),
            );
        }
        if (pricePKR <= 0) pricePKR = 0.01;

        console.log(`📦 Inserting variant: ${variant.attributeValue}...`);
        let variantData: any;
        try {
          // ✅ Variant ki single image save karo
          const variantImages = variant.variantImage
            ? [variant.variantImage]
            : variant.images || [];
          variantData = await dbInsert(
            supabaseUrl,
            supabaseKey,
            "product_variants",
            {
              product_id: productData.id,
              attribute_type: variant.attributeType,
              attribute_value: variant.attributeValue,
              price: pricePKR,
              original_price: originalPricePKR,
              description_rich: variant.description || null,
              description_images: variant.descriptionImages || [],
              description: variant.description
                ? variant.description.substring(0, 500)
                : null,
              stock: variant.stock || 999999,
              low_stock_threshold: variant.lowStockThreshold || null,
              is_active: true,
              // ✅ FIX: currency fields add karo
              currency_code: currentCurrency.code,
              base_price_pkr: pricePKR,
              base_original_price_pkr: originalPricePKR,
            },
          );
          console.log(`✅ Variant inserted: ${variantData.id}`);
        } catch (varErr: any) {
          console.error("Variant insert error:", varErr.message);
          continue;
        }

        // ✅ Variant ki image variant_images table mein save karo
        const variantImageUrl =
          variant.variantImage || (variant.images && variant.images[0]);
        if (variantImageUrl) {
          dbInsertMany(supabaseUrl, supabaseKey, "variant_images", [
            {
              variant_id: variantData.id,
              image_url: variantImageUrl,
              display_order: 0,
            },
          ]).catch((err) => console.error("Image error:", err));
        }

        // Bulk tiers
        if (variant.bulkPricingTiers && variant.bulkPricingTiers.length > 0) {
          const validTiers = variant.bulkPricingTiers.filter(
            (t: any) => t.min_quantity && t.tier_price > 0,
          );
          if (validTiers.length > 0) {
            dbInsertMany(
              supabaseUrl,
              supabaseKey,
              "bulk_pricing_tiers",
              validTiers.map((t: any) => ({
                variant_id: variantData.id,
                min_quantity: t.min_quantity,
                max_quantity: t.max_quantity,
                tier_price: t.tier_price,
                discount_percentage: t.discount_percentage ?? null,
                discount_price: t.discount_price ?? null,
              })),
            ).catch((err) => console.error("Tier error:", err));
          }
        }
      }

      console.log("✅ Product saved successfully!");
      resetForm();
      onSuccess();

      // FAQs
      const validFaqs = faqs.filter((f) => f.question.trim());
      if (validFaqs.length > 0) {
        dbInsertMany(
          supabaseUrl,
          supabaseKey,
          "product_faqs",
          validFaqs.map((f, idx) => ({
            product_id: productData.id,
            question: f.question.trim(),
            answer: f.answer.trim() || null,
            display_order: idx,
          })),
        ).catch((err) => console.error("FAQ error:", err));
      }

      setTimeout(() => {
        window.location.href = "/panel";
      }, 1500);
    } catch (err: any) {
      console.error("❌ Submit error:", err);
      onError(
        err.message || "Failed to save product. Check console for details.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalVariants =
    colorVariants.length +
    sizeVariants.length +
    materialVariants.length +
    capacityVariants.length;

  return (
    <form onSubmit={handleSubmit}>
      <div className="ap-form-grid-detailed">
        <div className="ap-detailed-left">
          {/* Basic Info */}
          <div className="ap-card">
            <div className="ap-card-header">
              <div className="ap-card-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              </div>
              <h3 className="ap-card-title">Basic Product Information</h3>
            </div>
            <div className="ap-card-body">
              <div className="ap-field">
                <label className="ap-label">Product Name *</label>
                <input
                  className="ap-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="ap-field">
                <ProductDescription
                  value={description}
                  onChange={handleDescriptionChange}
                  existingImages={descriptionImages}
                  maxImages={20}
                />
              </div>
              <div className="ap-row">
                <div className="ap-field">
                  <label className="ap-label">Brand</label>
                  <input
                    className="ap-input"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                  />
                </div>
                <div className="ap-field">
                  <label className="ap-label">Condition</label>
                  <select
                    className="ap-select"
                    value={condition}
                    onChange={(e) => setCondition(e.target.value)}
                  >
                    <option value="new">New</option>
                    <option value="used">Used</option>
                    <option value="refurbished">Refurbished</option>
                  </select>
                </div>
              </div>
              <div style={{ display: "flex", gap: "1.5rem" }}>
                <label className="ap-check-wrap">
                  <input
                    type="checkbox"
                    checked={isFeatured}
                    onChange={(e) => setIsFeatured(e.target.checked)}
                  />
                  <span className="ap-check-label">Featured</span>
                </label>
                <label className="ap-check-wrap">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                  />
                  <span className="ap-check-label">Active</span>
                </label>
              </div>
            </div>
          </div>

          {/* ✅ MAIN IMAGES SECTION — 20 tak, variant images auto-attach */}
          <div className="ap-card">
            <div className="ap-card-header">
              <div className="ap-card-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
              </div>
              <h3 className="ap-card-title">Main Product Images (Max 20)</h3>
            </div>
            <div className="ap-card-body">
              {/* Info banner */}
              <div
                style={{
                  background: "rgba(218,165,32,0.06)",
                  border: "1px solid rgba(218,165,32,0.2)",
                  borderRadius: "10px",
                  padding: "12px 14px",
                  marginBottom: "8px",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "10px",
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#8b6914"
                  strokeWidth="1.5"
                  width="18"
                  height="18"
                  style={{ flexShrink: 0, marginTop: "1px" }}
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <div
                  style={{
                    fontFamily: "var(--ap-sans)",
                    fontSize: "0.72rem",
                    color: "#8b6914",
                    lineHeight: 1.6,
                  }}
                >
                  <strong>Auto-Sync:</strong> Har variant ki image automatically
                  yahan add hoti hai. Aap additional images bhi manually add kar
                  sakte hain (max 20 total).
                </div>
              </div>

              {/* Upload button */}
              {mainImages.length < 20 && (
                <div
                  className="ap-img-upload"
                  onClick={() => !mainUploading && mainFileRef.current?.click()}
                  style={{ marginBottom: "12px" }}
                >
                  <input
                    ref={mainFileRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => handleMainImageUpload(e.target.files)}
                    style={{ display: "none" }}
                  />
                  <div className="ap-img-upload-icon">
                    {mainUploading ? (
                      <div className="ap-spinner" />
                    ) : (
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      >
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                    )}
                  </div>
                  <p className="ap-img-upload-title">
                    {mainUploading ? "Uploading..." : "Add More Images"}
                  </p>
                  <p className="ap-img-upload-sub">
                    {mainImages.length > 0
                      ? `${mainImages.length} / 20 images`
                      : "JPG, PNG, WEBP (Max 20 images)"}
                  </p>
                </div>
              )}

              {/* Images grid */}
              {mainImages.length > 0 ? (
                <div className="ap-img-previews">
                  {mainImages.map((url, i) => {
                    // Check karo yeh variant ki auto-synced image hai ya manually added
                    const isVariantImg = Object.values(
                      variantImageMapRef.current,
                    ).includes(url);
                    const variantName = isVariantImg
                      ? Object.entries(variantImageMapRef.current).find(
                          ([, v]) => v === url,
                        )?.[0]
                      : null;
                    return (
                      <div
                        key={i}
                        className="ap-img-thumb"
                        style={{ position: "relative" }}
                      >
                        <img src={url} alt={`Main ${i + 1}`} />
                        {/* Variant badge */}
                        {variantName && (
                          <div
                            style={{
                              position: "absolute",
                              bottom: "4px",
                              left: "4px",
                              background: "rgba(99,102,241,0.9)",
                              color: "#fff",
                              fontSize: "0.5rem",
                              fontFamily: "var(--ap-sans)",
                              fontWeight: 700,
                              padding: "2px 5px",
                              borderRadius: "4px",
                              letterSpacing: "0.05em",
                              maxWidth: "calc(100% - 8px)",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {variantName}
                          </div>
                        )}
                        <button
                          type="button"
                          className="ap-img-thumb-remove"
                          onClick={() => removeMainImage(i)}
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      </div>
                    );
                  })}
                  <div
                    className="ap-image-count"
                    style={{ width: "100%", marginTop: "4px" }}
                  >
                    {mainImages.length} / 20 images
                    {Object.keys(variantImageMapRef.current).length > 0 && (
                      <span
                        style={{
                          marginLeft: "8px",
                          color: "#6366f1",
                          fontSize: "0.65rem",
                        }}
                      >
                        ({Object.keys(variantImageMapRef.current).length}{" "}
                        auto-synced from variants)
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    padding: "24px",
                    textAlign: "center",
                    color: "#aaa",
                    fontFamily: "var(--ap-sans)",
                    fontSize: "0.78rem",
                    background: "rgba(0,0,0,0.02)",
                    borderRadius: "8px",
                    border: "1px dashed rgba(0,0,0,0.1)",
                  }}
                >
                  <p style={{ margin: 0 }}>Abhi koi image nahi hai.</p>
                  <p
                    style={{
                      margin: "4px 0 0",
                      fontSize: "0.68rem",
                      color: "#ccc",
                    }}
                  >
                    Variant image add karo ya upar se manually upload karo.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ─── Video Upload Card (Detailed Mode) ─── */}
          <div className="ap-card">
            <div className="ap-card-header">
              <div className="ap-card-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M22.54 6.42A2.78 2.78 0 0 0 20.7 4.55C19.12 4 12 4 12 4s-7.12 0-8.7.55A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.3 19.45C4.88 20 12 20 12 20s7.12 0 8.7-.55a2.78 2.78 0 0 0 1.84-1.87A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z" />
                  <polygon
                    points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02"
                    fill="currentColor"
                  />
                </svg>
              </div>
              <h3 className="ap-card-title">Product Video (Optional)</h3>
            </div>
            <div className="ap-card-body">
              <VideoUploader
                videoUrl={productVideo}
                onVideoChange={setProductVideo}
                onError={onError}
              />
            </div>
          </div>

          {/* Attributes */}
          <div className="ap-card">
            <div className="ap-card-header">
              <div className="ap-card-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
                </svg>
              </div>
              <h3 className="ap-card-title">
                Product Attributes (Each with 1 Image)
              </h3>
            </div>
            <div className="ap-card-body">
              <AttributeSelector
                label="Colors"
                type="color"
                values={colors}
                setValues={setColors}
                suggestions={COLOR_SUGGESTIONS}
                variants={colorVariants}
                setVariants={setColorVariants}
                onError={onError}
                currencyRate={currency.rate}
                currencyCode={currency.code}
                currencySymbol={currency.symbol}
                onVariantImageChange={handleVariantImageChange}
              />
              <AttributeSelector
                label="Sizes"
                type="size"
                values={sizes}
                setValues={setSizes}
                suggestions={SIZE_SUGGESTIONS}
                variants={sizeVariants}
                setVariants={setSizeVariants}
                onError={onError}
                currencyRate={currency.rate}
                currencyCode={currency.code}
                currencySymbol={currency.symbol}
                onVariantImageChange={handleVariantImageChange}
              />
              <AttributeSelector
                label="Materials"
                type="material"
                values={materials}
                setValues={setMaterials}
                suggestions={MATERIAL_SUGGESTIONS}
                variants={materialVariants}
                setVariants={setMaterialVariants}
                onError={onError}
                currencyRate={currency.rate}
                currencyCode={currency.code}
                currencySymbol={currency.symbol}
                onVariantImageChange={handleVariantImageChange}
              />
              <AttributeSelector
                label="Capacities"
                type="capacity"
                values={capacities}
                setValues={setCapacities}
                suggestions={CAPACITY_SUGGESTIONS}
                variants={capacityVariants}
                setVariants={setCapacityVariants}
                onError={onError}
                currencyRate={currency.rate}
                currencyCode={currency.code}
                currencySymbol={currency.symbol}
                onVariantImageChange={handleVariantImageChange}
              />
            </div>
          </div>

          {/* FAQs */}
          <div className="ap-card">
            <div className="ap-card-header">
              <div className="ap-card-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <h3 className="ap-card-title">FAQs</h3>
            </div>
            <div className="ap-card-body">
              <FAQBuilder faqs={faqs} setFaqs={setFaqs} />
            </div>
          </div>
        </div>

        {/* Right column — Summary */}
        <div className="ap-detailed-right">
          <div className="ap-card">
            <div className="ap-card-header">
              <div className="ap-card-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h3 className="ap-card-title">Summary</h3>
            </div>
            <div className="ap-card-body">
              {[
                ["Category", tab.category],
                ["Subcategory", tab.sub],
                ["Colors", colors.length > 0 ? colors.join(", ") : "—"],
                ["Sizes", sizes.length > 0 ? sizes.join(", ") : "—"],
                [
                  "Materials",
                  materials.length > 0 ? materials.join(", ") : "—",
                ],
                [
                  "Capacities",
                  capacities.length > 0 ? capacities.join(", ") : "—",
                ],
                ["Total Variants", totalVariants.toString()],
                ["Main Images", `${mainImages.length} / 20`],
                [
                  "Variant Images",
                  `${
                    Object.keys(variantImageMapRef.current).length
                  } auto-synced`,
                ],
                ["FAQs", `${faqs.length} added`],
                ["Video", productVideo ? "✅ Added" : "—"],
                ["Currency", currency.code],
              ].map(([k, v]) => (
                <div
                  key={k}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "0.5rem 0",
                    borderBottom: "1px solid rgba(218,165,32,0.1)",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--ap-sans)",
                      fontSize: "0.6rem",
                      fontWeight: 600,
                      letterSpacing: "0.15em",
                      textTransform: "uppercase",
                      color: "#999",
                    }}
                  >
                    {k}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--ap-serif)",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      color: "#8b6914",
                    }}
                  >
                    {v}
                  </span>
                </div>
              ))}
              <button
                type="submit"
                className="ap-submit-btn"
                disabled={isSubmitting}
                style={{
                  marginTop: "1rem",
                  opacity: isSubmitting ? 0.7 : 1,
                  width: "100%",
                }}
              >
                {isSubmitting ? (
                  <>
                    <div
                      className="ap-spinner"
                      style={{
                        width: "16px",
                        height: "16px",
                        marginRight: "8px",
                      }}
                    />
                    Saving {totalVariants} variant(s)...
                  </>
                ) : (
                  <>
                    Save Product with {totalVariants} Variant(s) in{" "}
                    {currency.symbol}{" "}
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      style={{ width: "14px", height: "14px" }}
                    >
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AddProduct() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(0);
  const [mode, setMode] = useState<Mode>("simple");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const { currency } = useCurrency();

  const addToast = (type: Toast["type"], title: string, msg: string) => {
    const id = Date.now();
    setToasts((p) => [...p, { id, type, title, msg }]);
    setTimeout(
      () =>
        setToasts((p) =>
          p.map((t) => (t.id === id ? { ...t, exiting: true } : t)),
        ),
      4000,
    );
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 4500);
  };

  const removeToast = (id: number) => {
    setToasts((p) => p.map((t) => (t.id === id ? { ...t, exiting: true } : t)));
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 350);
  };

  const handleModeChange = (newMode: Mode) => {
    if (newMode === mode) return;
    setToasts([]);
    setMode(newMode);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="ap-root">
      <div className="ap-ambient" aria-hidden="true" />
      <div className="ap-grain" aria-hidden="true" />
      <PanelNavbar />
      <div className="ap-content">
        <div className="ap-page-header">
          <p className="ap-eyebrow">
            <span className="ap-ey-line" /> Inventory Management -{" "}
            {currency.code} <span className="ap-ey-line" />
          </p>
          <h1 className="ap-page-title">
            Add <em>Product</em> in {currency.code}
          </h1>
          <p className="ap-page-sub">
            Choose mode: Simple images only or detailed variant management
            <br />
            <span style={{ fontSize: "0.7rem", color: "#8b6914" }}>
              💱 All prices will be saved in PKR (base) and converted to{" "}
              {currency.code} for display
            </span>
          </p>
        </div>

        <div className="ap-mode-buttons">
          <button
            type="button"
            className={`ap-mode-btn ${mode === "simple" ? "active" : ""}`}
            onClick={() => handleModeChange("simple")}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            Simple Mode
            <br />
            <span>Just product images</span>
          </button>
          <button
            type="button"
            className={`ap-mode-btn ${mode === "detailed" ? "active" : ""}`}
            onClick={() => handleModeChange("detailed")}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
            </svg>
            Detailed Mode
            <br />
            <span>
              Colors, sizes, materials, capacities with variant images
            </span>
          </button>
        </div>

        <div className="ap-tabs">
          {TABS.map((t, i) => (
            <button
              key={t.id}
              type="button"
              className={`ap-tab${activeTab === i ? " active" : ""}`}
              onClick={() => setActiveTab(i)}
            >
              <span className="ap-tab-label">{t.label}</span>
            </button>
          ))}
        </div>

        {mode === "simple" ? (
          <SimpleModeForm
            key={`simple-${mode}`}
            tab={TABS[activeTab]}
            onSuccess={() =>
              addToast(
                "success",
                "Product Saved",
                `${TABS[activeTab].sub} added successfully! Redirecting...`,
              )
            }
            onError={(msg) => addToast("error", "Error", msg)}
            router={router}
          />
        ) : (
          <DetailedModeForm
            key={`detailed-${mode}`}
            tab={TABS[activeTab]}
            onSuccess={() =>
              addToast(
                "success",
                "Product Saved",
                `${TABS[activeTab].sub} with variants added successfully! Redirecting...`,
              )
            }
            onError={(msg) => addToast("error", "Error", msg)}
            router={router}
          />
        )}
      </div>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
