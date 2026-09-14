import React from "react";

// Static design-only replica of page 2 (Last School Details + Physical Status +
// Declaration) of the Children's Valley English School admission form.
// No form logic/state is wired up — pure visual markup.

const AdmissionFormPage2: React.FC = () => {
  return (
    <div className="mx-auto max-w-4xl bg-white p-6 sm:p-10 font-serif text-slate-900">
      {/* LAST SCHOOL DETAILS */}
      <div className="relative mb-10">
        <div className="absolute -top-4 left-8 z-10 bg-yellow-300 px-6 py-1.5 shadow">
          <p className="font-bold text-indigo-900 tracking-wide">
            LAST SCHOOL DETAILS
          </p>
        </div>

        <div className="border-2 border-green-700 pt-8 pb-6 px-6 sm:px-8">
          <div className="flex items-center gap-2 mb-6">
            <span className="font-bold text-indigo-900 whitespace-nowrap">
              PEN of Student -
            </span>
            <div className="h-9 flex-1 border border-indigo-900" />
          </div>

          <div className="space-y-5 text-pink-800 font-medium">
            <div className="flex items-end gap-2">
              <span className="whitespace-nowrap">School Name :</span>
              <span className="border-b border-slate-400 flex-1" />
            </div>
            <div className="flex items-end gap-2">
              <span className="whitespace-nowrap">School Address :</span>
              <span className="border-b border-slate-400 flex-1" />
            </div>
            <div className="flex items-end gap-2">
              <span className="whitespace-nowrap">Passing Year :</span>
              <span className="border-b border-slate-400 w-40" />
            </div>
          </div>

          <p className="font-bold text-red-700 mt-6 mb-3 text-sm sm:text-base">
            11. PREVIOUS QUALIFYING EXAM DETAIL
          </p>

          <div className="flex flex-wrap items-center gap-4 text-green-800 font-medium">
            <div className="flex items-center gap-2">
              <span>Maximum Marks</span>
              <div className="h-8 w-20 border border-indigo-900" />
            </div>
            <div className="flex items-center gap-2">
              <span>Class</span>
              <div className="h-8 w-16 border border-indigo-900" />
            </div>
            <div className="flex items-center gap-2">
              <span>Marks Obtained</span>
              <div className="h-8 w-16 border border-indigo-900" />
              <span>%</span>
              <div className="h-8 w-16 border border-indigo-900" />
            </div>
          </div>
        </div>
      </div>

      {/* PHYSICAL STATUS OF STUDENT */}
      <div className="relative mb-8">
        <div className="absolute -top-4 left-8 z-10 bg-yellow-300 px-6 py-1.5 shadow">
          <p className="font-bold text-indigo-900 tracking-wide">
            PHYSICAL STATUS OF STUDENT
          </p>
        </div>

        <div className="border-2 border-green-700 pt-8 pb-6 px-6 sm:px-8">
          <div className="flex gap-6">
            <div className="flex-1 space-y-4 text-pink-800 font-medium">
              <div className="flex items-end gap-2">
                <span className="whitespace-nowrap">Student&apos;s Name</span>
                <span className="border-b border-slate-400 flex-1" />
              </div>
              <div className="flex items-end gap-2">
                <span className="whitespace-nowrap">Father&apos;s Name</span>
                <span className="border-b border-slate-400 flex-1" />
              </div>
              <div className="flex items-end gap-2">
                <span className="whitespace-nowrap">Mother&apos;s Name</span>
                <span className="border-b border-slate-400 flex-1" />
              </div>
            </div>

            <div className="flex-1 space-y-4 text-pink-800 font-medium">
              <div className="flex items-end gap-2">
                <span className="whitespace-nowrap">Weight in Kg.</span>
                <span className="border-b border-slate-400 flex-1" />
              </div>
              <div className="flex items-end gap-2">
                <span className="whitespace-nowrap">Height in Cm.</span>
                <span className="border-b border-slate-400 flex-1" />
              </div>
              <div className="flex items-end gap-2">
                <span className="whitespace-nowrap">Blood Group</span>
                <span className="border-b border-slate-400 flex-1" />
              </div>
            </div>

            <div className="hidden sm:flex h-28 w-24 border border-slate-500 items-center justify-center text-sm font-semibold shrink-0">
              PHOTO
            </div>
          </div>

          <div className="space-y-4 text-pink-800 font-medium mt-6">
            <div className="flex items-end gap-2">
              <span className="whitespace-nowrap">Allergy from any Medicine</span>
              <span className="border-b border-slate-400 flex-1" />
            </div>
            <div className="flex items-end gap-2">
              <span className="whitespace-nowrap">Allergy from any other thing</span>
              <span className="border-b border-slate-400 flex-1" />
            </div>
            <div className="flex items-end gap-2">
              <span className="whitespace-nowrap">Any Disease</span>
              <span className="border-b border-slate-400 flex-1" />
            </div>
            <div className="flex items-end gap-2">
              <span className="whitespace-nowrap">Any other information</span>
              <span className="border-b border-slate-400 flex-1" />
            </div>
          </div>

          <p className="text-right italic text-indigo-900 font-semibold mt-6">
            Parents&apos; Signature
          </p>
        </div>
      </div>

      {/* DECLARATION */}
      <div className="text-center mb-4">
        <h2 className="text-2xl italic font-bold text-purple-900 underline underline-offset-4">
          Declaration
        </h2>
      </div>

      <ul className="space-y-3 text-red-700 font-medium list-disc pl-6 mb-10">
        <li>
          I hereby declare that the information Submitted is complete and
          correct to the best of my knowledge.
        </li>
        <li>
          I fully agree to abide by rules and regulations of the School as
          they are now and may be in the future constituted and I will not
          claim for any refund of fees.
        </li>
        <li>
          In Case of any Unusual Occurrence on road or out side of the
          school, The School Management will not be Responsible.
        </li>
      </ul>

      {/* Signatures */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-green-800 font-medium mb-6">
        <div>
          <p>Signature of Father/Guardian</p>
          <p className="mt-3">Date:.......................................</p>
        </div>
        <div>
          <p>Signature of Mother</p>
          <p className="mt-3">Date:.......................................</p>
        </div>
        <div>
          <p>Signature of Student</p>
          <p className="mt-3">Date:.......................................</p>
        </div>
      </div>

      <p className="text-center text-indigo-900 font-semibold">
        Note: Enclose attested mark sheet &amp; T.C. of privious school.
      </p>
    </div>
  );
};

export default AdmissionFormPage2;
