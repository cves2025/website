import { useState } from "react";

type ResultTemplateId = "template1";

interface ResultTemplate {
  id: ResultTemplateId;
  name: string;
  description: string;
}

const TEMPLATES: ResultTemplate[] = [
  {
    id: "template1",
    name: "Result / Marksheet Template",
    description: "Current report card design",
  },
];

function ResultTemplate() {
  const [selectedTemplate, setSelectedTemplate] =
    useState<ResultTemplateId>("template1");

  return (
    <div className="w-full space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-primaryBlue">
          Result Template
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Select the template you want to use for the annual result / marksheet.
        </p>
      </div>

      {/* Template Selection */}
      <section className="rounded-lg bg-white p-4 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-800">
          Select Template
        </h2>

        <div className="space-y-3">
          {TEMPLATES.map((template) => (
            <label
              key={template.id}
              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition ${
                selectedTemplate === template.id
                  ? "border-primaryBlue bg-blue-50"
                  : "border-gray-200 hover:bg-gray-50"
              }`}
            >
              {/* Radio */}
              <input
                type="radio"
                name="resultTemplate"
                value={template.id}
                checked={selectedTemplate === template.id}
                onChange={() => setSelectedTemplate(template.id)}
                className="mt-1 h-4 w-4 accent-primaryBlue"
              />

              {/* Template Information */}
              <div>
                <p className="font-medium text-gray-800">
                  {template.name}
                </p>

                <p className="mt-1 text-sm text-gray-500">
                  {template.description}
                </p>
              </div>
            </label>
          ))}
        </div>
      </section>

      {/* Preview */}
      <section className="rounded-lg bg-white p-4 shadow-sm">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-800">
            Template Preview
          </h2>

          <p className="text-sm text-gray-500">
            Preview of the currently selected result template.
          </p>
        </div>

        {/* Selected Template */}
        {selectedTemplate === "template1" && <ResultTemplatePreview />}
      </section>
    </div>
  );
}

function ResultTemplatePreview() {
  return (
    <div className="flex justify-center overflow-x-auto rounded-lg bg-gray-100 p-4 sm:p-8">
      {/* Result / Marksheet */}
      <div className="w-full max-w-3xl min-w-[600px] border border-gray-300 bg-white p-6 shadow-md">
        {/* School Header */}
        <div className="border-b-2 border-gray-800 pb-4 text-center">
          <h1 className="text-2xl font-bold uppercase">
            Children&apos;s Valley English School
          </h1>

          <p className="mt-1 text-sm text-gray-600">
            Annual Examination Report Card
          </p>

          <p className="text-sm font-medium">Session 2026-27</p>
        </div>

        {/* Student Information */}
        <div className="mt-5 grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
          <div>
            <span className="font-semibold">Student Name:</span> Rahul Sharma
          </div>

          <div>
            <span className="font-semibold">Admission No:</span> CVES001
          </div>

          <div>
            <span className="font-semibold">Class:</span> V
          </div>

          <div>
            <span className="font-semibold">Section:</span> A
          </div>
        </div>

        {/* Subject-wise marks */}
        <div className="mt-6">
          <h3 className="mb-2 font-semibold">Subject-wise Marks</h3>

          <table className="w-full border-collapse border border-gray-300 text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 p-2 text-left">Subject</th>
                <th className="border border-gray-300 p-2 text-center">Max</th>
                <th className="border border-gray-300 p-2 text-center">
                  Obtained
                </th>
                <th className="border border-gray-300 p-2 text-center">
                  Result
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-300 p-2">English</td>
                <td className="border border-gray-300 p-2 text-center">70</td>
                <td className="border border-gray-300 p-2 text-center">62</td>
                <td className="border border-gray-300 p-2 text-center">Pass</td>
              </tr>
              <tr>
                <td className="border border-gray-300 p-2">Mathematics</td>
                <td className="border border-gray-300 p-2 text-center">70</td>
                <td className="border border-gray-300 p-2 text-center">65</td>
                <td className="border border-gray-300 p-2 text-center">Pass</td>
              </tr>
              <tr>
                <td className="border border-gray-300 p-2">Science</td>
                <td className="border border-gray-300 p-2 text-center">70</td>
                <td className="border border-gray-300 p-2 text-center">58</td>
                <td className="border border-gray-300 p-2 text-center">Pass</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Summary */}
        <div className="mt-4 grid grid-cols-3 gap-x-8 text-sm">
          <div>
            <span className="font-semibold">Total:</span> 185 / 210
          </div>
          <div>
            <span className="font-semibold">Percentage:</span> 88.1%
          </div>
          <div>
            <span className="font-semibold">Grade:</span> A+
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 flex justify-between text-sm">
          <div className="text-center">
            <div className="mb-1 h-8 w-32 border-b border-gray-500" />
            <span>Class Teacher</span>
          </div>

          <div className="text-center">
            <div className="mb-1 h-8 w-32 border-b border-gray-500" />
            <span>Principal</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ResultTemplate;