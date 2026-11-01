export interface AccordianFile {
  key: string;
  label: string;
  url: string;
}

interface AccordianProps {
  files: AccordianFile[];
  title: string;
  open: boolean;
  onToggle: () => void;
}

/** One collapsible group of PDF download links (Downloads page). */
function Accordian({ files, title, open, onToggle }: AccordianProps) {
  return (
    <div className="max-w-xl mx-auto mt-8">
      <div className="rounded-lg shadow">
        <button
          className="w-full flex justify-between items-center px-4 py-3 text-lg font-semibold bg-gray-100 hover:bg-gray-200 focus:outline-none"
          onClick={onToggle}
          aria-expanded={open}
        >
          <span>{title}</span>
          <svg
            className={`w-5 h-5 transform transition-transform duration-200 ${open ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
        {open && (
          <div className="px-4 py-3 bg-white border-t">
            {files.map((file) => (
              <a
                key={file.key}
                href={file.url}
                target="_blank"
                rel="noreferrer"
                download
                className="flex items-center gap-2 mb-2 px-4 py-2 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 hover:text-blue-900 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <svg
                  className="w-5 h-5 text-blue-500"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4"
                  />
                </svg>
                {file.label}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Accordian;
