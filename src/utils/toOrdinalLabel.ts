export function toOrdinalLabel(value: string): string {
  const num = Number(value);
  if (!Number.isInteger(num)) return value; // e.g. "Nursery", "LKG", "PG"

  const remainder100 = num % 100;
  if (remainder100 >= 11 && remainder100 <= 13) return `${num}th`;

  switch (num % 10) {
    case 1:
      return `${num}st`;
    case 2:
      return `${num}nd`;
    case 3:
      return `${num}rd`;
    default:
      return `${num}th`;
  }
}