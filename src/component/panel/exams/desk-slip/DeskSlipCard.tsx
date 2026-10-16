import React from "react";

export interface DeskSlipCardProps {
  admissionNo: string;
  className: string;
  section: string;
  examName: string;
  session: string;
  studentName: string;
  fatherName: string;
  photoUrl?: string;
}

const DeskSlipCard: React.FC<DeskSlipCardProps> = ({
  admissionNo,
  className,
  section,
  examName,
  session,
  studentName,
  fatherName,
  photoUrl,
}) => (
  <div className="box-border h-[4cm] w-[9cm] break-inside-avoid overflow-hidden border border-dashed border-gray-400 bg-white p-[1mm]">
    <div className="flex h-full flex-col border border-gray-400 bg-white font-sans text-[12px] leading-tight text-gray-800">
      {/* Header */}
      <div className="shrink-0 border-b border-gray-400 bg-gray-200 py-[3px] text-center text-[10px] font-bold tracking-wide">
        STUDENT EXAM DESK SLIP
      </div>

      {/* Body: Details (left) | Photo (right, full height) */}
      <div className="flex min-h-0 flex-1 items-stretch border-b border-gray-400">
        {/* Left: all details */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="border-b border-gray-400 px-1.5 py-[3px]">
            Admission No : <strong>{admissionNo || "-"}</strong>
          </div>

          <div className="border-b border-gray-400 px-1.5 py-[3px]">
            Class :{" "}
            <strong>
              {className}
              {section ? ` - ${section}` : ""}
            </strong>
          </div>

          <div className="border-b border-gray-400 bg-gray-100 px-1.5 py-[3px] text-[9px] font-bold">
            Valid For : {examName} : {session}
          </div>

          <div className="flex flex-1 flex-col justify-around px-1.5 py-[3px]">
            <div className="truncate">
              Name : <span className="font-medium">{studentName}</span>
            </div>
            <div className="truncate">
              Father Name :{" "}
              <span className="font-medium">{fatherName || "-"}</span>
            </div>
          </div>
        </div>

        {/* Right: photo takes the full right side */}
        <div className="relative w-[2.6cm] shrink-0 overflow-hidden border-l border-gray-400 bg-white">
          {photoUrl ? (
            <img
              src={photoUrl}
              alt={studentName}
              className="absolute inset-0 h-full w-full object-contain object-center"
            />
          ) : (
            <svg
              viewBox="0 0 100 120"
              preserveAspectRatio="xMidYMid meet"
              className="absolute inset-0 h-full w-full"
            >
              <rect width="100" height="120" fill="#e8737a" />
              <path d="M10 120 Q50 80 90 120 Z" fill="#3b6fb6" />
              <rect x="43" y="78" width="14" height="14" fill="#f2c9a5" />
              <ellipse cx="50" cy="52" rx="20" ry="25" fill="#f2c9a5" />
              <path
                d="M28 48 Q30 22 50 24 Q72 22 72 48 Q62 34 50 36 Q38 34 28 48 Z"
                fill="#3a2a22"
              />
              <path d="M44 92 L50 108 L56 92 Z" fill="#c0392b" />
            </svg>
          )}
        </div>
      </div>

      {/* Note */}
      <div className="shrink-0 bg-gray-50 px-1.5 py-[2px] text-[8px]">
        Note : Entry without Admit Card is not allowed during exam.
      </div>
    </div>
  </div>
);

export default DeskSlipCard;