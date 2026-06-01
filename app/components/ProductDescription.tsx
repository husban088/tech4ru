"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import RichTextEditor from "./RichTextEditor";
import { uploadToCloudinary } from "@/lib/cloudinary";

interface ProductDescriptionProps {
  value: string;
  onChange: (value: string, images: string[]) => void;
  existingImages?: string[];
  maxImages?: number;
}

export default function ProductDescription({
  value,
  onChange,
  existingImages = [],
  maxImages = 20,
}: ProductDescriptionProps) {
  const [description, setDescription] = useState(value);
  const [descriptionImages, setDescriptionImages] =
    useState<string[]>(existingImages);
  const [uploading, setUploading] = useState(false);
  const editorRef = useRef<any>(null);
  const scrollLockRef = useRef(false);
  const lastScrollYRef = useRef(0);

  useEffect(() => {
    setDescription(value);
  }, [value]);

  useEffect(() => {
    setDescriptionImages(existingImages);
  }, [existingImages]);

  const lockScroll = useCallback(() => {
    if (!scrollLockRef.current) {
      lastScrollYRef.current = window.scrollY;
      scrollLockRef.current = true;
    }
  }, []);

  const restoreScroll = useCallback(() => {
    if (scrollLockRef.current) {
      window.scrollTo({ top: lastScrollYRef.current, behavior: "instant" });
      scrollLockRef.current = false;
    }
  }, []);

  const handleDescriptionChange = useCallback(
    (newValue: string) => {
      lockScroll();
      setDescription(newValue);
      onChange(newValue, descriptionImages);
      requestAnimationFrame(() => restoreScroll());
    },
    [descriptionImages, onChange, lockScroll, restoreScroll]
  );

  // ✅ FIX: insertImageCallback ko KABHI call nahi karte
  // Image sirf gallery mein jayegi, Quill mein nahi
  const handleImageUpload = useCallback(
    async (file: File, _insertImageCallback: (url: string) => void) => {
      if (descriptionImages.length >= maxImages) {
        alert(`Maximum ${maxImages} images allowed in description`);
        return false;
      }

      const savedScrollY = window.scrollY;
      setUploading(true);

      try {
        const url = await uploadToCloudinary(file);

        setDescriptionImages((prev) => {
          const updated = [...prev, url];
          onChange(description, updated);
          return updated;
        });

        // ✅ insertImageCallback ko NAHI call kiya — image Quill mein nahi jayegi
        setUploading(false);

        setTimeout(() => {
          window.scrollTo({ top: savedScrollY, behavior: "instant" });
        }, 10);

        return true;
      } catch (error) {
        console.error("Image upload failed:", error);
        alert("Failed to upload image");
        setUploading(false);
        window.scrollTo({ top: savedScrollY, behavior: "instant" });
        return false;
      }
    },
    [descriptionImages, maxImages, onChange, description]
  );

  const removeDescriptionImage = useCallback(
    (index: number) => {
      const savedScrollY = window.scrollY;
      const updatedImages = descriptionImages.filter((_, i) => i !== index);
      setDescriptionImages(updatedImages);
      onChange(description, updatedImages);
      setTimeout(() => {
        window.scrollTo({ top: savedScrollY, behavior: "instant" });
      }, 10);
    },
    [descriptionImages, description, onChange]
  );

  return (
    <div className="ap-description-editor">
      <div className="ap-description-header">
        <label className="ap-label">
          Product Description
          <span className="ap-label-desc">
            (Rich text — add images below, max {maxImages})
          </span>
        </label>
      </div>

      <RichTextEditor
        value={description}
        onChange={handleDescriptionChange}
        placeholder="Write detailed product description here... Use toolbar to format text, add bullet points."
        onImageUpload={handleImageUpload}
        maxImages={maxImages}
        currentImageCount={descriptionImages.length}
        editorRef={editorRef}
      />

      {/* ✅ Gallery — images sirf yahan dikhti hain, Quill mein nahi */}
      {descriptionImages.length > 0 && (
        <div className="ap-description-image-gallery">
          <p className="ap-gallery-title">
            📷 Description Images ({descriptionImages.length}/{maxImages})
          </p>
          <div className="ap-gallery-grid">
            {descriptionImages.map((imgUrl, idx) => (
              <div key={idx} className="ap-gallery-item">
                <img src={imgUrl} alt={`Description image ${idx + 1}`} />
                <button
                  type="button"
                  className="ap-gallery-remove"
                  onClick={() => removeDescriptionImage(idx)}
                  title="Remove image"
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
          </div>
        </div>
      )}

      {uploading && (
        <div className="ap-upload-progress">
          <div className="ap-spinner-small" />
          <span>Uploading image to gallery...</span>
        </div>
      )}

      <style jsx>{`
        .ap-description-editor {
          width: 100%;
        }
        .ap-description-header {
          margin-bottom: 0.75rem;
        }
        .ap-label {
          font-family: var(--ap-sans);
          font-size: 0.72rem;
          font-weight: 600;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #8b6914;
        }
        .ap-label-desc {
          margin-left: 0.5rem;
          font-size: 0.55rem;
          font-weight: 400;
          color: #666;
          text-transform: none;
          letter-spacing: normal;
        }
        .ap-description-image-gallery {
          margin-top: 1rem;
          padding: 0.75rem;
          background: rgba(218, 165, 32, 0.04);
          border-radius: 12px;
          border: 1px solid rgba(218, 165, 32, 0.1);
        }
        .ap-gallery-title {
          font-family: var(--ap-sans);
          font-size: 0.6rem;
          font-weight: 600;
          color: #8b6914;
          margin: 0 0 0.75rem 0;
        }
        .ap-gallery-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
        }
        .ap-gallery-item {
          position: relative;
          width: 80px;
          height: 80px;
          border-radius: 8px;
          overflow: hidden;
          border: 1px solid rgba(218, 165, 32, 0.2);
          background: #ffffff;
          flex-shrink: 0;
        }
        .ap-gallery-item img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .ap-gallery-remove {
          position: absolute;
          top: 4px;
          right: 4px;
          width: 20px;
          height: 20px;
          background: rgba(0, 0, 0, 0.7);
          border: none;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ef4444;
          transition: all 0.2s;
          z-index: 10;
        }
        .ap-gallery-remove:hover {
          background: #ef4444;
          color: white;
          transform: scale(1.1);
        }
        .ap-gallery-remove svg {
          width: 10px;
          height: 10px;
        }
        .ap-upload-progress {
          margin-top: 0.5rem;
          padding: 0.5rem;
          background: rgba(218, 165, 32, 0.08);
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-family: var(--ap-sans);
          font-size: 0.6rem;
          color: #8b6914;
        }
        .ap-spinner-small {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(218, 165, 32, 0.2);
          border-top-color: #daa520;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
