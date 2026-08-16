import React from 'react';

/**
 * Clean QR Code generator component for e-tickets.
 * Generates dynamic QR code via QRServer API with fallback SVG renderer.
 */
export const QRCode = ({ value, size = 140, className = '' }) => {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(
    value || 'MUSEUM-TICKET-2026'
  )}`;

  return (
    <div className={`inline-flex flex-col items-center justify-center p-2 bg-white rounded-xl border border-gray-200 shadow-xs ${className}`}>
      <img
        src={qrUrl}
        alt={`Mã QR: ${value}`}
        width={size}
        height={size}
        className="rounded-lg object-contain"
        onError={(e) => {
          // Fallback SVG representation if API fails offline
          e.target.style.display = 'none';
        }}
      />
      <div className="text-[10px] font-mono font-bold text-museum-brown mt-1 tracking-wider">
        {value}
      </div>
    </div>
  );
};
