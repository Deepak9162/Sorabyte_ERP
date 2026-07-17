import React, { useState, useEffect } from "react";
import {
  Network,
  Plus,
  Trash2,
  GraduationCap,
  Users,
  BookOpen,
} from "lucide-react";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import EmptyState from "../components/ui/EmptyState";
import AppCombobox from "../components/ui/AppCombobox";
import { useToast } from "../context/ToastContext";
import api from "../services/api";

const ClassSubjectMapping = () => {
  const { addToast } = useToast();

  // Data State
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [mappings, setMappings] = useState([]);

  // Selection State
  const [selectedClass, setSelectedClass] = useState("");
  const [loading, setLoading] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    subjectId: "",
    teacherId: "",
    sessionsPerWeek: 5,
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      fetchMappings(selectedClass);
    } else {
      setMappings([]);
    }
  }, [selectedClass]);

  const fetchInitialData = async () => {
    try {
      const [clsRes, subRes, tchRes] = await Promise.all([
        api.get("/admin/classes"),
        api.get("/admin/academic/subjects"),
        api.get("/teachers"),
      ]);
      if (clsRes.data.success) setClasses(clsRes.data.data);
      if (subRes.data.success) setSubjects(subRes.data.data);

      if (tchRes.data.success) {
        // Handle paginated teacher response format if applicable
        const teacherData = tchRes.data.data.teachers || tchRes.data.data;
        setTeachers(teacherData);
      }
    } catch (error) {
      addToast(
        "Failed to load prerequisite data. Ensure you have the right permissions.",
        "error",
      );
      console.error(error);
    }
  };

  const fetchMappings = async (classId) => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/academic/classes/${classId}/subjects`);
      if (res.data.success) {
        setMappings(res.data.data);
      }
    } catch (error) {
      addToast(
        error.response?.data?.message || "Failed to fetch class mappings.",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = () => {
    if (!selectedClass) {
      addToast("Please select a class first to assign a subject.", "error");
      return;
    }
    setFormData({ subjectId: "", teacherId: "", sessionsPerWeek: 5 });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.subjectId || !formData.teacherId) {
      addToast("Please select both a subject and a teacher.", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post(
        `/admin/academic/classes/${selectedClass}/subjects`,
        formData,
      );
      addToast("Subject mapped to class successfully!", "success");
      setIsModalOpen(false);
      fetchMappings(selectedClass); // Refresh list
    } catch (error) {
      addToast(
        error.response?.data?.message || "Failed to map subject.",
        "error",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveMapping = async (mappingId) => {
    if (
      !window.confirm(
        "Are you sure you want to remove this subject from the class?",
      )
    )
      return;
    try {
      await api.delete(`/admin/academic/mappings/${mappingId}`);
      addToast("Mapping removed successfully.", "success");
      fetchMappings(selectedClass);
    } catch (error) {
      addToast(
        error.response?.data?.message || "Failed to remove mapping.",
        "error",
      );
    }
  };

  // Filter out subjects that are already mapped to this class
  const unmappedSubjects = subjects.filter(
    (sub) => !mappings.some((mapping) => mapping?.subject?._id === sub?._id),
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Network className="text-indigo-600" size={26} />
            Class Subject Mapping
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            Assign subjects and specific teachers to academic classes.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Top Controls Area */}
        <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row gap-4 justify-between items-center relative z-10">
          <div className="w-full max-w-sm space-y-1.5">
            <AppCombobox
              label="Select Academic Class"
              placeholder="Choose a Class..."
              searchPlaceholder="Search class..."
              emptyText="No classes found"
              value={selectedClass}
              onChange={(val) => setSelectedClass(val)}
              options={classes.map((cls) => ({
                value: cls?._id,
                label: cls?.name,
              }))}
            />
          </div>

          <Button
            onClick={handleOpenModal}
            icon={Plus}
            disabled={!selectedClass}
            className="w-full sm:w-auto mt-4 sm:mt-0"
          >
            Assign Subject
          </Button>
        </div>

        {/* Mappings List Area */}
        <div className="min-h-[400px]">
          {!selectedClass ? (
            <div className="h-full py-20">
              <EmptyState
                title="No Class Selected"
                description="Please select a class from the dropdown above to view or manage its subject mappings."
                icon={GraduationCap}
              />
            </div>
          ) : loading ? (
            <div className="p-12 flex justify-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
            </div>
          ) : mappings.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-white text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                    <th className="px-6 py-5">Subject Details</th>
                    <th className="px-6 py-5">Assigned Teacher</th>
                    <th className="px-6 py-5 text-center">Sessions / Wk</th>
                    <th className="px-6 py-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {mappings.map((mapping) => (
                    <tr
                      key={mapping?._id}
                      className="hover:bg-gray-50/50 transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                            <BookOpen size={20} />
                          </div>
                          <div>
                            <div className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
                              {mapping?.subject?.name || "Deleted Subject"}
                            </div>
                            <div className="text-xs font-medium text-gray-500 tracking-wider">
                              {mapping?.subject?.code || "N/A"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 border-l border-gray-50">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs">
                            {mapping?.teacher?.firstName?.charAt(0) || "?"}
                            {mapping?.teacher?.lastName?.charAt(0) || "?"}
                          </div>
                          <div>
                            <div className="font-bold text-gray-700">
                              {mapping?.teacher
                                ? `${mapping.teacher.firstName} ${mapping.teacher.lastName}`
                                : "Deleted Teacher"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 border-l border-gray-50 text-center">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 font-bold text-gray-600 text-sm">
                          {mapping?.sessionsPerWeek}
                        </span>
                      </td>
                      <td className="px-6 py-4 border-l border-gray-50 text-right">
                        <button
                          onClick={() => handleRemoveMapping(mapping?._id)}
                          className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Remove Assignment"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="h-full py-20">
              <EmptyState
                title="No Subjects Assigned"
                description="This class doesn't have any subjects mapped to it yet."
                icon={Network}
                action={
                  <Button onClick={handleOpenModal}>
                    Assign First Subject
                  </Button>
                }
              />
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Assign New Subject"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Readonly Class Header */}
          <div className="bg-indigo-50 p-4 rounded-xl flex items-center gap-3">
            <GraduationCap className="text-indigo-500" size={24} />
            <div>
              <p className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                Target Class
              </p>
              <p className="font-black text-indigo-900 text-lg leading-tight">
                {classes.find((c) => c?._id === selectedClass)?.name}
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-gray-700 flex justify-between">
              Select Subject
              <span className="text-xs text-indigo-500 font-medium">
                {unmappedSubjects.length} available
              </span>
            </label>
            <AppCombobox
              placeholder="Choose Subject..."
              searchPlaceholder="Search subject..."
              emptyText="No subjects available"
              value={formData.subjectId}
              onChange={(val) => setFormData({ ...formData, subjectId: val })}
              options={unmappedSubjects.map((sub) => ({
                value: sub?._id,
                label: sub?.name,
                badge: sub?.code,
              }))}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-gray-700">
              Assign Teacher
            </label>
            <AppCombobox
              placeholder="Choose Teacher..."
              searchPlaceholder="Search teacher..."
              emptyText="No teachers found"
              value={formData.teacherId}
              onChange={(val) => setFormData({ ...formData, teacherId: val })}
              options={teachers.map((tch) => ({
                value: tch?._id,
                label: `${tch?.firstName} ${tch?.lastName}`,
              }))}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-gray-700">
              Sessions per Week
            </label>
            <input
              type="number"
              min="1"
              max="20"
              required
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-medium"
              value={formData.sessionsPerWeek}
              onChange={(e) =>
                setFormData({ ...formData, sessionsPerWeek: e.target.value })
              }
            />
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              Confirm Assignment
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ClassSubjectMapping;
