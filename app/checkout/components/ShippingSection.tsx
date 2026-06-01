"use client";

import React from "react";
import { useCurrency } from "@/app/context/CurrencyContext";
import "./ShippingSection.css";

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  apartment: string;
  city: string;
  zip: string;
  country: string;
  state: string;
  cardNumber: string;
  cardName: string;
  expiry: string;
  cvv: string;
}

interface ShippingSectionProps {
  form: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    apartment: string;
    city: string;
    zip: string;
    country: string;
    state: string;
  };
  setFormField: (
    key: keyof FormData,
  ) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  getFieldError: (field: keyof FormData) => string | undefined;
  handleBlur: (field: keyof FormData) => void;
  focused: string | null;
  setFocused: (field: string | null) => void;
  selectedFlag?: string;
  selectedCountryCode?: string;
  phoneExample?: string;
  selectedCountry?: string;
  onCountryChange?: (countryCode: string) => void;
}

// Australian states with abbreviations and full names
const AUSTRALIAN_STATES = [
  { value: "NSW", label: "New South Wales", abbr: "NSW" },
  { value: "VIC", label: "Victoria", abbr: "VIC" },
  { value: "QLD", label: "Queensland", abbr: "QLD" },
  { value: "WA", label: "Western Australia", abbr: "WA" },
  { value: "SA", label: "South Australia", abbr: "SA" },
  { value: "TAS", label: "Tasmania", abbr: "TAS" },
  { value: "ACT", label: "Australian Capital Territory", abbr: "ACT" },
  { value: "NT", label: "Northern Territory", abbr: "NT" },
];

export default function ShippingSection({
  form,
  setFormField,
  getFieldError,
  handleBlur,
  focused,
  setFocused,
}: ShippingSectionProps) {
  const { currency } = useCurrency();

  const phoneMap: Record<
    string,
    { code: string; flag: string; example: string; name: string }
  > = {
    PKR: { code: "+92", flag: "🇵🇰", example: "3001234567", name: "Pakistan" },
    USD: {
      code: "+1",
      flag: "🇺🇸",
      example: "2125551234",
      name: "United States",
    },
    GBP: {
      code: "+44",
      flag: "🇬🇧",
      example: "7123456789",
      name: "United Kingdom",
    },
    EUR: { code: "+49", flag: "🇪🇺", example: "15123456789", name: "Europe" },
    AUD: { code: "+61", flag: "🇦🇺", example: "412345678", name: "Australia" },
    CAD: { code: "+1", flag: "🇨🇦", example: "4165551234", name: "Canada" },
    AED: { code: "+971", flag: "🇦🇪", example: "501234567", name: "UAE" },
    SAR: {
      code: "+966",
      flag: "🇸🇦",
      example: "501234567",
      name: "Saudi Arabia",
    },
    INR: { code: "+91", flag: "🇮🇳", example: "9876543210", name: "India" },
  };

  const phoneInfo = phoneMap[currency.code] || phoneMap["USD"];
  const isAustralia = currency.code === "AUD";

  // ✅ Country-specific placeholders — currency se detect hota hai
  const placeholderMap: Record<
    string,
    {
      firstName: string;
      lastName: string;
      city: string;
      zip: string;
      address: string;
      apartment: string;
    }
  > = {
    PKR: {
      firstName: "Ali",
      lastName: "Khan",
      city: "Lahore",
      zip: "54000",
      address: "House 12, Street 5, Gulberg",
      apartment: "Block B, Flat 3",
    },
    USD: {
      firstName: "John",
      lastName: "Doe",
      city: "New York",
      zip: "10001",
      address: "123 Main Street",
      apartment: "Apt 4B",
    },
    GBP: {
      firstName: "James",
      lastName: "Smith",
      city: "London",
      zip: "SW1A 1AA",
      address: "10 Downing Street",
      apartment: "Flat 2A",
    },
    EUR: {
      firstName: "Lukas",
      lastName: "Müller",
      city: "Berlin",
      zip: "10115",
      address: "Unter den Linden 5",
      apartment: "Wohnung 3",
    },
    AUD: {
      firstName: "Liam",
      lastName: "Wilson",
      city: "Sydney",
      zip: "2000",
      address: "42 George Street",
      apartment: "Unit 7",
    },
    CAD: {
      firstName: "Ethan",
      lastName: "Brown",
      city: "Toronto",
      zip: "M5V 2T6",
      address: "100 King Street West",
      apartment: "Suite 200",
    },
    AED: {
      firstName: "Ahmed",
      lastName: "Al Maktoum",
      city: "Dubai",
      zip: "00000",
      address: "Sheikh Zayed Road, Business Bay",
      apartment: "Office 15, Tower 2",
    },
    SAR: {
      firstName: "Mohammed",
      lastName: "Al Saud",
      city: "Riyadh",
      zip: "12271",
      address: "King Fahd Road, Al Olaya",
      apartment: "Floor 3, Building A",
    },
    INR: {
      firstName: "Arjun",
      lastName: "Sharma",
      city: "Mumbai",
      zip: "400001",
      address: "14 MG Road, Colaba",
      apartment: "Flat 6C",
    },
  };

  const ph = placeholderMap[currency.code] || placeholderMap["USD"];

  const isFieldFilled = (value: string) => value.trim().length > 0;

  // Get selected state label for display
  const getSelectedStateLabel = () => {
    const state = AUSTRALIAN_STATES.find((s) => s.value === form.state);
    return state?.label || "";
  };

  return (
    <div className="ss-shipping-section">
      <h2 className="ss-section-title">
        <em>01.</em> Shipping Information
      </h2>

      <div className="ss-fields-grid">
        {/* First Name */}
        <div
          className={`ss-field ${
            focused === "firstName" ? "ss-field--focused" : ""
          } ${isFieldFilled(form.firstName) ? "ss-field--filled" : ""} ${
            getFieldError("firstName") ? "ss-field--error" : ""
          }`}
        >
          <label className="ss-label">First Name *</label>
          <div className="ss-input-wrap">
            <input
              type="text"
              className="ss-input"
              placeholder={ph.firstName}
              value={form.firstName}
              onChange={setFormField("firstName")}
              onFocus={() => setFocused("firstName")}
              onBlur={() => {
                setFocused(null);
                handleBlur("firstName");
              }}
            />
          </div>
          <div className="ss-field-line" />
          {getFieldError("firstName") && (
            <span className="ss-error-text">{getFieldError("firstName")}</span>
          )}
        </div>

        {/* Last Name */}
        <div
          className={`ss-field ${
            focused === "lastName" ? "ss-field--focused" : ""
          } ${isFieldFilled(form.lastName) ? "ss-field--filled" : ""} ${
            getFieldError("lastName") ? "ss-field--error" : ""
          }`}
        >
          <label className="ss-label">Last Name *</label>
          <div className="ss-input-wrap">
            <input
              type="text"
              className="ss-input"
              placeholder={ph.lastName}
              value={form.lastName}
              onChange={setFormField("lastName")}
              onFocus={() => setFocused("lastName")}
              onBlur={() => {
                setFocused(null);
                handleBlur("lastName");
              }}
            />
          </div>
          <div className="ss-field-line" />
          {getFieldError("lastName") && (
            <span className="ss-error-text">{getFieldError("lastName")}</span>
          )}
        </div>

        {/* Email - Full width */}
        <div
          className={`ss-field ss-field--full ${
            focused === "email" ? "ss-field--focused" : ""
          } ${isFieldFilled(form.email) ? "ss-field--filled" : ""} ${
            getFieldError("email") ? "ss-field--error" : ""
          }`}
        >
          <label className="ss-label">Email Address *</label>
          <div className="ss-input-wrap">
            <input
              type="email"
              className="ss-input"
              placeholder="john@example.com"
              value={form.email}
              onChange={setFormField("email")}
              onFocus={() => setFocused("email")}
              onBlur={() => {
                setFocused(null);
                handleBlur("email");
              }}
            />
          </div>
          <div className="ss-field-line" />
          {getFieldError("email") && (
            <span className="ss-error-text">{getFieldError("email")}</span>
          )}
        </div>

        {/* Phone Number - Full width */}
        <div
          className={`ss-field ss-field--full ${
            focused === "phone" ? "ss-field--focused" : ""
          } ${isFieldFilled(form.phone) ? "ss-field--filled" : ""} ${
            getFieldError("phone") ? "ss-field--error" : ""
          }`}
        >
          <label className="ss-label">Phone Number *</label>
          <div className="ss-input-wrap">
            <div className="ss-phone-prefix">
              <span className="ss-phone-flag">{phoneInfo.flag}</span>
              <span className="ss-phone-code">{phoneInfo.code}</span>
            </div>
            <input
              type="tel"
              className="ss-input ss-input-with-prefix"
              placeholder={phoneInfo.example}
              value={form.phone}
              onChange={setFormField("phone")}
              onFocus={() => setFocused("phone")}
              onBlur={() => {
                setFocused(null);
                handleBlur("phone");
              }}
            />
          </div>
          <div className="ss-field-line" />
          {getFieldError("phone") && (
            <span className="ss-error-text">{getFieldError("phone")}</span>
          )}
          <span className="ss-hint-text">
            We'll send order updates via WhatsApp to this number
          </span>
        </div>

        {/* Address - Full width */}
        <div
          className={`ss-field ss-field--full ${
            focused === "address" ? "ss-field--focused" : ""
          } ${isFieldFilled(form.address) ? "ss-field--filled" : ""} ${
            getFieldError("address") ? "ss-field--error" : ""
          }`}
        >
          <label className="ss-label">Street Address *</label>
          <div className="ss-input-wrap">
            <input
              type="text"
              className="ss-input"
              placeholder={ph.address}
              value={form.address}
              onChange={setFormField("address")}
              onFocus={() => setFocused("address")}
              onBlur={() => {
                setFocused(null);
                handleBlur("address");
              }}
            />
          </div>
          <div className="ss-field-line" />
          {getFieldError("address") && (
            <span className="ss-error-text">{getFieldError("address")}</span>
          )}
        </div>

        {/* Apartment (Optional) - Full width */}
        <div
          className={`ss-field ss-field--full ${
            focused === "apartment" ? "ss-field--focused" : ""
          } ${isFieldFilled(form.apartment) ? "ss-field--filled" : ""}`}
        >
          <label className="ss-label">Apartment, Suite, etc. (Optional)</label>
          <div className="ss-input-wrap">
            <input
              type="text"
              className="ss-input"
              placeholder={ph.apartment}
              value={form.apartment}
              onChange={setFormField("apartment")}
              onFocus={() => setFocused("apartment")}
              onBlur={() => setFocused(null)}
            />
          </div>
          <div className="ss-field-line" />
        </div>

        {/* City */}
        <div
          className={`ss-field ${
            !isAustralia ? "ss-field--half" : ""
          } ${focused === "city" ? "ss-field--focused" : ""} ${
            isFieldFilled(form.city) ? "ss-field--filled" : ""
          } ${getFieldError("city") ? "ss-field--error" : ""}`}
        >
          <label className="ss-label">City / Suburb *</label>
          <div className="ss-input-wrap">
            <input
              type="text"
              className="ss-input"
              placeholder={ph.city}
              value={form.city}
              onChange={setFormField("city")}
              onFocus={() => setFocused("city")}
              onBlur={() => {
                setFocused(null);
                handleBlur("city");
              }}
            />
          </div>
          <div className="ss-field-line" />
          {getFieldError("city") && (
            <span className="ss-error-text">{getFieldError("city")}</span>
          )}
        </div>

        {/* Australian State Dropdown - Luxury Design */}
        {isAustralia && (
          <div
            className={`ss-field ss-state-field ${
              focused === "state" ? "ss-field--focused" : ""
            } ${isFieldFilled(form.state) ? "ss-field--filled" : ""} ${
              getFieldError("state") ? "ss-field--error" : ""
            }`}
          >
            <label className="ss-label">
              State / Territory <span className="ss-label-star">*</span>
            </label>
            <div className="ss-input-wrap ss-select-wrap">
              <select
                className="ss-input ss-select"
                value={form.state}
                onChange={setFormField("state")}
                onFocus={() => setFocused("state")}
                onBlur={() => {
                  setFocused(null);
                  handleBlur("state");
                }}
              >
                <option value="" disabled>
                  Select your state or territory
                </option>
                {AUSTRALIAN_STATES.map((state) => (
                  <option key={state.value} value={state.value}>
                    {state.label}
                  </option>
                ))}
              </select>
              <div className="ss-select-arrow" aria-hidden="true">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 12 12"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M2.5 4L6 7.5L9.5 4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div className="ss-select-glow" />
            </div>
            <div className="ss-field-line" />
            {getFieldError("state") && (
              <span className="ss-error-text">{getFieldError("state")}</span>
            )}
            {form.state && !getFieldError("state") && (
              <span className="ss-hint-text ss-hint-success">
                ✓ {getSelectedStateLabel()} selected
              </span>
            )}
          </div>
        )}

        {/* ZIP / Postcode */}
        <div
          className={`ss-field ${
            !isAustralia ? "ss-field--half" : ""
          } ${focused === "zip" ? "ss-field--focused" : ""} ${
            isFieldFilled(form.zip) ? "ss-field--filled" : ""
          } ${getFieldError("zip") ? "ss-field--error" : ""}`}
        >
          <label className="ss-label">
            {isAustralia ? "Postcode *" : "ZIP Code *"}
          </label>
          <div className="ss-input-wrap">
            <input
              type="text"
              className="ss-input"
              placeholder={ph.zip}
              value={form.zip}
              onChange={setFormField("zip")}
              onFocus={() => setFocused("zip")}
              onBlur={() => {
                setFocused(null);
                handleBlur("zip");
              }}
            />
          </div>
          <div className="ss-field-line" />
          {getFieldError("zip") && (
            <span className="ss-error-text">{getFieldError("zip")}</span>
          )}
        </div>
      </div>
    </div>
  );
}
