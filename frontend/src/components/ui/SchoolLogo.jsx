import React from "react";
import schoolLogo from "../../assets/schoollogo.png";

const SchoolLogo = ({ className = "w-16 h-16", showText = false }) => {
  return (
    <div className="flex items-center gap-3 select-none">
      <img
        src={schoolLogo}
        alt="Sorabyte Logo"
        className={`${className} rounded-full object-cover border border-gray-100 shadow-sm`}
      />
      {showText && (
        <div className="flex flex-col">
          <span className="font-extrabold text-lg text-gray-800 tracking-tight leading-none">
            Sorabyte
          </span>
          <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest leading-none mt-1">
            English School
          </span>
        </div>
      )}
    </div>
  );
};

export default SchoolLogo;
