import React from "react";
import { QRCodeCanvas } from "qrcode.react";

const QRCodeComponent = () => {
  const date = new Date();
  const currentMonth = date.toLocaleString("default", { month: "long" });

  const schoolPhoneNumber = "+919336576690"; // Replace with actual school number

  // Conditional message based on the month
  const message =
    ["August", "September", "October", "November", "December", "January"].includes(currentMonth)
      ? encodeURIComponent("Hello, I would like to inquire about the School.")
      : encodeURIComponent("Hello, I would like to inquire about the School Admission process.");

  const whatsappLink = `https://wa.me/${schoolPhoneNumber}?text=${message}`;

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4 text-gray-700">
        Scan to Open WhatsApp for Inquiry
      </h2>
      <QRCodeCanvas
        value={whatsappLink}
        size={300}
        className="border-4 border-green-500 rounded-lg p-2 shadow-md"
      />
      <a
        href={whatsappLink}
        className="mt-5 px-6 py-3 text-lg font-semibold text-white bg-green-500 rounded-lg shadow-md hover:bg-green-600 transition duration-300"
        target="_blank"
        rel="noopener noreferrer"
      >
        📩 Click Here for Inquiry
      </a>
    </div>
  );
};

export default QRCodeComponent;
