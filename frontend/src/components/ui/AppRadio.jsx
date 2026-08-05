import React, { useId } from "react";
import { cn } from "../../utils/cn";

/**
 * AppRadio — Custom enterprise radio input item.
 */
export const AppRadio = React.forwardRef(
  (
    {
      checked = false,
      onChange,
      label,
      description,
      disabled = false,
      value,
      name,
      className,
      id: externalId,
      ...props
    },
    ref
  ) => {
    const internalId = useId();
    const id = externalId || internalId;

    return (
      <div className={cn("inline-flex items-start gap-2.5 select-none", className)}>
        <div className="relative flex items-center pt-0.5">
          <input
            ref={ref}
            id={id}
            type="radio"
            name={name}
            value={value}
            checked={checked}
            disabled={disabled}
            onChange={(e) => onChange?.(e.target.value, e)}
            className="sr-only"
            {...props}
          />
          <label
            htmlFor={id}
            className={cn(
              "w-5 h-5 rounded-full border transition-all duration-150 flex items-center justify-center cursor-pointer shadow-2xs",
              checked
                ? "border-indigo-600 bg-white"
                : "bg-white border-gray-300 hover:border-indigo-400",
              disabled && "opacity-50 cursor-not-allowed bg-gray-100 border-gray-200"
            )}
          >
            {checked && <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />}
          </label>
        </div>

        {(label || description) && (
          <label htmlFor={id} className="cursor-pointer">
            {label && (
              <span className={cn("block text-sm font-semibold text-gray-800", disabled && "text-gray-400")}>
                {label}
              </span>
            )}
            {description && (
              <span className="block text-xs text-gray-500 font-normal">
                {description}
              </span>
            )}
          </label>
        )}
      </div>
    );
  }
);

AppRadio.displayName = "AppRadio";

export const AppRadioGroup = ({
  options = [],
  value,
  onChange,
  name,
  label,
  className,
}) => {
  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider ml-0.5">
          {label}
        </label>
      )}
      <div className="space-y-2">
        {options.map((opt) => {
          const val = typeof opt === "object" ? opt.value : opt;
          const lbl = typeof opt === "object" ? opt.label : opt;
          const desc = typeof opt === "object" ? opt.description : undefined;
          return (
            <AppRadio
              key={val}
              name={name}
              value={val}
              checked={String(value) === String(val)}
              onChange={onChange}
              label={lbl}
              description={desc}
            />
          );
        })}
      </div>
    </div>
  );
};

export default AppRadio;
