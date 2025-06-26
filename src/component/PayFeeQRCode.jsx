import React, { useEffect, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";

function PayFeeQRCode({ onClose, titleAndFee }) {
  const [uniqueToken, setUniqueToken] = useState(Date.now());

  // Auto-regenerate QR code every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setUniqueToken(Date.now()); // or use a random UUID
    }, 10000); // 10 seconds

    return () => clearInterval(interval);
  }, []);

  const upiUrl = `upi://pay?pa=mab.037212021330114@axisbank&pn=Children's+Valley+English+School&am=${titleAndFee.fee}&cu=INR&tn=${titleAndFee.title}-${uniqueToken}`;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-25"
      onClick={() => onClose()}
    >
      <div className="relative p-4 transform scale-90 transition-transform duration-300 ease-out animate-zoomIn">
        <div
          className="flex flex-col items-center gap-4 bg-white rounded-lg shadow-lg p-6"
          onClick={(e) => e.stopPropagation()} // Prevent closing on inner click
        >
          <QRCodeCanvas value={upiUrl} size={200} />
          <a
            href={upiUrl}
            className="text-blue-500 underline mt-2"
            target="_blank"
            rel="noopener noreferrer"
          >
            Pay with UPI App
          </a>
          <p className="mt-2 text-lg font-semibold">Pay to {titleAndFee.title}</p>
        </div>
        <button
          className="absolute top-4 right-4 bg-red-600 text-white rounded-full px-3 py-1 text-lg"
          onClick={() => onClose()}
        >
          ✖
        </button>
      </div>
    </div>
  );
}

export default PayFeeQRCode;
