import React, { useState, useRef } from "react";
import { UploadCloud, File, X, Image as ImageIcon } from "lucide-react";
import { cn } from "../../utils/cn";
import AppModal from "./AppModal";

/**
 * AppFileUpload — Drag & drop file uploader with preview support.
 */
export const AppFileUpload = ({
  onFileSelect,
  accept = "*",
  maxSizeMB = 10,
  label = "Upload file",
  helperText = "Drag & drop files here or browse",
  className,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const inputRef = useRef(null);

  const handleFiles = (files) => {
    if (files && files[0]) {
      const file = files[0];
      setSelectedFile(file);
      onFileSelect?.(file);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  return (
    <div className={cn("w-full space-y-2", className)}>
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "relative flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-3xl cursor-pointer transition-all duration-150 select-none bg-white",
          dragActive
            ? "border-indigo-600 bg-indigo-50/50"
            : "border-gray-200/90 hover:border-indigo-400 hover:bg-gray-50/50"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
        />

        <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mb-2">
          <UploadCloud size={24} />
        </div>

        <p className="text-sm font-extrabold text-gray-800">{label}</p>
        <p className="text-xs text-gray-500 font-medium mt-0.5">{helperText}</p>
        <p className="text-[11px] text-gray-400 font-semibold mt-1">Max size: {maxSizeMB}MB</p>
      </div>

      {selectedFile && (
        <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800">
          <div className="flex items-center gap-2 truncate">
            <File size={16} className="text-indigo-600 shrink-0" />
            <span className="truncate">{selectedFile.name}</span>
            <span className="text-gray-400 font-normal">
              ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedFile(null);
              onFileSelect?.(null);
            }}
            className="p-1 hover:bg-gray-200 rounded-lg text-gray-500 cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
};

/**
 * AppImagePreview — Modal preview for uploaded images.
 */
export const AppImagePreview = ({ src, alt = "Image preview", isOpen, onClose }) => {
  return (
    <AppModal isOpen={isOpen} onClose={onClose} title="Image Preview" size="lg">
      <div className="flex justify-center items-center p-2 bg-gray-950 rounded-2xl">
        <img src={src} alt={alt} className="max-h-[70vh] object-contain rounded-xl" />
      </div>
    </AppModal>
  );
};

export default AppFileUpload;
