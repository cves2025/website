import { useState } from "react";
import Underline from "../design/Underline";
import PayFeeQRCode from "./PayFeeQRCode";
import feeStructureData from "../assets/JSON/feeStructure.json"; // Used until a fee structure is saved
import SEO from "./SEO";
import Loader from "../custom-components/Loader";
import { CLASSES } from "../constants";
import useFeeStructure from "../hooks/useFeeStructure";
import { generateAcademicYears } from "../utils/generateAcademicYears";

const currentSession = generateAcademicYears()[0]?.value ?? "";

/** Name of a class on this page ("PG" -> "Play Group", "5" -> "Class-5"). */
const payFeeTitle = (className: string) =>
  className === "PG" ? "Play Group" : /^\d+$/.test(className) ? `Class-${className}` : className;

function PayFee() {
  const [openQRCode, setOpenQRCode] = useState(false);
  const [titleAndFee, setTitleAndFee] = useState<{ title?: string; fee?: string }>({ title: "", fee: "" })
  // Monthly fee of every class from Fees > Fee Structure of the current session.
  const { structure, saved, loading } = useFeeStructure(currentSession);
  const fees = saved
    ? CLASSES.filter((className) => structure.classes[className]?.monthly).map((className) => ({
        title: payFeeTitle(className),
        fee: String(structure.classes[className].monthly),
      }))
    : feeStructureData;

  function showQRCodeHandler(title?: string, fee?: string) {
    openQRCode ? setOpenQRCode(false) : setOpenQRCode(true)
    setTitleAndFee({
        title: title,
        fee: fee
    })
  }

  return (
    <div className="relative">
      <SEO
      title="Online Fee Payment | Children's Valley English School Varanasi"
      description="Pay school fees online for Children's Valley English School in Varanasi easily and securely. Quick and convenient payment options available."
      />
      <div className="max-w-xl mx-auto mt-8">
        <div className="flex flex-col justify-center items-center mt-4">
          <p className="text-3xl md:text-5xl font-extrabold text-gray-800 leading-tight">
            <span className="text-pink-500">Fee</span> Payment
          </p>
          <Underline className="w-2/3 md:w-1/2 lg:w-60 mt-2 self-center" />
        </div>
      </div>
      {loading ? (
        <Loader label="Loading fees..." />
      ) : (
      <div className="flex flex-wrap justify-center gap-2 mt-5 w-full text-2xl">
        {fees.map((item, index) => {
          return (
            <div
              key={index}
              onClick={()=> showQRCodeHandler(item.title, item.fee)}
              className="flex lg:basis-1/6 md:basis-1/3 mr-3 cursor-pointer h-10 px-2 w-full justify-center items-center text-center border border-gray-300 rounded-xl shadow bg-blue-400 hover:bg-blue-500"
            >
              {item.title}
            </div>
          );
        })}
      </div>
      )}
      {openQRCode && <PayFeeQRCode onClose={()=> showQRCodeHandler()} titleAndFee={titleAndFee} />}
    </div>
  );
}

export default PayFee;
