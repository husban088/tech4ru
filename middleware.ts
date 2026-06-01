import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ✅ SIMPLE MIDDLEWARE — Koi server-side auth check nahi
// Kyun? supabase.ts mein storageKey:"sb-auth-token" set hai
// jo session ko localStorage mein store karta hai, cookies mein nahi.
// Middleware sirf cookies access kar sakta hai — localStorage nahi.
// Isliye yahan check karna HAMESHA fail hoga aur signin redirect hoga.
// Auth guard layout.tsx (client-side) handle karta hai — woh perfectly kaam karta hai.

export async function middleware(req: NextRequest) {
  const response = NextResponse.next();

  // ✅ CRITICAL: bfcache disable karo
  // Chrome "Cache-Control: no-store" dekh ke bfcache use NAHI karta
  // Back/forward pe hamesha fresh server request jaayegi
  // → sab Supabase connections fresh → ERR_CONNECTION_CLOSED khatam
  response.headers.set(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate",
  );
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");

  // ✅ Additional: bfcache explicitly disable karo
  response.headers.set("Surrogate-Control", "no-store");

  return response;
}

export const config = {
  matcher: [
    // ✅ Sare HTML pages — back/forward pe fresh load ke liye
    // Static files, images, fonts exclude kiye hain
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|eot|css|js)$).*)",
  ],
};
