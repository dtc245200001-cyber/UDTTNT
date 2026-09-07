// Supabase Edge Function: sign-ticket-qr
// Ký số chống giả mạo mã QR vé tham quan bảo tàng bằng HMAC-SHA256 (Server-side)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

async function createHmacSha256Signature(message: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const msgData = encoder.encode(message);

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signatureBuffer = await crypto.subtle.sign("HMAC", cryptoKey, msgData);
  const signatureArray = Array.from(new Uint8Array(signatureBuffer));
  return signatureArray.map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

serve(async (req) => {
  // Xử lý CORS Preflight request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const secret = Deno.env.get("QR_SIGNING_SECRET") || "BAO_TANG_QUOC_GIA_VIET_NAM_SECURE_HMAC_KEY_2026";
    const { order_code } = await req.json();

    if (!order_code || typeof order_code !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing or invalid 'order_code' parameter." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cleanOrderCode = order_code.trim();
    const sig = await createHmacSha256Signature(cleanOrderCode, secret);

    return new Response(
      JSON.stringify({
        success: true,
        order_code: cleanOrderCode,
        sig: sig,
        signed_at: new Date().toISOString()
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message || "Internal Server Error in sign-ticket-qr" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
