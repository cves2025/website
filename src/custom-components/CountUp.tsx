import { useCountUp } from "../hooks/useCountUp";

interface CountUpProps {
  /** The number it ends on. */
  value: number;
  /** How it is written; gets the gliding (fractional) number. Whole numbers by default. */
  format?: (value: number) => string;
  /** Written after the number, e.g. "%". */
  suffix?: string;
}

/**
 * Dashboard number that counts up to `value` (and glides to a new one), so
 * the cards come alive when they load. Screen readers get the final value.
 *
 *   <CountUp value={742} />   <CountUp value={total} format={formatRupees} />
 */
function CountUp({ value, format = (n) => String(Math.round(n)), suffix = "" }: CountUpProps) {
  const shown = useCountUp(value);
  return (
    <span aria-label={`${format(value)}${suffix}`}>
      <span aria-hidden="true">
        {format(shown)}
        {suffix}
      </span>
    </span>
  );
}

export default CountUp;
