// lib/meta-events.ts
// ✅ Meta Conversions API (Server-Side) — Tech4U
// Ye file server se Facebook ko events bhejti hai (CAPI)
// Browser pixel ke saath milake deduplication hoti hai

const PIXEL_ID = "1929542124417287";
const ACCESS_TOKEN =
  "EAANmC8w3Je0BRX0ivx8uGQzhySn7Dye0qlCnT2LrzDa5kbT9yUftlYcmA0BiURCdWifD8pxZCH60RliwKmILARJAqq952LIaIgjzJ9qJa39sMfeFZAdVxis0IN6VBno8Ody0H6Vy0qWplT4ZBDyfo7MMeMdkHfRWddpv5DaNT0TZCIPubOvaxPL4wjWDvgcExAZDZD";

const CAPI_URL = `https://graph.facebook.com/v19.0/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MetaUserData {
  email?: string; // plain text — hashed ho ga automatically
  phone?: string; // plain text — hashed ho ga
  firstName?: string;
  lastName?: string;
  city?: string;
  country?: string; // 2-letter ISO code e.g. "PK"
  ipAddress?: string; // req.headers['x-forwarded-for']
  userAgent?: string; // req.headers['user-agent']
  fbc?: string; // _fbc cookie value
  fbp?: string; // _fbp cookie value
  externalId?: string; // your internal user ID
}

export interface MetaPurchaseData {
  value: number;
  currency: string; // e.g. "PKR" or "USD"
  orderId?: string;
  contentIds?: string[]; // product IDs
  contentType?: "product" | "product_group";
}

// ─── SHA-256 Hash helper ──────────────────────────────────────────────────────

async function sha256(text: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(text.trim().toLowerCase());
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ─── Build hashed user_data object ───────────────────────────────────────────

async function buildUserData(user: MetaUserData) {
  const ud: Record<string, string | string[]> = {};

  if (user.email) ud.em = [await sha256(user.email)];
  if (user.phone) {
    // Remove spaces/dashes/+, then hash
    const cleanPhone = user.phone.replace(/[\s\-\(\)\+]/g, "");
    ud.ph = [await sha256(cleanPhone)];
  }
  if (user.firstName) ud.fn = [await sha256(user.firstName)];
  if (user.lastName) ud.ln = [await sha256(user.lastName)];
  if (user.city)
    ud.ct = [await sha256(user.city.toLowerCase().replace(/\s/g, ""))];
  if (user.country) ud.country = [await sha256(user.country.toLowerCase())];
  if (user.ipAddress) ud.client_ip_address = user.ipAddress;
  if (user.userAgent) ud.client_user_agent = user.userAgent;
  if (user.fbc) ud.fbc = user.fbc;
  if (user.fbp) ud.fbp = user.fbp;
  if (user.externalId) ud.external_id = [await sha256(user.externalId)];

  return ud;
}

// ─── Core: Send event to Meta CAPI ───────────────────────────────────────────

async function sendMetaEvent({
  eventName,
  eventId,
  userData,
  customData,
  eventSourceUrl,
}: {
  eventName: string;
  eventId?: string;
  userData: MetaUserData;
  customData?: Record<string, unknown>;
  eventSourceUrl?: string;
}) {
  try {
    const ud = await buildUserData(userData);

    const payload = {
      data: [
        {
          event_name: eventName,
          event_time: Math.floor(Date.now() / 1000),
          event_id: eventId, // for deduplication with browser pixel
          event_source_url: eventSourceUrl,
          action_source: "website",
          user_data: ud,
          custom_data: customData,
        },
      ],
    };

    const res = await fetch(CAPI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const json = await res.json();

    if (!res.ok) {
      console.error("[Meta CAPI] Error:", json);
    } else {
      console.log(
        `[Meta CAPI] ✅ ${eventName} sent. Events received:`,
        json.events_received,
      );
    }

    return json;
  } catch (err) {
    console.error("[Meta CAPI] Network error:", err);
  }
}

// ─── Named event helpers ──────────────────────────────────────────────────────

/** PageView — call in server components or API routes */
export async function trackPageView(userData: MetaUserData, url?: string) {
  return sendMetaEvent({
    eventName: "PageView",
    userData,
    eventSourceUrl: url,
  });
}

/** Purchase — call after order is confirmed */
export async function trackPurchase(
  userData: MetaUserData,
  purchase: MetaPurchaseData,
  eventId?: string,
  url?: string,
) {
  return sendMetaEvent({
    eventName: "Purchase",
    eventId,
    userData,
    eventSourceUrl: url,
    customData: {
      value: purchase.value,
      currency: purchase.currency,
      order_id: purchase.orderId,
      content_ids: purchase.contentIds ?? [],
      content_type: purchase.contentType ?? "product",
    },
  });
}

/** AddToCart */
export async function trackAddToCart(
  userData: MetaUserData,
  data: { value?: number; currency?: string; contentId?: string },
  eventId?: string,
  url?: string,
) {
  return sendMetaEvent({
    eventName: "AddToCart",
    eventId,
    userData,
    eventSourceUrl: url,
    customData: {
      value: data.value,
      currency: data.currency ?? "PKR",
      content_ids: data.contentId ? [data.contentId] : [],
      content_type: "product",
    },
  });
}

/** InitiateCheckout */
export async function trackInitiateCheckout(
  userData: MetaUserData,
  data: { value?: number; currency?: string },
  eventId?: string,
  url?: string,
) {
  return sendMetaEvent({
    eventName: "InitiateCheckout",
    eventId,
    userData,
    eventSourceUrl: url,
    customData: {
      value: data.value,
      currency: data.currency ?? "PKR",
    },
  });
}

/** ViewContent — product page view */
export async function trackViewContent(
  userData: MetaUserData,
  data: {
    contentId: string;
    contentName?: string;
    value?: number;
    currency?: string;
  },
  eventId?: string,
  url?: string,
) {
  return sendMetaEvent({
    eventName: "ViewContent",
    eventId,
    userData,
    eventSourceUrl: url,
    customData: {
      content_ids: [data.contentId],
      content_name: data.contentName,
      content_type: "product",
      value: data.value,
      currency: data.currency ?? "PKR",
    },
  });
}
