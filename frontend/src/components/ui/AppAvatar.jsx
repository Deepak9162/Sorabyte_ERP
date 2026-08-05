import React from "react";
import { cn } from "../../utils/cn";
import { User, ShieldCheck, GraduationCap, Briefcase, Users, Shield } from "lucide-react";

/**
 * AppAvatar — Profile image or initials fallback badge with role badge indicators.
 * Roles: 'student', 'teacher', 'staff', 'parent', 'admin'
 */
export const AppAvatar = ({ src, name, role, size = "md", className }) => {
  const getInitials = (n) => {
    if (!n) return "?";
    const parts = n.trim().split(" ");
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const sizes = {
    xs: "w-6 h-6 text-[10px]",
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-12 h-12 text-base",
    xl: "w-16 h-16 text-lg",
  };

  const roleColors = {
    admin: "from-purple-100 to-indigo-200 text-indigo-900 border-indigo-300",
    teacher: "from-blue-100 to-sky-200 text-sky-900 border-sky-300",
    staff: "from-amber-100 to-yellow-200 text-amber-900 border-amber-300",
    student: "from-emerald-100 to-teal-200 text-teal-900 border-teal-300",
    parent: "from-rose-100 to-pink-200 text-rose-900 border-rose-300",
  };

  const roleIcons = {
    admin: ShieldCheck,
    teacher: GraduationCap,
    staff: Briefcase,
    student: User,
    parent: Users,
  };

  const RoleIcon = role ? roleIcons[role.toLowerCase()] : null;

  return (
    <div className="relative inline-flex shrink-0 select-none">
      <div
        className={cn(
          "relative inline-flex items-center justify-center rounded-full bg-gradient-to-br font-extrabold border shadow-2xs overflow-hidden shrink-0",
          role ? roleColors[role.toLowerCase()] || roleColors.student : "from-indigo-100 to-indigo-200 text-indigo-800 border-indigo-200/60",
          sizes[size] || sizes.md,
          className
        )}
      >
        {src ? (
          <img
            src={src}
            alt={name || "Avatar"}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.style.display = "none";
            }}
          />
        ) : name ? (
          <span>{getInitials(name)}</span>
        ) : (
          <User size={18} className="opacity-80" />
        )}
      </div>

      {RoleIcon && (
        <span className="absolute -bottom-0.5 -right-0.5 p-0.5 rounded-full bg-white border border-gray-200 text-indigo-600 shadow-2xs">
          <RoleIcon size={10} />
        </span>
      )}
    </div>
  );
};

export default AppAvatar;
