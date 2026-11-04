const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
  "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen",
  "Eighteen", "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

/** 0-99 in words. */
function twoDigits(value: number): string {
  if (value < 20) return ONES[value];
  return `${TENS[Math.floor(value / 10)]} ${ONES[value % 10]}`.trim();
}

/** 0-999 in words. */
function threeDigits(value: number): string {
  const hundreds = Math.floor(value / 100);
  const rest = value % 100;
  return [hundreds ? `${ONES[hundreds]} Hundred` : "", rest ? twoDigits(rest) : ""]
    .filter(Boolean)
    .join(" ");
}

/**
 * A rupee amount in words with the Indian system (lakh, crore), e.g.
 * 125000 -> "Rupees One Lakh Twenty Five Thousand Only".
 */
export function amountInWords(amount: number): string {
  let value = Math.round(Math.abs(amount));
  if (value === 0) return "Rupees Zero Only";
  const parts: string[] = [];
  const crore = Math.floor(value / 10000000);
  value %= 10000000;
  const lakh = Math.floor(value / 100000);
  value %= 100000;
  const thousand = Math.floor(value / 1000);
  value %= 1000;
  if (crore) parts.push(`${threeDigits(crore)} Crore`);
  if (lakh) parts.push(`${twoDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${twoDigits(thousand)} Thousand`);
  if (value) parts.push(threeDigits(value));
  return `Rupees ${parts.join(" ")} Only`;
}
