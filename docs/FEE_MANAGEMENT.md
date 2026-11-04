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

### Security (firestore.rules)
- `feeStructures`: anyone can read (public Pay Fee page); only an active admin can write.
- `feeSettings`, `feeAccounts`, `feePayments`, `feeCounters`: only an active admin (`users/{uid}`: role `admin`, not deleted, status `Active` or empty).
- Nothing in the fee module can be deleted. A receipt can only change by being cancelled. The receipt counter starts at 1 and only goes up by one.
- Deploy with `npm run deploy:rules:dev` (the `(default)` database) or `npm run deploy:rules:prod` (the `prod` database); each database has its own rules. The other collections of the app are still open (TEMPORARY), so check the prod database's current rules before deploying there.

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
- [x] Build a student's Fee Account from the structure (12 monthly lines, exam lines, admission fee for new admissions). The account is only written to Firestore on its first payment; until then it is built on screen, so structure changes still reach it.
- [x] **Collect Fee** page:
  - Pick a student by session, class, section and a searchable student list (name, admission no. or father's name).
  - See the account: every line with fee, discount, paid, due and status.
  - Tick lines or enter an amount (partial and advance payments allowed; with nothing ticked the oldest due lines are paid first).
  - Payment mode: Cash / UPI / Cheque / Bank transfer, plus a reference no. and a note.
  - Confirm, save in one transaction with the next receipt number, and print the receipt.
  - Payment history of the student with a reprint link.
- [x] **Fee Receipt** (print / PDF): two copies on one A4 page (Student Copy + Office Copy), school letterhead, receipt no., date, student details, lines paid, total in figures and words, payment mode, signature.

#### Step 3: Student fee adjustments
All on the Collect Fee page, each saved with an entry in the account's **change log** (who, when, what).
An amount never drops below what was already paid + discounted on a line; such lines are left as they are and the admin is told how many.
- [x] Special monthly fee for the whole year (and Remove to go back to the class fee).
- [x] Transport: monthly amount and a month range (from / to); Remove stops it. Unpaid lines outside the range are removed.
- [x] Discount on a line (fixed amount + reason; 0 removes it).
- [x] Waive a line + reason, or tick several lines (e.g. a month's Monthly and Transport) and waive them together; undo a waive.
- [x] Extra Charge (re-admission, annual charge or anything else): name, amount, optional month. Removable while nothing is paid on it.
- [x] Cancel a receipt (with a reason). The receipt stays, marked CANCELLED, and its amounts become due again.
- [x] Refresh from Fee Structure: updates monthly, exam and admission fees to the current structure (special fee, transport, discounts and extra charges stay).

#### Step 4: Reports
- [x] **Dues Report**: due per student up to a chosen month (pending months listed) and the remaining due of the session; filter by session, class and section, "only with dues" switch, totals, print (A4 landscape). Students who have not paid anything yet are included (their fees come from the fee structure). A name opens Collect Fee for that student.
- [x] **Collection Report**: total collected in a date range (Today / This month shortcuts), split by payment mode and by fee head, with the list of receipts; filter by mode, print. Cancelled receipts are listed but not counted.

#### Step 5: Carry forward, late fee and the Pay Fee page
- [x] **Carry forward** (Dues Report → "Carry forward from <previous session>"): a preview (students, total) and then, per student in one transaction, the unpaid lines of the old session are marked "Carried to <new session>" (due 0 there, not a waive) and a "Previous Dues (<old session>)" line with that amount is added to the new session. Safe to run again: done students are skipped, students added later are picked up. Students not in the new session (passed out / left) are not carried.
- [x] **Late fee**: when ON in Fee Settings, a "Late Fee" line is added for every month whose monthly fee is still due after the due day. Each month gets it once; it can be waived like any line. It is applied when an account is shown, in the reports, and inside every save.
- [x] Public **Pay Fee** page reads the monthly fee from the current session's Fee Structure (falls back to the old JSON list until a structure is saved).

### Phase 2: Advanced
- [ ] Fee card on the panel dashboard (today's collection, total due).
- [ ] WhatsApp due reminder (a link with a pre-filled message to the parent).
- [ ] Excel export of the Dues and Collection reports.

### Phase 3: Online (later)
- [ ] Parents see their child's fee account after student login is built.
- [ ] Online payment through a payment gateway (e.g. Razorpay).
