import React, { useState, useEffect } from "react";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  BookOpen,
  Filter,
  X,
  CreditCard,
  Users,
} from "lucide-react";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Modal from "../components/ui/Modal";
import Skeleton, { TableSkeleton } from "../components/ui/Skeleton";
import EmptyState from "../components/ui/EmptyState";
import ConfirmModal from "../components/ui/ConfirmModal";
import { useToast } from "../context/ToastContext";
import { cn } from "../utils/cn";
import { formatToINR } from "../utils/format";
import api from "../services/api";

const ClassManagement = () => {
  const { addToast } = useToast();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const [teachers, setTeachers] = useState([]);
  const [formData, setFormData] = useState({
    name: "",
    section: "",
    tuitionFee: "",
    teacher: "",
  });
  const [errors, setErrors] = useState({});

  const fetchClasses = async () => {
    try {
      setLoading(true);
      const res = await api.get("/admin/classes");
      if (res.data.success) {
        setClasses(res.data.data);
      }
    } catch (error) {
      addToast("Failed to fetch classes", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchTeachers = async () => {
    try {
      const res = await api.get("/teachers");
      if (res.data.success) {
        // The API returns { success: true, data: { teachers: [...], pagination: {...} } }
        const teachersArray = res.data.data.teachers || res.data.data;
        setTeachers(Array.isArray(teachersArray) ? teachersArray : []);
      }
    } catch (error) {
      console.error("Failed to fetch teachers:", error);
    }
  };

  useEffect(() => {
    fetchClasses();
    fetchTeachers();
  }, []);

  const handleOpenModal = (cls = null) => {
    if (cls) {
      setSelectedClass(cls);
      setFormData({
        name: cls.name,
        section: cls.section || "",
        tuitionFee: cls.tuitionFee,
        teacher: cls.teacher?._id || cls.teacher || "",
      });
    } else {
      setSelectedClass(null);
      setFormData({ name: "", section: "", tuitionFee: "", teacher: "" });
    }
    setErrors({});
    setIsModalOpen(true);
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.name) newErrors.name = "Class name is required";
    if (!formData.section) newErrors.section = "Section is required";
    if (!formData.tuitionFee || formData.tuitionFee <= 0)
      newErrors.tuitionFee = "Valid fee is required";
    if (!formData.teacher) newErrors.teacher = "Primary teacher is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsProcessing(true);
    try {
      if (selectedClass) {
        const res = await api.put(
          `/admin/classes/${selectedClass._id}`,
          formData,
        );
        if (res.data.success) {
          addToast("Class updated successfully");
          fetchClasses();
        }
      } else {
        const res = await api.post("/admin/classes", formData);
        if (res.data.success) {
          addToast("Class created successfully");
          fetchClasses();
        }
      }
      setIsModalOpen(false);
    } catch (error) {
      addToast(
        error.response?.data?.message || "Failed to save class",
        "error",
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async () => {
    setIsProcessing(true);
    try {
      await api.delete(`/admin/classes/${selectedClass._id}`);
      addToast("Class removed successfully", "error");
      fetchClasses();
      setIsDeleteConfirmOpen(false);
      setSelectedClass(null);
    } catch (error) {
      addToast("Failed to delete class", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredClasses = classes.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.section.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-gray-900 tracking-tight">
            Class Management
          </h2>
          <p className="text-gray-500 font-medium italic">
            Define class groups, sections, and monthly fee structures.
          </p>
        </div>
        <Button
          onClick={() => handleOpenModal()}
          icon={Plus}
          className="h-14 rounded-3xl shadow-xl shadow-indigo-100 px-8"
        >
          Add New Class
        </Button>
      </div>

      {/* Control Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="relative flex-1 group">
          <Search
            className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors"
            size={20}
          />
          <input
            type="text"
            placeholder="Search classes or sections..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-14 pr-6 py-4 bg-white border border-gray-100 rounded-3xl shadow-sm text-sm font-bold focus:ring-4 focus:ring-indigo-50 outline-none transition-all"
          />
        </div>
        <Button
          variant="secondary"
          icon={Filter}
          className="h-14 rounded-3xl px-6 border-gray-100 font-bold"
        >
          Apply Filters
        </Button>
      </div>

      {/* Responsive Content Container */}
      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-700">
        {loading ? (
          <div className="p-10">
            <TableSkeleton rows={4} columns={5} />
          </div>
        ) : filteredClasses.length === 0 ? (
          <EmptyState
            title="No classes configured"
            description={
              searchQuery
                ? `No records found matching "${searchQuery}"`
                : "Define your school's structural units to get started."
            }
            actionLabel={searchQuery ? "Clear Search" : "Create First Class"}
            onAction={() =>
              searchQuery ? setSearchQuery("") : handleOpenModal()
            }
          />
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-gray-100">
              {filteredClasses.map((cls) => (
                <div
                  key={cls._id}
                  className="p-6 space-y-6 hover:bg-gray-50/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-indigo-50 text-indigo-700 rounded-2xl flex items-center justify-center font-black shadow-inner shadow-indigo-100/50">
                        <BookOpen size={22} />
                      </div>
                      <div>
                        <h4 className="font-black text-gray-900 leading-tight uppercase tracking-tight">
                          {cls.name}
                        </h4>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
                          Room {cls.section}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenModal(cls)}
                        className="p-3 text-indigo-600 bg-indigo-50 rounded-xl shadow-sm transition-all"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedClass(cls);
                          setIsDeleteConfirmOpen(true);
                        }}
                        className="p-3 text-rose-600 bg-rose-50 rounded-xl shadow-sm transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100/50">
                      <div className="flex items-center gap-2 mb-1">
                        <CreditCard size={14} className="text-gray-400" />
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                          Monthly Fee
                        </p>
                      </div>
                      <p className="text-lg font-black text-gray-900 tracking-tight">
                        {formatToINR(cls.tuitionFee)}
                      </p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100/50">
                      <div className="flex items-center gap-2 mb-1">
                        <Users size={14} className="text-gray-400" />
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                          Teacher
                        </p>
                      </div>
                      <p className="text-sm font-bold text-gray-900 tracking-tight truncate">
                        {cls.teacher?.firstName ||
                          cls.teacher?.name ||
                          "Not Assigned"}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto custom-scrollbar">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100">
                    <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      Class Identifier
                    </th>
                    <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      Section
                    </th>
                    <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      Monthly Tuition
                    </th>
                    <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      Class Teacher
                    </th>
                    <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredClasses.map((cls) => (
                    <tr
                      key={cls._id}
                      className="group hover:bg-gray-50/80 transition-all duration-300"
                    >
                      <td className="px-10 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-indigo-50 text-indigo-700 rounded-2xl flex items-center justify-center font-black shadow-inner shadow-indigo-100/50">
                            <BookOpen size={22} />
                          </div>
                          <span className="font-black text-gray-900 text-lg uppercase tracking-tight group-hover:text-indigo-600 transition-colors">
                            {cls.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-10 py-6">
                        <span className="px-4 py-1.5 bg-gray-100 text-gray-600 rounded-xl text-[10px] font-black uppercase tracking-widest">
                          Room {cls.section}
                        </span>
                      </td>
                      <td className="px-10 py-6">
                        <div className="flex items-center gap-2">
                          <CreditCard size={16} className="text-gray-400" />
                          <span className="font-black text-gray-900 tracking-tight">
                            {formatToINR(cls.tuitionFee)}
                          </span>
                          <span className="text-[10px] text-gray-400 font-bold">
                            /MO
                          </span>
                        </div>
                      </td>
                      <td className="px-10 py-6">
                        <div className="flex items-center gap-2">
                          <Users size={16} className="text-gray-400" />
                          <span className="text-sm font-bold text-gray-700">
                            {cls.teacher?.firstName ||
                              cls.teacher?.name ||
                              "TBA"}
                          </span>
                        </div>
                      </td>
                      <td className="px-10 py-6 text-right">
                        <div className="flex items-center justify-end gap-3 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all transform translate-x-0 md:translate-x-4 md:group-hover:translate-x-0">
                          <button
                            onClick={() => handleOpenModal(cls)}
                            className="p-3 text-gray-400 hover:text-emerald-600 hover:bg-white rounded-2xl shadow-sm transition-all border border-transparent hover:border-gray-100"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedClass(cls);
                              setIsDeleteConfirmOpen(true);
                            }}
                            className="p-3 text-gray-400 hover:text-rose-600 hover:bg-white rounded-2xl shadow-sm transition-all border border-transparent hover:border-gray-100"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={
          selectedClass ? "Update Class Configuration" : "Establish New Class"
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} loading={isProcessing}>
              {selectedClass ? "Save Changes" : "Create Class Group"}
            </Button>
          </>
        }
      >
        <form className="space-y-6 py-2" onSubmit={handleSubmit}>
          <Input
            label="Class Name / Grade"
            placeholder="e.g. 10th Grade - A"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            error={errors.name}
          />
          <div className="grid grid-cols-2 gap-6">
            <Input
              label="Room / Section"
              placeholder="e.g. Alpha"
              value={formData.section}
              onChange={(e) =>
                setFormData({ ...formData, section: e.target.value })
              }
              error={errors.section}
            />
            <Input
              label="Monthly Fee Structure (₹)"
              type="number"
              placeholder="0.00"
              value={formData.tuitionFee}
              onChange={(e) =>
                setFormData({ ...formData, tuitionFee: e.target.value })
              }
              error={errors.tuitionFee}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-black text-gray-400 uppercase tracking-widest pl-1">
              Select Primary Teacher
            </label>
            <select
              className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-[1.25rem] text-sm font-bold focus:bg-white focus:ring-4 focus:ring-indigo-50 outline-none transition-all cursor-pointer"
              value={formData.teacher}
              onChange={(e) =>
                setFormData({ ...formData, teacher: e.target.value })
              }
            >
              <option value="">Choose a Teacher...</option>
              {teachers.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.firstName} {t.lastName || t.name}
                </option>
              ))}
            </select>
            {errors.teacher && (
              <p className="text-xs text-rose-500 font-bold pl-1">
                {errors.teacher}
              </p>
            )}
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={handleDelete}
        loading={isProcessing}
        title="Discontinue Class Group"
        message={`Warning: Deleting ${selectedClass?.name} will affect all enrolled students and their fee records. This action cannot be undone.`}
      />
    </div>
  );
};

export default ClassManagement;
