/**
 * Excel downloads of the fee reports. Amounts are written as numbers, so
 * they can be summed and filtered in Excel.
 */
import * as XLSX from "xlsx";

import { FEE_HEAD_LABELS, PAYMENT_MODES } from "../constants";
import { monthLabel } from "./feeStructure";
import { summarizeCollection } from "./feeReport";
import { toOrdinalLabel } from "./toOrdinalLabel";
import type { DuesReportRow, FeeHead, FeePayment } from "./type";

/** One row of the Dues Report as shown on the page. */
export interface DuesExportRow {
  row: DuesReportRow;
  due: number;
  months: number[];
  sessionDue: number;
}

const sheetOf = (rows: (string | number)[][], widths: number[]) => {
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet["!cols"] = widths.map((wch) => ({ wch }));
  return sheet;
};

/** Dues_2026-27_All_till-November.xlsx */
export function exportDuesExcel(
  rows: DuesExportRow[],
  options: { session: string; classLabel: string; upToMonth: number }
): void {
  const { session, classLabel, upToMonth } = options;
  const month = monthLabel(upToMonth);
  const header = [
    "S.No.",
    "Class",
    "Section",
    "Roll No.",
    "Student",
    "Admission No.",
    "Father",
    "Phone",
    "Pending months",
    `Due till ${month}`,
    "Session due",
  ];
  const body = rows.map((item, index) => [
    index + 1,
    toOrdinalLabel(item.row.student.className),
    item.row.student.section,
    item.row.rollNumber || "",
    item.row.student.studentName,
    item.row.student.admissionNo,
    item.row.student.fatherName,
    item.row.phone,
    item.months.map((value) => monthLabel(value).slice(0, 3)).join(", "),
    item.due,
    item.sessionDue,
  ]);
  const totals = [
    "",
    "",
    "",
    "",
    `Total (${rows.length} students)`,
    "",
    "",
    "",
    "",
    rows.reduce((sum, item) => sum + item.due, 0),
    rows.reduce((sum, item) => sum + item.sessionDue, 0),
  ];
  const sheet = sheetOf(
    [[`Dues Report - ${session} - ${classLabel} - till ${month}`], [], header, ...body, [], totals],
    [6, 8, 8, 8, 26, 14, 22, 14, 30, 14, 14]
  );
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Dues");
  XLSX.writeFile(workbook, `Dues_${session}_${classLabel.replace(/\s+/g, "-")}_till-${month}.xlsx`);
}

/** Collection_2026-11-01_to_2026-11-05.xlsx: a Receipts sheet and a Summary sheet. */
export function exportCollectionExcel(
  payments: FeePayment[],
  options: { from: string; to: string; modeLabel: string }
): void {
  const { from, to, modeLabel } = options;
  const period = from === to ? from : `${from} to ${to}`;
  const summary = summarizeCollection(payments);

  const receipts = sheetOf(
    [
      [`Collection Report - ${period} - ${modeLabel}`],
      [],
      [
        "Receipt No.",
        "Date",
        "Student",
        "Class",
        "Section",
        "Admission No.",
        "Mode",
        "Reference",
        "Amount",
        "Status",
        "Received by",
        "Fees paid",
      ],
      ...payments.map((payment) => [
        payment.receiptNo,
        payment.date,
        payment.studentName,
        toOrdinalLabel(payment.className),
        payment.section,
        payment.admissionNo,
        payment.mode,
        payment.reference,
        payment.amount,
        payment.status === "cancelled" ? `Cancelled - ${payment.cancelReason}` : "Active",
        payment.collectedByName,
        payment.allocations.map((item) => `${item.label}: ${item.amount}`).join("; "),
      ]),
      [],
      ["", "", `Total (${summary.receipts} active receipts)`, "", "", "", "", "", summary.total],
    ],
    [20, 12, 26, 8, 8, 14, 14, 18, 12, 24, 20, 60]
  );

  const heads = (Object.keys(FEE_HEAD_LABELS) as FeeHead[]).filter((head) => summary.byHead[head]);
  const summarySheet = sheetOf(
    [
      [`Collection Summary - ${period} - ${modeLabel}`],
      [],
      ["Total collected", summary.total],
      ["Active receipts", summary.receipts],
      ["Cancelled receipts", summary.cancelled],
      [],
      ["By payment mode", "Amount"],
      ...PAYMENT_MODES.map((mode) => [mode, summary.byMode[mode]]),
      [],
      ["By fee head", "Amount"],
      ...heads.map((head) => [FEE_HEAD_LABELS[head], summary.byHead[head] ?? 0]),
    ],
    [24, 14]
  );

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, receipts, "Receipts");
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");
  XLSX.writeFile(workbook, `Collection_${from === to ? from : `${from}_to_${to}`}.xlsx`);
}
