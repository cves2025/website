/**
 * Firestore access of the Transfer Certificate.
 *
 * - `transferCertificates/{id}`: one document per TC (draft / issued /
 *   cancelled). A cancelled TC stays, so its Sr. No. is never used again.
 * - `settings/transferCertificate`: letterhead and the default school category.
 * - `tcNumbers/{book}_{sr}`: one lock per used Book No. + Sr. No. (typed by the
 *   admin), written in the issue transaction, so a number is never used twice.
 * - Issuing marks the student's enrollment Left (`isDeleted`, `leftReason:
 *   "tc"`, `tcNo`, `leftAt`); cancelling (admin) brings it back.
 */
import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
  where,
} from "firebase/firestore";
import type { DocumentData } from "firebase/firestore";

import { COLLECTION, TC_REGISTER_CLASS, TC_SETTINGS_DOC } from "../constants";
import { db } from "../firebase/config";
import { loadAttendanceRange } from "./attendanceService";
import { loadFeeAccount } from "./feeService";
import { duesUpTo } from "./feeReport";
import { sessionDateRange, toDateKey, todayKey } from "./holidayCalendar";
import { loadRollNumbers } from "./rollNumbers";
import { toDateOrNull } from "./toDateOrNull";
import {
  currentTc,
  dateInWords,
  emptyTcFields,
  readTcFields,
  readTcSettings,
  readTcVerify,
  readTransferCertificate,
  romanClass,
  schoolDetailsOf,
  tcNoLockKey,
  tcNumberProblem,
  tcSerial,
  tcSerialLockKey,
  tcSubjectsText,
  tcVerifyRecord,
} from "./transferCertificate";
import type {
  TcFields,
  TcRecords,
  TcSettings,
  TcStudent,
  TcStudentRow,
  TcVerifyRecord,
  TransferCertificate,
} from "./type";

export interface TcActor {
  uid: string;
  name: string;
}

const text = (value: unknown): string =>
  typeof value === "string" ? value.trim() : typeof value === "number" ? String(value) : "";

const tcCollection = () => collection(db, COLLECTION.TRANSFER_CERTIFICATES);
const settingsRef = () => doc(db, COLLECTION.SETTINGS, TC_SETTINGS_DOC);
const verifyRef = (tcId: string) => doc(db, COLLECTION.TC_VERIFY, tcId);

/**
 * TC No. of the TC issued last (by issue time; a cancelled one counts, its
 * number is used), "" when none. The next TC No. is suggested from it.
 */
export async function loadLastTcNo(): Promise<string> {
  const snapshot = await getDocs(query(tcCollection(), orderBy("issuedAt", "desc"), limit(1)));
  return snapshot.empty ? "" : text(snapshot.docs[0].data().tcNo);
}

/* -------------------------------------------------- public verify page -- */

/** The public copy of a TC for the QR verify page (null = no such TC). Needs no login. */
export async function loadTcVerify(tcId: string): Promise<TcVerifyRecord | null> {
  if (!tcId) return null;
  const snapshot = await getDoc(verifyRef(tcId));
  return snapshot.exists() ? readTcVerify(snapshot.data()) : null;
}

/* ------------------------------------------------------------ settings -- */

export async function loadTcSettings(): Promise<TcSettings> {
  const snapshot = await getDoc(settingsRef());
  return readTcSettings(snapshot.exists() ? snapshot.data() : {});
}

/** Admin only (TC Settings page). */
export async function saveTcSettings(settings: TcSettings, uid: string): Promise<void> {
  await setDoc(
    settingsRef(),
    { ...settings, updatedBy: uid, updatedAt: serverTimestamp() },
    { merge: true }
  );
}

/* ---------------------------------------------------------------- list -- */

const studentOfEnrollment = (id: string, data: DocumentData): TcStudent => ({
  enrollmentId: id,
  studentId: text(data.studentId) || id,
  session: text(data.academicYear),
  className: text(data.className),
  section: text(data.section),
  studentName: text(data.studentName || `${data.firstName ?? ""} ${data.lastName ?? ""}`),
  admissionNo: text(data.enrollment),
  fatherName: text(data.fatherName),
});

/**
 * The TC page rows. One class + section: its students (also those removed
 * from the Student List when they have a TC) with their TC, in roll-number
 * order. Class TC_REGISTER_CLASS: every TC of the session (TC register),
 * newest Sr. No. first.
 */
export async function loadTcRows(
  session: string,
  className: string,
  section: string
): Promise<TcStudentRow[]> {
  if (className === TC_REGISTER_CLASS) {
    const snapshot = await getDocs(query(tcCollection(), where("session", "==", session)));
    const byStudent = new Map<string, TransferCertificate[]>();
    snapshot.docs.forEach((item) => {
      const tc = readTransferCertificate(item.id, item.data());
      byStudent.set(tc.studentId, [...(byStudent.get(tc.studentId) ?? []), tc]);
    });
    return [...byStudent.values()]
      .map((list): TcStudentRow => {
        const tc = currentTc(list) as TransferCertificate;
        return {
          enrollmentId: tc.enrollmentId,
          studentId: tc.studentId,
          session: tc.session,
          className: tc.className,
          section: tc.section,
          studentName: tc.fields.studentName,
          admissionNo: tc.fields.scholarNo,
          fatherName: tc.fields.fatherName,
          rollNumber: 0,
          left: tc.status === "issued",
          tc,
        };
      })
      .sort(
        (a, b) =>
          (b.tc?.srNo ?? 0) - (a.tc?.srNo ?? 0) ||
          (b.tc?.createdAt ?? "").localeCompare(a.tc?.createdAt ?? "")
      );
  }

  const [enrollments, tcs, rollNumbers] = await Promise.all([
    getDocs(
      query(
        collection(db, COLLECTION.ENROLLMENTS),
        where("academicYear", "==", session),
        where("className", "==", className),
        where("section", "==", section)
      )
    ),
    getDocs(
      query(
        tcCollection(),
        where("session", "==", session),
        where("className", "==", className),
        where("section", "==", section)
      )
    ),
    loadRollNumbers(session, [className]),
  ]);
  const byStudent = new Map<string, TransferCertificate[]>();
  tcs.docs.forEach((item) => {
    const tc = readTransferCertificate(item.id, item.data());
    byStudent.set(tc.studentId, [...(byStudent.get(tc.studentId) ?? []), tc]);
  });

  return enrollments.docs
    .map((item): TcStudentRow => {
      const student = studentOfEnrollment(item.id, item.data());
      return {
        ...student,
        rollNumber: rollNumbers.get(student.studentId) ?? rollNumbers.get(item.id) ?? 0,
        left: item.data().isDeleted === true,
        tc: currentTc(byStudent.get(student.studentId) ?? []),
      };
    })
    // Removed students only stay on the page when they have a TC.
    .filter((row) => !row.left || row.tc)
    .sort(
      (a, b) =>
        Number(a.left) - Number(b.left) ||
        (a.rollNumber || Infinity) - (b.rollNumber || Infinity) ||
        a.studentName.localeCompare(b.studentName)
    );
}

/* -------------------------------------------------------------- editor -- */

export async function loadTc(id: string): Promise<TransferCertificate | null> {
  const snapshot = await getDoc(doc(db, COLLECTION.TRANSFER_CERTIFICATES, id));
  return snapshot.exists() ? readTransferCertificate(snapshot.id, snapshot.data()) : null;
}

/** The student's TCs of a session (a draft or issued one is reopened). */
export async function loadStudentTcs(studentId: string, session: string): Promise<TransferCertificate[]> {
  const snapshot = await getDocs(
    query(tcCollection(), where("studentId", "==", studentId), where("session", "==", session))
  );
  return snapshot.docs.map((item) => readTransferCertificate(item.id, item.data()));
}

export async function loadTcStudent(enrollmentId: string): Promise<TcStudent | null> {
  const snapshot = await getDoc(doc(db, COLLECTION.ENROLLMENTS, enrollmentId));
  return snapshot.exists() ? studentOfEnrollment(snapshot.id, snapshot.data()) : null;
}

const joinText = (...parts: string[]) => parts.map((part) => part.trim()).filter(Boolean).join(", ");

/**
 * A new TC filled from the records: the admission form (students), the
 * first enrollment (admission class), the class subjects and the settings.
 * Attendance and fees come from `loadTcRecords`.
 */
export async function buildTcPrefill(
  student: TcStudent,
  settings: TcSettings
): Promise<TcFields> {
  const [studentSnap, enrollmentSnap, subjectSnap] = await Promise.all([
    getDoc(doc(db, COLLECTION.STUDENTS, student.studentId)),
    getDocs(query(collection(db, COLLECTION.ENROLLMENTS), where("studentId", "==", student.studentId))),
    getDocs(query(collection(db, COLLECTION.SUBJECTS), where("className", "==", student.className))),
  ]);
  const data = studentSnap.exists() ? studentSnap.data() : {};

  // Admission class: the student's first session.
  const first = enrollmentSnap.docs
    .map((item) => item.data())
    .filter((item) => text(item.academicYear))
    .sort((a, b) => text(a.academicYear).localeCompare(text(b.academicYear)))[0];
  // Students added on Add Student carry `createdAt` = the admission day;
  // imported students do not, and the date is left for the admin.
  const created = toDateOrNull(data.createdAt);
  const admissionDate = created ? toDateKey(created) : "";

  const subjects = subjectSnap.docs
    .map((item) => item.data())
    .filter((item) => item.archived !== true && text(item.name))
    .sort((a, b) => (Number(a.order) || 999) - (Number(b.order) || 999))
    .map((item) => ({ name: text(item.name), type: text(item.type) }));

  const dob = /^\d{4}-\d{2}-\d{2}$/.test(text(data.dob)) ? text(data.dob) : "";
  const today = todayKey();
  return {
    ...emptyTcFields(),
    scholarNo: student.admissionNo,
    pen: text(data.penOfStudent),
    studentName: (text(data.fullName) || student.studentName).toUpperCase(),
    fatherName: (text(data.fatherName) || student.fatherName).toUpperCase(),
    motherName: text(data.motherName).toUpperCase(),
    address: joinText(text(data.address), text(data.city)).toUpperCase(),
    nationality: text(data.nationality) || "Indian",
    category: text(data.category),
    dob,
    dobInWords: dateInWords(dob),
    lastClass: romanClass(student.className),
    admissionDate,
    admissionClass: romanClass(text(first?.className) || student.className),
    subjects: tcSubjectsText(subjects),
    nccCadet: "N/A",
    struckOffDate: today,
    conduct: "Good",
    schoolCategory: settings.schoolCategory,
    issueDate: today,
  };
}

/**
 * Attendance (marked days of the section up to `upTo`, and the student's
 * present days) and the fee due up to the month of `upTo`. A part that
 * cannot be read (e.g. fees are admin only) is null.
 */
export async function loadTcRecords(student: TcStudent, upTo: string): Promise<TcRecords> {
  const range = sessionDateRange(student.session);
  const until = upTo && upTo < range.to ? upTo : range.to;
  const [attendance, fees] = await Promise.all([
    loadAttendanceRange(student.session, student.className, student.section, range.from, until)
      .then((byDate) => {
        if (byDate.size === 0) return null;
        let present = 0;
        byDate.forEach((day) => {
          const status = day.records[student.studentId] ?? day.records[student.enrollmentId];
          if (status === "P") present += 1;
        });
        return { present, days: byDate.size };
      })
      .catch((cause) => {
        console.error("TC: attendance could not be read.", cause);
        return null;
      }),
    loadFeeAccount(student.session, {
      studentId: student.studentId,
      studentName: student.studentName,
      className: student.className,
      section: student.section,
      admissionNo: student.admissionNo,
      fatherName: student.fatherName,
    })
      .then(({ account }) => {
        const month = Number((until || todayKey()).slice(5, 7)) || 3;
        return {
          due: duesUpTo(account, month).due,
          concession:
            account.specialMonthlyFee !== null ||
            account.lines.some((line) => line.discount > 0 || line.waived),
        };
      })
      .catch((cause) => {
        // Teachers cannot read fee accounts (admin only).
        console.warn("TC: fee account could not be read.", cause);
        return null;
      }),
  ]);
  return { attendance, due: fees?.due ?? null, concession: fees?.concession ?? null };
}

/* ------------------------------------------------------------- writes -- */

const studentFields = (student: TcStudent) => ({
  studentId: student.studentId,
  enrollmentId: student.enrollmentId,
  session: student.session,
  className: student.className,
  section: student.section,
});

/** Saves a draft (new or existing); returns its id. */
export async function saveTcDraft(
  student: TcStudent,
  fields: TcFields,
  existingId: string | null,
  actor: TcActor
): Promise<string> {
  const ref = existingId ? doc(db, COLLECTION.TRANSFER_CERTIFICATES, existingId) : doc(tcCollection());
  const base = {
    ...studentFields(student),
    status: "draft",
    fields: readTcFields(fields),
    updatedBy: actor.uid,
    updatedByName: actor.name,
    updatedAt: serverTimestamp(),
  };
  if (existingId) {
    await updateDoc(ref, base);
  } else {
    await setDoc(ref, {
      ...base,
      srNo: 0,
      bookNo: "",
      tcNo: "",
      school: null,
      printCount: 0,
      createdAt: new Date().toISOString(),
      createdByName: actor.name,
      issuedAt: "",
      issuedByName: "",
      duesAtIssue: null,
      cancelReason: "",
      cancelledAt: "",
      cancelledByName: "",
      history: [],
    });
  }
  return ref.id;
}

export const TC_NOT_DRAFT = "TC_NOT_DRAFT";
/** Start of the error when the Book No. + Sr. No. is already on another TC (then its TC No.). */
export const TC_SERIAL_USED = "TC_SERIAL_USED";
/** Start of the error when the TC No. is already on another TC. */
export const TC_NO_USED = "TC_NO_USED";

/**
 * Issues a TC in one transaction: the Book No. + Sr. No. and the TC No.
 * typed by the admin (each locked in `tcNumbers`, so no other TC can use
 * them), the letterhead copied in, and the student marked Left.
 */
export async function issueTc(
  student: TcStudent,
  fields: TcFields,
  existingId: string | null,
  actor: TcActor,
  dues: number | null
): Promise<TransferCertificate> {
  const problem = tcNumberProblem(fields);
  if (problem) throw new Error(problem);
  const bookNo = fields.bookNo.trim();
  const srNo = tcSerial(fields);
  const tcNo = fields.tcNo.trim();
  const tcRef = existingId ? doc(db, COLLECTION.TRANSFER_CERTIFICATES, existingId) : doc(tcCollection());
  const enrollmentRef = doc(db, COLLECTION.ENROLLMENTS, student.enrollmentId);
  const serialRef = doc(db, COLLECTION.TC_NUMBERS, tcSerialLockKey(bookNo, srNo));
  const tcNoRef = doc(db, COLLECTION.TC_NUMBERS, tcNoLockKey(tcNo));

  return runTransaction(db, async (transaction) => {
    const settingsSnap = await transaction.get(settingsRef());
    const enrollmentSnap = await transaction.get(enrollmentRef);
    const serialSnap = await transaction.get(serialRef);
    if (serialSnap.exists()) throw new Error(`${TC_SERIAL_USED} ${text(serialSnap.data().tcNo)}`.trim());
    const tcNoSnap = await transaction.get(tcNoRef);
    if (tcNoSnap.exists()) throw new Error(TC_NO_USED);
    let createdAt = new Date().toISOString();
    if (existingId) {
      const current = await transaction.get(tcRef);
      if (current.exists()) {
        if (current.data().status !== "draft") throw new Error(TC_NOT_DRAFT);
        createdAt = text(current.data().createdAt) || createdAt;
      }
    }
    const settings = readTcSettings(settingsSnap.exists() ? settingsSnap.data() : {});
    const now = new Date().toISOString();
    const clean = { ...readTcFields(fields), bookNo, srNo: String(srNo), tcNo };
    const data = {
      ...studentFields(student),
      status: "issued" as const,
      srNo,
      bookNo,
      tcNo,
      fields: clean,
      school: schoolDetailsOf(settings),
      printCount: 0,
      createdAt,
      createdByName: actor.name,
      issuedAt: now,
      issuedBy: actor.uid,
      issuedByName: actor.name,
      duesAtIssue: dues,
      cancelReason: "",
      cancelledAt: "",
      cancelledByName: "",
      history: [{ at: now, byName: actor.name, action: "Issued", reason: "" }],
      updatedBy: actor.uid,
      updatedByName: actor.name,
      updatedAt: serverTimestamp(),
    };
    transaction.set(tcRef, data);
    transaction.set(verifyRef(tcRef.id), {
      ...tcVerifyRecord({ status: "issued", tcNo, session: student.session, fields: clean, cancelledAt: "" }, settings.schoolName),
      updatedAt: serverTimestamp(),
    });
    // The numbers are taken for good (a cancelled TC keeps them too).
    transaction.set(serialRef, { tcId: tcRef.id, tcNo, createdAt: now });
    transaction.set(tcNoRef, { tcId: tcRef.id, tcNo, createdAt: now });
    if (enrollmentSnap.exists()) {
      transaction.update(enrollmentRef, {
        isDeleted: true,
        leftReason: "tc",
        tcNo,
        leftAt: now,
        updatedAt: serverTimestamp(),
      });
    }
    return readTransferCertificate(tcRef.id, { ...data, updatedAt: null });
  });
}

/** Changes an issued TC; the old fields and the reason go into its history. */
export async function reviseTc(
  tc: TransferCertificate,
  fields: TcFields,
  reason: string,
  actor: TcActor
): Promise<TransferCertificate> {
  const entry = {
    at: new Date().toISOString(),
    byName: actor.name,
    action: "Revised" as const,
    reason,
    previous: tc.fields,
  };
  const history = [...tc.history, entry];
  // The number of an issued TC never changes.
  const clean = { ...readTcFields(fields), bookNo: tc.bookNo, srNo: String(tc.srNo), tcNo: tc.tcNo };
  // The TC and its public verify copy change together.
  const batch = writeBatch(db);
  batch.update(doc(db, COLLECTION.TRANSFER_CERTIFICATES, tc.id), {
    fields: clean,
    history,
    updatedBy: actor.uid,
    updatedByName: actor.name,
    updatedAt: serverTimestamp(),
  });
  batch.set(verifyRef(tc.id), {
    ...tcVerifyRecord({ ...tc, fields: clean }, tc.school?.schoolName ?? ""),
    updatedAt: serverTimestamp(),
  });
  await batch.commit();
  return { ...tc, fields: clean, history };
}

/**
 * Admin only: cancels an issued TC (its Sr. No. is not used again) and
 * brings the student back to the Student List.
 */
export async function cancelTc(
  tc: TransferCertificate,
  reason: string,
  actor: TcActor
): Promise<TransferCertificate> {
  const now = new Date().toISOString();
  const history = [...tc.history, { at: now, byName: actor.name, action: "Cancelled" as const, reason }];
  // The verify page shows CANCELLED from now on.
  const batch = writeBatch(db);
  batch.update(doc(db, COLLECTION.TRANSFER_CERTIFICATES, tc.id), {
    status: "cancelled",
    cancelReason: reason,
    cancelledAt: now,
    cancelledBy: actor.uid,
    cancelledByName: actor.name,
    history,
    updatedAt: serverTimestamp(),
  });
  batch.set(verifyRef(tc.id), {
    ...tcVerifyRecord({ ...tc, status: "cancelled", cancelledAt: now }, tc.school?.schoolName ?? ""),
    updatedAt: serverTimestamp(),
  });
  await batch.commit();
  const enrollmentRef = doc(db, COLLECTION.ENROLLMENTS, tc.enrollmentId);
  const enrollment = await getDoc(enrollmentRef);
  if (enrollment.exists() && enrollment.data().tcNo === tc.tcNo) {
    await updateDoc(enrollmentRef, {
      isDeleted: false,
      leftReason: deleteField(),
      tcNo: deleteField(),
      leftAt: deleteField(),
      updatedAt: serverTimestamp(),
    });
  }
  return { ...tc, status: "cancelled", cancelReason: reason, cancelledAt: now, cancelledByName: actor.name, history };
}

/** Counts a print of an issued TC (the next prints say DUPLICATE). */
export async function markTcPrinted(tc: TransferCertificate): Promise<void> {
  await updateDoc(doc(db, COLLECTION.TRANSFER_CERTIFICATES, tc.id), {
    printCount: tc.printCount + 1,
    lastPrintedAt: new Date().toISOString(),
  });
}

/** Deletes a draft (an issued TC is never deleted). */
export async function deleteTcDraft(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION.TRANSFER_CERTIFICATES, id));
}
