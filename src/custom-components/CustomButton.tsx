import { ButtonHTMLAttributes, ReactNode } from "react";

const VARIANTS = {
  primary: "bg-blue-600 text-white shadow-sm hover:bg-blue-700",
  success: "bg-green-600 text-white shadow-sm hover:bg-green-700",
  danger: "bg-red-600 text-white shadow-sm hover:bg-red-700",
  // School-colour gradient (bg-cves in tailwind.config.js).
  cves: "bg-cves text-white shadow-sm hover:shadow-md hover:brightness-110",
  outline:
    "border border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white",
} as const;

type Variant = keyof typeof VARIANTS;

interface CustomButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  type?: "submit" | "reset" | "button";
  variant?: Variant;
  loading?: boolean;
  children?: ReactNode;
  className?: string;
}

function CustomButton({
  type = "submit",
  variant = "primary",
  loading = false,
  children,
  className = "",
  ...rest
}: CustomButtonProps) {
  return (
    <button
      type={type}
      disabled={loading}
      className={`inline-flex items-center justify-center gap-2 rounded-md px-6 py-2.5 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${
        VARIANTS[variant] || VARIANTS.primary
      } ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export default CustomButton;