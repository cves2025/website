/**
 * Office QR (`/staff-qr`, admin): a full-screen page for a computer / tablet
 * in the office. Teachers scan it in the app at check-in / check-out when
 * the QR check is ON. The code is signed by the server and changes every
 * 20 seconds. The page is outside the panel, so the idle lock does not
 * cover it; nothing else of the panel is shown here.
 */
import { useContext } from "react";
import { Link } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { Maximize } from "lucide-react";

import { SCHOOL_NAME } from "../../../constants";
import Loader from "../../../custom-components/Loader";
import { useOfficeQr, useStaffAttendanceSettings } from "../../../hooks/useStaffAttendance";
import { myContext } from "../../context/MyContextProvider";

function OfficeQr() {
  const { user } = useContext(myContext);
  const isAdmin = user?.role === "admin";
  const { settings, loading } = useStaffAttendanceSettings();
  const { qr, error, secondsLeft } = useOfficeQr(isAdmin);

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100 p-6 text-center">
        <p className="font-semibold text-gray-700">Only the admin can open the office QR.</p>
      </div>
    );
  }

  const fullScreen = () => void document.documentElement.requestFullscreen?.().catch(() => undefined);
  const share = qr ? Math.min(secondsLeft / (qr.slotMs / 1000), 1) : 0;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-white p-6 text-center">
      <div>
        <p className="text-sm font-bold uppercase tracking-widest text-navy">{SCHOOL_NAME}</p>
        <h1 className="mt-1 text-3xl font-bold text-gray-800">Staff Attendance</h1>
        <p className="mt-1 text-gray-500">Open the CVES app &gt; My Attendance &gt; Check In, and scan this code.</p>
      </div>

      {!loading && !settings.qrCheck && (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800">
          The QR check is OFF in Attendance Settings, so teachers are not asked to scan it.
        </p>
      )}

      <div className="rounded-2xl border-4 border-navy p-5 shadow-lg">
        {qr ? (
          <QRCodeSVG value={qr.token} size={340} level="M" marginSize={1} />
        ) : (
          <div className="flex h-[340px] w-[340px] items-center justify-center">
            {error ? <p className="text-sm font-medium text-red-700">{error}</p> : <Loader label="Loading the QR..." />}
          </div>
        )}
      </div>

      <div className="w-full max-w-sm">
        <div className="h-2 overflow-hidden rounded-full bg-gray-100">
          <div className="h-full rounded-full bg-cves transition-[width] duration-500" style={{ width: `${share * 100}%` }} />
        </div>
        <p className="mt-2 text-sm text-gray-500">
          {error && qr ? "Reconnecting..." : `New code in ${secondsLeft} s`}
        </p>
      </div>

      <div className="flex gap-3 text-sm">
        <button
          type="button"
          onClick={fullScreen}
          className="flex items-center gap-2 rounded-md border border-gray-300 px-4 py-2 font-semibold text-navy hover:bg-navy-soft"
        >
          <Maximize className="h-4 w-4" /> Full screen
        </button>
        <Link
          to="/welcome/staff-attendance"
          className="rounded-md border border-gray-300 px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50"
        >
          Back to the panel
        </Link>
      </div>
    </div>
  );
}

export default OfficeQr;
