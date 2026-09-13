import { NavLink } from "react-router-dom";
import {
  FaUserGraduate,
  FaChalkboardTeacher,
  FaIdCard,
  FaFileAlt,
} from "react-icons/fa";

const CARDS = [
  {
    label: "Student",
    desc: "Add & manage students",
    to: "/welcome/student/add",
    icon: <FaUserGraduate className="w-7 h-7" />,
    color: "bg-green-100 text-green-700",
  },
  {
    label: "Teacher",
    desc: "Add & manage teachers",
    to: "/welcome/teacher/add",
    icon: <FaChalkboardTeacher className="w-7 h-7" />,
    color: "bg-blue-100 text-blue-700",
  },
  {
    label: "Admit Card",
    desc: "Generate admit cards",
    to: "/welcome/admit-card",
    icon: <FaIdCard className="w-7 h-7" />,
    color: "bg-amber-100 text-amber-700",
  },
  {
    label: "Result",
    desc: "View student results",
    to: "/welcome/result",
    icon: <FaFileAlt className="w-7 h-7" />,
    color: "bg-pink-100 text-pink-700",
  },
];

function PanelHome() {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-800">
          Dashboard
        </h2>
        <p className="text-gray-600 mt-1">
          Select an option from the sidebar to continue.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {CARDS.map((card) => (
          <NavLink
            key={card.label}
            to={card.to}
            className="group bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex flex-col items-start gap-3 hover:shadow-md hover:border-gray-300 transition-all"
          >
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${card.color}`}>
              {card.icon}
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-800 group-hover:text-blue-700">
                {card.label}
              </h3>
              <p className="text-sm text-gray-500">{card.desc}</p>
            </div>
          </NavLink>
        ))}
      </div>
    </div>
  );
}

export default PanelHome;