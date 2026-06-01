"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, FreeMode } from "swiper/modules";
import type { Swiper as SwiperType } from "swiper";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/free-mode";
import "./ProductGallery.css";

interface ProductGalleryProps {
  images: string[];
  productName: string;
  mainImages?: string[];
}

export default function ProductGallery({
  images,
  productName,
  mainImages = [],
}: ProductGalleryProps) {
  // Build combined thumbnail list: variant images first, then main images, deduped
  const buildThumbnailList = useCallback((): string[] => {
    const seen = new Set<string>();
    const result: string[] = [];

    // 1. Selected variant images
    if (images && images.length > 0) {
      images.forEach((img) => {
        if (img && !seen.has(img)) {
          seen.add(img);
          result.push(img);
        }
      });
    }

    // 2. Main product-level images
    if (mainImages && mainImages.length > 0) {
      mainImages.forEach((img) => {
        if (img && !seen.has(img)) {
          seen.add(img);
          result.push(img);
        }
      });
    }

    return result;
  }, [images, mainImages]);

  const allThumbs = buildThumbnailList();

  const [activeIdx, setActiveIdx] = useState(0);
  const [imgEntering, setImgEntering] = useState(false);

  // Lightbox state
  const [lightbox, setLightbox] = useState(false);
  const [lbClosing, setLbClosing] = useState(false);
  const [lbZoom, setLbZoom] = useState(1);
  const [lbPan, setLbPan] = useState({ x: 0, y: 0 });
  const [lbDragging, setLbDragging] = useState(false);
  const [portalRoot, setPortalRoot] = useState<Element | null>(null);

  // Swiper refs
  const thumbSwiperRef = useRef<SwiperType | null>(null);
  const lbThumbSwiperRef = useRef<SwiperType | null>(null);

  // Swipe refs
  const mainSwipeStart = useRef<{ x: number; y: number } | null>(null);
  const lbDragStart = useRef<{
    x: number;
    y: number;
    px: number;
    py: number;
  } | null>(null);
  const lbTouchStart = useRef<{
    x: number;
    y: number;
    px: number;
    py: number;
  } | null>(null);
  const lbSwipeStart = useRef<{ x: number; y: number } | null>(null);

  const lightboxRef = useRef<HTMLDivElement>(null);
  const lbStageRef = useRef<HTMLDivElement>(null);
  const lbImgContainerRef = useRef<HTMLDivElement>(null);

  const imagesKey = JSON.stringify(images);
  useEffect(() => {
    setActiveIdx(0);
    setImgEntering(false);
    setTimeout(() => {
      thumbSwiperRef.current?.slideTo(0);
      lbThumbSwiperRef.current?.slideTo(0);
    }, 50);
  }, [imagesKey]);

  const switchImg = useCallback(
    (idx: number) => {
      if (idx === activeIdx || allThumbs.length === 0) return;
      setImgEntering(true);
      setTimeout(() => {
        setActiveIdx(idx);
        setImgEntering(false);
      }, 80);
      thumbSwiperRef.current?.slideTo(idx);
      lbThumbSwiperRef.current?.slideTo(idx);
    },
    [activeIdx, allThumbs.length],
  );

  const closeLightbox = useCallback(() => {
    setLbClosing(true);
    setTimeout(() => {
      setLightbox(false);
      setLbClosing(false);
      setLbZoom(1);
      setLbPan({ x: 0, y: 0 });
      setLbDragging(false);
      lbDragStart.current = null;
      lbTouchStart.current = null;
      lbSwipeStart.current = null;
      document.body.style.overflow = "";
    }, 320);
  }, []);

  const handleMainMouseDown = (e: React.MouseEvent) => {
    mainSwipeStart.current = { x: e.clientX, y: e.clientY };
  };
  const handleMainMouseUp = (e: React.MouseEvent) => {
    if (!mainSwipeStart.current) return;
    const deltaX = e.clientX - mainSwipeStart.current.x;
    if (Math.abs(deltaX) > 50 && allThumbs.length > 1) {
      if (deltaX > 0)
        switchImg((activeIdx - 1 + allThumbs.length) % allThumbs.length);
      else switchImg((activeIdx + 1) % allThumbs.length);
    }
    mainSwipeStart.current = null;
  };

  const handleMainTouchStart = (e: React.TouchEvent) => {
    mainSwipeStart.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  };
  const handleMainTouchEnd = (e: React.TouchEvent) => {
    if (!mainSwipeStart.current) return;
    const deltaX = e.changedTouches[0].clientX - mainSwipeStart.current.x;
    if (Math.abs(deltaX) > 50 && allThumbs.length > 1) {
      if (deltaX > 0)
        switchImg((activeIdx - 1 + allThumbs.length) % allThumbs.length);
      else switchImg((activeIdx + 1) % allThumbs.length);
    }
    mainSwipeStart.current = null;
  };

  const getConstrainedPan = (
    newPan: { x: number; y: number },
    zoom: number,
  ) => {
    if (!lbStageRef.current || !lbImgContainerRef.current) return newPan;
    const stageRect = lbStageRef.current.getBoundingClientRect();
    const imgEl = lbImgContainerRef.current.querySelector(
      "img",
    ) as HTMLImageElement;
    if (!imgEl) return newPan;
    const overflowX = Math.max(0, imgEl.offsetWidth * zoom - stageRect.width);
    const overflowY = Math.max(0, imgEl.offsetHeight * zoom - stageRect.height);
    const maxPanX = overflowX / 2;
    const maxPanY = overflowY / 2;
    return {
      x: Math.min(maxPanX, Math.max(-maxPanX, newPan.x)),
      y: Math.min(maxPanY, Math.max(-maxPanY, newPan.y)),
    };
  };

  const handleLbMouseDown = (e: React.MouseEvent) => {
    if (lbZoom > 1) {
      e.preventDefault();
      setLbDragging(true);
      lbDragStart.current = {
        x: e.clientX,
        y: e.clientY,
        px: lbPan.x,
        py: lbPan.y,
      };
    } else {
      lbSwipeStart.current = { x: e.clientX, y: e.clientY };
    }
  };
  const handleLbMouseMove = (e: React.MouseEvent) => {
    if (lbZoom > 1 && lbDragging && lbDragStart.current) {
      const newPan = {
        x: lbDragStart.current.px + (e.clientX - lbDragStart.current.x),
        y: lbDragStart.current.py + (e.clientY - lbDragStart.current.y),
      };
      setLbPan(getConstrainedPan(newPan, lbZoom));
    }
  };
  const handleLbMouseUp = (e: React.MouseEvent) => {
    if (lbZoom > 1) {
      setLbDragging(false);
      lbDragStart.current = null;
    } else if (lbSwipeStart.current) {
      const deltaX = e.clientX - lbSwipeStart.current.x;
      const deltaY = e.clientY - lbSwipeStart.current.y;
      if (deltaY > 80 && Math.abs(deltaY) > Math.abs(deltaX)) {
        closeLightbox();
      } else if (Math.abs(deltaX) > 50 && allThumbs.length > 1) {
        const newIdx =
          deltaX > 0
            ? (activeIdx - 1 + allThumbs.length) % allThumbs.length
            : (activeIdx + 1) % allThumbs.length;
        setActiveIdx(newIdx);
        lbThumbSwiperRef.current?.slideTo(newIdx);
        setLbZoom(1);
        setLbPan({ x: 0, y: 0 });
      }
      lbSwipeStart.current = null;
    }
  };

  const handleLbTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (lbZoom > 1) {
      lbTouchStart.current = {
        x: touch.clientX,
        y: touch.clientY,
        px: lbPan.x,
        py: lbPan.y,
      };
    } else {
      lbSwipeStart.current = { x: touch.clientX, y: touch.clientY };
    }
  };
  const handleLbTouchMove = (e: React.TouchEvent) => {
    if (lbZoom > 1 && lbTouchStart.current) {
      const touch = e.touches[0];
      setLbPan(
        getConstrainedPan(
          {
            x:
              lbTouchStart.current.px +
              (touch.clientX - lbTouchStart.current.x),
            y:
              lbTouchStart.current.py +
              (touch.clientY - lbTouchStart.current.y),
          },
          lbZoom,
        ),
      );
    } else if (lbSwipeStart.current && lbImgContainerRef.current) {
      const touch = e.touches[0];
      const deltaY = touch.clientY - lbSwipeStart.current.y;
      if (deltaY > 0) {
        lbImgContainerRef.current.style.transform = `translateY(${
          deltaY * 0.4
        }px) scale(${Math.max(0.85, 1 - deltaY * 0.001)})`;
        lbImgContainerRef.current.style.transition = "none";
        if (lightboxRef.current) {
          lightboxRef.current.style.background = `rgba(8,6,4,${Math.max(
            0.35,
            0.97 - deltaY * 0.003,
          )})`;
        }
      }
    }
  };
  const handleLbTouchEnd = (e: React.TouchEvent) => {
    if (lbZoom > 1) {
      lbTouchStart.current = null;
    } else if (lbSwipeStart.current) {
      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - lbSwipeStart.current.x;
      const deltaY = touch.clientY - lbSwipeStart.current.y;
      if (lbImgContainerRef.current) {
        lbImgContainerRef.current.style.transform = "";
        lbImgContainerRef.current.style.transition = "";
      }
      if (lightboxRef.current) lightboxRef.current.style.background = "";
      if (deltaY > 80 && Math.abs(deltaY) > Math.abs(deltaX)) {
        closeLightbox();
      } else if (Math.abs(deltaX) > 50 && allThumbs.length > 1) {
        const newIdx =
          deltaX > 0
            ? (activeIdx - 1 + allThumbs.length) % allThumbs.length
            : (activeIdx + 1) % allThumbs.length;
        setActiveIdx(newIdx);
        lbThumbSwiperRef.current?.slideTo(newIdx);
        setLbZoom(1);
        setLbPan({ x: 0, y: 0 });
      }
      lbSwipeStart.current = null;
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (lbZoom > 1) {
      setLbZoom(1);
      setLbPan({ x: 0, y: 0 });
    } else setLbZoom(2.5);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const delta = e.deltaY > 0 ? -0.25 : 0.25;
    const newZoom = Math.min(4, Math.max(1, lbZoom + delta));
    if (newZoom === 1) {
      setLbPan({ x: 0, y: 0 });
    } else {
      const sf = newZoom / lbZoom;
      setLbPan(
        getConstrainedPan({ x: lbPan.x * sf, y: lbPan.y * sf }, newZoom),
      );
    }
    setLbZoom(newZoom);
  };

  const handleLightboxBackdropClick = (e: React.MouseEvent) => {
    if (e.target === lightboxRef.current || e.target === lbStageRef.current) {
      closeLightbox();
    }
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!lightbox) return;
      if (e.key === "Escape") {
        closeLightbox();
        return;
      }
      if (e.key === "ArrowRight" && allThumbs.length > 0) {
        const ni = (activeIdx + 1) % allThumbs.length;
        setActiveIdx(ni);
        lbThumbSwiperRef.current?.slideTo(ni);
        setLbZoom(1);
        setLbPan({ x: 0, y: 0 });
      }
      if (e.key === "ArrowLeft" && allThumbs.length > 0) {
        const ni = (activeIdx - 1 + allThumbs.length) % allThumbs.length;
        setActiveIdx(ni);
        lbThumbSwiperRef.current?.slideTo(ni);
        setLbZoom(1);
        setLbPan({ x: 0, y: 0 });
      }
      if (e.key === "+" || e.key === "=")
        setLbZoom((z) => Math.min(4, z + 0.5));
      if (e.key === "-")
        setLbZoom((z) => {
          const nz = Math.max(1, z - 0.5);
          if (nz === 1) setLbPan({ x: 0, y: 0 });
          return nz;
        });
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightbox, allThumbs.length, activeIdx, closeLightbox]);

  useEffect(() => {
    if (lightbox) {
      setLbZoom(1);
      setLbPan({ x: 0, y: 0 });
    }
  }, [activeIdx, lightbox]);

  useEffect(() => {
    document.body.style.overflow = lightbox ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [lightbox]);

  useEffect(() => {
    setPortalRoot(document.body);
  }, []);

  const openLightbox = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLightbox(true);
    setTimeout(() => lbThumbSwiperRef.current?.slideTo(activeIdx), 80);
  };

  if (!allThumbs || allThumbs.length === 0) {
    return (
      <div className="pg-gallery">
        <div className="pg-main-img-wrap">
          <div className="pg-img-placeholder">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.8"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </div>
        </div>
      </div>
    );
  }

  const variantImgSet = new Set<string>(
    images && images.length > 0 ? images : [],
  );

  return (
    <>
      <div className="pg-gallery">
        {/* BIG MAIN IMAGE */}
        <div
          className="pg-swiper-wrap"
          onMouseDown={handleMainMouseDown}
          onMouseUp={handleMainMouseUp}
          onTouchStart={handleMainTouchStart}
          onTouchEnd={handleMainTouchEnd}
        >
          <div
            className="pg-main-img-wrap"
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = ((e.clientX - rect.left) / rect.width - 0.5) * 4;
              const y = ((e.clientY - rect.top) / rect.height - 0.5) * 4;
              const img = e.currentTarget.querySelector(
                "img",
              ) as HTMLImageElement;
              if (img)
                img.style.transform = `scale(1.04) translate(${x}px, ${y}px)`;
            }}
            onMouseLeave={(e) => {
              const img = e.currentTarget.querySelector(
                "img",
              ) as HTMLImageElement;
              if (img) img.style.transform = "";
            }}
          >
            <img
              src={allThumbs[activeIdx]}
              alt={productName}
              className={imgEntering ? "pg-img-entering" : ""}
              style={{
                transition: "transform 0.6s cubic-bezier(0.22,1,0.36,1)",
              }}
              draggable={false}
            />
            {allThumbs.length > 1 && (
              <div className="pg-img-counter">
                {activeIdx + 1} / {allThumbs.length}
              </div>
            )}
            {allThumbs.length > 1 && (
              <div className="pg-swipe-hint">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <polyline points="15 18 9 12 15 6" />
                  <polyline points="9 18 15 12 9 6" />
                </svg>
                Swipe to browse
              </div>
            )}
            <button
              className="pg-expand-btn"
              onClick={openLightbox}
              aria-label="View full image"
              title="Open fullscreen view"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <polyline points="15 3 21 3 21 9" />
                <polyline points="9 21 3 21 3 15" />
                <line x1="21" y1="3" x2="14" y2="10" />
                <line x1="3" y1="21" x2="10" y2="14" />
              </svg>
            </button>
          </div>

          {/* Prev / Next arrows on big image */}
          {allThumbs.length > 1 && (
            <>
              <button
                className="pg-swiper-arrow pg-swiper-prev"
                onClick={(e) => {
                  e.stopPropagation();
                  switchImg(
                    (activeIdx - 1 + allThumbs.length) % allThumbs.length,
                  );
                }}
                aria-label="Previous image"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <button
                className="pg-swiper-arrow pg-swiper-next"
                onClick={(e) => {
                  e.stopPropagation();
                  switchImg((activeIdx + 1) % allThumbs.length);
                }}
                aria-label="Next image"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </>
          )}
        </div>

        {/* THUMBNAIL STRIP - BELOW BIG IMAGE */}
        {allThumbs.length > 1 && (
          <div className="pg-thumbs-swiper-wrap">
            <button
              className="pg-thumb-nav pg-thumb-nav--prev"
              onClick={() => thumbSwiperRef.current?.slidePrev()}
              aria-label="Scroll thumbnails left"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>

            <Swiper
              modules={[Navigation, FreeMode]}
              spaceBetween={6}
              slidesPerView="auto"
              freeMode={{ enabled: true, momentum: true }}
              watchSlidesProgress={true}
              onSwiper={(swiper) => {
                thumbSwiperRef.current = swiper;
              }}
              className="pg-thumbs-swiper"
            >
              {allThumbs.map((src, idx) => {
                const isActive = idx === activeIdx;
                const isVariantImg = variantImgSet.has(src);
                const isFirstMainImg =
                  mainImages.length > 0 &&
                  src === mainImages[0] &&
                  !variantImgSet.has(src);
                const hasSeparator = isFirstMainImg && variantImgSet.size > 0;
                return (
                  <SwiperSlide
                    key={idx}
                    className={`pg-thumb-slide ${
                      hasSeparator ? "pg-thumb-slide--with-separator" : ""
                    }`}
                  >
                    {hasSeparator && (
                      <div className="pg-thumb-separator-label">Gallery</div>
                    )}
                    <button
                      className={`pg-thumb${isActive ? " active" : ""}${
                        isVariantImg ? " pg-thumb--variant" : ""
                      }`}
                      onClick={() => switchImg(idx)}
                      title={
                        isVariantImg ? "Variant image" : `Image ${idx + 1}`
                      }
                    >
                      <img
                        src={src}
                        alt={`${productName} ${idx + 1}`}
                        draggable={false}
                      />
                      {isVariantImg && (
                        <span className="pg-thumb-variant-dot" />
                      )}
                    </button>
                  </SwiperSlide>
                );
              })}
            </Swiper>

            <button
              className="pg-thumb-nav pg-thumb-nav--next"
              onClick={() => thumbSwiperRef.current?.slideNext()}
              aria-label="Scroll thumbnails right"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* LIGHTBOX PORTAL */}
      {lightbox &&
        allThumbs[activeIdx] &&
        portalRoot &&
        createPortal(
          <div
            className={`pg-lightbox${lbClosing ? " pg-lightbox--closing" : ""}`}
            ref={lightboxRef}
            onClick={handleLightboxBackdropClick}
          >
            <div className="pg-lb-header" onClick={(e) => e.stopPropagation()}>
              <div className="pg-lb-numbering">
                {allThumbs.map((_, i) => (
                  <button
                    key={i}
                    className={`pg-lb-dot${activeIdx === i ? " active" : ""}`}
                    onClick={() => {
                      setActiveIdx(i);
                      lbThumbSwiperRef.current?.slideTo(i);
                      setLbZoom(1);
                      setLbPan({ x: 0, y: 0 });
                    }}
                    aria-label={`Image ${i + 1}`}
                  />
                ))}
              </div>
              <span className="pg-lb-counter">
                {activeIdx + 1} / {allThumbs.length}
              </span>
              <div className="pg-lb-zoom-controls">
                <button
                  className="pg-lb-zoom-btn"
                  onClick={() =>
                    setLbZoom((z) => {
                      const nz = Math.max(1, z - 0.5);
                      if (nz === 1) setLbPan({ x: 0, y: 0 });
                      return nz;
                    })
                  }
                  aria-label="Zoom out"
                  title="Zoom Out (−)"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    <line x1="8" y1="11" x2="14" y2="11" />
                  </svg>
                </button>
                <span className="pg-lb-zoom-level">
                  {Math.round(lbZoom * 100)}%
                </span>
                <button
                  className="pg-lb-zoom-btn"
                  onClick={() => setLbZoom((z) => Math.min(4, z + 0.5))}
                  aria-label="Zoom in"
                  title="Zoom In (+)"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    <line x1="11" y1="8" x2="11" y2="14" />
                    <line x1="8" y1="11" x2="14" y2="11" />
                  </svg>
                </button>
              </div>
              <button
                className="pg-lightbox-close"
                onClick={closeLightbox}
                aria-label="Close lightbox"
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
              className="pg-lb-stage"
              ref={lbStageRef}
              onMouseDown={handleLbMouseDown}
              onMouseMove={handleLbMouseMove}
              onMouseUp={handleLbMouseUp}
              onMouseLeave={() => {
                setLbDragging(false);
                lbDragStart.current = null;
              }}
              onTouchStart={handleLbTouchStart}
              onTouchMove={handleLbTouchMove}
              onTouchEnd={handleLbTouchEnd}
              onDoubleClick={handleDoubleClick}
              onWheel={handleWheel}
              onClick={handleLightboxBackdropClick}
              style={{
                cursor:
                  lbZoom > 1 ? (lbDragging ? "grabbing" : "grab") : "zoom-in",
              }}
            >
              <div
                className="pg-lb-img-container"
                ref={lbImgContainerRef}
                onClick={(e) => e.stopPropagation()}
                style={{
                  transform: `scale(${lbZoom}) translate(${
                    lbPan.x / lbZoom
                  }px, ${lbPan.y / lbZoom}px)`,
                  transition: lbDragging
                    ? "none"
                    : "transform 0.35s cubic-bezier(0.22,1,0.36,1)",
                }}
              >
                <img
                  src={allThumbs[activeIdx]}
                  alt="Product zoom"
                  draggable={false}
                />
              </div>
            </div>

            {allThumbs.length > 1 && (
              <>
                <button
                  className="pg-lb-arrow pg-lb-arrow--prev"
                  onClick={(e) => {
                    e.stopPropagation();
                    const ni =
                      (activeIdx - 1 + allThumbs.length) % allThumbs.length;
                    setActiveIdx(ni);
                    lbThumbSwiperRef.current?.slideTo(ni);
                    setLbZoom(1);
                    setLbPan({ x: 0, y: 0 });
                  }}
                  aria-label="Previous image"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                </button>
                <button
                  className="pg-lb-arrow pg-lb-arrow--next"
                  onClick={(e) => {
                    e.stopPropagation();
                    const ni = (activeIdx + 1) % allThumbs.length;
                    setActiveIdx(ni);
                    lbThumbSwiperRef.current?.slideTo(ni);
                    setLbZoom(1);
                    setLbPan({ x: 0, y: 0 });
                  }}
                  aria-label="Next image"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              </>
            )}

            <div className="pg-lb-swipe-hint">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <polyline points="12 5 12 19" />
                <polyline points="19 12 12 19 5 12" />
              </svg>
              Swipe down to close
            </div>

            {allThumbs.length > 1 && (
              <div
                className="pg-lb-thumbs-wrap"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  className="pg-lb-thumb-nav pg-lb-thumb-nav--prev"
                  onClick={() => lbThumbSwiperRef.current?.slidePrev()}
                  aria-label="Previous thumbnails"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                </button>

                <Swiper
                  modules={[Navigation, FreeMode]}
                  spaceBetween={6}
                  slidesPerView="auto"
                  freeMode={{ enabled: true, momentum: true }}
                  watchSlidesProgress={true}
                  onSwiper={(swiper) => {
                    lbThumbSwiperRef.current = swiper;
                  }}
                  className="pg-lb-thumbs-swiper"
                >
                  {allThumbs.map((src, i) => {
                    const isVariantImgLb = variantImgSet.has(src);
                    return (
                      <SwiperSlide key={i} className="pg-lb-thumb-slide">
                        <button
                          className={`pg-lb-thumb${
                            activeIdx === i ? " active" : ""
                          }${isVariantImgLb ? " pg-lb-thumb--variant" : ""}`}
                          onClick={() => {
                            setActiveIdx(i);
                            lbThumbSwiperRef.current?.slideTo(i);
                            setLbZoom(1);
                            setLbPan({ x: 0, y: 0 });
                          }}
                        >
                          <img src={src} alt="" draggable={false} />
                          <span className="pg-lb-thumb-num">{i + 1}</span>
                          {isVariantImgLb && (
                            <span className="pg-thumb-variant-dot pg-lb-variant-dot" />
                          )}
                        </button>
                      </SwiperSlide>
                    );
                  })}
                </Swiper>

                <button
                  className="pg-lb-thumb-nav pg-lb-thumb-nav--next"
                  onClick={() => lbThumbSwiperRef.current?.slideNext()}
                  aria-label="Next thumbnails"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              </div>
            )}
          </div>,
          portalRoot,
        )}
    </>
  );
}
