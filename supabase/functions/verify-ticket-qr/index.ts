// Supabase Edge Function: verify-ticket-qr
// Xác thực tính hợp lệ của chữ ký QR vé bảo tàng phía server (Server-side Verification)

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
    const secret = Deno.env.get("QR_SIGNING_SECRET");
    if (!secret) {
      return new Response(
        JSON.stringify({ error: "Server misconfigured: QR_SIGNING_SECRET not set." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const { order_code, sig } = await req.json();

    if (!order_code || !sig) {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: "Thiếu thông vị trí 'order_code' hoặc chữ ký 'sig'." 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cleanOrderCode = order_code.trim();
    const cleanSig = sig.trim();
    const expectedSig = await createHmacSha256Signature(cleanOrderCode, secret);

    // So sánh chữ ký an toàn
    const isValid = expectedSig.toLowerCase() === cleanSig.toLowerCase();

    return new Response(
      JSON.stringify({
        valid: isValid,
        order_code: cleanOrderCode,
        message: isValid ? "Chữ ký vé bảo tàng hợp lệ." : "Chữ ký không hợp lệ hoặc vé có dấu hiệu bị giả mạo!"
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ valid: false, error: error.message || "Lỗi xác thực chữ ký vé" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
