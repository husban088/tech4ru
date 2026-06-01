// app/api/track-live/route.ts
// ✅ FREE live tracking — No AfterShip, No paid API
// ✅ Timeline admin ke shipped_at + estimated_days se build hoti hai
// ✅ Courier tracking URL direct courier website pe redirect karta hai
// ✅ DB mein cache store karta hai

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

// ✅ FREE courier tracking URLs
const COURIER_TRACKING_URLS: Record<string, (tn: string) => string> = {
  // Pakistan
  "leopard courier": (tn) =>
    `https://www.leopardscourier.com/leopards-track-the-parcel?trackno=${tn}`,
  "leopards courier": (tn) =>
    `https://www.leopardscourier.com/leopards-track-the-parcel?trackno=${tn}`,
  leopard: (tn) =>
    `https://www.leopardscourier.com/leopards-track-the-parcel?trackno=${tn}`,
  tcs: (tn) => `https://www.tcsexpress.com/track/${tn}`,
  "tcs courier": (tn) => `https://www.tcsexpress.com/track/${tn}`,
  postex: (tn) => `https://postex.pk/tracking?tracking_number=${tn}`,
  "postex courier": (tn) => `https://postex.pk/tracking?tracking_number=${tn}`,
  trax: (tn) => `https://app.traxlogistics.com/track?cn=${tn}`,
  "trax courier": (tn) => `https://app.traxlogistics.com/track?cn=${tn}`,
  blueex: (tn) => `https://blueex.com/tracking/?tn=${tn}`,
  "blueex courier": (tn) => `https://blueex.com/tracking/?tn=${tn}`,
  "call courier": (tn) => `https://callcourier.com.pk/tracking?cn=${tn}`,
  "m&p": (tn) => `https://movenpick.com.pk/tracking?cn=${tn}`,
  swyft: (tn) => `https://swyftlogistics.com/tracking?cn=${tn}`,
  "swyft logistics": (tn) => `https://swyftlogistics.com/tracking?cn=${tn}`,

  // UK
  "royal mail": (tn) =>
    `https://www.royalmail.com/track-your-item#/tracking-results/${tn}`,
  "dpd uk": (tn) => `https://www.dpd.co.uk/apps/tracking/?package=${tn}`,
  dpd: (tn) => `https://www.dpd.co.uk/apps/tracking/?package=${tn}`,
  evri: (tn) => `https://www.evri.com/track-a-parcel#${tn}`,
  hermes: (tn) => `https://www.evri.com/track-a-parcel#${tn}`,
  parcelforce: (tn) =>
    `https://www.parcelforce.com/track-trace?trackNumber=${tn}`,
  yodel: (tn) => `https://www.yodel.co.uk/tracking/${tn}`,

  // Australia
  "australia post": (tn) =>
    `https://auspost.com.au/mypost/track/#/details/${tn}`,
  auspost: (tn) => `https://auspost.com.au/mypost/track/#/details/${tn}`,
  "courier please": (tn) =>
    `https://www.couriersplease.com.au/Tools/Track?Cn=${tn}`,

  // UAE
  aramex: (tn) =>
    `https://www.aramex.com/us/en/track/results?ShipmentNumber=${tn}`,
  fetchr: (tn) => `https://getfetchr.com/track?trackingNumber=${tn}`,

  // Canada
  "canada post": (tn) =>
    `https://www.canadapost-postescanada.ca/track-reperage/en#/details/${tn}`,
  purolator: (tn) =>
    `https://www.purolator.com/en/ship-track/tracking-details.page?pin=${tn}`,

  // Global
  dhl: (tn) => `https://www.dhl.com/en/express/tracking.html?AWB=${tn}`,
  fedex: (tn) => `https://www.fedex.com/fedextrack/?trknbr=${tn}`,
  ups: (tn) => `https://www.ups.com/track?tracknum=${tn}`,
  usps: (tn) => `https://tools.usps.com/go/TrackConfirmAction?tLabels=${tn}`,
};

function getCourierTrackingUrl(
  courierName: string,
  trackingNumber: string,
  adminUrl?: string,
): string {
  if (adminUrl && adminUrl.startsWith("http")) return adminUrl;
  const key = courierName.toLowerCase().trim();
  const urlFn = COURIER_TRACKING_URLS[key];
  if (urlFn) return urlFn(trackingNumber);
  return `https://www.google.com/search?q=${encodeURIComponent(courierName + " track " + trackingNumber)}`;
}

// ✅ Shipped date + estimated days se timeline build karo (no external API)
function buildTimeline(
  trackingNumber: string,
  courierName: string,
  shippedAt: string,
  estimatedDays?: string,
) {
  const now = new Date();
  const shippedDate = new Date(shippedAt);
  const daysSince = Math.floor(
    (now.getTime() - shippedDate.getTime()) / (1000 * 60 * 60 * 24),
  );
  const estDays = parseInt(estimatedDays || "5") || 5;
  const isDelivered = daysSince >= estDays;

  const steps = [];

  // Step 1: Picked up
  steps.push({
    date: shippedDate.toISOString(),
    location: "Origin Warehouse",
    status: "Shipment Picked Up",
    message: `Your parcel was picked up by ${courierName}`,
    tag: "Picked",
  });

  // Step 2: In transit
  if (daysSince >= 1) {
    steps.push({
      date: new Date(shippedDate.getTime() + 1 * 86400000).toISOString(),
      location: "Sorting Facility",
      status: "In Transit",
      message: "Parcel processed at sorting facility and dispatched",
      tag: "InTransit",
    });
  }

  // Step 3: Mid transit
  if (daysSince >= 2 && estDays > 3) {
    steps.push({
      date: new Date(shippedDate.getTime() + 2 * 86400000).toISOString(),
      location: "Regional Hub",
      status: "In Transit",
      message: "Shipment in transit — heading to destination city",
      tag: "InTransit",
    });
  }

  // Step 4: Out for delivery
  if (daysSince >= estDays - 1) {
    const ofdDate = new Date(shippedDate.getTime() + (estDays - 1) * 86400000);
    if (ofdDate <= now) {
      steps.push({
        date: ofdDate.toISOString(),
        location: "Local Delivery Hub",
        status: "Out for Delivery",
        message: "Your parcel is out for delivery today",
        tag: "OutForDelivery",
      });
    }
  }

  // Step 5: Delivered
  if (isDelivered) {
    steps.push({
      date: new Date(shippedDate.getTime() + estDays * 86400000).toISOString(),
      location: "Delivery Address",
      status: "Delivered",
      message: "Your parcel has been delivered successfully",
      tag: "Delivered",
    });
  }

  const estimatedDeliveryDate = new Date(
    shippedDate.getTime() + estDays * 86400000,
  );

  return {
    checkpoints: steps.reverse(), // Latest first
    delivered: isDelivered,
    estimated_delivery: estimatedDeliveryDate.toISOString(),
    status_message: isDelivered
      ? "Delivered"
      : daysSince >= estDays - 1
        ? "Out for Delivery"
        : "In Transit",
  };
}

// GET /api/track-live?tracking=XXX&courier=XXX&orderId=XXX
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const trackingNumber = searchParams.get("tracking")?.trim();
    const courierName = searchParams.get("courier")?.trim();
    const orderId = searchParams.get("orderId")?.trim();

    if (!trackingNumber || !courierName) {
      return NextResponse.json(
        { error: "tracking and courier are required" },
        { status: 400 },
      );
    }

    console.log(
      `🔍 FREE Tracking: ${trackingNumber} | Courier: ${courierName}`,
    );

    const supabase = getSupabase();

    // DB se order details fetch karo (shipped_at, estimated_days, courier_tracking_url)
    let shippedAt = new Date().toISOString();
    let estimatedDays = "5";
    let adminTrackingUrl: string | undefined;

    if (orderId) {
      const { data: order } = await supabase
        .from("orders")
        .select("shipped_at, estimated_days, courier_tracking_url")
        .eq("id", orderId)
        .single();

      if (order) {
        if (order.shipped_at) shippedAt = order.shipped_at;
        if (order.estimated_days) estimatedDays = order.estimated_days;
        if (order.courier_tracking_url)
          adminTrackingUrl = order.courier_tracking_url;
      }
    }

    // Timeline build karo (free, no API)
    const { checkpoints, delivered, estimated_delivery, status_message } =
      buildTimeline(trackingNumber, courierName, shippedAt, estimatedDays);

    // Courier tracking URL (direct link)
    const trackingUrl = getCourierTrackingUrl(
      courierName,
      trackingNumber,
      adminTrackingUrl,
    );

    // DB mein cache update karo
    if (orderId) {
      await supabase
        .from("orders")
        .update({
          live_tracking_data: {
            checkpoints,
            delivered,
            tracking_url: trackingUrl,
          },
          last_tracking_update: new Date().toISOString(),
        })
        .eq("id", orderId);
    }

    return NextResponse.json({
      tracking_number: trackingNumber,
      courier: courierName,
      delivered,
      estimated_delivery,
      last_updated: new Date().toISOString(),
      status_message,
      checkpoints,
      tracking_url: trackingUrl,
      used_api: false,
    });
  } catch (error: any) {
    console.error("❌ Track-live error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch tracking", checkpoints: [] },
      { status: 500 },
    );
  }
}
