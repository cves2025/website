import React from "react";
import Accordian from "../design/Accordian";
import Underline from "../design/Underline";
import { generateAcademicYears } from "../utils/generateAcademicYears";
import {
  DOWNLOAD_CATEGORIES,
  DOWNLOAD_CLASS_ROWS,
  downloadClassLabel,
  subscribeDownloads,
  type DownloadFile,
} from "../utils/downloadsService";
import Loader from "../custom-components/Loader";

const CURRENT_YEAR = generateAcademicYears()[0]?.value ?? "";

/** The published PDFs of the current session, one accordion per type. */
function Downloads() {
  const [openIndex, setOpenIndex] = React.useState<number | null>(null);
  const [files, setFiles] = React.useState<DownloadFile[] | null>(null);

  React.useEffect(
    () =>
      subscribeDownloads(
        { academicYear: CURRENT_YEAR, publishedOnly: true },
        setFiles,
        (error) => {
          console.error("Failed to load downloads:", error);
          setFiles([]);
        }
      ),
    []
  );

  // "All Classes" first, then the classes in school order.
  const accordians = DOWNLOAD_CATEGORIES.map((category) => ({
    title: `${category.label} ${CURRENT_YEAR}`,
    files: (files ?? [])
      .filter((file) => file.category === category.value)
      .sort(
        (a, b) =>
          DOWNLOAD_CLASS_ROWS.indexOf(a.className) -
          DOWNLOAD_CLASS_ROWS.indexOf(b.className)
      )
      .map((file) => ({
        key: file.id,
        label: downloadClassLabel(file.className),
        url: file.fileUrl,
      })),
  })).filter((item) => item.files.length > 0);

  return (
    <div className="max-w-xl mx-auto mt-8">
        <p className='text-xl md:text-3xl font-bold'><span className='text-pink-500'>Downloads</span> Sections</p>
        <Underline />
      {files === null ? (
        <Loader fullScreen={false} className="mt-8" />
      ) : accordians.length === 0 ? (
        <p className="mt-8 text-center text-gray-500">
          Downloads for {CURRENT_YEAR} will be available soon.
        </p>
      ) : (
        accordians.map((item, idx) => (
          <Accordian
            key={item.title}
            files={item.files}
            title={item.title}
            open={openIndex === idx}
            onToggle={() => setOpenIndex(openIndex === idx ? null : idx)}
          />
        ))
      )}
    </div>
  )
}

export default Downloads
