// app/api/upload-receipt/route.ts
//
// Receives the payment-receipt image from ReceiptPaymentMethod.tsx (Bank Transfer /
// JazzCash) and stores it in Supabase Storage, returning a public URL.
//
// ⚠️ Assumes the project already uses Supabase (as your other routes do) and that a
// public storage bucket named "receipts" exists. Create it once in the Supabase
// dashboard (Storage → New bucket → name: "receipts" → Public bucket: ON) or run:
//   supabase storage buckets create receipts --public
//
// Adjust the import path below to match wherever your project creates its Supabase
// server client (e.g. the same helper used in /api/save-order).

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const orderNumber = (formData.get("orderNumber") as string) || "unknown";
    const method = (formData.get("method") as string) || "manual";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Only image files are allowed" },
        { status: 400 },
      );
    }

    if (file.size > 8 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large (max 8MB)" },
        { status: 400 },
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const ext = file.name.split(".").pop() || "jpg";
    const fileName = `${method}/${orderNumber}-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("receipts")
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Supabase upload error:", uploadError);
      return NextResponse.json(
        { error: "Failed to upload receipt. Please try again." },
        { status: 500 },
      );
    }

    const { data: publicUrlData } = supabase.storage
      .from("receipts")
      .getPublicUrl(fileName);

    return NextResponse.json({ url: publicUrlData.publicUrl });
  } catch (error) {
    console.error("upload-receipt error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
