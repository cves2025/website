import type { LucideIcon } from "lucide-react";
import { IndianRupee, Receipt } from "lucide-react";

const TONES = {
  green: { box: "bg-emerald-50 text-emerald-700 ring-emerald-200", icon: "bg-emerald-600" },
  blue: { box: "bg-indigo-50 text-indigo-700 ring-indigo-200", icon: "bg-primaryBlue" },
  pink: { box: "bg-pink-50 text-pink-700 ring-pink-200", icon: "bg-pink-600" },
};

export interface EmptyStep {
  icon: LucideIcon;
  title: string;
  text: string;
  tone: keyof typeof TONES;
}

interface FeeEmptyStateProps {
  icon: LucideIcon;
  title: string;
  text: string;
  steps: EmptyStep[];
  className?: string;
}

/**
 * The colourful "nothing picked yet" card of the fee pages: a big icon in
 * the school colours, a heading and the numbered steps to get started.
 */
function FeeEmptyState({ icon: Icon, title, text, steps, className = "" }: FeeEmptyStateProps) {
  return (
    <div
      className={`relative flex flex-col items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-white px-6 py-6 text-center ${className}`}
    >
      {/* Soft school-colour glow in the corners */}
      <div aria-hidden className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full bg-emerald-200/40 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -right-10 top-10 h-48 w-48 rounded-full bg-indigo-300/40 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-20 left-1/3 h-56 w-56 rounded-full bg-pink-200/50 blur-3xl" />

      <div className="relative">
        <div className="grid h-20 w-20 place-items-center rounded-full bg-[linear-gradient(135deg,#009746,#393186,#e7087e,#e31e25)] shadow-lg">
          <Icon className="h-10 w-10 text-white" strokeWidth={1.75} />
        </div>
        <span className="absolute -right-4 -top-2 grid h-9 w-9 place-items-center rounded-full bg-amber-400 text-white shadow-md ring-4 ring-white">
          <IndianRupee className="h-4 w-4" strokeWidth={2.5} />
        </span>
        <span className="absolute -bottom-1 -left-5 grid h-9 w-9 place-items-center rounded-full bg-sky-500 text-white shadow-md ring-4 ring-white">
          <Receipt className="h-4 w-4" strokeWidth={2.5} />
        </span>
      </div>

      <h2 className="relative mt-4 text-xl font-bold text-gray-800">{title}</h2>
      <p className="relative mt-1 max-w-md text-sm text-gray-500">{text}</p>

      <ol className="relative mt-5 grid w-full max-w-3xl grid-cols-1 gap-3 sm:grid-cols-3">
        {steps.map((step, index) => (
          <li
            key={step.title}
            className={`flex flex-col items-center gap-1.5 rounded-xl p-3 ring-1 ring-inset ${TONES[step.tone].box}`}
          >
            <span className={`grid h-10 w-10 place-items-center rounded-full text-white shadow ${TONES[step.tone].icon}`}>
              <step.icon className="h-5 w-5" />
            </span>
            <p className="text-sm font-bold">
              {index + 1}. {step.title}
            </p>
            <p className="text-xs opacity-80">{step.text}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

export default FeeEmptyState;
