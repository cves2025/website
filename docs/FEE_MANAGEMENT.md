# School Fee Management System

Requirements for the fee module of the CVES admin panel, agreed on 2026-11-04.
Each step can be built, tested and committed separately.

---

## 1. Business rules

| Topic | Rule |
|---|---|
| Session | April to March (12 months). |
| Fee heads | Admission, Exam, Monthly (tuition), Transport. |
| Monthly fee | A different amount per class, set in the Fee Structure. |
| Admission fee | Charged once, when a student is newly admitted. A different amount per class. |
| Re-admission / annual charge | Not automatic. The admin adds it to a student as an **Extra Charge**. |
| Exam fee | The admin decides how many times a year, what it is for, and in which month (e.g. Half-Yearly in September, Annual in February), with a different amount per class. |
| Transport | Only for some students. Each student has their own monthly amount. There are no routes. |
| Special fee | A student can pay a fixed monthly fee for the whole year, different from the class fee (e.g. the class fee is 1000, the student pays 800). |
| Discount | A fixed amount (no percentage) on a particular line, with a reason (sibling, staff ward, etc.). |
| Waive-off (fee maafi) | The admin can waive the Monthly fee, the Transport fee, or both for any month, with a reason. |
| Partial payment | Allowed. |
| Advance payment | Allowed. Several months can be paid at once. |
| Payment adjustment | Money is adjusted against the oldest unpaid line first, unless the admin picks the lines. |
| Late fee | Not used today, but the system supports it. OFF by default. A fixed amount after the due date. |
| Due date | Set by the admin in settings (e.g. the 10th of every month). |
| Previous dues | The unpaid total of the last session comes into the new session as a **Previous Dues** line. |
| Who collects | Only the Admin. New permission `fee.manage`, which can't be given to teachers. |
| Receipt number | `CVES/<session>/<serial>`, e.g. `CVES/2026-27/0001`. The serial restarts every session and is never repeated. |
| Receipt cancel | A receipt is never deleted. It can only be cancelled, with a reason, and the paid lines become due again. |
| Public Pay Fee page | Reads the monthly fee from the Fee Structure instead of the JSON file. |

---

## 2. Main idea: the Fee Account

Every student has one **Fee Account** per session. It holds every fee line of that year:

```
Rahul Kumar · Class 5-A · 2026-27
Line                 Fee    Discount  Waived  Paid   Due
Previous Dues        600       -        -       -    600
Admission Fee      2,000       -        -    2,000     0
April - Monthly      800       -        -      800     0   (special fee 800)
April - Transport    500       -        -      500     0
May - Monthly        800       -       yes      -      0   (waived, reason saved)
May - Transport      500       -        -       -    500
Half-Yearly Exam     300      100       -       -    200
```

`Due = Fee - Discount - Paid` (0 when waived).

---

## 3. Data (Firestore)

| Collection / doc | Holds |
|---|---|
| `feeStructures/{session}` | Admission and Monthly fee per class, and the exam fee plan (name, month, amount per class). |
| `feeSettings/general` | Due day, late fee (on/off, amount), receipt prefix. |
| `feeAccounts/{session}_{studentId}` | A student's account: lines, special fee, transport, extra charges. |
| `feePayments/{receiptId}` | One document per receipt: date, mode, amount, lines paid, status (active/cancelled). |
| `feeCounters/{session}` | The last receipt serial, increased in a transaction. |

---

## 4. Phases and steps

### Phase 1: Core

#### Step 1: Fee Settings and Fee Structure
- [x] New `fee.manage` permission (admin only), a "Fees" group in the sidebar, and routes.
- [x] **Fee Structure** page per session (the next session is offered too, so fees can be set before April):
  - Admission fee and Monthly fee for each class.
  - Exam fee plan: add, edit or remove items (name, month, amount per class).
  - Copy the structure from the previous session.
- [x] **Fee Settings**: due day, late fee on/off + amount, receipt prefix.

#### Step 2: Fee Account, Collect Fee and Receipt
- [ ] Create a student's Fee Account from the structure (12 monthly lines, exam lines, admission fee for new admissions).
- [ ] **Collect Fee** page:
  - Search for a student by name, ID or class/section.
  - See the account: every line with fee, discount, waived, paid and due.
  - Pick lines or enter an amount (partial and advance payments allowed).
  - Payment mode: Cash / UPI / Cheque / Bank transfer, plus a reference no. and a note.
  - Save, generate the receipt number, and print the receipt.
- [ ] **Fee Receipt** (print / PDF): school letterhead, receipt no., date, student details, lines paid, total in figures and words, payment mode, signature.

#### Step 3: Student fee adjustments
- [ ] Special monthly fee for the whole year.
- [ ] Transport: on/off, monthly amount, starting month.
- [ ] Discount on a line (fixed amount + reason).
- [ ] Waive a line (Monthly, Transport or both for a month) + reason; undo a waive.
- [ ] Extra Charge (re-admission, annual charge or anything else): name, amount, month.
- [ ] Payment history of the student; reprint any receipt.
- [ ] Cancel a receipt (with a reason).
- [ ] Recalculate the unpaid lines when the Fee Structure changes (paid lines stay as they are).

#### Step 4: Reports
- [ ] **Dues Report**: due per student, filterable by class, section and month; defaulter list.
- [ ] **Collection Report**: total collected for a day, a month or a date range, split by payment mode, with a list of receipts.

#### Step 5: Carry forward, late fee and the Pay Fee page
- [ ] Bring the previous session's unpaid total in as a Previous Dues line (once per student).
- [ ] Late fee: when it's ON, add the late fee line for months not paid by the due date.
- [ ] Public Pay Fee page reads the monthly fee from the Fee Structure.

### Phase 2: Advanced
- [ ] Fee card on the panel dashboard (today's collection, total due).
- [ ] WhatsApp due reminder (a link with a pre-filled message to the parent).
- [ ] Excel export of the Dues and Collection reports.

### Phase 3: Online (later)
- [ ] Parents see their child's fee account after student login is built.
- [ ] Online payment through a payment gateway (e.g. Razorpay).
