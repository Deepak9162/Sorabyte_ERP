import React, { useState } from "react";
import { Copy, Check, Download, Printer, RefreshCw, ArrowLeft } from "lucide-react";
import AppButton from "./AppButton";
import AppIconButton from "./AppIconButton";

/**
 * AppCopyButton — Copies text to clipboard with success checkmark animation.
 */
export const AppCopyButton = ({ text, label = "Copy", iconOnly = false, size = "sm" }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e) => {
    e.stopPropagation();
    if (text) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (iconOnly) {
    return (
      <AppIconButton
        icon={copied ? Check : Copy}
        size={size}
        onClick={handleCopy}
        variant={copied ? "success" : "secondary"}
        title={copied ? "Copied!" : "Copy to clipboard"}
      />
    );
  }

  return (
    <AppButton
      size={size}
      variant={copied ? "success" : "secondary"}
      icon={copied ? Check : Copy}
      onClick={handleCopy}
    >
      {copied ? "Copied" : label}
    </AppButton>
  );
};

/**
 * AppDownloadButton — Download action button.
 */
export const AppDownloadButton = ({ onClick, label = "Export", loading = false, size = "sm", iconOnly = false }) => {
  if (iconOnly) {
    return <AppIconButton icon={Download} size={size} loading={loading} onClick={onClick} title="Download file" />;
  }
  return (
    <AppButton size={size} variant="secondary" icon={Download} loading={loading} onClick={onClick}>
      {label}
    </AppButton>
  );
};

/**
 * AppPrintButton — Print action button.
 */
export const AppPrintButton = ({ onClick, label = "Print", size = "sm", iconOnly = false }) => {
  if (iconOnly) {
    return <AppIconButton icon={Printer} size={size} onClick={onClick} title="Print page" />;
  }
  return (
    <AppButton size={size} variant="secondary" icon={Printer} onClick={onClick}>
      {label}
    </AppButton>
  );
};

/**
 * AppRefreshButton — Refresh data action button.
 */
export const AppRefreshButton = ({ onClick, loading = false, size = "sm", iconOnly = true }) => {
  if (iconOnly) {
    return <AppIconButton icon={RefreshCw} size={size} loading={loading} onClick={onClick} title="Refresh data" />;
  }
  return (
    <AppButton size={size} variant="secondary" icon={RefreshCw} loading={loading} onClick={onClick}>
      Refresh
    </AppButton>
  );
};

/**
 * AppBackButton — Navigation back button.
 */
export const AppBackButton = ({ onClick, label = "Back", size = "sm" }) => {
  return (
    <AppButton size={size} variant="ghost" icon={ArrowLeft} onClick={onClick || (() => window.history.back())}>
      {label}
    </AppButton>
  );
};
