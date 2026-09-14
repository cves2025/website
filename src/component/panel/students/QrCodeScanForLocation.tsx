import { QRCodeCanvas } from "qrcode.react";

const QrCodeScanForLocation = () => {
  return (
    <div className="flex flex-col items-center justify-center p-2 bg-white rounded-lg">
      <QRCodeCanvas
        value="D 59/295 A, Mahmoorganj, Varanasi : 0542-2220107, 9336576690"
        size={80}
        className="border-2 border-pink-500 rounded-lg p-2"
      />
      <div className="text-[8px] text-center text-slate-600">
        <span className="w-16">Scan for Location</span>
      </div>
    </div>
  );
};

export default QrCodeScanForLocation;
