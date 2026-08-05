import React, { useState } from "react";
import AppInput from "./AppInput";
import { Eye, EyeOff, Lock } from "lucide-react";

/**
 * AppPasswordInput — Input with toggle visibility button.
 */
export const AppPasswordInput = React.forwardRef((props, ref) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <AppInput
      ref={ref}
      type={showPassword ? "text" : "password"}
      icon={Lock}
      suffix={
        <button
          type="button"
          onClick={() => setShowPassword((prev) => !prev)}
          className="p-1 text-gray-400 hover:text-gray-600 focus:outline-none transition-colors cursor-pointer"
          title={showPassword ? "Hide password" : "Show password"}
        >
          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      }
      {...props}
    />
  );
});

AppPasswordInput.displayName = "AppPasswordInput";
export default AppPasswordInput;
