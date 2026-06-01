"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { supabase, Product } from "@/lib/supabase";
import { useCurrency } from "@/app/context/CurrencyContext";
import { convertPriceFromPKR } from "@/lib/panelCurrency";
import "../panel.css";
import "./products.css";
import PanelNavbar from "@/app/components/PanelNavbar";

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const { currency, formatPrice } = useCurrency();

  const categories = [
    "All",
    "Accessories",
    "Watches",
    "Automotive",
    "Home Decor",
  ];

  // Initial load
  useEffect(() => {
    async function load() {
      const query = supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });
      const { data } = await query;
      setProducts(data || []);
      setLoading(false);
    }
    load();
  }, []);

  // Realtime subscription for instant updates
  useEffect(() => {
    const channel = supabase
      .channel("products-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "products" },
        (payload) => {
          const newProduct = {
            ...payload.new,
            price: payload.new.price ?? 0,
            stock: payload.new.stock ?? 0,
            subcategory: payload.new.subcategory ?? "Uncategorized",
            is_active: payload.new.is_active ?? true,
          } as Product;
          setProducts((prev) => [newProduct, ...prev]);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "products" },
        (payload) => {
          const updated = {
            ...payload.new,
            price: payload.new.price ?? 0,
            stock: payload.new.stock ?? 0,
            subcategory: payload.new.subcategory ?? "Uncategorized",
            is_active: payload.new.is_active ?? true,
          } as Product;
          setProducts((prev) =>
            prev.map((p) => (p.id === updated.id ? updated : p))
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "products" },
        (payload) => {
          setProducts((prev) => prev.filter((p) => p.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filtered = products.filter((p) => {
    const matchCat = filter === "All" || p.category === filter;
    const matchSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.brand?.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (!error) {
      setProducts((p) => p.filter((x) => x.id !== id));
    }
  };

  const toggleActive = async (p: Product) => {
    const newStatus = !p.is_active;
    const { error } = await supabase
      .from("products")
      .update({ is_active: newStatus })
      .eq("id", p.id!);
    if (!error) {
      setProducts((prev) =>
        prev.map((x) => (x.id === p.id ? { ...x, is_active: newStatus } : x))
      );
    }
  };

  const getDisplayPrice = (priceInPKR: number | undefined): string => {
    if (!priceInPKR || priceInPKR === 0) return "Price not set";
    return formatPrice(priceInPKR);
  };

  const getDisplayOriginalPrice = (
    originalPrice: number | undefined,
    price: number | undefined
  ): string | null => {
    if (!originalPrice || originalPrice === 0) return null;
    if (price && originalPrice <= price) return null;
    return formatPrice(originalPrice);
  };

  return (
    <div className="p-root">
      <div className="p-ambient" aria-hidden="true" />
      <div className="p-grain" aria-hidden="true" />
      <PanelNavbar productCount={products.length} />

      <div className="p-content">
        <div className="p-page-header">
          <p className="p-eyebrow">
            <span className="p-ey-line" />
            Inventory
            <span className="p-ey-line" />
          </p>
          <h1 className="p-page-title">
            All <em>Products</em>
          </h1>
          <p className="p-page-sub">{products.length} products in store</p>
        </div>

        {/* Filters */}
        <div className="pr-toolbar">
          <div className="pr-search-wrap">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="pr-search-icon"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              className="pr-search"
              placeholder="Search by name or brand…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="pr-cats">
            {categories.map((c) => (
              <button
                key={c}
                className={`pr-cat-btn${filter === c ? " active" : ""}`}
                onClick={() => setFilter(c)}
              >
                {c}
              </button>
            ))}
          </div>

          <Link href="/panel/add-product" className="pr-add-btn">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M12 8v8M8 12h8" strokeLinecap="round" />
            </svg>
            Add Product
          </Link>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="p-empty">
            <div className="p-empty-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
              >
                <path d="M21 12a9 9 0 11-6.219-8.56" strokeLinecap="round" />
              </svg>
            </div>
            <p className="p-empty-title">Loading products…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-empty">
            <div className="p-empty-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
              >
                <path d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z" />
              </svg>
            </div>
            <p className="p-empty-title">No products found</p>
            <p className="p-empty-sub">
              Try different filters or add a product
            </p>
          </div>
        ) : (
          <div className="pr-grid">
            {filtered.map((p) => (
              <div key={p.id} className="pr-card">
                <div className="pr-card-img">
                  {p.images?.[0] ? (
                    <Image
                      src={p.images[0]}
                      alt={p.name}
                      fill
                      style={{ objectFit: "cover" }}
                      sizes="300px"
                    />
                  ) : (
                    <div className="pr-card-img-placeholder">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1"
                      >
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                      </svg>
                    </div>
                  )}
                  <div className="pr-card-overlay">
                    <span className="pr-card-cat">{p.subcategory}</span>
                    {p.is_featured && (
                      <span className="pr-card-feat">Featured</span>
                    )}
                  </div>
                </div>
                <div className="pr-card-body">
                  <h3 className="pr-card-name">{p.name}</h3>
                  {p.brand && <p className="pr-card-brand">{p.brand}</p>}
                  <div className="pr-card-price-row">
                    <span className="pr-card-price">
                      {getDisplayPrice(p.price)}
                    </span>
                    {getDisplayOriginalPrice(p.original_price, p.price) && (
                      <span className="pr-card-orig">
                        {getDisplayOriginalPrice(p.original_price, p.price)}
                      </span>
                    )}
                  </div>
                  <div className="pr-card-meta">
                    <span
                      className={`pr-card-status${
                        p.is_active ? "" : " inactive"
                      }`}
                    >
                      <span className="pr-dot" />
                      {p.is_active ? "Active" : "Inactive"}
                    </span>
                    <span className="pr-card-stock">
                      Stock: {p.stock === 999999 ? "∞" : p.stock}
                    </span>
                  </div>
                </div>
                <div className="pr-card-actions">
                  <Link
                    href={`/panel/edit-product/${p.id}`}
                    className="pr-action-btn"
                    title="Edit"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </Link>
                  <button
                    className="pr-action-btn"
                    title={p.is_active ? "Deactivate" : "Activate"}
                    onClick={() => toggleActive(p)}
                  >
                    {p.is_active ? (
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      >
                        <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      >
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                  <button
                    className="pr-action-btn pr-action-btn--del"
                    title="Delete"
                    onClick={() => p.id && handleDelete(p.id)}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14H6L5 6" />
                      <path d="M10 11v6M14 11v6" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
