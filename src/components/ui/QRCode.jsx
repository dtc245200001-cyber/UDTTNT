import React from 'react';

/**
 * Clean QR Code generator component for e-tickets.
 * Generates dynamic QR code via QRServer API with quiet zone and clean white container.
 */
export const QRCode = ({ value, size = 180, className = '' }) => {
  const qrData = value || 'MUSEUM-TICKET-2026';
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=8&data=${encodeURIComponent(
    qrData
  )}`;

  return (
    <div className={`inline-flex items-center justify-center p-3.5 bg-white rounded-2xl border border-museum-gold/30 shadow-xs ${className}`}>
      <img
        src={qrUrl}
        alt="Mã QR Vé Điện Tử"
        width={size}
        height={size}
        className="rounded-xl object-contain"
        onError={(e) => {
          e.target.onerror = null;
        }}
      />
    </div>
  );
};
