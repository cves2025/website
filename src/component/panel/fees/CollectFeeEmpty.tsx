import { CalendarCheck, GraduationCap, Search, Users } from "lucide-react";

import FeeEmptyState from "./FeeEmptyState";
import type { EmptyStep } from "./FeeEmptyState";

const STEPS: EmptyStep[] = [
  { icon: Users, title: "Pick class & section", text: "Choose them on the left.", tone: "green" },
  {
    icon: Search,
    title: "Find the student",
    text: "From the list, or search by enrollment no. or name.",
    tone: "blue",
  },
  {
    icon: CalendarCheck,
    title: "Tick fees & collect",
    text: "Pick the months, save and print the receipt.",
    tone: "pink",
  },
];

/** Shown on Collect Fee until a student is picked. */
function CollectFeeEmpty({ className = "" }: { className?: string }) {
  return (
    <FeeEmptyState
      icon={GraduationCap}
      title="Collect fee for a student"
      text="Pick a student to see the fee account of the session, take a payment and print the receipt."
      steps={STEPS}
      className={className}
    />
  );
}

export default CollectFeeEmpty;
