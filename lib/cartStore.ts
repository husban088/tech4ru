// lib/cartStore.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { supabase, CartItemType, Product, ProductVariant } from "./supabase";

// ============================================================
// PERFORMANCE OPTIMIZATIONS
// ============================================================

// ✅ Cache TTL - 30 seconds
const CACHE_TTL = 30000;
let lastFetchTime = 0;
let cachedItems: CartItemWithDetails[] = [];
let fetchPromise: Promise<void> | null = null;

// ✅ Debounce timers
let addToCartDebounce: NodeJS.Timeout | null = null;
let updateQuantityDebounce: Map<string, NodeJS.Timeout> = new Map();

// ✅ Batch update queue
let batchUpdates: Array<{ type: string; data: any }> = [];
let batchTimeout: NodeJS.Timeout | null = null;

// ============================================================
// TYPES
// ============================================================

interface CartItemWithDetails extends CartItemType {
  product?: Product;
  variantStock?: number;
  variantLowStockThreshold?: number | null;
  variantStockStatus?: "in_stock" | "out_of_stock" | "low_stock";
}

interface CartStore {
  items: CartItemWithDetails[];
  loading: boolean;
  initialized: boolean;
  cartId: string | null;
  sessionId: string | null;
  onCartOpen: (() => void) | null;
  setOnCartOpen: (fn: () => void) => void;
  fetchCart: () => Promise<void>;
  addToCart: (
    product: Product,
    variant?: ProductVariant | null,
    quantity?: number,
    piecesPerUnit?: number,
  ) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeFromCart: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  getCartCount: () => number;
  getSubtotal: () => number;
  getTotalPieces: () => number;
  prefetchCart: () => void;
  invalidateCache: () => void;
  // ✅ New method for forced refresh
  refreshCart: () => Promise<void>;
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function generateSessionId(): string {
  return `guest_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let sid = localStorage.getItem("guest_session_id");
  if (!sid) {
    sid = generateSessionId();
    localStorage.setItem("guest_session_id", sid);
  }
  return sid;
}

function deriveStockStatus(
  stock: number,
  threshold?: number | null,
): "in_stock" | "out_of_stock" | "low_stock" {
  if (stock === 0) return "out_of_stock";
  if (stock >= 999999) return "in_stock";
  if (threshold && threshold > 0 && stock <= threshold) return "low_stock";
  return "in_stock";
}

function processBatchUpdates() {
  if (batchUpdates.length === 0) return;

  const updates = [...batchUpdates];
  batchUpdates = [];

  Promise.all(
    updates.map(async (update) => {
      switch (update.type) {
        case "update_quantity":
          if (!update.data.id.startsWith("temp_")) {
            await supabase
              .from("cart_items")
              .update({
                quantity: update.data.quantity,
                updated_at: new Date().toISOString(),
              })
              .eq("id", update.data.id);
          }
          break;
        case "remove_item":
          if (!update.data.id.startsWith("temp_")) {
            await supabase.from("cart_items").delete().eq("id", update.data.id);
          }
          break;
      }
    }),
  ).catch(console.error);
}

function scheduleBatchUpdate(type: string, data: any) {
  batchUpdates.push({ type, data });

  if (batchTimeout) clearTimeout(batchTimeout);
  batchTimeout = setTimeout(() => {
    processBatchUpdates();
    batchTimeout = null;
  }, 100);
}

async function fetchCartItems(cartId: string): Promise<CartItemWithDetails[]> {
  try {
    const now = Date.now();
    if (cachedItems.length > 0 && now - lastFetchTime < CACHE_TTL) {
      return cachedItems;
    }

    const { data, error } = await supabase
      .from("cart_items")
      .select(
        `
        id,
        cart_id,
        product_id,
        variant_id,
        variant_name,
        variant_price,
        variant_original_price,
        variant_image,
        quantity,
        pieces_per_unit,
        created_at,
        updated_at
      `,
      )
      .eq("cart_id", cartId);

    if (error) {
      console.error("fetchCartItems error:", error);
      return cachedItems.length ? cachedItems : [];
    }

    const rawItems = (data as any[]) || [];
    if (rawItems.length === 0) {
      cachedItems = [];
      lastFetchTime = now;
      return [];
    }

    const productIds = [...new Set(rawItems.map((item) => item.product_id))];
    const variantIds = rawItems
      .filter((i) => i.variant_id)
      .map((i) => i.variant_id as string);

    const [productsResult, variantsResult] = await Promise.all([
      productIds.length > 0
        ? supabase.from("products").select("*").in("id", productIds)
        : { data: [] },
      variantIds.length > 0
        ? supabase
            .from("product_variants")
            .select("id, stock, low_stock_threshold")
            .in("id", variantIds)
        : { data: [] },
    ]);

    const productMap: Record<string, Product> = {};
    if (productsResult.data) {
      productsResult.data.forEach((p: any) => {
        productMap[p.id] = p;
      });
    }

    const variantStockMap: Record<
      string,
      { stock: number; low_stock_threshold: number | null }
    > = {};
    if (variantsResult.data) {
      variantsResult.data.forEach((v: any) => {
        variantStockMap[v.id] = {
          stock: v.stock,
          low_stock_threshold: v.low_stock_threshold,
        };
      });
    }

    const items: CartItemWithDetails[] = rawItems.map((item) => {
      const product = productMap[item.product_id];
      const variantInfo = item.variant_id
        ? variantStockMap[item.variant_id]
        : null;

      const stock = variantInfo?.stock ?? product?.stock ?? 0;
      const threshold =
        variantInfo?.low_stock_threshold ??
        (product as any)?.low_stock_threshold ??
        null;
      const stockStatus = deriveStockStatus(stock, threshold);

      // ✅ FIX: Build images array — variant_image first, then product images
      const baseImages = product?.images ?? [];
      const variantImg = item.variant_image;
      const mergedImages =
        variantImg && !baseImages.includes(variantImg)
          ? [variantImg, ...baseImages]
          : baseImages;

      return {
        ...item,
        pieces_per_unit: item.pieces_per_unit ?? 1,
        product: product
          ? {
              ...product,
              // ✅ Ensure images always includes variant_image so display never breaks
              images: mergedImages,
            }
          : undefined,
        variantStock: stock,
        variantLowStockThreshold: threshold,
        variantStockStatus: stockStatus,
      };
    });

    cachedItems = items;
    lastFetchTime = now;

    return items;
  } catch (err) {
    console.error("fetchCartItems exception:", err);
    return cachedItems.length ? cachedItems : [];
  }
}

async function getOrCreateCart(): Promise<{
  cartId: string;
  sessionId: string | null;
}> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const sessionId = user ? null : getSessionId();
  let cart: any = null;

  if (user) {
    const { data } = await supabase
      .from("carts")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    cart = data;
  } else if (sessionId) {
    const { data } = await supabase
      .from("carts")
      .select("id")
      .eq("session_id", sessionId)
      .maybeSingle();
    cart = data;
  }

  if (!cart) {
    const payload: Record<string, string> = {};
    if (user) payload.user_id = user.id;
    else if (sessionId) payload.session_id = sessionId;

    const { data: newCart, error } = await supabase
      .from("carts")
      .insert(payload)
      .select()
      .single();

    if (error || !newCart) throw new Error("Could not create cart");
    return { cartId: newCart.id, sessionId };
  }

  return { cartId: cart.id, sessionId };
}

// ============================================================
// MAIN STORE
// ============================================================

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      loading: false,
      initialized: false,
      cartId: null,
      sessionId: null,
      onCartOpen: null,

      setOnCartOpen: (fn) => set({ onCartOpen: fn }),

      invalidateCache: () => {
        lastFetchTime = 0;
        cachedItems = [];
      },

      prefetchCart: () => {
        if (typeof window === "undefined") return;
        if ("requestIdleCallback" in window) {
          requestIdleCallback(() => {
            if (!get().initialized && get().items.length === 0) {
              get().fetchCart();
            }
          });
        } else {
          setTimeout(() => {
            if (!get().initialized && get().items.length === 0) {
              get().fetchCart();
            }
          }, 100);
        }
      },

      refreshCart: async () => {
        // Force cache invalidation and refetch
        get().invalidateCache();
        fetchPromise = null;
        await get().fetchCart();
      },

      fetchCart: async () => {
        if (fetchPromise) return fetchPromise;

        fetchPromise = (async () => {
          if (get().items.length === 0) {
            set({ loading: true });
          }

          try {
            const {
              data: { user },
            } = await supabase.auth.getUser();
            const sessionId = user ? null : getSessionId();
            set({ sessionId });

            let cart: any = null;

            if (user) {
              const { data: userCart } = await supabase
                .from("carts")
                .select("*")
                .eq("user_id", user.id)
                .maybeSingle();
              cart = userCart;

              const guestSid = localStorage.getItem("guest_session_id");
              if (guestSid) {
                const { data: guestCart } = await supabase
                  .from("carts")
                  .select("*")
                  .eq("session_id", guestSid)
                  .maybeSingle();

                if (guestCart && !cart) {
                  const { data: claimed } = await supabase
                    .from("carts")
                    .update({ user_id: user.id, session_id: null })
                    .eq("id", guestCart.id)
                    .select()
                    .single();
                  cart = claimed;
                  localStorage.removeItem("guest_session_id");
                } else if (guestCart && cart) {
                  await mergeGuestCart(guestCart.id, cart.id);
                  localStorage.removeItem("guest_session_id");
                }
              }
            } else if (sessionId) {
              const { data: guestCart } = await supabase
                .from("carts")
                .select("*")
                .eq("session_id", sessionId)
                .maybeSingle();
              cart = guestCart;
            }

            if (!cart) {
              const payload: Record<string, string> = {};
              if (user) payload.user_id = user.id;
              else if (sessionId) payload.session_id = sessionId;

              const { data: newCart, error: cartErr } = await supabase
                .from("carts")
                .insert(payload)
                .select()
                .single();

              if (cartErr || !newCart) {
                set({ loading: false, initialized: true });
                return;
              }
              cart = newCart;
            }

            const cartId = cart.id;
            const freshItems = await fetchCartItems(cartId);

            const validItems = freshItems.filter((item) => {
              const stockStatus = item.variantStockStatus ?? "in_stock";
              if (stockStatus === "out_of_stock") {
                supabase.from("cart_items").delete().eq("id", item.id);
                return false;
              }
              return true;
            });

            set({
              cartId,
              items: validItems,
              loading: false,
              initialized: true,
            });
          } catch (err) {
            console.error("fetchCart error:", err);
            set({ loading: false, initialized: true });
          } finally {
            fetchPromise = null;
          }
        })();

        return fetchPromise;
      },

      addToCart: async (
        product: Product,
        variant: ProductVariant | null = null,
        quantity: number = 1,
        piecesPerUnit: number = 1,
      ) => {
        if (addToCartDebounce) clearTimeout(addToCartDebounce);

        return new Promise((resolve, reject) => {
          addToCartDebounce = setTimeout(async () => {
            try {
              if (!product.id) {
                console.error("addToCart: product.id is missing");
                reject(new Error("Product ID missing"));
                return;
              }

              const { items, onCartOpen } = get();

              const variantId = variant?.id ?? undefined;
              const variantName = variant
                ? variant.attribute_value
                : "Standard";
              // ✅ Always use product.price — caller sets it to the correct
              // per-piece price (sale price or bulk-tier per-piece price).
              // Falling back to variant?.price would use the raw DB price and
              // show the wrong (un-discounted) price in the cart.
              const variantPrice = product.price ?? variant?.price ?? 0;
              const variantOriginalPrice =
                product.original_price ?? variant?.original_price ?? undefined;

              const rawStock =
                variant != null
                  ? (variant.stock ?? 999999)
                  : ((product as any).stock ?? 999999);
              const lowStockThreshold =
                variant != null
                  ? (variant.low_stock_threshold ?? null)
                  : ((product as any).low_stock_threshold ?? null);

              const stockStatus = deriveStockStatus(
                rawStock,
                lowStockThreshold,
              );

              if (stockStatus === "out_of_stock") {
                alert("This product is out of stock");
                reject(new Error("Out of stock"));
                return;
              }

              const variantImage =
                product.images && product.images.length > 0
                  ? product.images[0]
                  : "";

              const existingItem = items.find(
                (i) =>
                  i.product_id === product.id &&
                  i.variant_id === variantId &&
                  (i.pieces_per_unit ?? 1) === piecesPerUnit,
              );

              const newQuantity = existingItem
                ? existingItem.quantity + quantity
                : quantity;

              if (stockStatus !== "in_stock" && rawStock > 0) {
                const totalPhysical = newQuantity * piecesPerUnit;
                if (totalPhysical > rawStock) {
                  const maxUnits = Math.floor(rawStock / piecesPerUnit);
                  alert(
                    `Only ${rawStock} items in stock. Max ${maxUnits} unit(s) of ${piecesPerUnit}-piece size.`,
                  );
                  reject(new Error("Stock limit exceeded"));
                  return;
                }
              }

              // Optimistic update
              if (existingItem) {
                set({
                  items: get().items.map((i) =>
                    i.id === existingItem.id
                      ? { ...i, quantity: newQuantity }
                      : i,
                  ),
                });
              } else {
                const tempId = `temp_${Date.now()}_${Math.random()}`;
                const tempItem: CartItemWithDetails = {
                  id: tempId,
                  cart_id: get().cartId || "",
                  product_id: product.id,
                  variant_id: variantId,
                  variant_name: variantName,
                  variant_price: variantPrice,
                  variant_original_price: variantOriginalPrice,
                  variant_image: variantImage,
                  quantity,
                  pieces_per_unit: piecesPerUnit,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                  variantStock: rawStock,
                  variantLowStockThreshold: lowStockThreshold,
                  variantStockStatus: stockStatus,
                  product: {
                    ...product,
                    price: variantPrice,
                    original_price: variantOriginalPrice,
                    stock: rawStock,
                  },
                };
                set({ items: [...get().items, tempItem] });
              }

              if (onCartOpen) onCartOpen();

              // Background DB sync
              setTimeout(async () => {
                try {
                  let cartId = get().cartId;
                  if (!cartId) {
                    const result = await getOrCreateCart();
                    cartId = result.cartId;
                    set({ cartId });
                  }

                  if (existingItem) {
                    await supabase
                      .from("cart_items")
                      .update({
                        quantity: newQuantity,
                        updated_at: new Date().toISOString(),
                      })
                      .eq("id", existingItem.id);
                  } else {
                    const { data: inserted, error } = await supabase
                      .from("cart_items")
                      .insert({
                        cart_id: cartId,
                        product_id: product.id,
                        variant_id: variantId ?? null,
                        variant_name: variantName,
                        variant_price: variantPrice,
                        variant_original_price: variantOriginalPrice ?? null,
                        variant_image: variantImage,
                        quantity,
                        pieces_per_unit: piecesPerUnit,
                      })
                      .select()
                      .single();

                    if (error || !inserted) {
                      console.error("addToCart insert error:", error);
                      set({
                        items: get().items.filter(
                          (i) =>
                            !(
                              i.id.startsWith("temp_") &&
                              i.product_id === product.id
                            ),
                        ),
                      });
                    } else {
                      // ✅ FIX: Preserve product object so name/brand/images are never lost
                      set({
                        items: get().items.map((i) =>
                          i.id.startsWith("temp_") &&
                          i.product_id === product.id
                            ? {
                                ...inserted,
                                pieces_per_unit:
                                  inserted.pieces_per_unit ?? piecesPerUnit,
                                variantStock: rawStock,
                                variantLowStockThreshold: lowStockThreshold,
                                variantStockStatus: stockStatus,
                                // ✅ Always attach product so name/brand/images survive
                                product: {
                                  ...product,
                                  price: variantPrice,
                                  original_price: variantOriginalPrice,
                                  stock: rawStock,
                                },
                              }
                            : i,
                        ),
                        cartId,
                      });
                    }
                  }

                  get().invalidateCache();
                } catch (dbErr) {
                  console.error("addToCart DB sync error:", dbErr);
                }
              }, 0);

              resolve();
            } catch (err) {
              reject(err);
            }
          }, 100);
        });
      },

      updateQuantity: async (itemId: string, quantity: number) => {
        if (quantity <= 0) {
          await get().removeFromCart(itemId);
          return;
        }

        const { items } = get();
        const item = items.find((i) => i.id === itemId);
        if (!item) return;

        const rawStock = item.variantStock ?? 999999;
        const stockStatus = item.variantStockStatus ?? "in_stock";
        const ppu = item.pieces_per_unit ?? 1;

        if (stockStatus === "out_of_stock") {
          await get().removeFromCart(itemId);
          return;
        }

        let finalQuantity = quantity;
        if (stockStatus !== "in_stock" && rawStock > 0) {
          const totalPhysical = quantity * ppu;
          if (totalPhysical > rawStock) {
            const maxUnits = Math.floor(rawStock / ppu);
            alert(
              `Only ${rawStock} items in stock. Max ${maxUnits} unit(s) allowed.`,
            );
            if (maxUnits <= 0) {
              await get().removeFromCart(itemId);
              return;
            }
            finalQuantity = maxUnits;
          }
        }

        set({
          items: items.map((i) =>
            i.id === itemId ? { ...i, quantity: finalQuantity } : i,
          ),
        });

        if (updateQuantityDebounce.has(itemId)) {
          clearTimeout(updateQuantityDebounce.get(itemId)!);
        }

        const timer = setTimeout(() => {
          scheduleBatchUpdate("update_quantity", {
            id: itemId,
            quantity: finalQuantity,
          });
          updateQuantityDebounce.delete(itemId);
          get().invalidateCache();
        }, 300);

        updateQuantityDebounce.set(itemId, timer);
      },

      removeFromCart: async (itemId: string) => {
        const { items } = get();
        const itemToRemove = items.find((i) => i.id === itemId);
        if (!itemToRemove) return;

        set({ items: items.filter((i) => i.id !== itemId) });
        scheduleBatchUpdate("remove_item", { id: itemId });
        get().invalidateCache();
      },

      clearCart: async () => {
        const { cartId } = get();
        set({ items: [] });

        if (cartId) {
          await supabase.from("cart_items").delete().eq("cart_id", cartId);
        }

        get().invalidateCache();
      },

      getCartCount: () => {
        return get().items.reduce((t, i) => t + i.quantity, 0);
      },

      getSubtotal: () => {
        return get().items.reduce((t, i) => {
          const price = i.variant_price ?? i.product?.price ?? 0;
          const ppu = i.pieces_per_unit ?? 1;
          return t + price * ppu * i.quantity;
        }, 0);
      },

      getTotalPieces: () => {
        return get().items.reduce(
          (t, i) => t + (i.pieces_per_unit ?? 1) * i.quantity,
          0,
        );
      },
    }),
    {
      name: "cart-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // ✅ Store complete items with all data
        items: state.items.map((item) => {
          // ✅ Build merged images: variant_image + product images (no duplicates)
          const prodImages = item.product?.images ?? [];
          const vImg = item.variant_image;
          const mergedImages =
            vImg && !prodImages.includes(vImg)
              ? [vImg, ...prodImages]
              : prodImages;

          return {
            id: item.id,
            cart_id: item.cart_id,
            product_id: item.product_id,
            variant_id: item.variant_id,
            variant_name: item.variant_name,
            variant_price: item.variant_price,
            variant_original_price: item.variant_original_price,
            variant_image: item.variant_image,
            quantity: item.quantity,
            pieces_per_unit: item.pieces_per_unit ?? 1,
            created_at: item.created_at,
            updated_at: item.updated_at,
            variantStock: item.variantStock,
            variantLowStockThreshold: item.variantLowStockThreshold,
            variantStockStatus: item.variantStockStatus,
            product: item.product
              ? {
                  id: item.product.id,
                  name: item.product.name,
                  description: item.product.description,
                  category: item.product.category,
                  subcategory: item.product.subcategory,
                  // ✅ Always include variant_image in saved images
                  images: mergedImages,
                  brand: item.product.brand,
                  condition: item.product.condition,
                  is_featured: item.product.is_featured,
                  is_active: item.product.is_active,
                  price: item.variant_price ?? item.product.price,
                  original_price:
                    item.variant_original_price ?? item.product.original_price,
                  stock: item.variantStock ?? item.product.stock,
                  created_at: item.product.created_at,
                  updated_at: item.product.updated_at,
                }
              : undefined,
          };
        }),
        cartId: state.cartId,
        sessionId: state.sessionId,
        initialized: state.initialized,
      }),
      onRehydrateStorage: () => (state) => {
        console.log("🔄 Cart rehydrating...");
        if (state?.items?.length) {
          console.log(
            `✅ Cart rehydrated: ${state.items.length} items from localStorage`,
          );
        }
        // ✅ Don't auto-fetch immediately - let component decide
        // This prevents race conditions and disappearing items
      },
      skipHydration: false,
    },
  ),
);

// ============================================================
// HELPER FUNCTION - Merge Guest Cart
// ============================================================

async function mergeGuestCart(
  guestCartId: string,
  userCartId: string,
): Promise<void> {
  try {
    const guestItems = await fetchCartItems(guestCartId);
    const userItems = await fetchCartItems(userCartId);

    for (const guestItem of guestItems) {
      const existing = userItems.find(
        (u) =>
          u.product_id === guestItem.product_id &&
          u.variant_id === guestItem.variant_id &&
          (u.pieces_per_unit ?? 1) === (guestItem.pieces_per_unit ?? 1),
      );

      if (existing) {
        await supabase
          .from("cart_items")
          .update({ quantity: existing.quantity + guestItem.quantity })
          .eq("id", existing.id);
      } else {
        await supabase.from("cart_items").insert({
          cart_id: userCartId,
          product_id: guestItem.product_id,
          variant_id: guestItem.variant_id,
          variant_name: guestItem.variant_name,
          variant_price: guestItem.variant_price,
          variant_original_price: guestItem.variant_original_price,
          variant_image: guestItem.variant_image,
          quantity: guestItem.quantity,
          pieces_per_unit: guestItem.pieces_per_unit ?? 1,
        });
      }
    }

    await supabase.from("cart_items").delete().eq("cart_id", guestCartId);
    await supabase.from("carts").delete().eq("id", guestCartId);
  } catch (err) {
    console.error("mergeGuestCart error:", err);
  }
}
