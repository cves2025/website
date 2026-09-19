import type {
  ButtonHTMLAttributes,
  MouseEvent,
  ReactNode,
} from "react";

const VARIANTS = {
  primary: "bg-blue-600 text-white shadow-sm hover:bg-blue-700",
  success: "bg-green-600 text-white shadow-sm hover:bg-green-700",
  danger: "bg-red-600 text-white shadow-sm hover:bg-red-700",
  warning: "bg-amber-500 text-white shadow-sm hover:bg-amber-600",
  outline:
    "border border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white",
  ghost: "bg-transparent text-blue-600 hover:bg-blue-50",
} as const;

const SIZES = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-5 py-2 text-sm",
  lg: "px-7 py-3 text-base",
  xl: "px-8 py-3.5 text-lg",
} as const;

export type ButtonVariant = keyof typeof VARIANTS;
export type ButtonSize = keyof typeof SIZES;

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Text shown inside the button. */
  buttonName?: ReactNode;
  /** Colour style of the button. */
  variant?: ButtonVariant;
  /** Alias of `variant` (handles the "varients" prop name too). */
  variants?: ButtonVariant;
  /** Controls the font size / padding of the button label. */
  size?: ButtonSize;
  /** Extra Tailwind classes merged on top of the default styles. */
  buttonStyle?: string;
  /** Callback fired on click — pass your own function here. */
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
}

function Button({
  buttonName,
  variant,
  variants,
  size = "md",
  buttonStyle = "",
  type = "button",
  children,
  onClick,
  ...rest
}: ButtonProps) {
  const resolvedVariant = variants ?? variant ?? "primary";

  return (
    <button
      type={type}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-md font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
        VARIANTS[resolvedVariant] || VARIANTS.primary
      } ${SIZES[size] || SIZES.md} ${buttonStyle}`}
      {...rest}
    >
      {buttonName ?? children}
    </button>
  );
}

export default Button;