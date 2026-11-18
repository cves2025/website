/**
 * Public page the QR code of a Transfer Certificate opens
 * (`/verify-tc/<tcId>`, no login). Shows whether the TC is valid or
 * cancelled, from `tcVerify/{tcId}`; only a few facts, no DOB / address / fees.
 */
import { useParams } from "react-router-dom";

import Loader from "../custom-components/Loader";
import useTcVerify from "../hooks/useTcVerify";
import { tcDateText } from "../utils/transferCertificate";

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-gray-100 py-2.5 last:border-b-0 sm:flex-row sm:gap-4">
      <dt className="text-sm text-gray-500 sm:w-44 sm:shrink-0">{label}</dt>
      <dd className="font-semibold text-gray-900 break-words">{value || "-"}</dd>
    </div>
  );
}

function TcVerify() {
  const { tcId = "" } = useParams();
  const { record, loading, error } = useTcVerify(tcId);

  return (
    <div className="mx-auto my-8 w-full max-w-xl px-4">
      <h1 className="text-center text-2xl font-extrabold text-gray-900 sm:text-3xl">
        Transfer Certificate <span className="text-primaryPink">Verification</span>
      </h1>
      <div className="mx-auto mt-2 h-1 w-24 rounded-full bg-cves" />

      <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <Loader fullScreen={false} label="Checking the certificate..." />
        ) : error ? (
          <p className="px-5 py-8 text-center font-semibold text-red-700">{error}</p>
        ) : !record ? (
          <div className="flex flex-col items-center gap-2 bg-red-50 px-5 py-8 text-center">
            <span className="text-4xl" aria-hidden>
              ⚠️
            </span>
            <p className="text-lg font-bold text-red-700">Certificate not found</p>
            <p className="text-sm text-red-700">
              This QR code does not belong to a Transfer Certificate issued by the school. Please contact the school
              office.
            </p>
          </div>
        ) : (
          <>
            {record.status === "cancelled" ? (
              <div className="flex flex-col items-center gap-1 bg-red-50 px-5 py-6 text-center">
                <span className="text-4xl" aria-hidden>
                  ❌
                </span>
                <p className="text-lg font-bold text-red-700">This certificate has been CANCELLED</p>
                {record.cancelledAt && (
                  <p className="text-sm text-red-700">Cancelled on {tcDateText(record.cancelledAt.slice(0, 10))}</p>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1 bg-emerald-50 px-5 py-6 text-center">
                <span className="text-4xl" aria-hidden>
                  ✅
                </span>
                <p className="text-lg font-bold text-emerald-700">Valid Transfer Certificate</p>
                <p className="text-sm text-emerald-700">Issued by {record.schoolName || "the school"}</p>
              </div>
            )}
            <dl className="px-5 py-3">
              <Fact label="TC No." value={record.tcNo} />
              <Fact label="Student's name" value={record.studentName} />
              <Fact label="Father's name" value={record.fatherName} />
              <Fact label="Class (last studied)" value={record.lastClass} />
              <Fact label="Session" value={record.session} />
              <Fact label="Struck off the rolls on" value={tcDateText(record.struckOffDate)} />
              <Fact label="Date of issue" value={tcDateText(record.issueDate)} />
            </dl>
          </>
        )}
      </div>

      <p className="mt-4 text-center text-xs text-gray-500">
        The details above come from the school's records at this moment. If they differ from the printed
        certificate, please contact the school office.
      </p>
    </div>
  );
}

export default TcVerify;
