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
import schoolLogo from "../../../assets/image/schoolLogo1.png";
import FitText from "../../../custom-components/FitText";

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
 * Compares two schedule papers by exam date, so the printed table always
 * follows the calendar order of the examination. Papers of the same date are
 * ordered by their reporting time, then end time and subject.
 *
 * Dates are stored as "yyyy-MM-dd" and times as 24h "HH:mm", so both compare
 * chronologically as plain strings.
 */
function comparePapersByDate(a: CardPaper, b: CardPaper): number {
  if (a.date && b.date) {
    const dateOrder = a.date.localeCompare(b.date);
    if (dateOrder !== 0) return dateOrder;
  } else if (a.date) {
    return -1;
  } else if (b.date) {
    return 1;
  }

  const timeToMinutes = (value: string): number => {
    const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
    return match ? Number(match[1]) * 60 + Number(match[2]) : Number.MAX_VALUE;
  };
  const fromOrder = timeToMinutes(a.fromTime) - timeToMinutes(b.fromTime);
  if (fromOrder !== 0) return fromOrder;
  const toOrder = timeToMinutes(a.toTime) - timeToMinutes(b.toTime);
  if (toOrder !== 0) return toOrder;
  return a.subject.localeCompare(b.subject);
}

const CELL = "border border-gray-300 px-2 py-0.5 overflow-hidden";

/**
 * Prints one admit card schedule table. Shared by the written papers table and
 * the practical papers table shown below it.
 * Fixed column widths + single-line FitText cells keep every row on one line.
 */
function AdmitScheduleTable({ papers }: { papers: CardPaper[] }) {
  // Show the papers in the calendar order of the exam (date-wise). The input
  // list is never mutated; the copy is sorted instead.
  const sortedPapers = [...papers].sort(comparePapersByDate);
  return (
    <div className="overflow-x-auto print:overflow-visible">
      <table className="w-full table-fixed border border-gray-300 text-sm">
        <colgroup>
          <col style={{ width: "28%" }} />
          <col style={{ width: "12%" }} />
          <col style={{ width: "17%" }} />
          <col style={{ width: "15%" }} />
          <col style={{ width: "13%" }} />
          <col style={{ width: "15%" }} />
        </colgroup>
        <thead>
          <tr className="bg-gray-100 text-gray-800">
            <th className={`${CELL} text-left`}>
              <FitText>Subject</FitText>
            </th>
            <th className={CELL}>
              <FitText className="text-center">Type</FitText>
            </th>
            <th className={CELL}>
              <FitText className="text-center">Date</FitText>
            </th>
            <th className={CELL}>
              <FitText className="text-center">Reporting Time</FitText>
            </th>
            <th className={CELL}>
              <FitText className="text-center">End Time</FitText>
            </th>
            <th className={CELL}>
              <FitText className="text-center">Invigilator Sign</FitText>
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedPapers.map((paper) => (
            <tr key={paper.id} className="print:break-inside-avoid">
              <td className={`${CELL} font-semibold`}>
                <FitText>{paper.subject}</FitText>
              </td>
              <td className={CELL}>
                <FitText className="text-center">{paper.type || "-"}</FitText>
              </td>
              <td className={CELL}>
                <FitText className="text-center">
                  {formatScheduleDate(paper.date)}
                </FitText>
              </td>
              <td className={CELL}>
                <FitText className="text-center">
                  {formatScheduleTime(paper.fromTime)}
                </FitText>
              </td>
              <td className={CELL}>
                <FitText className="text-center">
                  {formatScheduleTime(paper.toTime)}
                </FitText>
              </td>
              <td className={`${CELL} text-center text-gray-400`}>&nbsp;</td>
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

/** Label + single-line value row used in the student details block. */
function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <p className="flex gap-1.5">
      <span className="w-28 shrink-0 font-semibold text-gray-600">{label}</span>
      <FitText className="flex-1">: {value}</FitText>
    </p>
  );
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

  const studentName =
    card.studentName || `${card.firstName} ${card.lastName}`.trim() || "-";

  return (
    <div className="mx-auto mt-2 max-w-4xl overflow-hidden rounded-xl border-4 border-double border-blue-800 bg-white shadow-lg print:break-after-page print:break-inside-avoid print:last:break-after-auto">
      {/* Card header */}
      <div className="border-b-4 border-double border-blue-800 bg-white px-4 py-2 md:px-6">
        <div className="flex items-center justify-between gap-3 text-sm font-semibold text-black">
          <FitText className="flex-1">School Code: 09670911304</FitText>
          <FitText className="flex-1 text-right">
            Affiliation No.: 14203-05
          </FitText>
        </div>

        <div className="mt-1 flex items-start justify-center gap-3 sm:gap-4">
          <div className="h-24 w-24 shrink-0 overflow-hidden rounded sm:h-28 sm:w-28">
            <img
              src={schoolLogo}
              alt="school logo"
              className="h-full w-full scale-125 object-cover grayscale"
              loading="lazy"
            />
          </div>

          <div className="min-w-0 flex-1 text-left sm:text-center">
            <h3 className="text-lg font-extrabold leading-tight tracking-tight text-black sm:text-2xl">
              <FitText>CHILDREN&apos;S VALLEY ENGLISH SCHOOL</FitText>
            </h3>
            <p className="mt-0.5 text-xs font-semibold italic text-black md:text-sm">
              <FitText>
                D 59/295 A, Mahmoorganj, Varanasi &middot; 0542-2220107,
                9336576690
              </FitText>
            </p>
            <div className="mt-1 text-xs font-bold text-black sm:text-sm">
              <FitText>
                <span className="mr-3">A Gov. Affiliated</span>
                <span className="mr-3">C.B.S.E. Pattern</span>
                <span>Co - Education</span>
              </FitText>
            </div>
            <div className="mt-2 flex justify-center">
              <div className="inline-block rounded bg-black px-8 py-1 text-sm font-bold tracking-wide text-white md:text-base [-webkit-print-color-adjust:exact] [print-color-adjust:exact]">
                ADMIT CARD
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Exam strip */}
      <div className="flex items-center justify-between gap-x-4 border-b-2 border-blue-800 bg-blue-50 px-4 py-1 text-sm md:px-6">
        <FitText className="flex-1">
          <span className="font-semibold">Session:</span>{" "}
          {card.academicYear || exam.academicYear || "-"}
        </FitText>
        <FitText className="flex-[2] text-center">
          <span className="font-semibold">Examination:</span> {exam.examName}
        </FitText>
        <FitText className="flex-1 text-right">
          <span className="font-semibold">Class:</span>{" "}
          {toOrdinalLabel(card.className)}{" "}
          {card.section ? `- ${card.section}` : ""}
        </FitText>
      </div>

      {/* Student details + photo */}
      <div className="grid grid-cols-1 items-start gap-6 border-b border-gray-200 px-4 py-1 sm:grid-cols-[minmax(0,1fr)_auto] md:px-6 print:grid-cols-[minmax(0,1fr)_auto] print:px-6">
        <div className="grid min-w-0 grid-cols-1 content-start gap-x-4 gap-y-1.5 text-sm">
          <DetailRow label="Enrollment No." value={card.enrollment || "-"} />
          <DetailRow label="Student Name" value={studentName} />
          <DetailRow label="Father's Name" value={card.fatherName || "-"} />
          <DetailRow label="Mother's Name" value={card.motherName || "-"} />
        </div>
        <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded bg-white text-center text-xs text-gray-400">
          {card.studentPhoto ? (
            <img
              src={card.studentPhoto}
              alt="Student"
              className="h-full w-full object-contain"
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

        <div className="mt-3 text-xs text-gray-500">
          <FitText className="text-center">
            This admit card is valid only for {exam.examName}
            {exam.academicYear ? ` (${exam.academicYear})` : ""} and must be
            produced on every examination day.
          </FitText>
        </div>
      </div>
    </div>
  );
}

export default AdmitCardCard;