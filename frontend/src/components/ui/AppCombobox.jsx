import React from "react";
import AppSelect from "./AppSelect";

/**
 * AppCombobox — Combobox wrapper around AppSelect.
 */
export const AppCombobox = (props) => {
  return <AppSelect searchable clearable {...props} />;
};

export const AppAutocomplete = AppCombobox;
export default AppCombobox;
