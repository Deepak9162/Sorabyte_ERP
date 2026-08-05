import React from "react";
import { cn } from "../../utils/cn";

/**
 * AppIcon — Lucide Icon wrapper enforcing consistent stroke, sizing, color, & hover effects.
 */
export const AppIcon = ({
  icon: Icon,
  size = "md", // 'xs' (14), 'sm' (16), 'md' (18), 'lg' (22), 'xl' (28)
  strokeWidth = 2,
  className,
  color,
  hover = false,
  ...props
}) => {
  if (!Icon) return null;

  const sizes = {
    xs: 14,
    sm: 16,
    md: 18,
    lg: 22,
    xl: 28,
  };

  const pixelSize = typeof size === "number" ? size : sizes[size] || 18;

  return (
    <Icon
      size={pixelSize}
      strokeWidth={strokeWidth}
      style={color ? { color } : undefined}
      className={cn(
        "shrink-0 transition-colors duration-150",
        hover && "hover:text-indigo-600",
        className
      )}
      {...props}
    />
  );
};

export default AppIcon;
