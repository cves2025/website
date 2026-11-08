# Fee receipt (print)

Route `/welcome/fees/receipt?id=<paymentId>` (`FEE_RECEIPT_PATH`). Opened after collecting a fee
and from payment history. Business rules of fees: [../FEE_MANAGEMENT.md](../FEE_MANAGEMENT.md).

## Files

| File | What it does |
|---|---|
| `src/component/panel/fees/FeeReceipt.tsx` | Page: Back / Print buttons, `ReceiptPrintPanel`, preview sheets. Always `@page A4, margin 0`. Full A4: one sheet, copies top + bottom with a "cut here" line. Half sheets: one A4 page per copy, copy in the top half (preview marks where the half sheet ends). `FitBox` scales a too-long copy down to its half. `changePrint` saves settings at once |
| `src/component/panel/fees/ReceiptPrintPanel.tsx` | Settings card: Design (4), Paper (full A4 / half sheets), Copies (both / student / office); "Saving / Saved" state |
| `src/component/panel/fees/ReceiptDesigns.tsx` | The 4 designs as inline-styled components: Classic (H), Minimal (I), Balance (J, shows paid earlier / balance due), Band + Stamp (K, PAID stamp in the footer). Shared `Logo` (logo inside a circle at 70%), `CancelledStamp`, `Field`, `Signature` (`middle` slot), `Note` |
| `src/utils/feeService.ts` | `loadReceiptPrintSettings` / `saveReceiptPrintSettings` (`feeSettings/receiptPrint`), `loadReceiptBalance(payment)` |
| `src/hooks/useReceiptPrintSettings.ts` | Settings hook |
| `src/hooks/useReceiptBalance.ts` | Balance of the Balance design; reads account + its receipts only when that design is chosen and the receipt is active |

## Data

`feeSettings/receiptPrint` = `{ design, paper, copies }` (`ReceiptPrintSettings` in type.ts;
defaults `DEFAULT_RECEIPT_PRINT`; options `RECEIPT_DESIGN_OPTIONS`, `RECEIPT_PAPER_OPTIONS`,
`RECEIPT_COPIES_OPTIONS` in constants). Kept apart from `feeSettings/general`, which the Fee
Settings page overwrites whole. Firestore rules: fee collections are admin only.

Balance: paid earlier = active receipts with a smaller serial; balance = account due now +
active receipts saved later; total = paid earlier + this + balance (waived parts not counted).

## Change X -> look here

- A design's look: its component in `ReceiptDesigns.tsx`.
- New design: `ReceiptDesign` (type.ts), `RECEIPT_DESIGN_OPTIONS`, `DESIGNS` map in `ReceiptDesigns.tsx`.
- Page spacing / cut line / half-sheet marker: the sheet markup in `FeeReceipt.tsx`.
- Fonts Inter / Noto Serif are loaded in `index.html`.
