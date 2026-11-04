import { Toaster, toast, resolveValue, type Toast } from "react-hot-toast";
import { CheckCircle2, XCircle, Info, Loader2, X } from "lucide-react";

const variants = {
  success: { accent: "#16a34a", iconBg: "#dcfce7", Icon: CheckCircle2, title: "Success" },
  error: { accent: "#dc2626", iconBg: "#fee2e2", Icon: XCircle, title: "Error" },
  loading: { accent: "#2563eb", iconBg: "#dbeafe", Icon: Loader2, title: "Please wait" },
  blank: { accent: "#2563eb", iconBg: "#dbeafe", Icon: Info, title: "Notice" },
} as const;

function AppToast({ t }: { t: Toast }) {
  const v = variants[t.type as keyof typeof variants] ?? variants.blank;
  const showProgress = t.type !== "loading" && Number.isFinite(t.duration);

  return (
    <div
      className={`app-toast ${t.visible ? "app-toast-enter" : "app-toast-exit"}`}
      style={{ ["--toast-accent" as string]: v.accent }}
      role="status"
      aria-live="polite"
    >
      <span className="app-toast-icon" style={{ background: v.iconBg, color: v.accent }}>
        <v.Icon size={20} strokeWidth={2.4} className={t.type === "loading" ? "animate-spin" : ""} />
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-gray-900">{v.title}</p>
        <div className="mt-0.5 break-words text-sm text-gray-600">{resolveValue(t.message, t)}</div>
      </div>

      <button
        type="button"
        onClick={() => toast.dismiss(t.id)}
        className="-mr-1 -mt-1 rounded-md p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
        aria-label="Close"
      >
        <X size={16} />
      </button>

      {showProgress && (
        <span className="app-toast-progress" style={{ animationDuration: `${t.duration}ms` }} />
      )}
    </div>
  );
}

export function AppToaster() {
  return (
    <Toaster
      position="top-right"
      gutter={10}
      toastOptions={{ duration: 4000, success: { duration: 3000 }, error: { duration: 5000 } }}
    >
      {(t) => (t.type === "custom" ? <>{resolveValue(t.message, t)}</> : <AppToast t={t} />)}
    </Toaster>
  );
}
