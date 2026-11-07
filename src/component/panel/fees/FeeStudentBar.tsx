import { useEffect, useState } from "react";
import { Bus, PlusCircle, RefreshCw, Tags } from "lucide-react";

import { CVES_ON_HOVER } from "../../../constants";
import { formatRupees, monthLabel } from "../../../utils/feeStructure";
import { toOrdinalLabel } from "../../../utils/toOrdinalLabel";
import type { FeeAccount } from "../../../utils/type";

export type StudentBarAction = "special" | "transport" | "extra" | "refresh";

interface FeeStudentBarProps {
  account: FeeAccount;
  enrollmentNo: string;
  rollNumber: number;
  fatherName: string;
  photo: string;
  /**
   * "card": the full student card at the top of the fees.
   * "bar": the slim full-width bar shown at the top while scrolling.
   */
  variant: "card" | "bar";
  disabled?: boolean;
  onAction: (action: StudentBarAction) => void;
}

const ACTIONS = [
  { kind: "special" as const, label: "Special Fee", icon: Tags },
  { kind: "transport" as const, label: "Transport", icon: Bus },
  { kind: "extra" as const, label: "Extra Charge", icon: PlusCircle },
  { kind: "refresh" as const, label: "Refresh", icon: RefreshCw },
];

/** The student's photo (whole, never cropped), or the initials without one. */
function StudentAvatar({ name, photo, small }: { name: string; photo: string; small: boolean }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [photo]);

  const frame = `${small ? "h-11 w-9" : "h-20 w-16"} shrink-0 overflow-hidden rounded-md border-2 border-white shadow ring-1 ring-primaryBlue/25`;

  if (photo && !failed) {
    return (
      <div className={`${frame} bg-white`}>
        <img
          src={photo}
          alt={name}
          onError={() => setFailed(true)}
          className="h-full w-full object-cover object-top"
        />
      </div>
    );
  }
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  return (
    <div
      className={`${frame} grid place-items-center bg-primaryBlue font-bold text-white ${small ? "text-sm" : "text-lg"}`}
    >
      {initials || "?"}
    </div>
  );
}

/**
 * The student being charged, with the account actions: as the full card,
 * or as the slim bar that stands in for it while scrolling.
 */
function FeeStudentBar({
  account,
  enrollmentNo,
  rollNumber,
  fatherName,
  photo,
  variant,
  disabled,
  onAction,
}: FeeStudentBarProps) {
  const isBar = variant === "bar";
  const details = [
    { label: "Enrollment No.", value: enrollmentNo },
    { label: "Roll No.", value: rollNumber ? String(rollNumber) : "" },
    { label: "Father", value: fatherName },
  ];

  const info = (
    <div className="flex min-w-0 items-center gap-3">
      <StudentAvatar name={account.studentName} photo={photo} small={isBar} />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className={`font-bold leading-tight text-gray-900 ${isBar ? "text-base" : "text-lg"}`}>
            {account.studentName}
          </p>
          <span className="rounded-md bg-primaryBlue/10 px-2 py-0.5 text-xs font-semibold text-primaryBlue">
            Class {toOrdinalLabel(account.className)} - {account.section}
          </span>
        </div>
        <dl
          className={`flex flex-wrap items-center gap-x-5 gap-y-1 ${isBar ? "mt-0.5 text-xs" : "mt-1.5 text-sm"}`}
        >
          {details.map((item) => (
            <div key={item.label} className="flex min-w-0 items-baseline gap-1.5">
              <dt className="text-gray-500">{item.label}:</dt>
              <dd className="break-words font-semibold text-gray-800">{item.value || "-"}</dd>
            </div>
          ))}
        </dl>
        {!isBar && (
          <div className="mt-2 flex flex-wrap gap-1.5 text-xs font-semibold empty:hidden">
            {account.specialMonthlyFee !== null && (
              <span className="rounded-full bg-purple-100 px-2 py-0.5 text-purple-700">
                Special fee {formatRupees(account.specialMonthlyFee)}/month
              </span>
            )}
            {account.transport && (
              <span className="rounded-full bg-sky-100 px-2 py-0.5 text-sky-700">
                Transport {formatRupees(account.transport.amount)}/month (
                {monthLabel(account.transport.fromMonth).slice(0, 3)} -{" "}
                {monthLabel(account.transport.toMonth).slice(0, 3)})
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );

  const buttons = ACTIONS.map(({ kind, label, icon: Icon }) => (
    <button
      key={kind}
      type="button"
      disabled={disabled}
      onClick={() => onAction(kind)}
      title={kind === "refresh" ? "Refresh the fees from the Fee Structure" : undefined}
      // White at rest, the school-colour gradient on hover.
      className={`flex items-center justify-center gap-1.5 rounded-md border border-gray-300 bg-white font-semibold text-gray-700 transition disabled:opacity-50 ${CVES_ON_HOVER} ${
        isBar ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  ));

  // Layouts follow the width of the card's own column (container queries),
  // not the screen: with the sidebar open the column is much narrower.
  if (isBar) {
    return (
      <div className="[container-type:inline-size]">
        <div className="flex flex-col gap-2 rounded-lg border border-primaryBlue/30 bg-gradient-to-r from-indigo-50 via-white to-white px-4 py-2 shadow-lg [@container(min-width:52rem)]:flex-row [@container(min-width:52rem)]:items-center [@container(min-width:52rem)]:justify-between">
          {info}
          <div className="flex shrink-0 flex-wrap gap-2">{buttons}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="[container-type:inline-size]">
      <div className="flex flex-col divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white [@container(min-width:40rem)]:flex-row [@container(min-width:40rem)]:divide-x [@container(min-width:40rem)]:divide-y-0">
        <div className="min-w-0 flex-1 rounded-t-lg bg-gradient-to-r from-indigo-50 to-white p-4 [@container(min-width:40rem)]:rounded-l-lg [@container(min-width:40rem)]:rounded-tr-none">
          {info}
        </div>
        <div className="grid shrink-0 grid-cols-2 content-center gap-2 bg-gray-50/60 p-4 [@container(min-width:28rem)]:grid-cols-4 [@container(min-width:40rem)]:w-80 [@container(min-width:40rem)]:grid-cols-2">
          {buttons}
        </div>
      </div>
    </div>
  );
}

export default FeeStudentBar;
