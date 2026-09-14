import React from "react";

// Static design-only replica of the Children's Valley English School admission form.
// No form logic/state is wired up — pure visual markup, ready to be made functional later.

const BoxedInput: React.FC<{ cells: number }> = ({ cells }) => {
  return (
    <div className="flex w-full border border-sky-500">
      {Array.from({ length: cells }).map((_, i) => (
        <div
          key={i}
          className={`h-9 flex-1 ${i !== cells - 1 ? "border-r border-sky-500" : ""}`}
        />
      ))}
    </div>
  );
};

const CheckboxRow: React.FC<{ label: string }> = ({ label }) => (
  <div className="flex items-center justify-between">
    <span className="text-red-700 font-semibold text-sm">{label}</span>
    <div className="h-5 w-5 border-2 border-green-700" />
  </div>
);

const AdmissionForm: React.FC = () => {
  return (
    <div className="mx-auto max-w-4xl bg-white p-6 sm:p-10 font-serif text-slate-900">
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="text-xs sm:text-sm font-semibold text-slate-800">
          School Code : 09670911304
        </div>
        <div className="text-xs sm:text-sm font-semibold text-slate-800">
          Affiliation No. : 14203-05
        </div>
      </div>

      <div className="flex items-center gap-4 mb-2">
        {/* Logo placeholder */}
        <div className="h-24 w-24 sm:h-28 sm:w-28 shrink-0 rounded-full border-2 border-amber-400 flex items-center justify-center text-center text-[8px] leading-tight text-slate-500 p-1">
          SCHOOL LOGO
        </div>

        <div className="flex-1 text-center">
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            <span className="text-green-700">CHILDREN&apos;S </span>
            <span className="text-indigo-800">VALLEY </span>
            <span className="text-red-600">ENGLISH SCHOOL</span>
          </h1>
          <p className="italic text-indigo-900 text-xs sm:text-base mt-1">
            D 59/295 A, Mahmoorganj, Varanasi : 0542-2220107, 9336576690
          </p>
          <div className="flex items-center justify-center gap-4 sm:gap-8 mt-2 text-xs sm:text-base">
            <span className="text-red-600 font-bold underline">A Gov. Affiliated</span>
            <span className="text-green-700 font-bold underline">C.B.S.E. Pattern</span>
            <span className="text-indigo-900 font-bold underline">Co - Education</span>
          </div>
        </div>

        {/* QR placeholders */}
        <div className="hidden sm:flex flex-col gap-1 shrink-0">
          <div className="flex gap-2">
            <div className="h-16 w-16 border border-slate-400 flex items-center justify-center text-[7px] text-slate-400">
              QR
            </div>
            <div className="h-16 w-16 border border-slate-400 flex items-center justify-center text-[7px] text-slate-400">
              QR
            </div>
          </div>
          <div className="flex gap-2 text-[8px] text-center text-slate-600">
            <span className="w-16">Scan for Location</span>
            <span className="w-16">Scan for Contact</span>
          </div>
        </div>
      </div>

      {/* Admission form banner */}
      <div className="flex justify-center mb-6">
        <div className="bg-pink-600 text-white text-2xl sm:text-3xl font-bold italic px-8 py-2 rounded-md shadow">
          ADMISSION FORM
        </div>
      </div>

      {/* Class / Session / Enrollment */}
      <div className="flex flex-wrap items-end gap-6 mb-6 text-green-800 font-semibold text-sm sm:text-base">
        <div className="flex items-end gap-2">
          <span>Class :</span>
          <span className="border-b border-slate-500 w-28" />
        </div>
        <div className="flex items-end gap-2">
          <span>Session : 20</span>
          <span className="border-b border-slate-500 w-8" />
          <span>- 20</span>
          <span className="border-b border-slate-500 w-8" />
        </div>
        <div className="flex items-end gap-2">
          <span>Enrollment No. :</span>
          <span className="border-b border-slate-500 w-32" />
        </div>
      </div>

      {/* Student / Mother / Father / Occupation */}
      <div className="space-y-5 mb-6">
        <div>
          <p className="font-bold text-sm sm:text-base mb-1">1. STUDENT&apos;S NAME</p>
          <BoxedInput cells={22} />
        </div>
        <div>
          <p className="font-bold text-sm sm:text-base mb-1">2. MOTHER&apos;S NAME</p>
          <BoxedInput cells={22} />
        </div>
        <div>
          <p className="font-bold text-sm sm:text-base mb-1">3. FATHER&apos;S NAME</p>
          <BoxedInput cells={22} />
        </div>
        <div>
          <p className="font-bold text-sm sm:text-base mb-1">4. FATHER&apos;S OCCUPATION</p>
          <BoxedInput cells={22} />
        </div>
      </div>

      {/* Gender / Category / Nationality / DOB */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-6">
        <div className="border border-sky-500 p-3">
          <p className="font-bold text-sm mb-2">5. GENDER</p>
          <div className="space-y-2">
            <CheckboxRow label="MALE" />
            <CheckboxRow label="FEMALE" />
          </div>
        </div>

        <div className="border border-sky-500 p-3">
          <p className="font-bold text-sm mb-2">6. CATEGORY</p>
          <div className="grid grid-cols-2 gap-y-2 gap-x-2">
            <CheckboxRow label="GEN" />
            <CheckboxRow label="OBC" />
            <CheckboxRow label="SC" />
            <CheckboxRow label="ST" />
          </div>
        </div>

        <div className="border border-sky-500 p-3">
          <p className="font-bold text-sm mb-2">7. NATIONALITY</p>
          <div className="flex gap-4">
            <CheckboxRow label="INDIAN" />
            <CheckboxRow label="OTHERS" />
          </div>
        </div>

        <div className="sm:col-span-1">
          <p className="font-bold text-sm mb-2">8. DATE OF BIRTH</p>
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <p className="text-xs text-center mb-1">DATE</p>
              <div className="flex border border-sky-500">
                <div className="h-9 w-full border-r border-sky-500" />
                <div className="h-9 w-full" />
              </div>
            </div>
            <div className="flex-1">
              <p className="text-xs text-center mb-1">MONTH</p>
              <div className="flex border border-sky-500">
                <div className="h-9 w-full border-r border-sky-500" />
                <div className="h-9 w-full" />
              </div>
            </div>
            <div className="flex-1">
              <p className="text-xs text-center mb-1">YEAR</p>
              <div className="flex border border-sky-500">
                <div className="h-9 w-full border-r border-sky-500" />
                <div className="h-9 w-full border-r border-sky-500" />
                <div className="h-9 w-full border-r border-sky-500" />
                <div className="h-9 w-full" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contact number + Photos */}
      <div className="flex flex-col sm:flex-row gap-6 mb-6">
        <div className="flex-1">
          <p className="font-bold text-sm sm:text-base mb-1">9. CONTACT NUMBER</p>
          <p className="text-red-700 text-sm font-semibold mb-1">MOBILE NO.</p>
          <BoxedInput cells={10} />
          <p className="text-red-700 text-sm font-semibold mt-3 mb-1">MOBILE NO.</p>
          <BoxedInput cells={10} />
        </div>

        <div className="flex gap-4 justify-center">
          {["MOTHER'S\nPHOTO", "FATHER'S\nPHOTO", "STUDENT'S\nPHOTO"].map((label) => (
            <div
              key={label}
              className="h-28 w-24 border-2 border-pink-600 flex items-center justify-center text-center text-xs font-semibold whitespace-pre-line px-1"
            >
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* Address section */}
      <div className="text-indigo-900 font-bold text-sm sm:text-base mb-4">
        <p>
          10. WRITE YOUR COMPLETE PERMANENT CORRESPONDENCE ADDRESS INCLUDING
        </p>
        <p>YOUR NAME IN ENGLISH IN CAPITAL LETTRES WITH (BLUE / BALL PEN)</p>
      </div>

      <div className="space-y-4 text-green-800 font-semibold text-sm sm:text-base">
        <div className="flex items-end gap-2">
          <span>NAME :</span>
          <span className="border-b border-slate-500 flex-1" />
        </div>
        <div className="flex items-end gap-2">
          <span>ADDRESS :</span>
          <span className="border-b border-slate-500 flex-1" />
        </div>
        <div className="border-b border-slate-500 h-4" />

        <div className="flex flex-wrap items-end gap-4">
          <div className="flex items-end gap-2 flex-1 min-w-[160px]">
            <span>CITY :</span>
            <span className="border-b border-slate-500 flex-1" />
          </div>
          <div className="flex items-end gap-2 flex-1 min-w-[160px]">
            <span>STATE :</span>
            <span className="border-b border-slate-500 flex-1" />
          </div>
          <div className="flex items-end gap-2">
            <span>PIN:</span>
            <div className="flex border border-slate-400">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className={`h-8 w-7 ${i !== 5 ? "border-r border-slate-400" : ""}`}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-end gap-2">
          <span>PERMANENT ADDRESS :</span>
          <span className="border-b border-slate-500 flex-1" />
        </div>
        <div className="border-b border-slate-500 h-4" />

        <div className="flex flex-wrap items-end gap-4">
          <div className="flex items-end gap-2 flex-1 min-w-[160px]">
            <span>CITY :</span>
            <span className="border-b border-slate-500 flex-1" />
          </div>
          <div className="flex items-end gap-2 flex-1 min-w-[160px]">
            <span>STATE :</span>
            <span className="border-b border-slate-500 flex-1" />
          </div>
          <div className="flex items-end gap-2">
            <span>PIN:</span>
            <div className="flex border border-slate-400">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className={`h-8 w-7 ${i !== 5 ? "border-r border-slate-400" : ""}`}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-end gap-2">
          <span>MANDATORY E-MAIL ADDRESS</span>
          <span className="border-b border-slate-500 flex-1" />
        </div>
      </div>
    </div>
  );
};

export default AdmissionForm;
