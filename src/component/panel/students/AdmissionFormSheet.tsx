import { useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { Control } from "react-hook-form";
import type { AdmissionStudentFormValues } from "../../../utils/type";
import type { PhotoKind } from "../../../firebase/studentPhotos";
import AdmissionBoxedInput from "../../../custom-components/admission/AdmissionBoxedInput";
import AdmissionCheckboxGroup from "../../../custom-components/admission/AdmissionCheckboxGroup";
import AdmissionDateOfBirth from "../../../custom-components/admission/AdmissionDateOfBirth";
import AdmissionLineInput from "../../../custom-components/admission/AdmissionLineInput";
import AdmissionPinInput from "../../../custom-components/admission/AdmissionPinInput";
import AdmissionSessionInput from "../../../custom-components/admission/AdmissionSessionInput";
import AdmissionSelectInput from "../../../custom-components/admission/AdmissionSelectInput";
import MobileNumberInputBox from "../../../custom-components/admission/MobileNumberInputBox";
import { ADMISSION_SECTIONS, CLASSES, PHONE_PATTERN } from "../../../constants";
import schoolLogo from "../../../assets/image/schoolLogo.jpg";
import QrCodeScanForLocation from "./QrCodeScanForLocation";
import QrCodeScanForContact from "./QrCodeScanForContact";

/**
 * The two pages of the paper admission form, shared by Add / Edit Student
 * (editable) and View Student (read-only, printable). Only the form itself
 * lives here; the page around it adds its own buttons.
 */

/**
 * Makes the disabled form read like a filled-in paper form: full colour
 * instead of the greyed-out disabled look, no placeholders and no dropdown
 * arrows.
 */
export const READ_ONLY_FORM =
  "m-0 min-w-0 border-0 p-0 [&_:disabled]:!cursor-default [&_:disabled]:!opacity-100 [&_*:has(:disabled)]:!opacity-100 [&_label]:!opacity-100 [&_input::placeholder]:!text-transparent [&_[data-placeholder]]:!text-transparent [&_[role=combobox]>svg]:hidden [&_[role=combobox]]:!bg-transparent [&_input[readonly]]:!text-slate-900";

/**
 * Width (px) the form is laid out at inside an A4 sheet - the width the
 * screen form is designed for. The sheet then scales it down to fit.
 */
const SHEET_DESIGN_WIDTH = 900;

/**
 * One A4 sheet (210 x 297 mm, 10 mm margin). The same size on screen and on
 * paper, so what is seen is what prints. The form is laid out at
 * SHEET_DESIGN_WIDTH and scaled to fit the sheet's width and height, so it
 * keeps the screen layout and is never cut off.
 */
export function A4Sheet({ children }: { children: ReactNode }) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState({ scale: 1, offset: 0 });

  useLayoutEffect(() => {
    const content = contentRef.current;
    const box = content?.parentElement;
    if (!content || !box) return;

    // A transform does not change the layout size, so measuring it never
    // feeds back into the scale.
    const measure = () => {
      const scale = Math.min(
        box.clientWidth / SHEET_DESIGN_WIDTH,
        box.clientHeight / content.offsetHeight,
      );
      // Centre the scaled form across the sheet.
      setFit({
        scale,
        offset: (box.clientWidth - SHEET_DESIGN_WIDTH * scale) / 2,
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(content);
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="mx-auto h-[296mm] w-[210mm] shrink-0 overflow-hidden bg-white p-[10mm] shadow-lg print:mx-0 print:shadow-none print:break-after-page print:last:break-after-auto">
      <div className="h-full w-full">
        <div
          ref={contentRef}
          className="font-times lining-nums text-slate-900"
          style={{
            width: SHEET_DESIGN_WIDTH,
            transform: `translateX(${fit.offset}px) scale(${fit.scale})`,
            transformOrigin: "top left",
          }}
        >
          {children}
        </div>
      </div>
    </section>
  );
}

const PIN_RULES = {
  pattern: {
    value: /^\d{0,6}$/,
    message: "PIN must be 6 digits",
  },
};

interface SheetProps {
  control: Control<AdmissionStudentFormValues>;
}

interface InfoSheetProps extends SheetProps {
  /** Text of the pink banner, e.g. "ADMISSION FORM". */
  bannerTitle: string;
  /** Draws one photo box (upload box when editing, plain photo when viewing). */
  renderPhoto: (kind: PhotoKind, label: string) => ReactNode;
}

/** Page 1: Student Info. */
export function AdmissionInfoSheet({
  control,
  bannerTitle,
  renderPhoto,
}: InfoSheetProps) {
  return (
    <>
      {/* Header - laid out like the printed form */}
      <div className="mb-3 flex items-center gap-4">
        <img
          src={schoolLogo}
          alt="school logo"
          className="h-28 w-28 shrink-0 object-contain sm:h-32 sm:w-32"
          loading="lazy"
        />

        <div className="min-w-0 flex-1 text-center">
          <div className="mb-1 flex items-start justify-between gap-2 text-xs font-semibold text-slate-800 sm:text-sm">
            <span>School Code : 09670911304</span>
            <span>Affiliation No. : 14203-05</span>
          </div>
          <h1 className="font-cancun text-xl font-extrabold tracking-tight sm:whitespace-nowrap sm:text-3xl">
            <span className="text-green-700">CHILDREN&apos;S </span>
            <span className="text-indigo-800">VALLEY </span>
            <span className="text-red-600">ENGLISH </span>
            <span className="text-pink-600">SCHOOL</span>
          </h1>
          <p className="italic text-indigo-900 text-xs sm:text-base mt-1">
            D 59/295 A, Mahmoorganj, Varanasi : 0542-2220107, 9336576690
          </p>
          <div className="flex items-center justify-center gap-4 sm:gap-8 mt-2 text-xs sm:text-base">
            <span className="text-red-600 font-bold underline">
              A Gov. Affiliated
            </span>
            <span className="text-green-700 font-bold underline">
              C.B.S.E. Pattern
            </span>
            <span className="text-indigo-900 font-bold underline">
              Co - Education
            </span>
          </div>
        </div>
      </div>

      {/* Admission form banner, with the QR codes on its right */}
      <div className="relative mb-6 flex items-center justify-center sm:min-h-[7.5rem]">
        <div className="bg-pink-600 text-white text-xl sm:text-2xl font-bold italic px-8 py-2 rounded-md shadow">
          {bannerTitle}
        </div>
        <div className="absolute right-0 top-1/2 hidden -translate-y-1/2 gap-2 sm:flex">
          <QrCodeScanForLocation />
          <QrCodeScanForContact />
        </div>
      </div>

      {/* Class / Section / Session / Enrollment */}
      <div className="flex flex-wrap items-start gap-6 mb-6 text-green-800 font-semibold text-sm sm:flex-nowrap sm:justify-between sm:text-base">
        <AdmissionSelectInput
          control={control}
          name="className"
          prefix="Class :"
          options={CLASSES.map((cls) => ({ label: cls, value: cls }))}
        />
        <AdmissionSelectInput
          control={control}
          name="section"
          prefix="Section :"
          placeholder="Select"
          options={ADMISSION_SECTIONS.map((section) => ({
            label: section,
            value: section,
          }))}
        />
        <AdmissionSessionInput
          control={control}
          startName="sessionStart"
          endName="sessionEnd"
          rules={{ required: "Please enter session" }}
        />
        <AdmissionLineInput
          control={control}
          name="enrollment"
          prefix="Enrollment No. :"
          maxLength={5}
          numeric
          className="w-32"
          rules={{ required: "Enrollment number is required" }}
        />
      </div>
      {/* Student / Mother / Father / Occupation */}
      <div className="space-y-5 mb-6">
        <div>
          <p className="font-bold text-sm sm:text-base mb-1">
            1. STUDENT&apos;S NAME
          </p>
          <AdmissionBoxedInput
            control={control}
            name="fullName"
            cells={24}
            fillRow
            maxLength={50}
            rules={{ required: "Student's name is required" }}
          />
        </div>
        <div>
          <p className="font-bold text-sm sm:text-base mb-1">
            2. MOTHER&apos;S NAME
          </p>
          <AdmissionBoxedInput
            control={control}
            name="motherName"
            cells={24}
            fillRow
            maxLength={50}
            rules={{ required: "Mother's name is required" }}
          />
        </div>
        <div>
          <p className="font-bold text-sm sm:text-base mb-1">
            3. FATHER&apos;S NAME
          </p>
          <AdmissionBoxedInput
            control={control}
            name="fatherName"
            cells={24}
            fillRow
            maxLength={50}
            rules={{ required: "Father's name is required" }}
          />
        </div>
        <div>
          <p className="font-bold text-sm sm:text-base mb-1">
            4. FATHER&apos;S OCCUPATION
          </p>
          <AdmissionBoxedInput
            control={control}
            name="fatherOccupation"
            cells={24}
            fillRow
            maxLength={50}
          />
        </div>
      </div>

      {/* Gender / Category / Nationality / DOB */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-6">
        <div className="border border-sky-500 p-3">
          <p className="font-bold text-sm mb-2">5. GENDER</p>
          <AdmissionCheckboxGroup
            control={control}
            name="gender"
            options={[
              { value: "MALE", label: "MALE" },
              { value: "FEMALE", label: "FEMALE" },
            ]}
            rules={{ required: "Please select gender" }}
            className="space-y-2"
          />
        </div>

        <div className="border border-sky-500 p-3">
          <p className="font-bold text-sm mb-2">6. CATEGORY</p>
          <AdmissionCheckboxGroup
            control={control}
            name="category"
            options={[
              { value: "GEN", label: "GEN" },
              { value: "OBC", label: "OBC" },
              { value: "SC", label: "SC" },
              { value: "ST", label: "ST" },
            ]}
            rules={{ required: "Please select category" }}
            className="grid grid-cols-2 gap-y-2 gap-x-2"
          />
        </div>

        <div className="border border-sky-500 p-3">
          <p className="font-bold text-sm mb-2">7. NATIONALITY</p>
          <AdmissionCheckboxGroup
            control={control}
            name="nationality"
            options={[
              { value: "INDIAN", label: "INDIAN" },
              { value: "OTHERS", label: "OTHERS" },
            ]}
            rules={{ required: "Please select nationality" }}
            className="flex gap-4"
          />
        </div>

        <div className="sm:col-span-1">
          <p className="font-bold text-sm mb-2">8. DATE OF BIRTH</p>
          <AdmissionDateOfBirth
            control={control}
            dayName="dobDay"
            monthName="dobMonth"
            yearName="dobYear"
            rules={{
              required: "Enter date of birth",
              pattern: {
                value: /^\d{4}$/,
                message: "Enter 4-digit year",
              },
            }}
          />
        </div>
      </div>

      {/* Contact number + Photos */}
      <div className="flex flex-col sm:flex-row gap-6 mb-6">
        <div className="flex-1">
          <p className="font-bold text-sm sm:text-base mb-1">
            9. CONTACT NUMBER
          </p>
          <p className="text-red-700 text-sm font-semibold mb-1">
            MOBILE NO.
          </p>
          <MobileNumberInputBox
            control={control}
            name="phone"
            type="tel"
            rules={{
              pattern: {
                value: PHONE_PATTERN,
                message: "Phone can contain only digits, spaces, + or -",
              },
            }}
          />
          <p className="text-red-700 text-sm font-semibold mt-3 mb-1">
            MOBILE NO.
          </p>
          <MobileNumberInputBox
            control={control}
            name="phone2"
            type="tel"
            rules={{
              pattern: {
                value: PHONE_PATTERN,
                message: "Phone can contain only digits, spaces, + or -",
              },
            }}
          />
        </div>

        <div className="flex gap-4 justify-center">
          {renderPhoto("mother", "MOTHER'S\nPHOTO")}
          {renderPhoto("father", "FATHER'S\nPHOTO")}
          {renderPhoto("student", "STUDENT'S\nPHOTO")}
        </div>
      </div>
      {/* Address section */}
      <div className="text-indigo-900 font-bold text-sm sm:text-base mb-4">
        <p>
          10. WRITE YOUR COMPLETE PERMANENT CORRESPONDENCE ADDRESS INCLUDING
        </p>
        <p>
          YOUR NAME IN ENGLISH IN CAPITAL LETTRES WITH (BLUE / BALL PEN)
        </p>
      </div>

      <div className="space-y-4 text-green-800 font-semibold text-sm sm:text-base">
        <AdmissionLineInput
          control={control}
          name="correspondenceName"
          prefix="NAME :"
          maxLength={50}
        />
        <AdmissionLineInput
          control={control}
          name="address"
          prefix="ADDRESS :"
          maxLength={100}
        />

        <div className="flex flex-wrap items-end gap-4">
          <AdmissionLineInput
            control={control}
            name="city"
            prefix="CITY :"
            maxLength={50}
            wrapperClassName="flex-1 min-w-[160px]"
          />
          <AdmissionLineInput
            control={control}
            name="state"
            prefix="STATE :"
            maxLength={50}
            wrapperClassName="flex-1 min-w-[160px]"
          />
          <div className="flex items-end gap-2">
            <span className="whitespace-nowrap">PIN:</span>
            <AdmissionPinInput
              control={control}
              name="pin"
              rules={PIN_RULES}
            />
          </div>
        </div>

        <AdmissionLineInput
          control={control}
          name="permanentAddress"
          prefix="PERMANENT ADDRESS :"
          maxLength={100}
        />

        <div className="flex flex-wrap items-end gap-4">
          <AdmissionLineInput
            control={control}
            name="permanentCity"
            prefix="CITY :"
            maxLength={50}
            wrapperClassName="flex-1 min-w-[160px]"
          />
          <AdmissionLineInput
            control={control}
            name="permanentState"
            prefix="STATE :"
            maxLength={50}
            wrapperClassName="flex-1 min-w-[160px]"
          />
          <div className="flex items-end gap-2">
            <span className="whitespace-nowrap">PIN:</span>
            <AdmissionPinInput
              control={control}
              name="permanentPin"
              rules={PIN_RULES}
            />
          </div>
        </div>

        <AdmissionLineInput
          control={control}
          name="email"
          prefix="MANDATORY E-MAIL ADDRESS"
          maxLength={50}
        />
      </div>
    </>
  );
}

/** Page 2: Previous School Info, physical status, declaration, signatures. */
export function AdmissionSchoolSheet({ control }: SheetProps) {
  return (
    <>
      {/* LAST SCHOOL DETAILS */}
      <div className="relative mb-10">
        <div className="absolute -top-4 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap bg-yellow-300 px-6 py-1.5 shadow">
          <p className="font-bold text-indigo-900 tracking-wide">
            LAST SCHOOL DETAILS
          </p>
        </div>

        <div className="border-2 border-green-700 pt-8 pb-6 px-6 sm:px-8">
          <div className="flex items-center gap-2 mb-6">
            <span className="font-bold text-indigo-900 whitespace-nowrap">
              PEN of Student -
            </span>
            <AdmissionBoxedInput
              control={control}
              name="penOfStudent"
              cells={10}
              maxLength={15}
              numeric
              borderColor="border-indigo-900"
              wrapperClassName="flex-1"
            />
          </div>

          <div className="space-y-5 text-pink-800 font-medium">
            <AdmissionLineInput
              control={control}
              name="lastSchoolName"
              prefix="School Name :"
              maxLength={50}
              underlineClassName="border-slate-400"
            />
            <AdmissionLineInput
              control={control}
              name="lastSchoolAddress"
              prefix="School Address :"
              maxLength={100}
              underlineClassName="border-slate-400"
            />
            <AdmissionLineInput
              control={control}
              name="passingYear"
              prefix="Passing Year :"
              className="w-40"
              maxLength={4}
              numeric
              underlineClassName="border-slate-400"
            />
          </div>

          <p className="font-bold text-red-700 mt-6 mb-3 text-sm sm:text-base">
            11. PREVIOUS QUALIFYING EXAM DETAIL
          </p>

          <div className="flex flex-wrap justify-between items-center gap-4 text-green-800 font-medium">
            <div className="flex justify-between items-center gap-2">
              <span className="whitespace-nowrap">Maximum Marks</span>
              <AdmissionBoxedInput
                control={control}
                name="previousQualifyingExam.maximumMarks"
                cells={1}
                maxLength={4}
                numeric
                singleInputBox={true}
                borderColor="border-indigo-900"
                cellHeightClassName="h-8"
                wrapperClassName="w-20"
                align="center"
              />
            </div>
            <div className="flex items-center gap-2">
              <span>Class</span>
              <AdmissionSelectInput
                control={control}
                name="previousQualifyingExam.previousClass"
                options={CLASSES.map((cls) => ({ label: cls, value: cls }))}
                placeholder="Select"
                wrapperClassName="w-24"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="whitespace-nowrap">Marks Obtained</span>
              <AdmissionBoxedInput
                control={control}
                name="previousQualifyingExam.marksObtained"
                cells={1}
                maxLength={4}
                numeric
                singleInputBox={true}
                borderColor="border-indigo-900"
                cellHeightClassName="h-8"
                wrapperClassName="w-16"
                align="center"
              />
              <span>%</span>
              <AdmissionBoxedInput
                control={control}
                name="previousQualifyingExam.percentage"
                cells={1}
                readOnly
                singleInputBox={true}
                borderColor="border-indigo-900"
                cellHeightClassName="h-8"
                wrapperClassName="w-16"
                align="center"
              />
            </div>
          </div>
        </div>
      </div>
      {/* PHYSICAL STATUS OF STUDENT */}
      <div className="relative mb-8">
        <div className="absolute -top-4 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap bg-yellow-300 px-6 py-1.5 shadow">
          <p className="font-bold text-indigo-900 tracking-wide">
            PHYSICAL STATUS OF STUDENT
          </p>
        </div>

        <div className="border-2 border-green-700 pt-8 pb-6 px-6 sm:px-8">
          <div className="flex gap-6">
            <div className="flex-1 space-y-4 text-pink-800 font-medium">
              <AdmissionLineInput
                control={control}
                name="physicalStatus.studentName"
                prefix="Student's Name"
                maxLength={50}
                underlineClassName="border-slate-400"
              />
              <AdmissionLineInput
                control={control}
                name="physicalStatus.fatherName"
                prefix="Father's Name"
                maxLength={50}
                underlineClassName="border-slate-400"
              />
              <AdmissionLineInput
                control={control}
                name="physicalStatus.motherName"
                prefix="Mother's Name"
                maxLength={50}
                underlineClassName="border-slate-400"
              />
            </div>

            <div className="flex-1 space-y-4 text-pink-800 font-medium">
              <AdmissionLineInput
                control={control}
                name="physicalStatus.weight"
                prefix="Weight in Kg."
                maxLength={3}
                numeric
                underlineClassName="border-slate-400"
              />
              <AdmissionLineInput
                control={control}
                name="physicalStatus.height"
                prefix="Height in Cm."
                maxLength={3}
                numeric
                underlineClassName="border-slate-400"
              />
              <AdmissionLineInput
                control={control}
                name="physicalStatus.bloodGroup"
                prefix="Blood Group"
                maxLength={2}
                underlineClassName="border-slate-400"
              />
            </div>

            <div className="hidden sm:flex h-28 w-24 border border-slate-500 items-center justify-center text-sm font-semibold shrink-0">
              PHOTO
            </div>
          </div>

          <div className="space-y-4 text-pink-800 font-medium mt-6">
            <AdmissionLineInput
              control={control}
              name="physicalStatus.allergyMedicine"
              prefix="Allergy from any Medicine"
              maxLength={50}
              underlineClassName="border-slate-400"
            />
            <AdmissionLineInput
              control={control}
              name="physicalStatus.allergyOther"
              prefix="Allergy from any other thing"
              maxLength={50}
              underlineClassName="border-slate-400"
            />
            <AdmissionLineInput
              control={control}
              name="physicalStatus.disease"
              prefix="Any Disease"
              maxLength={50}
              underlineClassName="border-slate-400"
            />
            <AdmissionLineInput
              control={control}
              name="physicalStatus.otherInformation"
              prefix="Any other information"
              maxLength={50}
              underlineClassName="border-slate-400"
            />
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
          <p className="mt-3">
            Date:.......................................
          </p>
        </div>
        <div>
          <p>Signature of Mother</p>
          <p className="mt-3">
            Date:.......................................
          </p>
        </div>
        <div>
          <p>Signature of Student</p>
          <p className="mt-3">
            Date:.......................................
          </p>
        </div>
      </div>

      <p className="text-center text-indigo-900 font-semibold">
        Note: Enclose attested mark sheet &amp; T.C. of privious school.
      </p>
    </>
  );
}
