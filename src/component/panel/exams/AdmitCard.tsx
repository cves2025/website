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
}

const ACTIONS: AdmitCardAction[] = [
  {
    to: ADD_EXAM_PATH,
    buttonLabel: "+ Add Exam",
    buttonClass: "bg-blue-600 hover:bg-blue-700",
    icon: <FaPlus />,
    title: "Add Exam",
  },
  {
    to: GENERATE_ADMIT_CARD_PATH,
    buttonLabel: "Admit Card",
    buttonClass: "bg-amber-600 hover:bg-amber-700",
    icon: <FaAddressCard />,
    title: "Generate Admit Card",    
  },
  {
    to: EXAM_SCHEDULE_PATH,
    buttonLabel: "Exam Schedule",
    buttonClass: "bg-green-600 hover:bg-green-700",
    icon: <FaClipboardList />,
    title: "Exam Schedule",
  },
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
    </div>
  );
}

export default AdmitCard;