import React from "react";
import AppInput from "./AppInput";
import { Clock } from "lucide-react";

/**
 * AppTimePicker — Enterprise 12h/24h time input component.
 */
export const AppTimePicker = (props) => {
  return <AppInput type="time" icon={Clock} {...props} />;
};

export default AppTimePicker;
