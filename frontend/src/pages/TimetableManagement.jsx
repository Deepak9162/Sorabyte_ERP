import React, { useState, useEffect } from "react";
import {
  Calendar,
  Plus,
  Trash2,
  Save,
  Clock,
  User,
  BookOpen,
  Download,
  ChevronDown,
  X,
  AlertCircle,
  Copy,
  Undo2,
} from "lucide-react";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Modal from "../components/ui/Modal";
import CopyModal from "../components/ui/CopyModal";
import AppCombobox from "../components/ui/AppCombobox";
import { TableSkeleton } from "../components/ui/Skeleton";
import { useToast } from "../context/ToastContext";
import api from "../services/api";
import { cn } from "../utils/cn";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const SLOT_TYPES = ["Theory", "Lab", "Project", "Break"];

const incrementTimeByOneHour = (timeStr) => {
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return "09:00 AM";

  let hours = parseInt(match[1], 10);
  const minutes = match[2];
  let ampm = match[3].toUpperCase();

  if (ampm === "PM" && hours !== 12) {
    hours += 12;
  } else if (ampm === "AM" && hours === 12) {
    hours = 0;
  }

  hours = (hours + 1) % 24;

  ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  if (hours === 0) hours = 12;

  const formattedHours = hours.toString().padStart(2, "0");
  return `${formattedHours}:${minutes} ${ampm}`;
};

const TimetableManagement = () => {
  const { addToast } = useToast();
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);

  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSemester, setSelectedSemester] = useState("Annual Term");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [timetable, setTimetable] = useState(null); // { _id, weeklySchedule: [] }
  const [workingDays, setWorkingDays] = useState(DAYS);
  
  // Copy Modal State
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [sourceDayForCopy, setSourceDayForCopy] = useState(null);
  
  // Undo State
  const [lastAuditLogId, setLastAuditLogId] = useState(null);
  const [undoTimeLeft, setUndoTimeLeft] = useState(0);

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [classesRes, subjectsRes, teachersRes, workingDaysRes] = await Promise.allSettled(
          [
            api.get("/admin/classes"),
            api.get("/admin/academic/subjects"),
            api.get("/teachers"),
            api.get("/settings/working-days"),
          ],
        );

        if (classesRes.status === "fulfilled") {
          setClasses(classesRes.value.data.data || []);
        }
        if (subjectsRes.status === "fulfilled") {
          setSubjects(subjectsRes.value.data.data || []);
        }
        if (teachersRes.status === "fulfilled") {
          // Handle both array and object formats for robustness
          const teacherData = teachersRes.value.data.data;
          setTeachers(
            Array.isArray(teacherData)
              ? teacherData
              : teacherData?.teachers || [],
          );
        }
        if (workingDaysRes.status === "fulfilled" && workingDaysRes.value.data.data) {
          setWorkingDays(workingDaysRes.value.data.data);
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      }
    };
    fetchData();
  }, []);

  // Fetch timetable when class/semester changes
  useEffect(() => {
    if (selectedClass) {
      fetchTimetable();
      setLastAuditLogId(null);
      setUndoTimeLeft(0);
    }
  }, [selectedClass, selectedSemester]);

  // Undo Timer
  useEffect(() => {
    let timer;
    if (undoTimeLeft > 0) {
      timer = setTimeout(() => setUndoTimeLeft(undoTimeLeft - 1), 1000);
    } else if (undoTimeLeft === 0 && lastAuditLogId) {
      setLastAuditLogId(null); // Hide undo button after 30s
    }
    return () => clearTimeout(timer);
  }, [undoTimeLeft, lastAuditLogId]);

  const handleCopySuccess = (auditLogId) => {
    setIsCopyModalOpen(false);
    setLastAuditLogId(auditLogId);
    setUndoTimeLeft(30);
    fetchTimetable(); // Refresh view
    addToast("Timetable copied successfully!", "success");
  };

  const handleUndo = async () => {
    try {
      setLoading(true);
      const res = await api.post(`/admin/timetable/undo/${lastAuditLogId}`);
      if (res.data.success) {
        addToast("Undo successful! Timetable reverted.", "success");
        setLastAuditLogId(null);
        setUndoTimeLeft(0);
        fetchTimetable();
      }
    } catch (error) {
      addToast(error.response?.data?.message || "Undo failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchTimetable = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/timetable/class/${selectedClass}`);
      if (res.data.success) {
        const fetchedTimetable = res.data.data;
        // Ensure all workingDays are present in the timetable
        const existingDays = fetchedTimetable.weeklySchedule.map(d => d.day);
        workingDays.forEach(day => {
          if (!existingDays.includes(day)) {
            fetchedTimetable.weeklySchedule.push({ day, slots: [] });
          }
        });
        
        // Sort the days based on the order in workingDays
        fetchedTimetable.weeklySchedule.sort((a, b) => {
          return workingDays.indexOf(a.day) - workingDays.indexOf(b.day);
        });

        setTimetable(fetchedTimetable);
      } else {
        setTimetable(initEmptyTimetable());
      }
    } catch (error) {
      if (error.response?.status === 404) {
        setTimetable(initEmptyTimetable());
      } else {
        addToast("Error fetching timetable", "error");
      }
    } finally {
      setLoading(false);
    }
  };

  const initEmptyTimetable = () => {
    return {
      class: selectedClass,
      semester: selectedSemester,
      academicYear: new Date().getFullYear().toString(),
      weeklySchedule: workingDays.map((day) => ({
        day,
        slots: [],
      })),
    };
  };

  const addSlot = (dayIndex) => {
    setTimetable((prev) => {
      const updatedSchedule = [...prev.weeklySchedule];
      const daySlots = updatedSchedule[dayIndex].slots || [];
      
      let nextStartTime = "08:00 AM";
      let nextEndTime = "09:00 AM";
      
      if (daySlots.length > 0) {
        const lastSlot = daySlots[daySlots.length - 1];
        if (lastSlot.endTime) {
          nextStartTime = lastSlot.endTime;
          nextEndTime = incrementTimeByOneHour(lastSlot.endTime);
        }
      }

      updatedSchedule[dayIndex] = {
        ...updatedSchedule[dayIndex],
        slots: [
          ...daySlots,
          {
            startTime: nextStartTime,
            endTime: nextEndTime,
            subject: "",
            teacher: "",
            type: "Theory",
            label: "",
          },
        ],
      };
      return { ...prev, weeklySchedule: updatedSchedule };
    });
  };

  const removeSlot = (dayIndex, slotIndex) => {
    setTimetable((prev) => {
      const updatedSchedule = [...prev.weeklySchedule];
      updatedSchedule[dayIndex] = {
        ...updatedSchedule[dayIndex],
        slots: updatedSchedule[dayIndex].slots.filter(
          (_, i) => i !== slotIndex,
        ),
      };
      return { ...prev, weeklySchedule: updatedSchedule };
    });
  };

  const updateSlot = (dayIndex, slotIndex, field, value) => {
    setTimetable((prev) => {
      const updatedSchedule = [...prev.weeklySchedule];
      const updatedSlots = [...updatedSchedule[dayIndex].slots];
      updatedSlots[slotIndex] = {
        ...updatedSlots[slotIndex],
        [field]: value,
      };
      updatedSchedule[dayIndex] = {
        ...updatedSchedule[dayIndex],
        slots: updatedSlots,
      };
      return { ...prev, weeklySchedule: updatedSchedule };
    });
  };

  const validateTimetable = () => {
    if (!timetable || !timetable.weeklySchedule) return false;
    for (const daySchedule of timetable.weeklySchedule) {
      for (const slot of daySchedule.slots) {
        if (slot.type === "Break" && !slot.label) {
          addToast(
            `Label is required for Break on ${daySchedule.day} at ${slot.startTime}`,
            "error",
          );
          return false;
        }
        if (slot.type !== "Break") {
          if (!slot.subject) {
            addToast(
              `Subject is required for ${slot.type} on ${daySchedule.day} at ${slot.startTime}`,
              "error",
            );
            return false;
          }
          if (!slot.teacher) {
            addToast(
              `Teacher is required for ${slot.type} on ${daySchedule.day} at ${slot.startTime}`,
              "error",
            );
            return false;
          }
        }
      }
    }
    return true;
  };

  const handleSave = () => {
    if (!validateTimetable()) return;
    setIsConfirmModalOpen(true);
  };

  const executeSave = async () => {
    try {
      setSaving(true);
      setIsConfirmModalOpen(false);

      // Sanitize data: Ensure subject and teacher are just IDs, not populated objects
      const sanitizedWeeklySchedule = timetable.weeklySchedule.map((day) => ({
        ...day,
        slots: day.slots.map((slot) => ({
          ...slot,
          subject: slot.subject?._id || slot.subject || null,
          teacher: slot.teacher?._id || slot.teacher || null,
        })),
      }));

      const payload = {
        ...timetable,
        class: timetable.class?._id || timetable.class,
        weeklySchedule: sanitizedWeeklySchedule,
      };

      if (timetable._id) {
        await api.put(`/admin/timetable/${timetable._id}`, payload);
        addToast("Timetable updated successfully", "success");
      } else {
        await api.post("/admin/timetable", payload);
        addToast("Timetable created successfully", "success");
        fetchTimetable(); // Reload to get ID
      }
    } catch (error) {
      addToast(
        error.response?.data?.message || "Failed to save timetable",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = async () => {
    try {
      addToast("Preparing your PDF...", "info");
      const res = await api.get(`/timetable/download/${selectedClass}`, {
        responseType: "blob",
      });

      // Create a blob URL from the data
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `timetable_${selectedClass}.pdf`);
      document.body.appendChild(link);
      link.click();

      // Cleanup
      link.remove();
      window.URL.revokeObjectURL(url);
      addToast("PDF downloaded successfully", "success");
    } catch (error) {
      console.error("PDF Download Error:", error);
      addToast("Failed to download PDF. Please try again.", "error");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">
            Timetable Management
          </h2>
          <p className="text-gray-500 font-medium italic">
            Design academic schedules with automated overlap detection.
          </p>
        </div>
        <div className="flex gap-3">
          {lastAuditLogId && undoTimeLeft > 0 && (
            <Button
              variant="outline"
              icon={Undo2}
              onClick={handleUndo}
              className="border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100"
            >
              Undo ({undoTimeLeft}s)
            </Button>
          )}
          {timetable?._id && (
            <Button
              variant="secondary"
              icon={Download}
              onClick={handleDownload}
            >
              Download PDF
            </Button>
          )}
          <Button
            icon={Save}
            loading={saving}
            onClick={handleSave}
            disabled={!selectedClass}
          >
            {timetable?._id ? "Update Changes" : "Save Timetable"}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
        <div className="space-y-1.5">
          <label className="text-xs font-black text-gray-400 uppercase tracking-widest pl-1">
            Select Class
          </label>
          <AppCombobox
            placeholder="Choose a Class..."
            searchPlaceholder="Search class..."
            emptyText="No classes found"
            value={selectedClass}
            onChange={(val) => setSelectedClass(val)}
            options={classes.map((cls) => ({
              value: cls._id,
              label: cls.name,
            }))}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-black text-gray-400 uppercase tracking-widest pl-1">
            Academic Term
          </label>
          <AppCombobox
            placeholder="Annual Term"
            searchable={false}
            value={selectedSemester}
            onChange={(val) => setSelectedSemester(val)}
            options={[
              { value: "Annual Term", label: "Annual Term" },
              { value: "Term 1 (Half Yearly)", label: "Term 1 (Half Yearly)" },
              { value: "Term 2 (Annual Exam)", label: "Term 2 (Annual Exam)" },
            ]}
          />
        </div>

        <div className="flex items-end">
          <div className="w-full p-4 bg-indigo-50/50 rounded-2xl flex items-center gap-3">
            <Clock className="text-indigo-600" size={20} />
            <div>
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest leading-none mb-1">
                Conflict Check
              </p>
              <p className="text-xs font-bold text-indigo-700">
                Overlap detection active
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Timetable Grid */}
      {!selectedClass ? (
        <div className="h-[400px] flex flex-col items-center justify-center bg-white rounded-[2.5rem] border border-gray-100 shadow-sm animate-in zoom-in duration-500">
          <div className="w-24 h-24 bg-indigo-50 rounded-[2rem] flex items-center justify-center mb-6">
            <Calendar size={48} className="text-indigo-600 opacity-40" />
          </div>
          <h3 className="text-2xl font-black text-gray-900 mb-2">
            No Class Selected
          </h3>
          <p className="text-gray-500 font-bold italic max-w-xs text-center">
            Pick a class from the dropdown above to manage its academic
            schedule.
          </p>
        </div>
      ) : loading ? (
        <div className="p-10 bg-white rounded-[2.5rem] border border-gray-100 shadow-sm">
          <TableSkeleton rows={5} columns={6} />
        </div>
      ) : (
        <div className="space-y-6">
          {timetable?.weeklySchedule.map((dayData, dayIndex) => (
            <div
              key={dayData.day}
              className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden group/day transition-all duration-300 hover:shadow-xl hover:border-indigo-100"
            >
              <div className="bg-gray-50/80 px-4 md:px-10 py-5 border-b border-gray-100 flex items-center justify-between sticky top-0 z-10 backdrop-blur-sm group-hover/day:bg-white transition-colors">
                <div className="flex items-center gap-2 md:gap-4">
                  <div className="w-10 h-10 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100 group-hover/day:scale-110 transition-transform">
                    <Calendar size={20} />
                  </div>
                  <h3 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight">
                    {dayData.day}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  {dayData.slots.length > 0 && (
                    <button
                      type="button"
                      onClick={() => removeSlot(dayIndex, dayData.slots.length - 1)}
                      title="Remove the last period for this day"
                      className="flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-wider transition-all active:scale-95 border border-rose-200/80 cursor-pointer"
                    >
                      <Trash2 size={15} />
                      <span className="hidden sm:inline">Remove Last</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setSourceDayForCopy(dayData.day);
                      setIsCopyModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 md:gap-2 px-4 md:px-6 py-2.5 bg-gray-100 text-gray-700 rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-widest hover:bg-gray-200 transition-all hover:scale-105 active:scale-95 border border-gray-200 cursor-pointer"
                  >
                    <Copy size={16} /> Copy
                  </button>
                  <button
                    type="button"
                    onClick={() => addSlot(dayIndex)}
                    className="flex items-center gap-1.5 md:gap-2 px-4 md:px-6 py-2.5 bg-indigo-600 text-white rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-100/50 hover:bg-indigo-700 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                  >
                    <Plus size={16} /> Add Period
                  </button>
                </div>
              </div>

              <div className="p-6 overflow-x-auto custom-scrollbar">
                {dayData.slots.length === 0 ? (
                  <div className="py-12 text-center">
                    <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Clock size={32} className="text-gray-200" />
                    </div>
                    <p className="text-gray-400 italic font-bold">
                      No periods assigned for {dayData.day}.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col md:flex-row gap-6 min-w-full md:min-w-max pb-4">
                    {dayData.slots.map((slot, slotIndex) => (
                      <div
                        key={slotIndex}
                        className={cn(
                          "w-full md:w-[280px] p-6 rounded-[2.25rem] border transition-all relative group/slot overflow-hidden",
                          slot.type === "Break"
                            ? "bg-amber-50/50 border-amber-100 shadow-inner"
                            : "bg-white border-gray-100 hover:border-indigo-200 hover:shadow-2xl hover:shadow-indigo-100/30",
                        )}
                      >
                        {/* Hover Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover/slot:opacity-100 transition-opacity pointer-events-none" />

                        <div className="space-y-4 relative">
                          {/* Time Range & Delete Button Row */}
                          <div className="flex items-center gap-2">
                            <div className="flex-1 flex items-center gap-1.5 p-2 bg-slate-100/80 rounded-xl border border-slate-200/60 group-hover/slot:bg-white transition-colors">
                              <input
                                type="text"
                                value={slot.startTime}
                                onChange={(e) =>
                                  updateSlot(
                                    dayIndex,
                                    slotIndex,
                                    "startTime",
                                    e.target.value,
                                  )
                                }
                                className="w-full text-[10px] font-black text-slate-700 bg-transparent border-none focus:ring-0 p-0 text-center uppercase tracking-wider"
                                placeholder="00:00 AM"
                              />
                              <div className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0" />
                              <input
                                type="text"
                                value={slot.endTime}
                                onChange={(e) =>
                                  updateSlot(
                                    dayIndex,
                                    slotIndex,
                                    "endTime",
                                    e.target.value,
                                  )
                                }
                                className="w-full text-[10px] font-black text-slate-700 bg-transparent border-none focus:ring-0 p-0 text-center uppercase tracking-wider"
                                placeholder="00:00 AM"
                              />
                            </div>

                            <button
                              type="button"
                              onClick={() => removeSlot(dayIndex, slotIndex)}
                              title="Delete this period"
                              className="w-8 h-8 rounded-xl bg-rose-50 hover:bg-rose-600 text-rose-500 hover:text-white border border-rose-200/80 flex items-center justify-center transition-all shrink-0 cursor-pointer active:scale-90 shadow-2xs"
                            >
                              <X className="w-4 h-4 stroke-[2.5]" />
                            </button>
                          </div>

                          {/* Slot Type */}
                          <div className="relative">
                            <select
                              className={cn(
                                "w-full pl-4 pr-10 py-2.5 rounded-[1.25rem] text-[10px] font-black uppercase tracking-widest border border-transparent outline-none transition-all appearance-none cursor-pointer",
                                slot.type === "Break"
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-indigo-600 text-white shadow-lg shadow-indigo-100",
                              )}
                              value={slot.type}
                              onChange={(e) =>
                                updateSlot(
                                  dayIndex,
                                  slotIndex,
                                  "type",
                                  e.target.value,
                                )
                              }
                            >
                              {SLOT_TYPES.map((t) => (
                                <option
                                  key={t}
                                  value={t}
                                  className="text-gray-900"
                                >
                                  {t}
                                </option>
                              ))}
                            </select>
                            <ChevronDown
                              className={cn(
                                "absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none transition-transform group-hover/slot:scale-110",
                                slot.type === "Break"
                                  ? "text-amber-500"
                                  : "text-white/70",
                              )}
                              size={14}
                            />
                          </div>

                          {slot.type === "Break" ? (
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-black text-amber-400 uppercase tracking-widest pl-1">
                                Break Label
                              </label>
                              <input
                                type="text"
                                value={slot.label || ""}
                                onChange={(e) =>
                                  updateSlot(
                                    dayIndex,
                                    slotIndex,
                                    "label",
                                    e.target.value,
                                  )
                                }
                                placeholder="e.g. Lunch Break"
                                className="w-full px-4 py-3 bg-white border border-amber-100 rounded-2xl text-sm font-bold placeholder:text-amber-200 outline-none focus:ring-4 focus:ring-amber-50"
                              />
                            </div>
                          ) : (
                            <div className="space-y-4 pt-2">
                              {/* Subject Picker */}
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
                                  Subject
                                </label>
                                <AppCombobox
                                  placeholder="Select Subject..."
                                  searchPlaceholder="Search subject..."
                                  emptyText="No subjects found"
                                  value={slot.subject?._id || slot.subject || ""}
                                  onChange={(val) => updateSlot(dayIndex, slotIndex, "subject", val)}
                                  options={subjects.map((s) => ({
                                    value: s._id,
                                    label: s.name,
                                  }))}
                                />
                              </div>

                              {/* Teacher Picker */}
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
                                  Faculty
                                </label>
                                <AppCombobox
                                  placeholder="Select Faculty..."
                                  searchPlaceholder="Search teacher..."
                                  emptyText="No teachers found"
                                  value={slot.teacher?._id || slot.teacher || ""}
                                  onChange={(val) => updateSlot(dayIndex, slotIndex, "teacher", val)}
                                  options={teachers.map((t) => ({
                                    value: t._id,
                                    label: `${t.firstName} ${t.lastName}`,
                                  }))}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirmation Modal */}
      <Modal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        title="Confirm Timetable Save"
      >
        <div className="space-y-6">
          <div className="flex items-center gap-4 p-4 bg-indigo-50 rounded-2xl">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm">
              <AlertCircle className="text-indigo-600" size={24} />
            </div>
            <div>
              <p className="font-bold text-gray-900">Are you sure?</p>
              <p className="text-xs text-indigo-600 font-medium tracking-tight">
                This will overwrite the current schedule for this class.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Button
              variant="secondary"
              className="h-12 rounded-2xl font-black text-xs uppercase mb-0 w-full"
              onClick={() => setIsConfirmModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="h-12 rounded-2xl font-black text-xs uppercase mb-0 w-full"
              onClick={executeSave}
              loading={saving}
            >
              Confirm Save
            </Button>
          </div>
        </div>
      </Modal>

      {/* Copy Modal */}
      {isCopyModalOpen && (
        <CopyModal
          isOpen={isCopyModalOpen}
          onClose={() => setIsCopyModalOpen(false)}
          sourceDay={sourceDayForCopy}
          workingDays={workingDays}
          timetableId={timetable?._id}
          onSuccess={handleCopySuccess}
        />
      )}
    </div>
  );
};

export default TimetableManagement;
