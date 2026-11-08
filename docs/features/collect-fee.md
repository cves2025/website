# Collect Fee

Route `/welcome/fees/collect` (`FEE_COLLECT_PATH`); the selection lives in the URL
(`?session=&class=&section=&student=`) so it survives a trip to the receipt. Business rules:
[../FEE_MANAGEMENT.md](../FEE_MANAGEMENT.md). The header's rupee button (`Welcome.tsx`) opens this
page with `state.focusSearch`, which puts the cursor in the student search.

## Files

| File | What it does |
|---|---|
| `src/component/panel/fees/CollectFee.tsx` | Page: 3 columns (filters + totals / fee account / payment), sticky student card + compact bar on scroll (`useIsStuck`), mobile layout (history last, fixed Collect bar), payment flow |
| `src/component/panel/fees/StudentSearch.tsx` | Search by enrollment no. or name in the session (`useStudentSearch`); `focusKey` prop focuses it; browser's own clear cross hidden |
| `src/component/panel/fees/FeeStudentBar.tsx` | Student info card + action buttons (Concession Fee = `special`, Transport, Extra, Refresh) |
| `src/component/panel/fees/FeeAccountCards.tsx` | Month cards and fee lines with checkboxes; sequential-payment rules; waive button ("Waive (fee exemption)") |
| `src/component/panel/fees/FeeAdjustDialog.tsx` | One dialog for every account change (special monthly fee, transport, extra, discount, waive, refresh to structure) |
| `src/component/panel/fees/PaymentHistory.tsx` | Receipts of the account; cancel; open receipt |
| `src/component/panel/fees/CarryForwardDialog.tsx` | Carry previous-session dues forward |
| `src/component/panel/fees/CollectFeeEmpty.tsx`, `FeeEmptyState.tsx` | Empty states |
| `src/utils/feeAccount.ts` | Pure account logic: lines, totals (`feeTotals`, `lineDue`), month order, tick rules (`canTickLine`, `tickMonth`...), `allocatePayment`, adjustments (`applyDiscount`, `applyWaive`, `applySpecialMonthlyFee`, `applyTransport`...), late fee, carry forward |
| `src/utils/feeService.ts` | Firestore: structure, settings, accounts, payments (transaction with receipt counter), cancel |
| Hooks | `useFeeAccount`, `useAccountPayments`, `useSectionStudents`, `useStudentSearch`, `useFeeSettings`, `useFeeStructure`, `useCarryForwardPlan` |

## Data

`feeAccounts/{session}_{studentId}`, `feePayments/{session}_{serial}`, `feeCounters/{session}`,
`feeStructures/{session}`, `feeSettings/general` (see FEE_MANAGEMENT.md section 3).

## Change X -> look here

- Rules of what can be ticked / paid first: `feeAccount.ts` (tick + allocation functions).
- Labels of actions: `FeeStudentBar.tsx` (`ACTIONS`), `FeeAdjustDialog.tsx` (titles, messages).
- Receipt after payment: [fee-receipt.md](fee-receipt.md).
