import { ReactElement } from "react";
import { NavLink } from "react-router-dom";
import { FaAddressCard, FaClipboardList, FaPlus } from "react-icons/fa";
import {
  ADD_EXAM_PATH,
  EXAM_SCHEDULE_PATH,
  GENERATE_ADMIT_CARD_PATH,
} from "./examScheduleShared";

/**
 * Admit Card hub.
 *
 * Each button opens the page it belongs to:
 *  - "Admit Card"     -> GenerateAdmitCard.tsx (generates and prints the card)
 *  - "Exam Schedule"  -> ExamSchedule.tsx (edits the subject papers)
 *  - "+ Add Exam"     -> the Add Exam page (exam templates)
 */
interface AdmitCardAction {
  /** Route opened by the button / card. */
  to: string;
  /** Text of the top button. */
  buttonLabel: string;
  /** Tailwind color classes of the top button. */
  buttonClass: string;
  icon: ReactElement;
  title: string;
  description: string;
}

const ACTIONS: AdmitCardAction[] = [
  {
    to: ADD_EXAM_PATH,
    buttonLabel: "+ Add Exam",
    buttonClass: "bg-blue-600 hover:bg-blue-700",
    icon: <FaPlus />,
    title: "Add Exam",
    description:
      "Create or edit an exam template with its academic year, applicable classes, exam window and marks scheme.",
  },
  {
    to: GENERATE_ADMIT_CARD_PATH,
    buttonLabel: "Admit Card",
    buttonClass: "bg-amber-600 hover:bg-amber-700",
    icon: <FaAddressCard />,
    title: "Generate Admit Card",
    description:
      "Pick the exam, the class and the student and print the admit card with only the papers applicable to that class.",
  },
  {
    to: EXAM_SCHEDULE_PATH,
    buttonLabel: "Exam Schedule",
    buttonClass: "bg-green-600 hover:bg-green-700",
    icon: <FaClipboardList />,
    title: "Exam Schedule",
    description:
      "Add every subject paper of an exam with its date, reporting time, end time and the classes it applies to.",
  },
];

const STEPS: string[] = [
  "Create the exam on the Add Exam page (once per exam / session).",
  "Open Exam Schedule, select the exam and save every subject paper.",
  "Open Admit Card, select the exam and class, then generate and print the card of any student.",
];

function AdmitCard() {
  return (
    <div className="max-w-5xl">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800">
            Admit Card
          </h2>
          <p className="text-gray-600 mt-1">
            Prepare the exam schedule (subject, date, time and applicable
            classes) and then generate the admit card of any student.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {ACTIONS.map((action) => (
            <NavLink
              key={action.to}
              to={action.to}
              className={`text-white font-bold rounded-md px-4 py-2 text-sm transition-colors ${action.buttonClass}`}
            >
              {action.buttonLabel}
            </NavLink>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ACTIONS.map((action) => (
          <div
            key={action.to}
            className="flex flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-lg text-gray-700">
              {action.icon}
            </span>
            <h3 className="mt-3 text-base font-bold text-gray-800">
              {action.title}
            </h3>
            <p className="mt-1 flex-1 text-sm text-gray-600">
              {action.description}
            </p>
            <NavLink
              to={action.to}
              className="mt-4 inline-flex w-fit items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-bold text-gray-700 transition-colors hover:bg-gray-50"
            >
              Open →
            </NavLink>
          </div>
        ))}
      </div>

      <section className="mt-6 rounded-xl border border-gray-200 bg-white p-4 md:p-6 shadow-sm">
        <h3 className="text-lg font-bold text-gray-800">How it works</h3>
        <ol className="mt-3 list-inside list-decimal space-y-2 text-sm text-gray-700">
          {STEPS.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>
    </div>
  );
}

export default AdmitCard;