import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { QRCodeCanvas } from "qrcode.react";
import {
  COLLECTION,
  STAMP_SIGN_FIELDS,
  STAMP_SIGN_PRINCIPLE_DOC,
} from "../../../constants";
import { db } from "../../../firebase/config";
import { CardStudent, ExamDoc } from "../../../utils/type";
import { toOrdinalLabel } from "../../../utils/toOrdinalLabel";
import {
  formatScheduleDate,
  formatScheduleTime,
} from "./examScheduleShared";
import type { CardPaper } from "./useAdmitCardGenerator";
import schoolLogo from "../../../assets/image/schoolLogo.jpg";

/** Principal's signed+stamped image URL, read ONCE from the
    "stampSign"/"principle" document and cached for the whole session so every
    printed card shares the same single fetch (no repeated Firestore reads). */
let principalSignUrlPromise: Promise<string | null> | null = null;

function loadPrincipalSignUrl(): Promise<string | null> {
  if (!principalSignUrlPromise) {
    principalSignUrlPromise = getDoc(
      doc(db, COLLECTION.STAMP_SIGN, STAMP_SIGN_PRINCIPLE_DOC)
    )
      .then((snapshot) => {
        if (!snapshot.exists()) return null;
        const data = snapshot.data();
        const url = data ? data[STAMP_SIGN_FIELDS.PRINCIPLE_SIGN_WITH_STAMP] : undefined;
        return typeof url === "string" ? url : null;
      })
      // Never block the card for a missing/broken image document.
      .catch(() => null);
  }
  return principalSignUrlPromise;
}

/**
 * Prints one admit card schedule table. Shared by the written papers table and
 * the practical papers table shown below it.
 */
function AdmitScheduleTable({ papers }: { papers: CardPaper[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border border-gray-300 text-sm">
        <thead>
          <tr className="bg-gray-100 text-gray-800">
            <th className="border border-gray-300 px-3 py-2 text-left">
              Subject
            </th>
            <th className="border border-gray-300 px-3 py-2">Type</th>
            <th className="border border-gray-300 px-3 py-2">Date</th>
            <th className="border border-gray-300 px-3 py-2">Reporting Time</th>
            <th className="border border-gray-300 px-3 py-2">End Time</th>
            <th className="border border-gray-300 px-3 py-2">
              Invigilator Sign
            </th>
          </tr>
        </thead>
        <tbody>
          {papers.map((paper) => (
            <tr key={paper.id}>
              <td className="border border-gray-300 px-3 py-1 font-semibold">
                {paper.subject}
              </td>
              <td className="border border-gray-300 px-3 py-1 text-center">
                {paper.type || "-"}
              </td>
              <td className="border border-gray-300 px-3 py-1 text-center">
                {formatScheduleDate(paper.date)}
              </td>
              <td className="border border-gray-300 px-3 py-1 text-center">
                {formatScheduleTime(paper.fromTime)}
              </td>
              <td className="border border-gray-300 px-3 py-1 text-center">
                {formatScheduleTime(paper.toTime)}
              </td>
              <td className="border border-gray-300 px-3 py-1 text-center text-gray-400">
                &nbsp;
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface AdmitCardCardProps {
  /** Student the card is printed for. */
  card: CardStudent;
  /** Exam the card belongs to. */
  exam: ExamDoc;
  /** Written papers of the class (rendered in the first table). */
  writtenPapers: CardPaper[];
  /** Practical / viva papers of the class (rendered in the second table). */
  practicalPapers: CardPaper[];
}

/** One printed admit card. */
function AdmitCardCard({
  card,
  exam,
  writtenPapers,
  practicalPapers,
}: AdmitCardCardProps) {
  const [principalSignUrl, setPrincipalSignUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void loadPrincipalSignUrl().then((url) => {
      if (active) setPrincipalSignUrl(url);
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="mx-auto mt-2 max-w-3xl overflow-hidden rounded-xl border-4 border-double border-blue-800 bg-white shadow-lg print:break-after-page print:last:break-after-auto">
      {/* Card header */}
      <div className="border-b-4 border-double border-blue-800 bg-white px-4 py-2 md:px-6">
        <div className="flex items-center justify-between gap-3 text-sm font-semibold text-gray-600">
          <span>School Code: 09670911304</span>
          <span>Affiliation No.: 14203-05</span>
        </div>

        <div className="mt-1 flex items-start justify-center gap-3 sm:gap-4">
          <div className="h-24 w-24 shrink-0 overflow-hidden rounded sm:h-28 sm:w-28">
            <img
              src={schoolLogo}
              alt="school logo"
              className="h-full w-full scale-125 object-cover"
              loading="lazy"
            />
          </div>

          <div className="text-left sm:text-center">
            <h3 className="font-cancun text-lg sm:text-2xl font-extrabold tracking-tight leading-tight">
              <span className="text-green-700">CHILDREN&apos;S</span>{" "}
              <span className="text-indigo-800">VALLEY</span>{" "}
              <span className="text-red-600">ENGLISH</span>{" "}
              <span className="text-pink-600">SCHOOL</span>
            </h3>
            <p className="mt-0.5 text-xs font-semibold italic text-gray-700 md:text-sm">
              D 59/295 A, Mahmoorganj, Varanasi &middot; 0542-2220107,
              9336576690
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs sm:text-sm font-bold sm:justify-center">
              <span className="text-red-700">A Gov. Affiliated</span>
              <span className="text-green-700">C.B.S.E. Pattern</span>
              <span className="text-indigo-800">Co - Education</span>
            </div>
            <div className="mt-2 flex justify-center">
              <div className="inline-block rounded bg-pink-500 px-8 py-1 text-sm font-bold tracking-wide text-white md:text-base">
                ADMIT CARD
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Exam strip */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b-2 border-blue-800 bg-blue-50 px-4 py-1 text-sm md:px-6">
        <p>
          <span className="font-semibold">Examination:</span> {exam.examName}
        </p>
        <p>
          <span className="font-semibold">Session:</span>{" "}
          {card.academicYear || exam.academicYear || "-"}
        </p>
        <p>
          <span className="font-semibold">Class:</span>{" "}
          {toOrdinalLabel(card.className)}{" "}
          {card.section ? `- ${card.section}` : ""}
        </p>
      </div>

      {/* Student details + photo */}
      <div className="grid grid-cols-1 items-start gap-6 border-b border-gray-200 py-1 md:px-6 sm:grid-cols-[1fr_auto]">
        <div className="grid content-start grid-cols-1 gap-x-4 gap-y-1.5 text-sm">
          <p className="flex gap-1.5">
            <span className="w-28 shrink-0 font-semibold text-gray-600">
              Enrollment No.
            </span>
            <span>: {card.enrollment || "-"}</span>
          </p>
          <p className="flex gap-1.5">
            <span className="w-28 shrink-0 font-semibold text-gray-600">
              Student Name
            </span>
            <span>
              :{" "}
              {card.studentName ||
                `${card.firstName} ${card.lastName}`.trim() ||
                "-"}
            </span>
          </p>
          <p className="flex gap-1.5">
            <span className="w-28 shrink-0 font-semibold text-gray-600">
              Father&apos;s Name
            </span>
            <span>: {card.fatherName || "-"}</span>
          </p>
          <p className="flex gap-1.5">
            <span className="w-28 shrink-0 font-semibold text-gray-600">
              Mother&apos;s Name
            </span>
            <span>: {card.motherName || "-"}</span>
          </p>
        </div>
        <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded border-2 border-dashed border-gray-400 text-center text-xs text-gray-400">
          {card.studentPhoto ? (
            <img
              src={card.studentPhoto}
              alt="Student"
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="px-2">Affix recent photograph</span>
          )}
        </div>
      </div>

      {/* Subject wise schedule: the written papers table comes first, and the
          practical / viva papers of the same subjects are printed in their own
          table right below it. */}
      <div className="p-2 md:p-1">
        {writtenPapers.length > 0 && (
          <>
            <h4 className="mb-1 text-center font-bold text-gray-800">
              Subject-wise Exam Schedule
            </h4>
            <AdmitScheduleTable papers={writtenPapers} />
          </>
        )}

        {practicalPapers.length > 0 && (
          <>
            <h4 className="mb-1 mt-2 text-center font-bold text-gray-800">
              Practical / Viva-Voce Exam Schedule
            </h4>
            <AdmitScheduleTable papers={practicalPapers} />
          </>
        )}

        {/* Instructions */}
        <div className="mt-4 rounded-md border border-blue-200 bg-blue-50/60 p-3">
          <h5 className="text-sm font-bold text-gray-800">
            Instructions to the candidate
          </h5>
          <ol className="mt-2 list-inside list-decimal space-y-1 text-xs text-gray-700">
            <li>
              Reach the examination hall at least 15 minutes before the
              reporting time printed above.
            </li>
            <li>
              Bring this admit card along with a recent passport size
              photograph; entry is not allowed without it.
            </li>
            <li>
              Use only blue or black ink. Mobile phones and smart watches are
              strictly prohibited.
            </li>
            <li>
              Read every question carefully and write the answers in your own
              handwriting.
            </li>
            <li>
              The school is not responsible for any loss of personal belongings
              in the examination hall.
            </li>
          </ol>
        </div>

        {/* QR + signatures */}
        <div className="mt-6 flex flex-wrap items-end justify-between gap-6 text-sm text-gray-700">
          <div className="text-center">
            <p className="w-36 border-t-2 border-gray-400 pt-2">
              Class Teacher
            </p>
          </div>
          <div className="flex flex-col items-center gap-1">
            <QRCodeCanvas value="https://cves.in" size={72} />
            <span className="text-xs font-semibold text-gray-600">
              www.cves.in
            </span>
          </div>
          <div className="text-center">
            {principalSignUrl && (
              <img
                src={principalSignUrl}
                alt="Principal"
                className="mx-auto mb-1 h-32 w-32 object-contain"
              />
            )}
            <p className="w-36 border-t-2 border-gray-400 pt-2">Principal</p>
          </div>
        </div>

        <p className="mt-3 text-center text-xs text-gray-500">
          This admit card is valid only for {exam.examName}
          {exam.academicYear ? ` (${exam.academicYear})` : ""} and must be
          produced on every examination day.
        </p>
      </div>
    </div>
  );
}

export default AdmitCardCard;