import { Fragment, useEffect, useState } from "react";

import { doc, getDoc } from "firebase/firestore";

import { QRCodeCanvas } from "qrcode.react";

import {
  COLLECTION,
  STAMP_SIGN_FIELDS,
  STAMP_SIGN_PRINCIPLE_DOC,
} from "../../../../constants";

import { db } from "../../../../firebase/config";

import { CardStudent } from "../../../../utils/type";

import {
  GRADE_SCALE,
  gradeFromPercentage,
  type ResultCardExtras,
  type ResultRow,
  type ResultTableModel,
  type ResultTotals,
} from "../../../../utils/resultCardModel";

import schoolLogo from "../../../../assets/image/schoolLogo1.png";

import FitText from "../../../../custom-components/FitText";

import type { ResultLayout } from "../../../../utils/resultCard";

/* ---------------- Principal sign (ek baar fetch, phir cache) ---------------- */

let principalSignUrlPromise: Promise<string | null> | null = null;

function loadPrincipalSignUrl(): Promise<string | null> {
  if (!principalSignUrlPromise) {
    principalSignUrlPromise = getDoc(
      doc(db, COLLECTION.STAMP_SIGN, STAMP_SIGN_PRINCIPLE_DOC),
    )
      .then((snapshot) => {
        if (!snapshot.exists()) return null;

        const url =
          snapshot.data()?.[STAMP_SIGN_FIELDS.PRINCIPLE_SIGN_WITH_STAMP];

        return typeof url === "string" ? url : null;
      })

      .catch(() => null);
  }

  return principalSignUrlPromise;
}

/* ---------------- Small helpers ---------------- */

const CELL = "border border-gray-500 px-1 py-[2px] text-center align-middle";

const TYPE_CELL =
  "overflow-hidden break-words text-[7.5px] font-semibold uppercase leading-tight";

function sumScores(scores: { obtained: number; max: number }[]) {
  const obtained =
    Math.round(scores.reduce((sum, score) => sum + score.obtained, 0) * 100) /
    100;

  const max = scores.reduce((sum, score) => sum + score.max, 0);

  return {
    obtained,

    max,

    text: max > 0 ? String(obtained) : "-",

    grade: max > 0 ? gradeFromPercentage((obtained / max) * 100) : "-",
  };
}

const HEAD =
  "border border-gray-500 px-0.5 py-[2px] text-center align-middle text-[8.5px] font-bold uppercase leading-tight";

const ROMAN = [
  "",

  "I",

  "II",

  "III",

  "IV",

  "V",

  "VI",

  "VII",

  "VIII",

  "IX",

  "X",

  "XI",

  "XII",
];

/** "5" -> "V"; "Nursery" -> "Nursery". */

function classLabel(className: string): string {
  const value = Number(className);

  return Number.isInteger(value) && value >= 1 && value <= 12
    ? ROMAN[value]
    : className;
}

/** "2025-26" -> "2025 - 26". */

function sessionLabel(value: string): string {
  return value ? value.replace(/\s*-\s*/, " - ") : "-";
}

function todayLabel(): string {
  const now = new Date();

  const day = String(now.getDate()).padStart(2, "0");

  const month = String(now.getMonth() + 1).padStart(2, "0");

  return `${day}.${month}.${now.getFullYear()}`;
}

const totalText = (totals: ResultTotals, value: string): string =>
  totals.hasMarks && totals.max > 0 ? value : "-";

/**

 * Type column ka short label.

 * PG / Nursery / LKG / UKG (written-oral): Written -> (W), Oral -> (O).

 * Baaki classes (scheme): Written -> (WR), Practical -> (PR), Oral -> (O).

 */

function typeLabel(type: string, layout: ResultLayout): string {
  const t = String(type ?? "")
    .trim()

    .toLowerCase();

  const short = layout === "written-oral";

  if (t === "theory" || t === "written") return short ? "(W)" : "(WR)";

  if (t === "oral") return "(O)";

  if (t === "practical") return short ? "(P)" : "(PR)";

  if (/^(written\s*\+\s*oral|written\s+and\s+oral)$/.test(t)) {
    return short ? "(W+O)" : "(WR+O)";
  }

  return t;
}

/* ---------------- Statement of marks ---------------- */

function StatementTable({ model }: { model: ResultTableModel }) {
  const {
    layout,

    terms,

    rows,

    showGrand,

    termTotals,

    examTotals,

    grandTotals,
  } = model;

  if (terms.length === 0 || rows.length === 0) return null;

  // Same subject ke rows ek group (e.g. English Written + English Oral).

  const groups: { name: string; rows: ResultRow[] }[] = [];

  const groupByKey = new Map<string, { name: string; rows: ResultRow[] }>();

  rows.forEach((row) => {
    const key = row.subjectName.trim().toLowerCase();

    let group = groupByKey.get(key);

    if (!group) {
      group = { name: row.subjectName, rows: [] };

      groupByKey.set(key, group);

      groups.push(group);
    }

    group.rows.push(row);
  });

  const hasTypes = groups.some((group) => group.rows.length > 1);

  // Har subject ka total (Written + Oral milakar), term-wise aur grand.

  const groupScores = groups.map((group) => ({
    terms: terms.map((_, termIndex) =>
      sumScores(group.rows.map((row) => row.termScores[termIndex])),
    ),

    grand: sumScores(group.rows.map((row) => row.grand)),
  }));

  // Headers ke max: subject ke total se (Unit Test 30 + Half Yearly 70 = 100).

  const termHeaderMax = terms.map((_, termIndex) =>
    Math.max(0, ...groupScores.map((score) => score.terms[termIndex].max)),
  );

  const grandHeaderMax = Math.max(
    0,

    ...groupScores.map((score) => score.grand.max),
  );

  const examHeaderMax = terms.map((term, termIndex) =>
    term.exams.map((exam, examIndex) => {
      const fromGroups = Math.max(
        0,

        ...groups.map((group) =>
          group.rows.reduce((sum, row) => {
            const cell = row.termCells[termIndex][examIndex];

            return sum + (cell.counts ? cell.max : 0);
          }, 0),
        ),
      );

      return fromGroups > 0 ? fromGroups : exam.max;
    }),
  );

  const subjectNameWidth = hasTypes ? 15 : 14;

  const typeWidth = hasTypes ? 4 : 0;

  const subjectWidth = subjectNameWidth + typeWidth;

  const valueCols =
    terms.reduce((count, term) => count + term.exams.length + 2, 0) +
    (showGrand ? 2 : 0);

  const colWidth = (100 - subjectWidth) / valueCols;

  return (
    <table className="w-full table-fixed border-collapse border border-gray-500 text-[10px]">
      <colgroup>
        <col style={{ width: `${subjectNameWidth}%` }} />

        {hasTypes && <col style={{ width: `${typeWidth}%` }} />}

        {Array.from({ length: valueCols }).map((_, index) => (
          <col key={index} style={{ width: `${colWidth}%` }} />
        ))}
      </colgroup>

      <thead>
        <tr>
          <th colSpan={hasTypes ? 2 : 1} className={`${HEAD} text-left`}>
            Scholastic Areas:
          </th>

          <th colSpan={valueCols} className={`${HEAD} bg-blue-100 text-[10px]`}>
            Statement of Marks
          </th>
        </tr>

        <tr>
          <th rowSpan={2} colSpan={hasTypes ? 2 : 1} className={HEAD}>
            Subject Name
          </th>

          {terms.map((term) => (
            <th key={term.key} colSpan={term.exams.length + 2} className={HEAD}>
              {term.label}
            </th>
          ))}

          {showGrand && (
            <th colSpan={2} className={HEAD}>
              Grand Total
            </th>
          )}
        </tr>

        <tr>
          {terms.map((term, termIndex) => (
            <Fragment key={term.key}>
              {term.exams.map((exam, examIndex) => (
                <th key={exam.id} className={HEAD}>
                  {exam.name}

                  {examHeaderMax[termIndex][examIndex] > 0
                    ? ` (${examHeaderMax[termIndex][examIndex]})`
                    : ""}
                </th>
              ))}

              <th className={HEAD}>
                Marks Obtained
                {termHeaderMax[termIndex] > 0
                  ? ` (${termHeaderMax[termIndex]})`
                  : ""}
              </th>

              <th className={HEAD}>Grade</th>
            </Fragment>
          ))}

          {showGrand && (
            <>
              <th className={HEAD}>
                Marks Obtained{grandHeaderMax > 0 ? ` (${grandHeaderMax})` : ""}
              </th>

              <th className={HEAD}>Grade</th>
            </>
          )}
        </tr>
      </thead>

      <tbody>
        {groups.map((group) => {
          const span = group.rows.length;

          return (
            <Fragment key={group.rows[0].key}>
              {group.rows.map((row, rowIndex) => {
                const first = rowIndex === 0;

                return (
                  <tr key={row.key} className="print:break-inside-avoid">
                    {first && (
                      <td
                        rowSpan={span}
                        className={`${CELL} text-left font-medium uppercase leading-tight`}
                      >
                        {span > 1 ? group.name : row.subject}
                      </td>
                    )}

                    {hasTypes && (
                      <td className={`${CELL} ${TYPE_CELL}`}>
                        {span > 1 ? typeLabel(row.type, layout) : ""}
                      </td>
                    )}

                    {row.termCells.map((cells, termIndex) => (
                      <Fragment key={terms[termIndex].key}>
                        {cells.map((cell, examIndex) => (
                          <td
                            key={terms[termIndex].exams[examIndex].id}
                            className={CELL}
                          >
                            {cell.text}
                          </td>
                        ))}

                        <td className={`${CELL} font-semibold`}>
                          {row.termScores[termIndex].text}
                        </td>

                        <td className={CELL}>
                          {row.termScores[termIndex].grade}
                        </td>
                      </Fragment>
                    ))}

                    {showGrand && (
                      <>
                        <td className={`${CELL} font-semibold`}>
                          {row.grand.text}
                        </td>

                        <td className={CELL}>{row.grand.grade}</td>
                      </>
                    )}
                  </tr>
                );
              })}
            </Fragment>
          );
        })}

        {/* Total */}

        <tr className="font-bold">
          <td colSpan={hasTypes ? 2 : 1} className={`${CELL} text-left`}>
            Total
          </td>

          {terms.map((term, termIndex) => (
            <Fragment key={term.key}>
              {term.exams.map((exam, examIndex) => {
                const examTotal = examTotals[termIndex][examIndex];

                return (
                  <td key={exam.id} className={CELL}>
                    {examTotal
                      ? totalText(examTotal, String(examTotal.obtained))
                      : "-"}
                  </td>
                );
              })}

              <td className={CELL}>
                {totalText(
                  termTotals[termIndex],

                  String(termTotals[termIndex].obtained),
                )}
              </td>

              <td className={CELL}>
                {totalText(termTotals[termIndex], termTotals[termIndex].grade)}
              </td>
            </Fragment>
          ))}

          {showGrand && (
            <>
              <td className={CELL}>
                {totalText(grandTotals, String(grandTotals.obtained))}
              </td>

              <td className={CELL}>
                {totalText(grandTotals, grandTotals.grade)}
              </td>
            </>
          )}
        </tr>

        {/* Percentage */}

        <tr className="font-bold">
          <td colSpan={hasTypes ? 2 : 1} className={`${CELL} text-left`}>
            Percentage
          </td>

          {terms.map((term, termIndex) => (
            <Fragment key={term.key}>
              {term.exams.map((exam, examIndex) => {
                const examTotal = examTotals[termIndex][examIndex];

                return (
                  <td key={exam.id} className={CELL}>
                    {examTotal
                      ? totalText(examTotal, `${examTotal.percentage}%`)
                      : "-"}
                  </td>
                );
              })}

              <td colSpan={2} className={CELL}>
                {totalText(
                  termTotals[termIndex],

                  String(termTotals[termIndex].percentage),
                )}
              </td>
            </Fragment>
          ))}

          {showGrand && (
            <td colSpan={2} className={CELL}>
              {totalText(grandTotals, String(grandTotals.percentage))}
            </td>
          )}
        </tr>
      </tbody>
    </table>
  );
}

/* ---------------- Scholastic Areas II (grades) ---------------- */

function GradeAreasTable({ model }: { model: ResultTableModel }) {
  if (model.gradeRows.length === 0 || model.terms.length === 0) return null;

  // Har exam ke liye ek grade column: Term-I (Unit Test I, Half Yearly) + Term-II

  // (Unit Test II, Annual). Jis exam mein grade save hai wahi dikhta hai.

  // Notebook sirf Statement of Marks ka sub-column hai - grade table mein pure

  // exams hi aate hain (filter sub !== "notebook").

  const gradeExamsPerTerm = model.terms.map((term) =>
    term.exams.filter((exam) => exam.sub !== "notebook"),
  );

  const subjectWidth = 30;

  const totalExams = gradeExamsPerTerm.reduce(
    (count, exams) => count + exams.length,

    0,
  );

  const examWidth = totalExams > 0 ? (100 - subjectWidth) / totalExams : 0;

  return (
    <table className="mt-1 w-full table-fixed border-collapse border border-gray-500 text-[10px]">
      <colgroup>
        <col style={{ width: `${subjectWidth}%` }} />

        {Array.from({ length: totalExams }).map((_, index) => (
          <col key={index} style={{ width: `${examWidth}%` }} />
        ))}
      </colgroup>

      <thead>
        <tr className="bg-blue-100">
          <th className={`${HEAD} text-left`}>Scholastic Areas II:</th>

          {model.terms.map((term, termIndex) => (
            <th
              key={term.key}
              colSpan={gradeExamsPerTerm[termIndex].length}
              className={HEAD}
            >
              {term.label}
            </th>
          ))}
        </tr>

        <tr>
          <th className={HEAD} />

          {gradeExamsPerTerm.map((exams) =>
            exams.map((exam) => (
              <th key={exam.id} className={HEAD}>
                {exam.name}
              </th>
            )),
          )}
        </tr>
      </thead>

      <tbody>
        {model.gradeRows.map((row) => (
          <tr key={row.key}>
            <td className={`${CELL} text-left uppercase`}>{row.subject}</td>

            {row.termGrades.map((termGrades, termIndex) =>
              termGrades.map((grade, examIndex) => (
                <td
                  key={gradeExamsPerTerm[termIndex][examIndex].id}
                  className={CELL}
                >
                  {grade}
                </td>
              )),
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* ---------------- Bar chart (Max Marks vs Marks Obtained) ---------------- */

const MAX_COLOR = "#3366cc";

const OBTAINED_COLOR = "#dc3912";

function ChartBar({
  value,

  axisMax,

  color,
}: {
  value: number;

  axisMax: number;

  color: string;
}) {
  return (
    <div
      className="flex w-[16px] items-start justify-center overflow-hidden"
      style={{
        height: `${Math.min(100, (value / axisMax) * 100)}%`,

        backgroundColor: color,
      }}
    >
      <span className="pt-[1px] text-[7px] leading-none text-white">
        {value}
      </span>
    </div>
  );
}

function MarksChart({ rows }: { rows: ResultRow[] }) {
  // Written + Oral jaise rows ek subject ban jaate hain.

  const bySubject = new Map<
    string,
    { name: string; max: number; obtained: number }
  >();

  rows.forEach((row) => {
    if (row.grand.max <= 0) return;

    const entry = bySubject.get(row.subjectName) ?? {
      name: row.subjectName,

      max: 0,

      obtained: 0,
    };

    entry.max += row.grand.max;

    entry.obtained += row.grand.obtained;

    bySubject.set(row.subjectName, entry);
  });

  const data = Array.from(bySubject.values());

  if (data.length === 0) return null;

  const top = Math.max(...data.map((item) => item.max));

  const step = Math.max(5, Math.ceil(top / 5 / 5) * 5);

  const axisMax = step * 5;

  const ticks = [0, 1, 2, 3, 4, 5].map((index) => index * step);

  return (
    <div className="px-4 pt-0">
      <div className="flex">
        {/* Y axis labels */}

        <div className="relative h-[100px] w-8 shrink-0 print:h-[84px]">
          {ticks.map((tick) => (
            <span
              key={tick}
              className="absolute right-1 translate-y-1/2 text-[8px] leading-none text-gray-600"
              style={{ bottom: `${(tick / axisMax) * 100}%` }}
            >
              {tick}
            </span>
          ))}
        </div>

        {/* Plot */}

        <div className="relative h-[100px] flex-1 border-b border-l border-gray-400 print:h-[84px]">
          {ticks.slice(1).map((tick) => (
            <div
              key={tick}
              className="absolute inset-x-0 border-t border-gray-200"
              style={{ bottom: `${(tick / axisMax) * 100}%` }}
            />
          ))}

          <div className="absolute inset-0 flex items-end">
            {data.map((item) => (
              <div
                key={item.name}
                className="flex h-full flex-1 items-end justify-center gap-[2px]"
              >
                <ChartBar
                  value={item.max}
                  axisMax={axisMax}
                  color={MAX_COLOR}
                />

                <ChartBar
                  value={item.obtained}
                  axisMax={axisMax}
                  color={OBTAINED_COLOR}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* X axis labels */}

      <div className="ml-8 flex">
        {data.map((item) => (
          <span
            key={item.name}
            className="flex-1 px-0.5 text-center text-[7.5px] uppercase leading-tight text-gray-700"
          >
            {item.name}
          </span>
        ))}
      </div>

      <p className="mt-0 text-center text-[8px] italic text-gray-600">
        Subjects
      </p>

      {/* Legend */}

      <div className="mt-0 flex items-center justify-center gap-5 text-[9px]">
        <span className="flex items-center gap-1">
          <span
            className="inline-block h-2.5 w-4"
            style={{ backgroundColor: MAX_COLOR }}
          />
          Max Marks
        </span>

        <span className="flex items-center gap-1">
          <span
            className="inline-block h-2.5 w-4"
            style={{ backgroundColor: OBTAINED_COLOR }}
          />
          Marks Obtained
        </span>
      </div>
    </div>
  );
}

/* ---------------- Student detail row ---------------- */

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <p className="flex gap-1 text-[12px]">
      <span className="w-36 shrink-0 text-gray-700">{label} :</span>

      <FitText className="flex-1 font-medium uppercase">{value}</FitText>
    </p>
  );
}

/* ---------------- QR payload ---------------- */

/** Sirf har shabd ka pehla letter capital, baaki lowercase (Title Case). */

function titleCase(value: string): string {
  return String(value ?? "")
    .toLowerCase()

    .replace(
      /(^|[\s-:])([a-z])/g,

      (_match, pre, letter) => pre + letter.toUpperCase(),
    );
}

/**

 * QR code ke andar ka data (compact, taaki QR chhota version rahe aur aasani

 * se scan ho): student profile + selected exams ka total marks / percentage.

 * Ek exam ho to ussi ka, multiple exams ho to unka sum + %.

 */

function resultQrPayload(params: {
  card: CardStudent;

  rollNo: number;

  academicYear: string;

  model: ResultTableModel;
}): string {
  const { card, rollNo, academicYear, model } = params;

  const studentName =
    card.studentName || `${card.firstName} ${card.lastName}`.trim() || "-";

  const lines: string[] = [];

  lines.push("CVES REPORT CARD");

  lines.push(`ADM:${card.enrollment || "-"}`);

  lines.push(`ROLL:${rollNo > 0 ? String(rollNo) : "-"}`);

  lines.push(`NAME:${studentName}`);

  lines.push(
    `CLASS:${classLabel(card.className)}${card.section ? `-${card.section}` : ""}`,
  );

  lines.push(`SES:${sessionLabel(card.academicYear || academicYear)}`);

  const hasMarks = (totals: ResultTotals) => totals.hasMarks && totals.max > 0;

  const show = (totals: ResultTotals) =>
    `${totals.obtained}/${totals.max} (${totals.percentage}%)`;

  if (model.terms.every((_, index) => !hasMarks(model.termTotals[index]))) {
    lines.push("NO MARKS SAVED");
  } else {
    // Har term ka total & percentage (jis exams ka data dikh raha hai).

    model.terms.forEach((term, termIndex) => {
      const totals = model.termTotals[termIndex];

      if (hasMarks(totals)) lines.push(`${term.label}:${show(totals)}`);
    });

    // Dono terms hon to total sum + grand percentage.

    if (model.showGrand && hasMarks(model.grandTotals)) {
      lines.push(`GRAND:${show(model.grandTotals)}`);
    }
  }

  lines.push(
    `RESULT:${
      model.result === "pass" ? "PASS" : model.result === "fail" ? "FAIL" : "-"
    }`,
  );

  lines.push("cves.in");

  return lines.map(titleCase).join("\n");
}

/* ---------------- Card ---------------- */

export interface ResultCardProps {
  card: CardStudent;

  /** Roll number saved with the marks (same as the Cross List); 0 = unknown. */

  rollNo: number;

  academicYear: string;

  model: ResultTableModel;

  /** Remarks, attendance, rank, date (marks entry form banne ke baad aayenge). */

  extras?: ResultCardExtras;
}

function ResultCard({
  card,

  rollNo,

  academicYear,

  model,

  extras = {},
}: ResultCardProps) {
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

  const attendance =
    typeof extras.attendancePresent === "number" &&
    typeof extras.attendanceTotal === "number"
      ? `${extras.attendancePresent}/${extras.attendanceTotal}`
      : "Not entered";

  const resultText =
    model.result === "pass" ? "Pass" : model.result === "fail" ? "Fail" : "-";

  // Fail students ka rank "-" (Cross List jaisa).

  const rankText =
    model.result === "fail" || !extras.rank ? "-" : String(extras.rank);

  // QR ke andar student profile + selected exams ka total / percentage.

  const qrValue = resultQrPayload({ card, rollNo, academicYear, model });

  return (
    <div className="mx-auto mt-2 max-w-4xl [-webkit-print-color-adjust:exact] [print-color-adjust:exact] print:m-0 print:h-[296mm] print:w-[210mm] print:max-w-none print:overflow-hidden print:break-after-page print:p-[10px] print:box-border print:last:break-after-auto">
      <div className="relative flex h-full flex-col overflow-hidden rounded-xl border-4 border-double border-blue-800 bg-white shadow-lg print:rounded-none print:shadow-none">
        {/* Watermark */}

        <img
          src={schoolLogo}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-[58%] z-20 w-[700px] -translate-x-1/2 -translate-y-1/2 select-none object-contain opacity-[0.1] mix-blend-multiply"
        />

        {/* Card header (pehle jaisa) */}

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
                <div className="inline-block rounded bg-pink-600 px-8 py-1 text-sm font-bold tracking-wide text-white md:text-base">
                  REPORT CARD
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Academic session */}

        <p className="border-b border-gray-300 py-1 text-center text-sm font-bold text-black">
          Academic Session : {sessionLabel(card.academicYear || academicYear)}
        </p>

        {/* Student details + photo */}

        <div className="flex items-start justify-between gap-4 px-4 py-1 md:px-6">
          <div className="min-w-0 flex-1 space-y-0.5">
            <DetailRow label="Admission No." value={card.enrollment || "-"} />

            <DetailRow
              label="Roll No."
              value={rollNo > 0 ? String(rollNo) : "-"}
            />

            <DetailRow label="Student's Name" value={studentName} />

            <DetailRow label="Mother's Name" value={card.motherName || "-"} />

            <DetailRow label="Father's Name" value={card.fatherName || "-"} />

            <DetailRow
              label="Class & Section"
              value={`${classLabel(card.className)} - ${card.section || ""}`.trim()}
            />
          </div>

          <div
            className={`flex h-28 w-24 shrink-0 items-center justify-center overflow-hidden bg-white text-center text-[10px] text-gray-400 ${
              card.studentPhoto ? "" : "border border-gray-400"
            }`}
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

        {/* Body */}

        <div className="flex flex-1 flex-col px-2 pb-0">
          {!model.grandTotals.hasMarks && (
            <p className="mb-2 rounded border border-amber-300 bg-amber-50 px-3 py-1 text-center text-xs font-semibold text-amber-800 print:hidden">
              No marks are saved for this student in the selected exam(s).
            </p>
          )}

          <StatementTable model={model} />

          <GradeAreasTable model={model} />

          <div className="mt-1 mb-2 space-y-0.5 px-2 text-[11px]">
            <p>
              <span className="font-bold">Attendance :</span> {attendance}
            </p>

            <p>
              <span className="font-bold">Result :</span>

              <span className="font-bold text-green-700">
                {" "}
                {resultText.toUpperCase()}
              </span>
            </p>

            <p>
              <span className="font-bold">Rank :</span> {rankText}
            </p>

            <p>
              <span className="font-bold">Class Teacher's Remarks :</span>{" "}
              {extras.remarks?.trim() || "-"}
            </p>
          </div>

          <MarksChart rows={model.rows} />

          {/* Date + signatures */}

          <div className="mt-auto px-2 text-[11px]">
            <p className="font-bold">
              Date : {extras.resultDate || todayLabel()}
            </p>

            <div className="mt-0 flex items-end justify-between border-b border-gray-400 pb-0.5 font-bold">
              <span>Signature of Class Teacher</span>

              {/* QR wahi hai jahan parent ka signature hota tha. */}

              <div className="text-center">
                <QRCodeCanvas
                  value={qrValue}
                  size={96}
                  level="L"
                  includeMargin
                  marginSize={2}
                />

                <span className="mt-0.5 block text-[9px] font-semibold text-gray-600">
                  www.cves.in
                </span>
              </div>

              <div className="text-center">
                {principalSignUrl && (
                  <img
                    src={principalSignUrl}
                    alt="Principal"
                    className="mx-auto mb-0.5 h-28 w-40 object-contain"
                  />
                )}

                <span>Signature of Principal</span>
              </div>
            </div>
          </div>

          {/* Instructions */}

          <div className="px-2 pt-0.5 pb-1 text-center text-[9px]">
            {/* <p className="font-bold">Instructions</p> */}

            <p className="text-left">
              Grading scale for scholastic areas: Grades are awarded on a
              8-point grading scale as follows -
            </p>

            <table className="mt-0 w-full table-fixed border-collapse border border-gray-500 text-[9px]">
              <tbody>
                <tr className="font-bold">
                  <td className={`${CELL} text-left`}>MARKS RANGE</td>

                  {GRADE_SCALE.map((band) => (
                    <td key={band.grade} className={CELL}>
                      {band.range}
                    </td>
                  ))}
                </tr>

                <tr className="font-bold">
                  <td className={`${CELL} text-left`}>GRADE</td>

                  {GRADE_SCALE.map((band) => (
                    <td key={band.grade} className={CELL}>
                      {band.grade}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ResultCard;
