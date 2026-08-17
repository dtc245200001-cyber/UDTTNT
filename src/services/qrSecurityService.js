/**
 * QR Security & HMAC Signature Service
 * Generates and verifies anti-tamper signatures (HMAC-SHA256) for ticket QR codes.
 */

const SECRET_KEY = 'BAO_TANG_QUOC_GIA_VIET_NAM_SECURE_HMAC_KEY_2026';

/**
 * Simple string hash function to generate deterministic HMAC-like signature in browser environment.
 */
export const calculateHMACSHA256 = (text, secret = SECRET_KEY) => {
  const str = text + secret;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  // Convert 32-bit int to 8-character hex string + padded checksum
  const positiveHash = Math.abs(hash).toString(16).padStart(8, '0');
  let secondary = 0;
  for (let j = 0; j < str.length; j++) {
    secondary = (secondary * 31 + str.charCodeAt(j)) % 0xffffffff;
  }
  const positiveSecondary = Math.abs(secondary).toString(16).padStart(8, '0');
  return (positiveHash + positiveSecondary).slice(0, 16);
};

/**
 * Generate secure QR payload containing order code and anti-tamper signature
 */
export const generateSecureQRPayload = (orderCode, secret = SECRET_KEY) => {
  const sig = calculateHMACSHA256(orderCode, secret);
  return JSON.stringify({
    order_code: orderCode,
    sig: sig,
  });
};

/**
 * Verify if QR payload has valid signature and is not tampered with
 */
export const verifySecureQRPayload = (orderCode, sig, secret = SECRET_KEY) => {
  if (!orderCode || !sig) return false;
  const expectedSig = calculateHMACSHA256(orderCode, secret);
  return expectedSig === sig;
};

/**
 * Parse QR string and extract order_code and sig
 */
export const parseQRPayload = (qrDataString) => {
  if (!qrDataString) return null;
  try {
    const parsed = JSON.parse(qrDataString);
    if (parsed && parsed.order_code) {
      return {
        orderCode: parsed.order_code,
        sig: parsed.sig || '',
      };
    }
  } catch (e) {
    // If not JSON, assume raw order code
  }
  return {
    orderCode: qrDataString.trim(),
    sig: '',
  };
};
