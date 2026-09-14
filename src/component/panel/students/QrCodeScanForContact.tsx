import { QRCodeCanvas } from "qrcode.react";

const QrCodeScanForContact = () => {
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
    <div className="flex flex-col items-center justify-center p-2 bg-white rounded-lg">      
      <QRCodeCanvas
        value={whatsappLink}
        size={80}
        className="border-2 border-pink-500 rounded-lg p-2"
      /> 
      <div className="text-[8px] text-center text-slate-600">                
                <span className="w-16">Scan for Contact</span>
              </div>   
    </div>
  );
};

export default QrCodeScanForContact;
