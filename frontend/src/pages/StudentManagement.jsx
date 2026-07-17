import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  User,
  CheckCircle,
  AlertCircle,
  Filter,
  Eye,
  GraduationCap,
  Phone,
  UserCheck,
  X,
  ChevronDown,
} from "lucide-react";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Modal from "../components/ui/Modal";
import Skeleton, { TableSkeleton } from "../components/ui/Skeleton";
import EmptyState from "../components/ui/EmptyState";
import ConfirmModal from "../components/ui/ConfirmModal";
import { useToast } from "../context/ToastContext";
import { cn } from "../utils/cn";
import AppCombobox from "../components/ui/AppCombobox";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

const StudentManagement = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterClass, setFilterClass] = useState("all");
  const [isProcessing, setIsProcessing] = useState(false);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    rollNumber: "",
    class: "",
    grade: "",
    parentName: "",
    parentPhone: "",
    email: "",
  });

  const [errors, setErrors] = useState({});

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const res = await api.get("/students", {
        params: {
          isActive: "true",
          limit: 1000,
        },
      });
      if (res.data.success) {
        setStudents(res.data.data.students || []);
      }
    } catch (error) {
      console.error("Fetch students error:", error);
      addToast("Failed to fetch students", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    if (!user) return;
    try {
      const endpoint =
        user?.role === "teacher"
          ? "/timetable/teacher/assigned-classes"
          : "/admin/classes";
      const res = await api.get(endpoint);
      if (res.data.success) {
        setClasses(res.data.data || []);
      }
    } catch (error) {
      console.error("Fetch classes error:", error);
    }
  };

  useEffect(() => {
    fetchStudents();
    fetchClasses();
  }, []);

  const handleOpenModal = (student = null) => {
    if (student) {
      setSelectedStudent(student);
      setFormData({
        firstName: student.firstName,
        lastName: student.lastName,
        rollNumber: student.rollNumber,
        class: student.class?._id || student.class,
        grade: student.grade || "",
        parentName: student.parentName,
        parentPhone: student.parentPhone,
        email: student.email || "",
      });
    } else {
      setSelectedStudent(null);
      setFormData({
        firstName: "",
        lastName: "",
        rollNumber: "",
        class: "",
        grade: "",
        parentName: "",
        parentPhone: "",
        email: "",
      });
    }
    setErrors({});
    setIsModalOpen(true);
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.firstName) newErrors.firstName = "First name is required";
    if (!formData.lastName) newErrors.lastName = "Last name is required";
    if (!formData.email) newErrors.email = "Email is required";
    if (!formData.rollNumber) newErrors.rollNumber = "Roll number is required";
    if (!formData.class) newErrors.class = "Class is required";
    if (!formData.grade) newErrors.grade = "Grade is required";
    if (!formData.parentPhone)
      newErrors.parentPhone = "Parent phone is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddOrUpdateStudent = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsProcessing(true);
    try {
      if (selectedStudent) {
        const res = await api.put(`/students/${selectedStudent._id}`, formData);
        if (res.data.success) {
          addToast("Student information updated successfully");
        }
      } else {
        const res = await api.post("/admin/students", formData);
        if (res.data.success) {
          addToast("New student enrolled successfully");
        }
      }
      await fetchStudents();
      setIsModalOpen(false);
    } catch (error) {
      console.error("Save student error:", error);
      const message =
        error.response?.data?.message || "Failed to process student request";
      addToast(message, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async () => {
    setIsProcessing(true);
    try {
      const res = await api.delete(`/students/${selectedStudent._id}`);
      if (res.data.success) {
        addToast("Student record permanently deleted", "error");
        await fetchStudents();
      }
    } catch (error) {
      console.error("Delete student error:", error);
      addToast("Failed to delete student record", "error");
    } finally {
      setIsDeleteConfirmOpen(false);
      setIsProcessing(false);
      setSelectedStudent(null);
    }
  };

  const filteredStudents = students.filter((s) => {
    const nameMatch = `${s.firstName} ${s.lastName}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const rollMatch = s.rollNumber
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const classMatch = filterClass === "all" || s.class === filterClass;
    return (nameMatch || rollMatch) && classMatch;
  });

  const getClassName = (id) => {
    const classId = typeof id === "object" ? id._id : id;
    return classes.find((c) => c._id === classId)?.name || "N/A";
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-gray-900 tracking-tight">
            Student Directory
          </h2>
          <p className="text-gray-500 font-medium italic">
            Manage enrollment records, academic profiles, and student data.
          </p>
        </div>
        <Button
          onClick={() => handleOpenModal()}
          icon={Plus}
          className="h-14 rounded-3xl shadow-xl shadow-indigo-100 px-8"
        >
          Enroll Student
        </Button>
      </div>

      {/* Control Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3 relative group">
          <Search
            className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors"
            size={20}
          />
          <input
            type="text"
            placeholder="Search by name or roll number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-14 pr-6 py-4 bg-white border border-gray-100 rounded-3xl shadow-sm text-sm font-bold focus:ring-4 focus:ring-indigo-50 outline-none transition-all"
          />
        </div>
        <AppCombobox
          placeholder="All Classes"
          searchPlaceholder="Search class..."
          emptyText="No classes found"
          clearable
          value={filterClass === "all" ? "" : filterClass}
          onChange={(val) => setFilterClass(val || "all")}
          options={classes.map((c) => ({
            value: c._id,
            label: c.name,
          }))}
          containerClassName="w-full"
        />
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-700">
        {/* Responsive Content Container */}
        <div className="overflow-hidden">
          {loading ? (
            <div className="p-10">
              <TableSkeleton rows={6} columns={5} />
            </div>
          ) : filteredStudents.length === 0 ? (
            <EmptyState
              title="No students found"
              description={
                searchQuery
                  ? `No records matched "${searchQuery}" in class ${getClassName(filterClass)}`
                  : "Start building your directory by enrolling students."
              }
              actionLabel={searchQuery ? "Clear Search" : "Enroll New Student"}
              onAction={() =>
                searchQuery ? setSearchQuery("") : handleOpenModal()
              }
            />
          ) : (
            <>
              {/* Mobile Card View (visible on small screens) */}
              <div className="md:hidden divide-y divide-gray-100">
                {filteredStudents.map((student) => (
                  <div
                    key={student._id}
                    className="p-6 space-y-4 hover:bg-gray-50/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-black shadow-inner">
                          {student.firstName.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-black text-gray-900 leading-tight">
                            {student.firstName} {student.lastName}
                          </h4>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
                            Roll: {student.rollNumber} •{" "}
                            {getClassName(student.class)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            navigate(
                              `/students/${student.studentId || student._id}`,
                            )
                          }
                          className="p-3 text-indigo-600 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-all"
                          title="View Profile"
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          onClick={() => handleOpenModal(student)}
                          className="p-3 text-emerald-600 bg-emerald-50 rounded-xl hover:bg-emerald-100 transition-all"
                          title="Edit Student"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedStudent(student);
                            setIsDeleteConfirmOpen(true);
                          }}
                          className="p-3 text-rose-600 bg-rose-50 rounded-xl hover:bg-rose-100 transition-all"
                          title="Delete Record"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-gray-50 rounded-xl border border-gray-100/50">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-tighter mb-1 leading-none">
                          Status
                        </p>
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest leading-none",
                            student.status === "active"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-rose-100 text-rose-700",
                          )}
                        >
                          {student.status}
                        </span>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-xl border border-gray-100/50">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-tighter mb-1 leading-none">
                          Phone
                        </p>
                        <p className="text-[10px] font-bold text-gray-700">
                          {student.parentPhone}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View (visible on md+) */}
              <div className="hidden md:block overflow-x-auto custom-scrollbar">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-gray-50/50 border-b border-gray-100">
                      <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        Student Information
                      </th>
                      <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        Class / Group
                      </th>
                      <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        Account Status
                      </th>
                      <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        Contact Details
                      </th>
                      <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredStudents.map((student) => (
                      <tr
                        key={student._id}
                        className="group hover:bg-gray-50/80 transition-all duration-300"
                      >
                        <td className="px-10 py-6">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-indigo-50 text-indigo-700 rounded-2xl flex items-center justify-center font-black shadow-inner shadow-indigo-100/50">
                              {student.firstName.charAt(0)}
                            </div>
                            <div>
                              <p className="font-black text-gray-900 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">
                                {student.firstName} {student.lastName}
                              </p>
                              <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-0.5">
                                Roll Number: {student.rollNumber}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-10 py-6">
                          <span className="px-4 py-1.5 bg-gray-100 text-gray-600 rounded-xl text-[10px] font-black uppercase tracking-widest">
                            {getClassName(student.class)}
                          </span>
                        </td>
                        <td className="px-10 py-6">
                          <span
                            className={cn(
                              "px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-2",
                              student.status === "active"
                                ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                                : "bg-rose-50 text-rose-600 border border-rose-100",
                            )}
                          >
                            <span
                              className={cn(
                                "w-1.5 h-1.5 rounded-full",
                                student.status === "active"
                                  ? "bg-emerald-500"
                                  : "bg-rose-500",
                              )}
                            />
                            {student.status}
                          </span>
                        </td>
                        <td className="px-10 py-6">
                          <p className="text-sm font-bold text-gray-700">
                            {student.email}
                          </p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight mt-0.5">
                            {student.parentPhone}
                          </p>
                        </td>
                        <td className="px-10 py-6 text-right">
                          <div className="flex items-center justify-end gap-3 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all transform translate-x-0 md:translate-x-4 md:group-hover:translate-x-0">
                            <button
                              onClick={() =>
                                navigate(
                                  `/students/${student.studentId || student._id}`,
                                )
                              }
                              className="p-3 text-gray-400 hover:text-indigo-600 hover:bg-white rounded-2xl shadow-sm transition-all border border-transparent hover:border-gray-100"
                              title="View Profile"
                            >
                              <Eye size={18} />
                            </button>
                            <button
                              onClick={() => handleOpenModal(student)}
                              className="p-3 text-gray-400 hover:text-emerald-600 hover:bg-white rounded-2xl shadow-sm transition-all border border-transparent hover:border-gray-100"
                              title="Edit Student"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedStudent(student);
                                setIsDeleteConfirmOpen(true);
                              }}
                              className="p-3 text-gray-400 hover:text-rose-600 hover:bg-white rounded-2xl shadow-sm transition-all border border-transparent hover:border-gray-100"
                              title="Delete Record"
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
      </div>

      {/* Modals & Overlays */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={
          selectedStudent ? "Update Student Profile" : "Enroll New Student"
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddOrUpdateStudent} loading={isProcessing}>
              {selectedStudent ? "Save Changes" : "Complete Enrollment"}
            </Button>
          </>
        }
      >
        <form className="space-y-6 py-2" onSubmit={handleAddOrUpdateStudent}>
          <div className="grid grid-cols-2 gap-6">
            <Input
              label="First Name"
              placeholder="e.g. John"
              value={formData.firstName}
              onChange={(e) =>
                setFormData({ ...formData, firstName: e.target.value })
              }
              error={errors.firstName}
            />
            <Input
              label="Last Name"
              placeholder="e.g. Doe"
              value={formData.lastName}
              onChange={(e) =>
                setFormData({ ...formData, lastName: e.target.value })
              }
              error={errors.lastName}
            />
          </div>
          <div className="grid grid-cols-2 gap-6">
            <Input
              label="Roll Number"
              placeholder="e.g. S101"
              value={formData.rollNumber}
              onChange={(e) =>
                setFormData({ ...formData, rollNumber: e.target.value })
              }
              error={errors.rollNumber}
            />
            <div className="space-y-1.5">
              <AppCombobox
                label="Class"
                placeholder="Select Group"
                searchPlaceholder="Search class..."
                emptyText="No classes found"
                value={formData.class}
                onChange={(val) => setFormData({ ...formData, class: val })}
                error={errors.class}
                options={classes.map((c) => ({
                  value: c._id,
                  label: c.name,
                }))}
              />
            </div>
            <Input
              label="Grade"
              placeholder="e.g. 10"
              value={formData.grade}
              onChange={(e) =>
                setFormData({ ...formData, grade: e.target.value })
              }
              error={errors.grade}
            />
          </div>
          <div className="grid grid-cols-2 gap-6">
            <Input
              label="Email Address"
              placeholder="student@test.com"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              error={errors.email}
            />
            <Input
              label="Guardian Name"
              placeholder="Parent or Guardian"
              value={formData.parentName}
              onChange={(e) =>
                setFormData({ ...formData, parentName: e.target.value })
              }
            />
          </div>
          <Input
            label="Contact Number"
            placeholder="10-digit phone"
            value={formData.parentPhone}
            onChange={(e) =>
              setFormData({ ...formData, parentPhone: e.target.value })
            }
            error={errors.parentPhone}
          />
        </form>
      </Modal>

      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title="Student Insights"
        maxWidth="md"
        noFooter
      >
        {selectedStudent && (
          <div className="space-y-8">
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 bg-indigo-600 text-white rounded-[2.5rem] flex items-center justify-center text-4xl font-black shadow-2xl shadow-indigo-100">
                {selectedStudent.firstName.charAt(0)}
              </div>
              <div className="space-y-1">
                <h3 className="text-3xl font-black text-gray-900 tracking-tight uppercase">
                  {selectedStudent.firstName} {selectedStudent.lastName}
                </h3>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-[10px] font-black uppercase tracking-widest">
                    Roll: {selectedStudent.rollNumber}
                  </span>
                  <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-black uppercase tracking-widest">
                    Active Enrollment
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-5 bg-gray-50 rounded-3xl border border-gray-100 space-y-4">
                <div className="flex items-center gap-3">
                  <GraduationCap className="text-indigo-600" size={24} />
                  <div>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                      Assigned Class
                    </p>
                    <p className="font-black text-gray-800 uppercase">
                      {getClassName(selectedStudent.class)}
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-5 bg-gray-50 rounded-3xl border border-gray-100 space-y-4">
                <div className="flex items-center gap-3">
                  <UserCheck className="text-indigo-600" size={24} />
                  <div>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                      Guardian
                    </p>
                    <p className="font-black text-gray-800 uppercase">
                      {selectedStudent.parentName}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <Button
                className="flex-1 rounded-[1.25rem] h-14"
                variant="secondary"
                onClick={() => {
                  setIsViewModalOpen(false);
                  handleOpenModal(selectedStudent);
                }}
              >
                Edit Profile
              </Button>
              <Button
                className="flex-1 rounded-[1.25rem] h-14"
                variant="danger"
                onClick={() => {
                  setIsViewModalOpen(false);
                  setIsDeleteConfirmOpen(true);
                }}
              >
                Terminate
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmModal
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={handleDelete}
        loading={isProcessing}
        title="Unenroll Student"
        message={`Are you sure you want to permanently delete the records for ${selectedStudent?.firstName}? This action is irreversible.`}
      />
    </div>
  );
};

export default StudentManagement;
