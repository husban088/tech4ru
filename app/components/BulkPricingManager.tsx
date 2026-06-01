// app/panel/components/BulkPricingManager.tsx
"use client";

import { useState } from "react";
import { useCurrency } from "@/app/context/CurrencyContext";

export type BulkPricingTier = {
  id?: string;
  variant_id: string;
  min_quantity: number;
  max_quantity: number;
  tier_price: number; // ALWAYS stored in PKR (total price for min_quantity pieces)
  discount_percentage: number | null;
  discount_price: number | null;
  created_at?: string;
  updated_at?: string;
};

type BulkPricingManagerProps = {
  variantId?: string;
  unitPrice: number; // Sale price per piece — ALWAYS in PKR (base currency, as stored in DB)
  tiers: BulkPricingTier[];
  onTiersChange: (tiers: BulkPricingTier[]) => void;
  onError: (msg: string) => void;
};

const MAX_QUANTITY = 100;

export function BulkPricingManager({
  unitPrice,
  tiers,
  onTiersChange,
  onError,
}: BulkPricingManagerProps) {
  const { currency, formatPrice: ctxFormatPrice } = useCurrency();
  const currencyCode = currency.code;

  const [showAddForm, setShowAddForm] = useState(false);
  const [newTierMin, setNewTierMin] = useState(2);
  const [newTierMax, setNewTierMax] = useState(2);
  const [newTierDiscount, setNewTierDiscount] = useState(0);

  // ─── Helpers ────────────────────────────────────────────────────────────────

  /**
   * ALL prices are stored and calculated in PKR.
   * unitPrice prop MUST be in PKR (raw DB price).
   * Display conversion happens only in fmt() via the currency context.
   *
   * tier_price in DB = total PKR for min_quantity pieces after discount.
   * Formula: unitPricePKR × qty × (1 - discount/100)
   *
   * Example: unitPrice=4000 PKR, qty=2, discount=5%
   *   → 4000 * 2 * 0.95 = 7600 PKR (stored in DB)
   *   → formatPrice(7600) → displayed in user's currency
   */

  /**
   * Calculate total PKR price for qty pieces at discountPct.
   * Always returns PKR — never depends on display currency.
   */
  const calcTotalPKR = (qty: number, discountPct: number): number => {
    return Number((unitPrice * qty * (1 - discountPct / 100)).toFixed(2));
  };

  // Format a PKR amount in display currency using currency context
  const fmt = (pkrAmount: number): string => ctxFormatPrice(pkrAmount);

  // ─── Build a tier object ────────────────────────────────────────────────────
  /**
   * tier_price = total PKR for min_quantity pieces after discount.
   * This is ALWAYS PKR regardless of admin's display currency.
   */
  const buildTier = (
    minQty: number,
    maxQty: number,
    discountPct: number,
  ): BulkPricingTier => {
    const totalPKR = calcTotalPKR(minQty, discountPct);
    return {
      variant_id: "",
      min_quantity: minQty,
      max_quantity: maxQty,
      tier_price: totalPKR,
      discount_percentage: discountPct,
      discount_price: totalPKR,
    };
  };

  // ─── Get display values for a saved tier ───────────────────────────────────
  /**
   * tier_price is stored as PKR total in DB.
   * ALWAYS read tier_price directly from DB — never recalculate from unitPrice.
   * This guarantees the displayed price exactly matches what was saved,
   * regardless of currency rate changes or display currency.
   */
  const getTierTotalDisplay = (tier: BulkPricingTier): number => {
    // Always use the stored PKR value — never recalculate from unitPrice
    // (recalculating from unitPrice causes drift when variant price is edited
    //  but tiers haven't been re-saved yet, or when display currency differs)
    return tier.tier_price; // PKR — fmt() will convert for display
  };

  // ─── Actions ────────────────────────────────────────────────────────────────
  const addTier = () => {
    if (newTierMin < 2) {
      onError("Minimum quantity must be at least 2");
      return;
    }
    if (newTierMax > MAX_QUANTITY) {
      onError(`Maximum quantity cannot exceed ${MAX_QUANTITY}`);
      return;
    }
    if (newTierMin > newTierMax) {
      onError("Minimum cannot be greater than maximum quantity");
      return;
    }
    const overlapping = tiers.some(
      (t) => !(newTierMax < t.min_quantity || newTierMin > t.max_quantity),
    );
    if (overlapping) {
      onError("Quantity range overlaps with an existing tier");
      return;
    }

    const newTier = buildTier(newTierMin, newTierMax, newTierDiscount);
    const updatedTiers = [...tiers, newTier].sort(
      (a, b) => a.min_quantity - b.min_quantity,
    );
    onTiersChange(updatedTiers);
    setNewTierMin(2);
    setNewTierMax(2);
    setNewTierDiscount(0);
    setShowAddForm(false);
  };

  const removeTier = (index: number) => {
    onTiersChange(tiers.filter((_, i) => i !== index));
  };

  const updateTierDiscount = (index: number, discountPct: number) => {
    const tier = tiers[index];
    const updated = buildTier(
      tier.min_quantity,
      tier.max_quantity,
      discountPct,
    );
    const updatedTiers = [...tiers];
    updatedTiers[index] = { ...updatedTiers[index], ...updated };
    onTiersChange(updatedTiers);
  };

  const addMultipleTiers = () => {
    const presets = [
      { min: 2, max: 2, discount: 5 },
      { min: 3, max: 3, discount: 8 },
      { min: 4, max: 4, discount: 10 },
      { min: 5, max: 5, discount: 12 },
      { min: 6, max: 10, discount: 15 },
      { min: 11, max: 20, discount: 20 },
      { min: 21, max: 50, discount: 25 },
      { min: 51, max: 100, discount: 30 },
    ];

    const newTiers: BulkPricingTier[] = [];
    for (const p of presets) {
      const exists = tiers.some(
        (t) => !(p.max < t.min_quantity || p.min > t.max_quantity),
      );
      if (!exists) newTiers.push(buildTier(p.min, p.max, p.discount));
    }

    const updatedTiers = [...tiers, ...newTiers].sort(
      (a, b) => a.min_quantity - b.min_quantity,
    );
    onTiersChange(updatedTiers);
  };

  // ─── Preview for add form ──────────────────────────────────────────────────
  // All in PKR — fmt() handles display conversion
  const previewTotalPKR = calcTotalPKR(newTierMin, newTierDiscount);
  const previewPerPiecePKR = previewTotalPKR / newTierMin;
  const previewSavingPKR = unitPrice - previewPerPiecePKR;

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="ap-bulk-pricing-section">
      <div className="ap-bulk-pricing-header">
        <div className="ap-bulk-pricing-header-left">
          <div className="ap-bulk-pricing-icon">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </div>
          <div>
            <h3 className="ap-bulk-pricing-title">
              Bulk Pricing ({currency.code})
            </h3>
            <p className="ap-bulk-pricing-subtitle">
              Unit price: {fmt(unitPrice)} per piece
            </p>
          </div>
        </div>
        {tiers.length === 0 && (
          <button
            type="button"
            className="ap-bulk-add-all-btn"
            onClick={addMultipleTiers}
          >
            Add All Tiers
          </button>
        )}
      </div>

      {tiers.length > 0 && (
        <div className="ap-bulk-tiers-table-wrap">
          <table className="ap-bulk-tiers-table">
            <thead>
              <tr>
                <th>Quantity</th>
                <th>Total Price ({currencyCode})</th>
                <th>Per Piece</th>
                <th>You Save</th>
                <th>Discount</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {tiers.map((tier, idx) => {
                const isRange = tier.min_quantity !== tier.max_quantity;
                const qtyText = isRange
                  ? `${tier.min_quantity} – ${tier.max_quantity} pcs`
                  : `${tier.min_quantity} pc`;

                const discountPct = tier.discount_percentage ?? 0;

                // All amounts in PKR (unitPrice is PKR, getTierTotalDisplay returns PKR)
                // fmt() converts PKR → display currency for rendering
                const totalPKR = getTierTotalDisplay(tier); // = tier.tier_price (PKR from DB)
                const perPiecePKR = totalPKR / tier.min_quantity;
                const originalTotalPKR = unitPrice * tier.min_quantity;
                const savingPerPiecePKR = unitPrice - perPiecePKR;
                const actualPct =
                  unitPrice > 0
                    ? ((savingPerPiecePKR / unitPrice) * 100).toFixed(1)
                    : "0.0";

                return (
                  <tr key={idx}>
                    <td className="ap-bulk-tier-qty">{qtyText}</td>
                    <td className="ap-bulk-tier-total-price">
                      <span className="ap-bulk-cut-price">
                        {fmt(originalTotalPKR)}
                      </span>
                      <span className="ap-bulk-sale-price">
                        {fmt(totalPKR)}
                      </span>
                    </td>
                    <td className="ap-bulk-tier-per-piece">
                      {fmt(perPiecePKR)}
                    </td>
                    <td className="ap-bulk-tier-saving">
                      Save {fmt(savingPerPiecePKR)}/pc
                    </td>
                    <td className="ap-bulk-tier-discount">
                      <span className="ap-bulk-discount-badge">
                        {actualPct}% OFF
                      </span>
                      <input
                        type="number"
                        className="ap-bulk-discount-input"
                        value={tier.discount_percentage ?? 0}
                        onChange={(e) =>
                          updateTierDiscount(
                            idx,
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        min="0"
                        max="90"
                        step="1"
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="ap-bulk-tier-remove"
                        onClick={() => removeTier(idx)}
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
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!showAddForm ? (
        <button
          type="button"
          className="ap-bulk-add-tier-btn"
          onClick={() => setShowAddForm(true)}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Tier
        </button>
      ) : (
        <div className="ap-bulk-add-tier-form">
          <div className="ap-bulk-form-row">
            <div className="ap-bulk-form-field">
              <label>Min Qty</label>
              <input
                type="number"
                min="2"
                max="100"
                value={newTierMin}
                onChange={(e) => setNewTierMin(parseInt(e.target.value) || 2)}
              />
            </div>
            <div className="ap-bulk-form-field">
              <label>Max Qty</label>
              <input
                type="number"
                min={newTierMin}
                max="100"
                value={newTierMax}
                onChange={(e) =>
                  setNewTierMax(parseInt(e.target.value) || newTierMin)
                }
              />
            </div>
            <div className="ap-bulk-form-field">
              <label>Discount %</label>
              <input
                type="number"
                min="0"
                max="90"
                step="1"
                value={newTierDiscount}
                onChange={(e) =>
                  setNewTierDiscount(parseFloat(e.target.value) || 0)
                }
              />
            </div>
            <button
              type="button"
              className="ap-bulk-add-confirm"
              onClick={addTier}
            >
              Add
            </button>
            <button
              type="button"
              className="ap-bulk-add-cancel"
              onClick={() => setShowAddForm(false)}
            >
              Cancel
            </button>
          </div>
          <div className="ap-bulk-form-preview">
            <span>Unit price: {fmt(unitPrice)}</span>
            <span>→</span>
            <span className="ap-bulk-preview-price">
              Total: {fmt(previewTotalPKR)}
            </span>
            <span className="ap-bulk-preview-saving">
              Per piece: {fmt(previewPerPiecePKR)}
            </span>
            <span className="ap-bulk-preview-saving">
              Save: {fmt(previewSavingPKR)}/pc
            </span>
          </div>
        </div>
      )}

      <div className="ap-bulk-presets-small">
        <span className="ap-bulk-presets-label">Quick add:</span>
        {[
          { label: "2pc", qty: 2, maxQty: 2, discount: 5 },
          { label: "3pc", qty: 3, maxQty: 3, discount: 8 },
          { label: "4pc", qty: 4, maxQty: 4, discount: 10 },
          { label: "5pc", qty: 5, maxQty: 5, discount: 12 },
          { label: "6-10", qty: 6, maxQty: 10, discount: 15 },
          { label: "11-20", qty: 11, maxQty: 20, discount: 20 },
          { label: "21-50", qty: 21, maxQty: 50, discount: 25 },
          { label: "51-100", qty: 51, maxQty: 100, discount: 30 },
        ].map((preset, idx) => (
          <button
            key={idx}
            type="button"
            className="ap-bulk-preset-chip"
            onClick={() => {
              const exists = tiers.some(
                (t) =>
                  !(
                    preset.maxQty < t.min_quantity ||
                    preset.qty > t.max_quantity
                  ),
              );
              if (!exists) {
                const newTier = buildTier(
                  preset.qty,
                  preset.maxQty,
                  preset.discount,
                );
                const updatedTiers = [...tiers, newTier].sort(
                  (a, b) => a.min_quantity - b.min_quantity,
                );
                onTiersChange(updatedTiers);
              } else {
                onError("Tier already exists for this quantity range");
              }
            }}
          >
            {preset.label}
            <span>{preset.discount}%</span>
          </button>
        ))}
      </div>
    </div>
  );
}
