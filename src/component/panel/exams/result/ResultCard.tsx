import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { QRCodeCanvas } from "qrcode.react";
import {
  COLLECTION,
  STAMP_SIGN_FIELDS,
  STAMP_SIGN_PRINCIPLE_DOC,
} from "../../../../constants";
import { db } from "../../../../firebase/config";
import { CardStudent } from "../../../../utils/type";
import { toOrdinalLabel } from "../../../../utils/toOrdinalLabel";
import type {
  ResultRow,
  ResultTableModel,
  ResultTotals,
} from "../../../../utils/resultCardModel";
import schoolLogo from "../../../../assets/image/schoolLogo1.png";
import FitText from "../../../../custom-components/FitText";

let principalSignUrlPromise: Promise<string | null> | null = null;

function loadPrincipalSignUrl(): Promise<string | null> {
  if (!principalSignUrlPromise) {
    principalSignUrlPromise = getDoc(
      doc(db, COLLECTION.STAMP_SIGN, STAMP_SIGN_PRINCIPLE_DOC)
    )
      .then((snapshot) => {
        if (!snapshot.exists()) return null;
        const url = snapshot.data()?.[STAMP_SIGN_FIELDS.PRINCIPLE_SIGN_WITH_STAMP];
        return typeof url === "string" ? url : null;
      })
      .catch(() => null);
  }
  return principalSignUrlPromise;
}

const CELL = "border border-gray-300 px-1.5 py-0.5 overflow-hidden";

type ExamHead = { id: string; name: string };

/** " (20)" - max marks of a Written / Oral row, taken from the saved marks. */
function maxLabel(row: ResultRow): string {
  const max = row.cells.find((cell) => cell.counts && cell.max > 0)?.max;
  return max ? ` (${max})` : "";
}

function MarksTable({
  title,
  rows,
  exams,
  withPart = false,
  withFinal = true,
}: {
  title: string;
  rows: ResultRow[];
  exams: ExamHead[];
  withPart?: boolean;
  withFinal?: boolean;
}) {
  if (rows.length === 0) return null;

  const subjectWidth = withPart ? 24 : 34;
  const partWidth = withPart ? 16 : 0;
  const columnCount = Math.max(exams.length + (withFinal ? 1 : 0), 1);
  const valueWidth = (100 - subjectWidth - partWidth) / columnCount;

  return (
    <div className="mb-2">
      <h4 className="mb-1 text-center text-sm font-bold text-gray-800">
        {title}
      </h4>
      <table className="w-full table-fixed border border-gray-300 text-xs">
        <colgroup>
          <col style={{ width: `${subjectWidth}%` }} />
          {withPart && <col style={{ width: `${partWidth}%` }} />}
          {exams.map((exam) => (
            <col key={exam.id} style={{ width: `${valueWidth}%` }} />
          ))}
          {withFinal && <col style={{ width: `${valueWidth}%` }} />}
        </colgroup>
        <thead>
          <tr className="bg-gray-100 text-gray-800">
            <th className={`${CELL} text-left`}>
              <FitText>Subject</FitText>
            </th>
            {withPart && (
              <th className={CELL}>
                <FitText className="text-center">Type</FitText>
              </th>
            )}
            {exams.map((exam) => (
              <th key={exam.id} className={CELL}>
                <FitText className="text-center">{exam.name}</FitText>
              </th>
            ))}
            {withFinal && (
              <th className={CELL}>
                <FitText className="text-center">Total</FitText>
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="print:break-inside-avoid">
              {row.isGroupStart && (
                <td rowSpan={row.groupSize} className={`${CELL} font-semibold`}>
                  <FitText>{row.subject}</FitText>
                </td>
              )}
              {withPart && (
                <td className={CELL}>
                  <FitText>
                    {row.part}
                    {maxLabel(row)}
                  </FitText>
                </td>
              )}
              {row.cells.map((cell, index) => (
                <td key={index} className={CELL}>
                  <FitText className="text-center">{cell.text}</FitText>
                </td>
              ))}
              {withFinal && (
                <td className={`${CELL} font-semibold`}>
                  <FitText className="text-center">{row.finalText}</FitText>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SummaryTable({
  exams,
  examTotals,
  finalTotals,
}: {
  exams: ExamHead[];
  examTotals: ResultTotals[];
  finalTotals: ResultTotals;
}) {
  const labelWidth = 34;
  const valueWidth = (100 - labelWidth) / (exams.length + 1);

  const show = (
    totals: ResultTotals,
    pick: (value: ResultTotals) => string
  ): string => (totals.hasMarks && totals.max > 0 ? pick(totals) : "-");

  const lines: Array<[string, (value: ResultTotals) => string]> = [
    ["Total Marks", (value) => String(value.obtained)],
    ["Maximum Marks", (value) => String(value.max)],
    ["Percentage", (value) => `${value.percentage}%`],
  ];

  return (
    <table className="w-full table-fixed border border-gray-300 text-xs">
      <colgroup>
        <col style={{ width: `${labelWidth}%` }} />
        {exams.map((exam) => (
          <col key={exam.id} style={{ width: `${valueWidth}%` }} />
        ))}
        <col style={{ width: `${valueWidth}%` }} />
      </colgroup>
      <thead>
        <tr className="bg-gray-100 text-gray-800">
          <th className={`${CELL} text-left`}>
            <FitText>Summary</FitText>
          </th>
          {exams.map((exam) => (
            <th key={exam.id} className={CELL}>
              <FitText className="text-center">{exam.name}</FitText>
            </th>
          ))}
          <th className={CELL}>
            <FitText className="text-center">Final Total</FitText>
          </th>
        </tr>
      </thead>
      <tbody>
        {lines.map(([label, pick]) => (
          <tr key={label} className="font-semibold">
            <td className={CELL}>
              <FitText>{label}</FitText>
            </td>
            {examTotals.map((totals, index) => (
              <td key={exams[index].id} className={CELL}>
                <FitText className="text-center">{show(totals, pick)}</FitText>
              </td>
            ))}
            <td className={CELL}>
              <FitText className="text-center">
                {show(finalTotals, pick)}
              </FitText>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <p className="flex gap-1.5">
      <span className="w-28 shrink-0 font-semibold text-gray-600">{label}</span>
      <FitText className="flex-1">: {value}</FitText>
    </p>
  );
}

export interface ResultCardProps {
  card: CardStudent;
  /** Roll number saved with the marks (same as the Cross List); 0 = unknown. */
  rollNo: number;
  academicYear: string;
  model: ResultTableModel;
}

function ResultCard({ card, rollNo, academicYear, model }: ResultCardProps) {
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
  const examNames = model.exams.map((exam) => exam.name).join(", ");
  const isSchemeLayout = model.layout === "scheme";

  return (
    <div className="mx-auto mt-2 max-w-4xl print:m-0 print:h-[296mm] print:w-[210mm] print:max-w-none print:overflow-hidden print:break-after-page print:p-[10px] print:box-border print:last:break-after-auto">
      <div className="flex h-full flex-col overflow-hidden rounded-xl border-4 border-double border-blue-800 bg-white shadow-lg print:rounded-none print:shadow-none">
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
                className="h-full w-full scale-125 object-cover"
                loading="lazy"
              />
            </div>

            <div className="min-w-0 flex-1 text-left sm:text-center">
              <h3 className="font-cancun text-3xl">
            <span className="text-green-600">CHILDREN'S</span>
            <span className="text-blue-800"> VALLEY</span>
            <span className="text-red-600"> ENGLISH</span>
            <span className="text-pink-600"> SCHOOL</span>
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
                <div className="inline-block rounded bg-pink-600 px-8 py-1 text-sm font-bold tracking-wide text-white md:text-base [-webkit-print-color-adjust:exact] [print-color-adjust:exact]">
                  RESULT CARD
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Exam strip */}
        <div className="flex items-center justify-between gap-x-4 border-b-2 border-blue-800 bg-blue-50 px-4 py-1 text-sm md:px-6">
          <FitText className="flex-1">
            <span className="font-semibold">Session:</span>{" "}
            {card.academicYear || academicYear || "-"}
          </FitText>
          <FitText className="flex-[2] text-center">
            <span className="font-semibold">Examination:</span> {examNames}
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
            <DetailRow
              label="Roll No."
              value={rollNo > 0 ? String(rollNo) : "-"}
            />
            <DetailRow label="Student Name" value={studentName} />
            <DetailRow label="Father's Name" value={card.fatherName || "-"} />
            <DetailRow label="Mother's Name" value={card.motherName || "-"} />
          </div>
          <div
            className={`flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded ${
              !card.studentPhoto ? "border border-gray-400" : ""
            } bg-white text-center text-xs text-gray-400`}
          >
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

        {/* Marks tables */}
        <div className="flex flex-1 flex-col p-2 md:p-1">
          {!model.finalTotals.hasMarks && (
            <p className="mb-2 rounded border border-amber-300 bg-amber-50 px-3 py-1 text-center text-xs font-semibold text-amber-800 print:hidden">
              No marks are saved for this student in the selected exam(s).
            </p>
          )}

          <MarksTable
            title={isSchemeLayout ? "Theory" : "Marks"}
            rows={model.mainRows}
            exams={model.exams}
            withPart={!isSchemeLayout}
          />
          <MarksTable
            title="Practical"
            rows={model.practicalRows}
            exams={model.exams}
          />
          <MarksTable
            title="Grades"
            rows={model.gradeRows}
            exams={model.exams}
            withFinal={false}
          />

          <SummaryTable
            exams={model.exams}
            examTotals={model.examTotals}
            finalTotals={model.finalTotals}
          />

          <p className="mt-2 text-center text-base font-bold text-black">
            Result: {model.result ? model.result.toUpperCase() : "-"}
          </p>

          {/* QR + signatures */}
          <div className="mt-auto flex flex-wrap items-end justify-between gap-6 pt-6 text-sm text-gray-700">
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
                  className="mx-auto mb-1 h-32 w-32 object-contain print:h-24 print:w-24"
                />
              )}
              <p className="w-36 border-t-2 border-gray-400 pt-2">Principal</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ResultCard;