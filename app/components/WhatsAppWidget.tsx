"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import "./whatsapp-widget.css";

export default function WhatsAppWidget() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 300);
    return () => clearTimeout(timer);
  }, []);

  const handleClick = () => {
    window.open("https://wa.me/4915782101282", "_blank");
  };

  return (
    <div
      className={`wa-widget ${isVisible ? "wa-visible" : ""}`}
      onClick={handleClick}
    >
      {/* Pulse Rings */}
      <span className="wa-pulse-ring" />
      <span className="wa-pulse-ring wa-pulse-ring-delayed" />

      {/* WhatsApp Icon Button */}
      <button className="wa-button" aria-label="Chat on WhatsApp">
        <div className="wa-image-container">
          <img
            src="/whatlogo.avif"
            alt="WhatsApp"
            className="wa-icon-img"
            width={72}
            height={72}
          />
        </div>
        <span className="wa-badge">24/7</span>
      </button>

      {/* Simple Tooltip on Hover */}
      <div className="wa-tooltip">
        <span>Chat with us on WhatsApp</span>
      </div>
    </div>
  );
}
