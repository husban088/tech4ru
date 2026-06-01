"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import "./DescriptionModal.css"; // Import the separate CSS file

interface DescriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  description: string;
  productName: string;
  images?: string[]; // Images from description_images column
  variantName?: string; // Optional variant name (e.g., "Black", "Large")
}

export default function DescriptionModal({
  isOpen,
  onClose,
  description,
  productName,
  images: externalImages = [],
  variantName,
}: DescriptionModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [allImages, setAllImages] = useState<string[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showFullImageModal, setShowFullImageModal] = useState(false);
  const [cleanDescription, setCleanDescription] = useState("");

  // Extract images from HTML description and merge with external images
  const extractContent = useCallback(
    (html: string, externalImgList: string[]) => {
      if (!html && externalImgList.length === 0) {
        return {
          images: [],
          cleanHtml: "<p>No detailed description available.</p>",
        };
      }

      // Create temp div to parse HTML
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = html || "";

      // Extract image URLs from HTML
      const imgElements = tempDiv.querySelectorAll("img");
      const htmlImageUrls: string[] = [];
      imgElements.forEach((img) => {
        const src = img.getAttribute("src");
        if (src && !htmlImageUrls.includes(src)) {
          htmlImageUrls.push(src);
        }
      });

      // Remove images from HTML for text display
      imgElements.forEach((img) => img.remove());

      // Combine HTML images with external images (no duplicates)
      const combinedImages = [...htmlImageUrls];
      externalImgList.forEach((img) => {
        if (!combinedImages.includes(img)) {
          combinedImages.push(img);
        }
      });

      // Get clean HTML
      const cleanHtml =
        tempDiv.innerHTML || "<p>No detailed description available.</p>";

      return {
        images: combinedImages,
        cleanHtml: cleanHtml,
      };
    },
    []
  );

  // Update content when description or externalImages change
  useEffect(() => {
    if (isOpen) {
      const { images: extractedImages, cleanHtml } = extractContent(
        description,
        externalImages
      );
      setAllImages(extractedImages);
      setCleanDescription(cleanHtml);
      console.log(
        "🖼️ DescriptionModal - Extracted images:",
        extractedImages.length
      );
    }
  }, [description, externalImages, extractContent, isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(e.target as Node) &&
        isOpen
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      setIsAnimating(true);
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen && !isAnimating) return null;

  // Handle full image modal
  const openFullImage = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    setShowFullImageModal(true);
  };

  // Get display name for modal title
  const displayName = variantName
    ? `${productName} (${variantName})`
    : productName;

  // Render images in rows (responsive grid)
  const renderImages = () => {
    if (allImages.length === 0) {
      return (
        <div className="dm-no-images">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            style={{ width: 32, height: 32, marginBottom: 8, opacity: 0.5 }}
          >
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
          <p>No images available for this product.</p>
        </div>
      );
    }

    return (
      <div className="dm-images-section">
        <div className="dm-section-header">
          <div className="dm-section-icon">
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
          <h3 className="dm-section-title">Product Images</h3>
          <span className="dm-section-count">
            {allImages.length} image{allImages.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="dm-images-grid">
          {allImages.map((img, idx) => (
            <div
              key={idx}
              className="dm-image-card"
              onClick={() => openFullImage(img)}
            >
              <div className="dm-image-wrapper">
                <img
                  src={img}
                  alt={`Product image ${idx + 1}`}
                  loading="lazy"
                  onError={(e) => {
                    console.error("Failed to load image:", img);
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
                <div className="dm-image-overlay">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                  </svg>
                  <span>Click to enlarge</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Main Modal Overlay */}
      <div className={`dm-overlay ${isOpen ? "open" : ""}`} onClick={onClose} />
      <div
        className={`dm-modal-wrapper ${isOpen ? "open" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dm-modal" ref={modalRef}>
          <div className="dm-modal-header">
            <div className="dm-modal-title-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M4 6h16M4 12h16M4 18h16" />
                <path d="M8 6v12" />
                <path d="M16 6v12" />
              </svg>
            </div>
            <div className="dm-modal-title">
              <h2>{displayName}</h2>
              <p className="dm-modal-subtitle">
                {variantName ? "Variant Description" : "Product Description"}
              </p>
            </div>
            <button className="dm-modal-close" onClick={onClose}>
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

          <div className="dm-modal-body">
            {/* Description Text Section */}
            <div className="dm-description-section">
              <div className="dm-section-header">
                <div className="dm-section-icon">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <path d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </div>
                <h3 className="dm-section-title">Description</h3>
              </div>
              <div
                className="dm-description-content"
                dangerouslySetInnerHTML={{ __html: cleanDescription }}
              />
            </div>

            {/* Images Section - Shows images from description_images */}
            {renderImages()}
          </div>

          <div className="dm-modal-footer">
            <button className="dm-footer-btn" onClick={onClose}>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Full Image Modal for Enlarged View */}
      {showFullImageModal && selectedImage && (
        <>
          <div
            className="dm-full-overlay"
            onClick={() => setShowFullImageModal(false)}
          />
          <div className="dm-full-modal">
            <button
              className="dm-full-close"
              onClick={() => setShowFullImageModal(false)}
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
            <img src={selectedImage} alt="Full size preview" />
          </div>
        </>
      )}
    </>
  );
}
