// lib/supabase.ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // ✅ storageKey HATA DIYA — default Supabase key use hogi
    // Custom storageKey ki wajah se Vercel pe session cookie aur
    // localStorage key alag ho jaate the — session lost hoti thi
    // storageKey: "sb-auth-token",  ← YEH PROBLEM THI
  },
  db: {
    schema: "public",
  },
});

// Types (unchanged)
export type BulkPricingTier = {
  id?: string;
  variant_id: string;
  min_quantity: number;
  max_quantity: number;
  tier_price: number;
  discount_percentage: number | null;
  discount_price: number | null;
  created_at?: string;
  updated_at?: string;
};

export type Product = {
  id?: string;
  created_at?: string;
  updated_at?: string;
  name: string;
  description: string;
  description_images?: string[];
  category: string;
  subcategory: string;
  brand?: string;
  condition: string;
  is_featured: boolean;
  is_active: boolean;
  rating?: number;
  reviews_count?: number;
  price?: number;
  stock?: number;
  images?: string[];
  main_images?: string[];
  original_price?: number;
};

export type ProductVariant = {
  id?: string;
  product_id: string;
  attribute_type: "color" | "size" | "material" | "capacity" | "standard";
  attribute_value: string;
  price: number;
  original_price?: number;
  description?: string;
  stock: number;
  low_stock_threshold?: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  bulk_pricing_tiers?: BulkPricingTier[];
};

export type VariantImage = {
  id?: string;
  variant_id: string;
  image_url: string;
  display_order: number;
  created_at?: string;
};

export type ProductFAQ = {
  id?: string;
  product_id: string;
  question: string;
  answer?: string;
  display_order: number;
  created_at?: string;
  updated_at?: string;
};

export type CartItemType = {
  id: string;
  cart_id: string;
  product_id: string;
  variant_id?: string;
  variant_name?: string;
  variant_price?: number;
  variant_original_price?: number;
  variant_image?: string;
  quantity: number;
  pieces_per_unit: number;
  created_at: string;
  updated_at: string;
  product?: Product;
};

export type Cart = {
  id: string;
  user_id: string | null;
  session_id: string | null;
  created_at: string;
  updated_at: string;
};

export type CartWithItems = Cart & {
  items: CartItemType[];
};

export type Profile = {
  id: string;
  username: string;
  email: string;
  created_at: string;
  updated_at: string;
};
