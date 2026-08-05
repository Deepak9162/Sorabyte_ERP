/**
 * GLOBAL UI DESIGN SYSTEM (PHASE-1) BARREL EXPORT
 * Unified single source of truth for all School ERP components.
 * 
 * Enterprise Governance:
 * - Every existing page redesign MUST use these reusable components.
 * - Every future feature MUST use these reusable components.
 * - No developer is allowed to create duplicate UI components.
 */

// Icon Wrapper
export { AppIcon } from "./AppIcon";

// Utility Action Buttons
export {
  AppCopyButton,
  AppDownloadButton,
  AppPrintButton,
  AppRefreshButton,
  AppBackButton,
} from "./AppUtilityButtons";

// Layout System Primitives
export { AppLayout } from "./AppLayout";
export {
  AppPage,
  AppSection,
  AppContainer,
  AppGrid,
  AppStack,
  AppDivider,
} from "./AppPage";
export { AppPageHeader, AppPageActions } from "./AppPageHeader";

// Navigation (Sidebar & Topbar)
export {
  AppSidebar,
  SidebarGroup,
  SidebarItem,
  SidebarCollapse,
  SidebarFooter,
} from "./AppSidebar";
export { AppTopNavbar } from "./AppTopNavbar";

// Filter Bar & Action Toolbars
export { AppFilterBar } from "./AppFilterBar";
export { AppBulkToolbar } from "./AppBulkToolbar";

// Theme Architecture
export { ThemeProvider, useTheme } from "./ThemeProvider";

// Dialogs & Alerts
export { AppConfirmDialog, AppSuccessDialog } from "./AppConfirmDialog";

// Chart Wrapper
export { AppChartCard } from "./AppChartCard";

// Buttons & Actions
export { AppButton, default as Button } from "./AppButton";
export { AppIconButton } from "./AppIconButton";

// Inputs & Forms
export { AppInput, default as Input } from "./AppInput";
export { AppSearch } from "./AppSearch";
export { AppTextarea } from "./AppTextarea";
export { AppPasswordInput } from "./AppPasswordInput";
export { AppFormField } from "./AppFormField";

// Dropdowns & Selection
export { AppSelect, default as Select } from "./AppSelect";
export { AppMultiSelect } from "./AppMultiSelect";
export { AppDropdown } from "./AppDropdown";
export { AppCombobox, AppAutocomplete } from "./AppCombobox";

// Date & Time Pickers
export { AppDatePicker, default as DatePicker } from "./AppDatePicker";
export { AppDateRangePicker } from "./AppDateRangePicker";
export { AppTimePicker } from "./AppTimePicker";
export { AppCalendar } from "./AppCalendar";

// Selection Controls
export { AppCheckbox } from "./AppCheckbox";
export { AppRadio, AppRadioGroup } from "./AppRadio";
export { AppSwitch } from "./AppSwitch";

// Badges & Pills
export { AppBadge, AppChip } from "./AppBadge";
export { AppStatusPill } from "./AppStatusPill";

// Avatars & Tooltips
export { AppAvatar } from "./AppAvatar";
export { AppTooltip, AppPopover } from "./AppTooltip";

// Modals, Drawers & Dialogs
export { AppModal, default as Modal } from "./AppModal";
export { AppDrawer, AppDialog } from "./AppDrawer";

// Cards & Containers
export { AppCard } from "./AppCard";
export { AppStatCard } from "./AppStatCard";

// Navigation & Organization
export { AppAccordion } from "./AppAccordion";
export { AppTabs } from "./AppTabs";
export { AppBreadcrumb } from "./AppBreadcrumb";
export { AppPagination } from "./AppPagination";

// Data Display & Tables
export { AppTable } from "./AppTable";

// Feedback, Loading & File Systems
export { AppLoading } from "./AppLoading";
export {
  AppSkeleton,
  AppTableSkeleton,
  TableSkeleton,
  AppCardSkeleton,
  CardSkeleton,
  default as Skeleton,
} from "./AppSkeleton";
export { AppEmptyState, default as EmptyState } from "./AppEmptyState";
export { AppErrorState } from "./AppErrorState";
export { AppToast, AppNotification } from "./AppToast";
export { AppProgress } from "./AppProgress";
export { AppFileUpload, AppImagePreview } from "./AppFileUpload";
