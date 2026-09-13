import { ID_CARD_DESIGNS } from "./idCardDesigns";

// Design selector buttons row
interface DesignPickerProps {
  value: string;
  onChange: (id: string) => void;
}

export function DesignPicker({ value, onChange }: DesignPickerProps) {
  return (
    <div className="mb-6">
      <p className="text-sm font-semibold text-gray-700 mb-2">Choose Design</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-w-2xl">
        {ID_CARD_DESIGNS.map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => onChange(d.id)}
            className={`rounded-xl border-2 p-2 text-left transition-all ${
              value === d.id
                ? "border-blue-600 bg-blue-50 shadow-sm"
                : "border-gray-200 bg-white hover:border-gray-300"
            }`}
          >
            <div className={`h-8 rounded-md mb-1 ${d.swatch}`} />
            <p className="text-xs font-bold text-gray-800">{d.name}</p>
            <p className="text-[10px] text-gray-500 leading-tight">{d.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

// Demo badge (frontend-only marker)
export function DemoBadge() {
  return (
    <span className="inline-flex items-center gap-1 ml-2 text-[10px] font-bold uppercase tracking-wide bg-amber-100 text-amber-800 border border-amber-300 rounded-full px-2 py-0.5">
      Demo
    </span>
  );
}