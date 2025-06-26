import React, { useState } from "react";
import Underline from "../design/Underline";
import PayFeeQRCode from "./PayFeeQRCode";
import feeStructureData from "../assets/JSON/feeStructure.json"; // Importing fee structure from JSON file

function PayFee() {
  const [openQRCode, setOpenQRCode] = useState(false);
  const [titleAndFee, setTitleAndFee] = useState({title:"", fee:""})

  function showQRCodeHandler(title, fee) {
    openQRCode ? setOpenQRCode(false) : setOpenQRCode(true)
    setTitleAndFee({
        title: title,
        fee: fee
    })
  }

  return (
    <div>
      <div className="max-w-xl mx-auto mt-8">
        <div className="flex flex-col justify-center items-center mt-4">
          <p className="text-3xl md:text-5xl font-extrabold text-gray-800 leading-tight">
            <span className="text-pink-500">Fee</span> Payment
          </p>
          <Underline className="w-2/3 md:w-1/2 lg:w-60 mt-2 self-center" />
        </div>
      </div>
      <div className="flex flex-wrap justify-center gap-2 mt-5 w-full text-2xl">
        {feeStructureData.map((item, index) => {
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
      {openQRCode && <PayFeeQRCode onClose={()=> showQRCodeHandler()} titleAndFee={titleAndFee} />}
    </div>
  );
}

export default PayFee;
