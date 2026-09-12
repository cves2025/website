import React from "react";
import { Barcode } from "./idCardDesigns.jsx";

function initialsOf(name) {
  return (name || "U")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() || "U";
}

// ============================================================
// DESIGN 1 - CLASSIC  (portrait, blue band, barcode)
// ============================================================
function ClassicCard({ person }) {
  const initials = initialsOf(person.name);
  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden max-w-xs mx-auto">
      <div className="bg-gradient-to-b from-blue-800 to-blue-600 text-white text-center px-4 py-3">
        <p className="font-black text-sm leading-tight">CHILDREN'S VALLEY ENG. SCHOOL</p>
        <p className="text-[10px] opacity-90">Mahmoorganj, Varanasi (UP)</p>
      </div>
      <div className="px-4 py-3 flex flex-col items-center text-center">
        <div className="w-20 h-24 rounded-lg bg-gradient-to-br from-blue-100 to-blue-200 border-2 border-blue-700 text-blue-800 flex items-center justify-center text-2xl font-bold shadow">
          {initials}
        </div>
        <p className="mt-2 text-[10px] font-bold tracking-widest text-blue-700">{person.role} ID</p>
        <h3 className="text-base font-extrabold text-gray-900 leading-tight">{person.name}</h3>
        <div className="mt-2 w-full space-y-1 text-[12px] text-gray-700">
          <p><span className="font-semibold">ID:</span> {person.id}</p>
          {person.detailLabel && <p><span className="font-semibold">{person.detailLabel}:</span> {person.detail}</p>}
          {person.extraLabel && <p><span className="font-semibold">{person.extraLabel}:</span> {person.extra}</p>}
        </div>
      </div>
      <div className="px-4 pb-3">
        <div className="flex justify-center text-gray-800"><Barcode className="h-8" /></div>
        <p className="text-center text-[10px] text-gray-500 mt-1">Valid till: {person.validTill || "31 Mar 2027"}</p>
        <div className="mt-2 pt-2 border-t border-gray-200 flex items-center justify-between text-[10px] text-gray-600">
          <span className="font-bold">CVES</span>
          <span className="border-t border-gray-500 pt-0.5 w-16 text-center font-semibold">Sign.</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// DESIGN 2 - MODERN  (horizontal badge, bold green strip)
// ============================================================
function ModernCard({ person }) {
  const initials = initialsOf(person.name);
  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden flex max-w-md mx-auto">
      <div className="w-2.5 bg-gradient-to-b from-green-600 to-emerald-400" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between px-4 pt-3">
          <div>
            <p className="text-[10px] font-bold tracking-widest text-green-700 uppercase">{person.role}</p>
            <p className="font-black text-sm text-gray-900">CHILDREN'S VALLEY ENGLISH SCHOOL</p>
            <p className="text-[10px] text-gray-500">Mahmoorganj, Varanasi (UP)</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-green-600 text-white flex items-center justify-center font-bold shrink-0">
            {initials}
          </div>
        </div>
        <div className="px-4 py-3 flex items-center gap-3">
          <div className="w-16 h-20 rounded-lg bg-gray-200 border-2 border-gray-300 text-gray-600 flex items-center justify-center text-xl font-bold shrink-0">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-extrabold text-gray-900 leading-tight truncate">{person.name}</h3>
            <p className="text-[11px] text-gray-500 font-semibold">{person.id}</p>
            <div className="mt-1 grid grid-cols-2 gap-x-2 gap-y-0.5 text-[11px] text-gray-700">
              {person.detailLabel && <p><span className="font-semibold text-gray-500">{person.detailLabel}:</span> {person.detail}</p>}
              {person.extraLabel && <p><span className="font-semibold text-gray-500">{person.extraLabel}:</span> {person.extra}</p>}
            </div>
          </div>
        </div>
        <div className="px-4 pb-3 flex items-center justify-between border-t border-gray-100 pt-2">
          <p className="text-[10px] text-gray-500">Valid till: <b>{person.validTill || "31 Mar 2027"}</b></p>
          <div className="text-gray-700"><Barcode className="h-6" /></div>
        </div>
      </div>
    </div>
  );
}

export { ClassicCard, ModernCard, initialsOf };

// ============================================================
// DESIGN 3 - PREMIUM  (dark navy + gold)
// ============================================================
function PremiumCard({ person }) {
  const initials = initialsOf(person.name);
  return (
    <div className="bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 rounded-2xl shadow-2xl overflow-hidden max-w-md mx-auto text-white ring-1 ring-amber-300/40">
      <div className="px-5 pt-4 pb-3 border-b border-amber-300/30 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold tracking-[0.2em] text-amber-300 uppercase">Identity Card</p>
          <p className="font-black text-sm leading-tight">Children's Valley</p>
          <p className="font-black text-sm leading-tight text-amber-300">English School</p>
          <p className="text-[10px] text-gray-400 mt-0.5">Mahmoorganj, Varanasi (UP)</p>
        </div>
        <div className="w-11 h-11 rounded-full bg-amber-400 text-gray-900 flex items-center justify-center font-black text-lg shrink-0">
          {initials}
        </div>
      </div>
      <div className="px-5 py-4 flex items-center gap-4">
        <div className="w-16 h-20 rounded-lg border-2 border-amber-300/50 bg-gray-700/50 flex items-center justify-center text-xl font-bold text-amber-200 shrink-0">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold tracking-widest text-amber-300 uppercase">{person.role}</p>
          <h3 className="text-lg font-extrabold leading-tight truncate">{person.name}</h3>
          <div className="mt-1.5 space-y-0.5 text-[11px] text-gray-300">
            <p>ID: <b className="text-white">{person.id}</b></p>
            {person.detailLabel && <p>{person.detailLabel}: <b className="text-white">{person.detail}</b></p>}
            {person.extraLabel && <p>{person.extraLabel}: <b className="text-white">{person.extra}</b></p>}
          </div>
        </div>
      </div>
      <div className="px-5 pb-4">
        <div className="flex justify-end text-amber-200/80"><Barcode className="h-8" /></div>
        <div className="mt-2 pt-2 border-t border-gray-600/50 flex items-center justify-between text-[10px] text-gray-400">
          <span>Valid till: <b className="text-amber-300">{person.validTill || "31 Mar 2027"}</b></span>
          <span className="border-t border-amber-300/60 pt-0.5 w-16 text-center text-amber-200 font-semibold">Sign.</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// DESIGN 4 - VIBRANT  (playful gradient)
// ============================================================
function VibrantCard({ person }) {
  const initials = initialsOf(person.name);
  return (
    <div className="bg-gradient-to-br from-pink-500 via-rose-500 to-amber-400 rounded-3xl shadow-2xl overflow-hidden max-w-md mx-auto text-white relative">
      <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full" />
      <div className="absolute -bottom-10 -left-6 w-28 h-28 bg-white/10 rounded-full" />
      <div className="relative px-5 pt-5 pb-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black tracking-[0.2em] uppercase">My School Card</p>
            <p className="font-black text-sm md:text-base leading-tight drop-shadow">Children's Valley English School</p>
            <p className="text-[10px] opacity-90">Mahmoorganj, Varanasi (UP)</p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-white/25 border border-white/50 flex items-center justify-center font-black text-lg shrink-0 backdrop-blur">
            {initials}
          </div>
        </div>
        <div className="mt-4 flex items-center gap-4 bg-white/20 rounded-2xl p-3 backdrop-blur border border-white/30">
          <div className="w-16 h-20 rounded-xl bg-white text-rose-500 flex items-center justify-center text-xl font-black shadow shrink-0">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black tracking-widest uppercase">{person.role}</p>
            <h3 className="text-lg font-black leading-tight drop-shadow truncate">{person.name}</h3>
            <div className="mt-1 space-y-0.5 text-[11px] opacity-95">
              <p><b>ID:</b> {person.id}</p>
              {person.detailLabel && <p><b>{person.detailLabel}:</b> {person.detail}</p>}
              {person.extraLabel && <p><b>{person.extraLabel}:</b> {person.extra}</p>}
            </div>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-[10px]">Valid till: <b>{person.validTill || "31 Mar 2027"}</b></p>
          <div className="text-white/80"><Barcode className="h-7" /></div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Main switcher
// ============================================================
export const DESIGN_RENDERERS = {
  classic: ClassicCard,
  modern: ModernCard,
  premium: PremiumCard,
  vibrant: VibrantCard,
};

function IdCardPreview({ person, design = "classic" }) {
  const Renderer = DESIGN_RENDERERS[design] || ClassicCard;
  return (
    <div className={design === "classic" ? "max-w-xs mx-auto" : "max-w-md mx-auto"}>
      <Renderer person={person} />
    </div>
  );
}

export default IdCardPreview;