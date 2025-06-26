import React from "react";

const Button = ({text, costumClass, ...props}) => {
  return (
    <button className={`text-blue-600 text-xl px-6 py-3 rounded-lg shadow-md hover:bg-blue-500 hover:text-white transition duration-400 cursor-pointer border border-blue-500  ${costumClass}`} {...props}>
      {text}
    </button>
  );
};

export default Button;
