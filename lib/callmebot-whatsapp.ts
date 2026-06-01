// lib/callmebot-whatsapp.ts
// ✅ COMPLETE CALLLMEBOT WHATSAPP INTEGRATION
// 100% FREE - Germany based servers
// Supports ALL countries: UK (+44), USA (+1), Australia (+61), Pakistan (+92), etc.

export interface CallMeBotResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

// ============================================
// PHONE NUMBER FORMATTER - ALL COUNTRIES
// ============================================
function formatPhoneForCallMeBot(phoneNumber: string): string {
  let clean = phoneNumber.trim().replace(/[\s\-\(\)]/g, "");

  // If starts with +, remove it
  if (clean.startsWith("+")) {
    clean = clean.slice(1);
  }
  // Pakistan local format: 03001234567 → 923001234567
  else if (clean.startsWith("0") && clean.length === 11 && clean[1] === "3") {
    clean = "92" + clean.slice(1);
  }

  // Remove any non-digits
  clean = clean.replace(/\D/g, "");

  console.log(`📱 CallMeBot formatted: "${phoneNumber}" → "${clean}"`);
  return clean;
}

// ============================================
// SEND TEXT MESSAGE VIA CALLMEBOT
// ============================================
export async function sendCallMeBotWhatsApp(
  phoneNumber: string,
  message: string,
): Promise<CallMeBotResponse> {
  const apiKey = process.env.CALLMEBOT_API_KEY;

  if (!apiKey) {
    console.error("❌ CALLMEBOT_API_KEY not configured in .env.local");
    return { success: false, error: "CALLMEBOT_API_KEY not configured" };
  }

  const formattedPhone = formatPhoneForCallMeBot(phoneNumber);
  const encodedMessage = encodeURIComponent(message);

  // CallMeBot API endpoint
  const url = `https://api.callmebot.com/whatsapp.php?phone=${formattedPhone}&text=${encodedMessage}&apikey=${apiKey}`;

  console.log(`📱 Sending WhatsApp via CallMeBot to: ${formattedPhone}`);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "text/plain",
      },
    });

    const result = await response.text();
    console.log("CallMeBot response:", result);

    // Check for success responses
    if (
      result.includes("OK") ||
      result.includes("Message") ||
      result.includes("success")
    ) {
      console.log(`✅ WhatsApp sent via CallMeBot!`);
      return {
        success: true,
        messageId: `callmebot_${Date.now()}_${formattedPhone}`,
      };
    } else if (result.includes("ERROR") || result.includes("error")) {
      console.error(`❌ CallMeBot error: ${result}`);
      return { success: false, error: result };
    } else {
      // Sometimes CallMeBot returns success without explicit OK
      if (response.ok) {
        return {
          success: true,
          messageId: `callmebot_${Date.now()}_${formattedPhone}`,
        };
      }
      return { success: false, error: result };
    }
  } catch (error: any) {
    console.error(`❌ CallMeBot fetch error:`, error.message);
    return { success: false, error: error.message };
  }
}

// ============================================
// SEND IMAGE WITH CAPTION VIA CALLMEBOT
// ============================================
export async function sendCallMeBotWhatsAppMedia(
  phoneNumber: string,
  caption: string,
  imageUrl: string,
): Promise<CallMeBotResponse> {
  const apiKey = process.env.CALLMEBOT_API_KEY;

  if (!apiKey) {
    console.error("❌ CALLMEBOT_API_KEY not configured");
    return { success: false, error: "CALLMEBOT_API_KEY not configured" };
  }

  // Validate image URL
  if (!imageUrl || !imageUrl.startsWith("http")) {
    console.warn("⚠️ Invalid image URL for CallMeBot:", imageUrl);
    return { success: false, error: "Invalid image URL" };
  }

  const formattedPhone = formatPhoneForCallMeBot(phoneNumber);
  const encodedCaption = encodeURIComponent(caption);
  const encodedImageUrl = encodeURIComponent(imageUrl);

  // CallMeBot media endpoint
  const url = `https://api.callmebot.com/whatsapp.php?phone=${formattedPhone}&text=${encodedCaption}&apikey=${apiKey}&media=${encodedImageUrl}`;

  console.log(`🖼️ Sending WhatsApp image via CallMeBot to: ${formattedPhone}`);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "text/plain",
      },
    });

    const result = await response.text();

    if (
      result.includes("OK") ||
      result.includes("Message") ||
      result.includes("success")
    ) {
      console.log(`✅ WhatsApp image sent via CallMeBot!`);
      return { success: true };
    } else {
      console.warn(`⚠️ CallMeBot image send might have failed: ${result}`);
      // Don't fail completely if image fails, text still might work
      return { success: false, error: result };
    }
  } catch (error: any) {
    console.error(`❌ CallMeBot image error:`, error.message);
    return { success: false, error: error.message };
  }
}
