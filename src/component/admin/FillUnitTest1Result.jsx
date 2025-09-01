import { useState, useEffect, useContext } from "react";
import { myContext } from "../context/MyContextProvider";
import { useNavigate } from "react-router-dom";

const FillUnitTest1Marks = ({ students, selectSubject, selectedClass }) => {
  const { user } = useContext(myContext);
  const navigate = useNavigate();

  const [writtenMarksData, setWrittenMarksData] = useState({});
  const [oralMarksData, setOralMarksData] = useState({});
  const [gradeMarksData, setGradeMarksData] = useState({});
  const [SciCompMarksData, setSciCompMarksData] = useState({});

  const subjectName = selectSubject.split(" ")[0];
  const gradeSubject = ["Conversation", "Drawing", "Karate", "Dance", "Yoga", "Attendance", "Rank", "Remark"];
  const otherSubject = ["Attendance", "Rank", "Remark"];

  const writtenHandleChange = (id, value) => {
    setWrittenMarksData((prev) => ({ ...prev, [id]: value }));
  };
  const oralHandleChange = (id, value) => {
    setOralMarksData((prev) => ({ ...prev, [id]: value }));
  };
  const gradeHandleChange = (id, value) => {
    setGradeMarksData((prev) => ({ ...prev, [id]: value }));
  };

  const SciCompHandleChange = (id, value) => {
    setSciCompMarksData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (studentId) => {
    const written = writtenMarksData[studentId];
    const oral = oralMarksData[studentId];
    const grade = gradeMarksData[studentId];
    const SciComp = SciCompMarksData[studentId];

    if (written === undefined && oral === undefined && grade === undefined && SciComp === undefined) {
      alert("Please enter marks");
      return;
    }

    const payload = {
      studentId,
      subjects: [
        ["PG", "Nursery","LKG"].includes(selectedClass) ? {
          name: subjectName,
          marks:
            gradeSubject.includes(subjectName)
              ? {
                  grade: grade !== "AB" ? String(grade) : String(grade),
                }
              : {
                  written: written !== "AB" ? Number(written) : String(written),
                  oral: oral !== "AB" ? Number(oral) : String(oral),
                },
        } : ["UKG"].includes(selectedClass) ? {
          name: subjectName,
          marks:
            gradeSubject.includes(subjectName)
              ? {
                  grade: grade !== "AB" ? String(grade) : String(grade),
                }
              : subjectName == "Science" || subjectName == "Computer" ? {
                  written: written !== "AB" ? Number(written) : String(written),
                }: {
                  written: written !== "AB" ? Number(written) : String(written),
                  oral: oral !== "AB" ? Number(oral) : String(oral),
                }
        } : {
          name: subjectName,
          marks:
            gradeSubject.includes(subjectName)
              ? {
                  grade: grade !== "AB" ? String(grade) : String(grade),
                }
              : subjectName == "Science" || subjectName == "Computer" ? {
                  written: written !== "AB" ? Number(written) : String(written),
                  practical: SciComp !== "AB" ? Number(SciComp) : String(SciComp),
                }: {
                  written: written !== "AB" ? Number(written) : String(written),
                }
        },
      ],
    };

    try {
      const response = await fetch(
        "http://localhost:3000/api/unit-test-1/add-marks",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();

      if (response.ok) {
        alert("Marks added successfully!");
      } else {
        alert(data.error || "Failed to add marks");
      }
    } catch (error) {
      console.error("Error submitting marks:", error);
      alert("Something went wrong");
    }
  };

  useEffect(() => {
    if (!user) navigate("/login");
    const initialWritten = {};
    const initialOral = {};
    const initialGrade = {};
    const initialPractical = {};
    console.log(students, selectSubject, selectedClass);

    students.forEach((student) => {
      const subjectMarks = student.unitTest1Marks?.[0]?.subjects?.find(
        (sub) => sub.name === selectSubject.split(" ")[0]
      );

      if (subjectMarks) {
        initialWritten[student._id] = subjectMarks.marks.written;
        initialOral[student._id] = subjectMarks.marks.oral;
        initialGrade[student._id] = subjectMarks.marks.grade;
        initialPractical[student._id] = subjectMarks.marks.practical;
      }
    });

    setWrittenMarksData(initialWritten);
    setOralMarksData(initialOral);
    setGradeMarksData(initialGrade);
    setSciCompMarksData(initialPractical);
  }, [students, user, navigate, selectSubject]);

  return (
    <div className="p-4 space-y-4">
      {students.map((student, index) => (
        <div
          key={student._id}
          className="flex items-center gap-4 border-b pb-2"
        >
          <div className="w-1/4">{index + 1}</div>
          <div className="w-1/4">{student.enrollment}</div>
          <div className="w-1/4">{student.name}</div>
          <div className="w-1/4">{student.fatherName}</div>
          <div className="flex flex-row justify-center items-center gap-2">
            <div>{selectSubject.split(" ")[0]}</div>
            <div className="flex flex-col gap-2">
              {
                ["PG", "Nursery", "LKG"].includes(selectedClass) && <>
                {(!gradeSubject.includes(subjectName)) ? (
                <>
                  <input
                    type="text"
                    placeholder="Written"
                    className="w-20 border px-2 py-1 rounded"
                    value={writtenMarksData[student._id] || ""}
                    onChange={(e) =>
                      writtenHandleChange(student._id, e.target.value)
                    }
                  />
                  <input
                    type="text"
                    placeholder="Oral"
                    className="w-20 border px-2 py-1 rounded"
                    value={oralMarksData[student._id] || ""}
                    onChange={(e) =>
                      oralHandleChange(student._id, e.target.value)
                    }
                  />
                </>
              ) : (
                <input
                  type="text"
                  placeholder={!otherSubject.includes(subjectName) ? "Grade" : otherSubject.includes("Attendance") ? "Ex: 22/50" : ""}
                  className="w-20 border px-2 py-1 rounded"
                  value={gradeMarksData[student._id] || ""}
                  onChange={(e) =>
                    gradeHandleChange(student._id, e.target.value)
                  }
                />
              )}
                </>
              }
              {
                ["UKG"].includes(selectedClass) && <>
                {(!gradeSubject.includes(subjectName)) ? (subjectName == "Science" || subjectName == "Computer")?<input
                  type="text"
                  placeholder="Marks"
                  className="w-20 border px-2 py-1 rounded"
                  value={writtenMarksData[student._id] || ""}
                  onChange={(e) =>
                    writtenHandleChange(student._id, e.target.value)
                  }
                /> :(
                <>
                  <input
                    type="text"
                    placeholder="Written"
                    className="w-20 border px-2 py-1 rounded"
                    value={writtenMarksData[student._id] || ""}
                    onChange={(e) =>
                      writtenHandleChange(student._id, e.target.value)
                    }
                  />
                  <input
                    type="text"
                    placeholder="Oral"
                    className="w-20 border px-2 py-1 rounded"
                    value={oralMarksData[student._id] || ""}
                    onChange={(e) =>
                      oralHandleChange(student._id, e.target.value)
                    }
                  />
                </>
              ) : (
                <input
                  type="text"
                  placeholder={otherSubject.includes(subjectName) ? "" : "Grade"}
                  className="w-20 border px-2 py-1 rounded"
                  value={gradeMarksData[student._id] || ""}
                  onChange={(e) =>
                    gradeHandleChange(student._id, e.target.value)
                  }
                />
              )}
                </>
              }
              {
                ['1','2','3','4','5','6','7','8'].includes(selectedClass) && <>
                {(!gradeSubject.includes(subjectName)) ? (subjectName == "Science" || subjectName == "Computer")? <>
                <input
                    type="text"
                    placeholder="Written"
                    className="w-20 border px-2 py-1 rounded"
                    value={writtenMarksData[student._id] || ""}
                    onChange={(e) =>
                      writtenHandleChange(student._id, e.target.value)
                    }
                  />
                <input
                  type="text"
                  placeholder="Practical"
                  className="w-20 border px-2 py-1 rounded"
                  value={SciCompMarksData[student._id] || ""}
                  onChange={(e) =>
                    SciCompHandleChange(student._id, e.target.value)
                  }
                />
                
                  </> :(
                <>
                  <input
                    type="text"
                    placeholder="Written"
                    className="w-20 border px-2 py-1 rounded"
                    value={writtenMarksData[student._id] || ""}
                    onChange={(e) =>
                      writtenHandleChange(student._id, e.target.value)
                    }
                  />
                </>
              ) : (
                <input
                  type="text"
                  placeholder={gradeSubject.includes(subjectName) ? "Grade" : ""}
                  className="w-20 border px-2 py-1 rounded"
                  value={gradeMarksData[student._id] || ""}
                  onChange={(e) =>
                    gradeHandleChange(student._id, e.target.value)
                  }
                />
              )}
                </>
              }
            </div>
          </div>
          <button
            className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
            onClick={() => handleSubmit(student._id)}
          >
            Add
          </button>
        </div>
      ))}
    </div>
  );
};

export default FillUnitTest1Marks;
