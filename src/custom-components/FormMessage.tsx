import { ReactNode } from "react";

interface FormMessageProps {
  type?: "success" | "error";
  children?: ReactNode;
  className?: string;
}

function FormMessage({ type = "success", children, className = "" }: FormMessageProps) {
  if (!children) return null;
  const styles =
    type === "error"
      ? "border-red-300 bg-red-50 text-red-700"
      : "border-green-300 bg-green-50 text-green-700";
  return (
    <div
      className={`mb-4 rounded-md border px-4 py-2.5 text-sm font-semibold ${styles} ${className}`}
    >
      {children}
    </div>
  );
}

export default FormMessage;