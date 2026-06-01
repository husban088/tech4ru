"use client";

import { useState } from "react";
import Link from "next/link";
import "@/app/styles/product-grid.css";
import ProductGrid from "../components/ProductGrid";
import QuickView from "../components/QuickView";
import { supabase } from "@/lib/supabase";

const SUBCATEGORIES = [
  {
    name: "Wall Decor",
    href: "/home-decor/wall-decor",
    description: "Art, mirrors, and wall installations",
  },
  {
    name: "Lighting",
    href: "/home-decor/lighting",
    description: "Ambient, task, and decorative lighting",
  },
  {
    name: "Kitchen Essentials",
    href: "/home-decor/kitchen-essentials",
    description: "Premium cookware and tools",
  },
  {
    name: "Storage & Organizers",
    href: "/home-decor/storage-organizers",
    description: "Elegant storage solutions",
  },
];

interface QuickViewProduct {
  id: string;
  name: string;
  brand?: string;
  price: number;
  original_price?: number;
  category: string;
  subcategory: string;
  images: string[];
  stock: number;
  description?: string;
  condition?: string;
  is_featured?: boolean;
  is_active?: boolean;
  stockStatus?: "in_stock" | "out_of_stock" | "low_stock";
  lowStockThreshold?: number | null;
  rating?: number;
  reviews_count?: number;
}

interface ProductVariant {
  id: string;
  product_id: string;
  attribute_type: "color" | "size" | "material" | "capacity" | "standard";
  attribute_value: string;
  price: number;
  original_price?: number;
  description?: string;
  stock: number;
  low_stock_threshold?: number;
}

export default function HomeDecor() {
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const [quickViewProduct, setQuickViewProduct] =
    useState<QuickViewProduct | null>(null);
  const [quickViewVariants, setQuickViewVariants] = useState<ProductVariant[]>(
    []
  );
  const [quickViewSelectedVariant, setQuickViewSelectedVariant] =
    useState<ProductVariant | null>(null);
  const [variantImagesMap, setVariantImagesMap] = useState<
    Record<string, string[]>
  >({});

  const handleQuickView = async (productId: string) => {
    try {
      const { data: productData, error: productError } = await supabase
        .from("products")
        .select("*")
        .eq("id", productId)
        .single();

      if (productError) {
        console.error("Error fetching product:", productError);
        return;
      }

      const { data: variantsData, error: variantsError } = await supabase
        .from("product_variants")
        .select("*")
        .eq("product_id", productId)
        .eq("is_active", true);

      if (variantsError) {
        console.error("Error fetching variants:", variantsError);
        return;
      }

      if (variantsData && variantsData.length > 0) {
        const variantIds = variantsData.map((v: any) => v.id);
        const { data: imagesData } = await supabase
          .from("variant_images")
          .select("*")
          .in("variant_id", variantIds)
          .order("display_order", { ascending: true });

        if (imagesData) {
          const imagesByVariant: Record<string, string[]> = {};
          imagesData.forEach((img: any) => {
            if (!imagesByVariant[img.variant_id]) {
              imagesByVariant[img.variant_id] = [];
            }
            imagesByVariant[img.variant_id].push(img.image_url);
          });
          setVariantImagesMap(imagesByVariant);
        }
      }

      const bestVariant =
        variantsData?.find((v: any) => v.attribute_type === "standard") ||
        variantsData?.[0];

      let productImages: string[] = [];
      if (bestVariant && variantImagesMap[bestVariant.id]) {
        productImages = variantImagesMap[bestVariant.id];
      } else if (productData.images) {
        productImages = productData.images;
      }

      const stock = bestVariant?.stock || productData.stock || 0;
      const lowStockThreshold =
        bestVariant?.low_stock_threshold || productData.low_stock_threshold;
      const stockStatus =
        stock === 0
          ? "out_of_stock"
          : lowStockThreshold && stock <= lowStockThreshold
          ? "low_stock"
          : "in_stock";

      const quickViewData: QuickViewProduct = {
        id: productData.id,
        name: productData.name,
        brand: productData.brand,
        price: bestVariant?.price || productData.price || 0,
        original_price:
          bestVariant?.original_price || productData.original_price,
        category: productData.category,
        subcategory: productData.subcategory,
        images: productImages,
        stock: stock,
        description: bestVariant?.description || productData.description,
        condition: productData.condition,
        is_featured: productData.is_featured,
        is_active: productData.is_active,
        stockStatus: stockStatus,
        lowStockThreshold: lowStockThreshold,
        rating: productData.rating,
        reviews_count: productData.reviews_count,
      };

      setQuickViewProduct(quickViewData);
      setQuickViewVariants(variantsData || []);
      setQuickViewSelectedVariant(bestVariant || null);
      setQuickViewOpen(true);
    } catch (err) {
      console.error("QuickView error:", err);
    }
  };

  return (
    <>
      <div className="sub-root">
        <div className="sub-ambient" aria-hidden="true" />
        <div className="sub-grain" aria-hidden="true" />
        <div className="sub-lines" aria-hidden="true">
          {[...Array(6)].map((_, i) => (
            <span key={i} />
          ))}
        </div>

        <div className="sub-hero">
          <div className="sub-hero-inner">
            <div className="sub-breadcrumb">
              <Link href="/" className="sub-breadcrumb-link">
                Home
              </Link>
              <span className="sub-breadcrumb-sep">/</span>
              <span className="sub-breadcrumb-current">Home Decor</span>
            </div>
            <h1 className="sub-title">
              Elegant <em>Home Decor</em>
            </h1>
            <p className="sub-description">
              Transform your living space with our curated collection of premium
              home accessories
            </p>
            <div className="sub-deco">
              <div className="sub-deco-line" />
              <div className="sub-deco-diamond" />
              <div className="sub-deco-line" />
            </div>
          </div>
        </div>

        <div className="sub-main">
          <div className="cat-subnav">
            {SUBCATEGORIES.map((cat) => (
              <Link key={cat.name} href={cat.href} className="cat-subnav-item">
                <span className="cat-subnav-name">{cat.name}</span>
                <span className="cat-subnav-desc">{cat.description}</span>
              </Link>
            ))}
          </div>

          <div className="cat-section">
            <div className="cat-section-header">
              <h2 className="cat-section-title">All Home Decor</h2>
              <div className="cat-section-line" />
            </div>
            <ProductGrid category="Home Decor" onQuickView={handleQuickView} />
          </div>
        </div>
      </div>

      <QuickView
        isOpen={quickViewOpen}
        onClose={() => setQuickViewOpen(false)}
        product={quickViewProduct}
        variants={quickViewVariants}
        selectedVariant={quickViewSelectedVariant}
        variantImagesMap={variantImagesMap}
      />
    </>
  );
}
