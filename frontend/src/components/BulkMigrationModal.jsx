import React, { useState, useEffect } from "react";
import Modal from "./ui/Modal";
import Button from "./ui/Button";
import Input from "./ui/Input";
import AppCombobox from "./ui/AppCombobox";
import {
  Users,
  ArrowRight,
  AlertTriangle,
  RefreshCw,
  Layers,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import api from "../services/api";
import { useToast } from "../context/ToastContext";

const SECTION_OPTIONS = ["A", "B", "C", "D", "E", "F"];

const BulkMigrationModal = ({
  isOpen,
  onClose,
  selectedStudents = [],
  classes = [],
  onSuccess,
}) => {
  const { addToast } = useToast();
  const [targetClassId, setTargetClassId] = useState("");
  const [targetClassName, setTargetClassName] = useState("");
  const [targetSection, setTargetSection] = useState("A");
  const [isCustomSection, setIsCustomSection] = useState(false);
  const [customSectionInput, setCustomSectionInput] = useState("");
  const [rollMode, setRollMode] = useState("keep");
  const [loading, setLoading] = useState(false);

  // Auto-detect current Class and Section from selected students
  const currentClassNames = [
    ...new Set(
      selectedStudents.map(
        (s) => s.className || getClassName(s.class) || "Unknown",
      ),
    ),
  ];
  const currentSections = [
    ...new Set(selectedStudents.map((s) => s.section || "")),
  ];

  const currentClassDisplay =
    currentClassNames.length === 1 ? currentClassNames[0] : "Multiple Classes";
  const currentSectionDisplay =
    currentSections.length === 1 && currentSections[0]
      ? `Section ${currentSections[0]}`
      : currentSections.length === 1 && !currentSections[0]
        ? "No Section"
        : "Multiple Sections";

  function getClassName(classRef) {
    if (!classRef) return "";
    if (typeof classRef === "string") {
      const found = classes.find((c) => c._id === classRef);
      return found ? found.name : classRef;
    }
    return classRef.name || "";
  }

  // Pre-fill target class when modal opens
  useEffect(() => {
    if (isOpen) {
      setTargetClassId("");
      setTargetClassName("");
      setTargetSection("A");
      setIsCustomSection(false);
      setCustomSectionInput("");
      setRollMode("keep");
    }
  }, [isOpen]);

  const handleClassSelect = (val) => {
    setTargetClassId(val);
    const selectedCls = classes.find((c) => c._id === val || c.name === val);
    if (selectedCls) {
      setTargetClassName(selectedCls.name);
      if (selectedCls.section) {
        setTargetSection(selectedCls.section);
      }
    } else {
      setTargetClassName(val);
    }
  };

  const finalSection = isCustomSection
    ? customSectionInput.trim().toUpperCase()
    : targetSection;

  const handleConfirmMigration = async (e) => {
    e.preventDefault();
    if (!selectedStudents || selectedStudents.length === 0) {
      addToast("No students selected for migration", "error");
      return;
    }

    if (!targetClassName && !targetClassId) {
      addToast("Please select a target class", "error");
      return;
    }

    const studentIds = selectedStudents.map((s) => s._id || s.id);

    setLoading(true);
    try {
      const res = await api.put("/students/bulk-migrate", {
        studentIds,
        targetClassId: targetClassId || undefined,
        targetClassName: targetClassName,
        targetSection: finalSection,
        rollMode: rollMode,
      });

      if (res.data.success) {
        const { migratedCount, newClassName, newSection } = res.data.data;
        const targetDisplay = newSection
          ? `${newClassName} - ${newSection}`
          : newClassName;
        addToast(
          `Successfully migrated ${migratedCount} student${migratedCount > 1 ? "s" : ""} to ${targetDisplay}`,
          "success",
        );
        if (onSuccess) {
          onSuccess(res.data.data);
        }
        onClose();
      }
    } catch (error) {
      console.error("Bulk Migration Error:", error);
      addToast(
        error.response?.data?.message || "Failed to perform bulk migration",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  const classOptions = classes.map((c) => ({
    value: c._id,
    label: c.section ? `${c.name} (${c.section})` : c.name,
  }));

  const destinationDisplay = targetClassName
    ? `${targetClassName} ${finalSection ? `- Section ${finalSection}` : ""}`
    : "Select Destination Class";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-bold">
            <Layers size={20} />
          </div>
          <div>
            <h3 className="text-lg font-black text-gray-900 leading-tight">
              Bulk Student Migration
            </h3>
            <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
              {selectedStudents.length} Student
              {selectedStudents.length > 1 ? "s" : ""} Selected
            </p>
          </div>
        </div>
      }
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={loading}
            type="button"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmMigration}
            loading={loading}
            disabled={loading || (!targetClassName && !targetClassId)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-2.5 rounded-xl shadow-lg shadow-indigo-200 transition-all flex items-center gap-2"
          >
            <CheckCircle2 size={18} />
            <span>Confirm Migration</span>
          </Button>
        </div>
      }
    >
      <form onSubmit={handleConfirmMigration} className="space-y-6 py-1">
        {/* Source Summary Badge */}
        <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
              Current Source
            </span>
            <span className="text-sm font-black text-slate-800">
              {currentClassDisplay}
            </span>
            <span className="text-xs font-bold text-slate-500 ml-2">
              ({currentSectionDisplay})
            </span>
          </div>
          <div className="px-3 py-1 bg-indigo-100/80 text-indigo-700 rounded-full text-xs font-black uppercase tracking-wider">
            {selectedStudents.length} Selected
          </div>
        </div>

        {/* Destination Selection */}
        <div className="space-y-4">
          <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider">
            Destination Class & Section
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Target Class <span className="text-rose-500">*</span>
              </label>
              <AppCombobox
                options={classOptions}
                value={targetClassId}
                onChange={handleClassSelect}
                placeholder="Select or type class name..."
                allowCustom={true}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Target Section
              </label>
              {!isCustomSection ? (
                <div className="flex gap-2">
                  <select
                    value={targetSection}
                    onChange={(e) => {
                      if (e.target.value === "CUSTOM") {
                        setIsCustomSection(true);
                        setCustomSectionInput("");
                      } else {
                        setTargetSection(e.target.value);
                      }
                    }}
                    className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {SECTION_OPTIONS.map((sec) => (
                      <option key={sec} value={sec}>
                        Section {sec}
                      </option>
                    ))}
                    <option value="CUSTOM">+ New Section...</option>
                  </select>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter section name (e.g. C)"
                    value={customSectionInput}
                    onChange={(e) => setCustomSectionInput(e.target.value)}
                    className="h-10 text-sm font-bold uppercase"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomSection(false);
                      setTargetSection("A");
                    }}
                    className="px-3 text-xs font-bold text-slate-500 hover:text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50"
                  >
                    Reset
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Roll Number Options */}
        <div className="space-y-3 pt-2 border-t border-slate-100">
          <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider">
            Roll Number Handling
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label
              className={`p-3.5 border rounded-2xl cursor-pointer flex items-start gap-3 transition-all ${
                rollMode === "keep"
                  ? "border-indigo-500 bg-indigo-50/40 shadow-sm"
                  : "border-slate-200 hover:border-slate-300 bg-white"
              }`}
            >
              <input
                type="radio"
                name="rollMode"
                value="keep"
                checked={rollMode === "keep"}
                onChange={() => setRollMode("keep")}
                className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
              />
              <div>
                <span className="text-xs font-black text-slate-800 block">
                  Keep Existing Roll Numbers
                </span>
                <span className="text-[10px] text-slate-500 font-medium">
                  Retain student's current roll numbers unchanged.
                </span>
              </div>
            </label>

            <label
              className={`p-3.5 border rounded-2xl cursor-pointer flex items-start gap-3 transition-all ${
                rollMode === "regenerate"
                  ? "border-indigo-500 bg-indigo-50/40 shadow-sm"
                  : "border-slate-200 hover:border-slate-300 bg-white"
              }`}
            >
              <input
                type="radio"
                name="rollMode"
                value="regenerate"
                checked={rollMode === "regenerate"}
                onChange={() => setRollMode("regenerate")}
                className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
              />
              <div>
                <span className="text-xs font-black text-slate-800 block">
                  Auto Generate Roll Numbers
                </span>
                <span className="text-[10px] text-slate-500 font-medium">
                  Sort alphabetically by name & assign 1, 2, 3...
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Dynamic Visual Preview Panel */}
        <div className="p-4 bg-gradient-to-r from-indigo-50/60 to-purple-50/60 border border-indigo-100 rounded-2xl space-y-2">
          <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest block">
            Migration Preview
          </span>
          <div className="flex items-center justify-between text-xs font-black text-slate-800">
            <div className="bg-white px-3 py-1.5 rounded-xl border border-indigo-100 shadow-xs">
              <span className="text-[9px] font-bold text-slate-400 uppercase block">
                FROM
              </span>
              <span>{currentClassDisplay}</span>
            </div>
            <ArrowRight size={18} className="text-indigo-500 shrink-0" />
            <div className="bg-white px-3 py-1.5 rounded-xl border border-indigo-100 shadow-xs text-right">
              <span className="text-[9px] font-bold text-slate-400 uppercase block">
                TO
              </span>
              <span className="text-indigo-700">{destinationDisplay}</span>
            </div>
          </div>
        </div>

        {/* Safety Warning Notice Box */}
        <div className="p-3.5 bg-amber-50/80 border border-amber-200/80 rounded-2xl flex items-start gap-3 text-amber-900">
          <ShieldCheck size={20} className="text-amber-600 shrink-0 mt-0.5" />
          <div className="text-[11px] leading-relaxed font-medium">
            <strong className="font-black text-amber-950 block mb-0.5">
              ERP Isolation Safety Guarantee:
            </strong>
            This action ONLY updates Class, Section, and Roll Numbers.
            Attendance, Fee Records, Examination Marks, Timetables, and
            Historical Reports remain 100% untouched.
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default BulkMigrationModal;
