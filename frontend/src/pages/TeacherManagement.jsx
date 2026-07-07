import React, { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Search,
  Edit2,
  UserCheck,
  UserMinus,
  Mail,
  Phone,
  CheckCircle,
  AlertCircle,
  Wifi,
  WifiOff,
  Clock,
  UserSquare2,
} from "lucide-react";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Modal from "../components/ui/Modal";
import { TableSkeleton } from "../components/ui/Skeleton";
import EmptyState from "../components/ui/EmptyState";
import { cn } from "../utils/cn";
import api from "../services/api";

const TeacherManagement = () => {
  const [teachers, setTeachers] = useState([]);
  const [classesList, setClassesList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    subject: "",
    assignedClasses: [],
  });

  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState(null);

  const fetchTeachers = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.get("/teachers");
      if (res.data.success) {
        setTeachers(res.data.data.teachers || res.data.data);
      }
    } catch (error) {
      console.error("Failed to fetch teachers:", error);
      if (!silent) showToast("Could not load staff members", "error");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeachers();
    fetchClasses();
    // Auto-refresh every 30 seconds for live online status
    const interval = setInterval(() => fetchTeachers(true), 30_000);
    return () => clearInterval(interval);
  }, [fetchTeachers]);

  const fetchClasses = async () => {
    try {
      const res = await api.get("/admin/classes");
      if (res.data.success) {
        setClassesList(res.data.data);
      }
    } catch (error) {
      console.error("Failed to fetch classes:", error);
    }
  };

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleOpenModal = (teacher = null) => {
    if (teacher) {
      setSelectedTeacher(teacher);
      setFormData({
        firstName: teacher.firstName,
        lastName: teacher.lastName,
        email: teacher.email,
        phone: teacher.phone,
        subject: teacher.subject,
        assignedClasses: teacher.assignedClasses || [],
      });
    } else {
      setSelectedTeacher(null);
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        subject: "",
        assignedClasses: [],
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
    if (!formData.subject) newErrors.subject = "Subject is required";
    if (!formData.phone) newErrors.phone = "Phone number is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      if (selectedTeacher) {
        // Update existing teacher profile
        const res = await api.put(`/teachers/${selectedTeacher._id}`, formData);
        if (res.data.success) {
          showToast("Teacher profile updated");
        }
      } else {
        // Create new teacher and user account
        const payload = {
          user: {
            name: `${formData.firstName} ${formData.lastName}`,
            email: formData.email,
            password: "password123", // Default password
          },
          teacher: formData,
        };
        const res = await api.post("/admin/teachers", payload);
        if (res.data.success) {
          showToast("Teacher registered successfully");
        }
      }
      await fetchTeachers();
      setIsModalOpen(false);
    } catch (error) {
      console.error("Save error:", error);
      const message = error.response?.data?.message || "Failed to save teacher";
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (teacher) => {
    try {
      const newStatus = !teacher.isActive;
      const res = await api.put(`/teachers/${teacher._id}`, {
        isActive: newStatus,
      });
      if (res.data.success) {
        showToast(
          `Staff account ${newStatus ? "activated" : "deactivated"}`,
          newStatus ? "success" : "error",
        );
        fetchTeachers();
      }
    } catch (error) {
      console.error("Status toggle error:", error);
      showToast("Failed to update status", "error");
    }
  };

  const handleClassToggle = (clsName) => {
    const current = formData.assignedClasses;
    if (current.includes(clsName)) {
      setFormData({
        ...formData,
        assignedClasses: current.filter((c) => c !== clsName),
      });
    } else {
      setFormData({ ...formData, assignedClasses: [...current, clsName] });
    }
  };

  // ── Online presence helpers
  const getOnlineStatus = (userObj) => {
    if (!userObj) return { online: false, lastSeenText: null };
    if (!userObj.isOnline) {
      return { online: false, lastSeenText: userObj.lastSeen ? getLastSeenText(userObj.lastSeen) : null };
    }
    // isOnline=true — verify lastSeen is recent (within 5 minutes)
    const diff = userObj.lastSeen ? Date.now() - new Date(userObj.lastSeen).getTime() : Infinity;
    if (diff > 5 * 60 * 1000) {
      return { online: false, lastSeenText: getLastSeenText(userObj.lastSeen) };
    }
    return { online: true, lastSeenText: "Active now" };
  };

  const getLastSeenText = (lastSeen) => {
    if (!lastSeen) return null;
    const diff = Math.floor((Date.now() - new Date(lastSeen).getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return new Date(lastSeen).toLocaleDateString();
  };

  const filteredTeachers = teachers.filter(
    (t) =>
      `${t.firstName} ${t.lastName}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      t.subject.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Toast */}
      {toast && (
        <div
          className={cn(
            "fixed top-6 right-6 z-[100] p-4 rounded-xl shadow-lg border flex items-center gap-3 animate-in slide-in-from-right-10",
            toast.type === "success"
              ? "bg-emerald-50 border-emerald-100 text-emerald-800"
              : "bg-red-50 border-red-100 text-red-800",
          )}
        >
          {toast.type === "success" ? (
            <CheckCircle size={20} />
          ) : (
            <AlertCircle size={20} />
          )}
          <span className="font-bold text-sm">{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">
            Staff Management
          </h2>
          <p className="text-gray-500 font-medium">
            Manage teacher profiles, subjects, and class assignments.
          </p>
        </div>
        <Button
          onClick={() => handleOpenModal()}
          icon={Plus}
          className="rounded-2xl shadow-lg shadow-indigo-100"
        >
          Add New Teacher
        </Button>
      </div>

      {/* Search & Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 relative">
          <Search
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
            size={20}
          />
          <input
            type="text"
            placeholder="Search by name or subject..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white border border-gray-100 rounded-[1.5rem] shadow-sm text-sm focus:ring-4 focus:ring-indigo-100 outline-none transition-all"
          />
        </div>
        <div className="bg-indigo-600 rounded-[1.5rem] p-4 flex items-center justify-between text-white shadow-xl shadow-indigo-100">
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-widest opacity-70">
              Total Staff
            </span>
            <span className="text-2xl font-black">{teachers.length}</span>
          </div>
          <UserSquare2 size={32} className="opacity-40" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-10">
              <TableSkeleton rows={5} columns={5} />
            </div>
          ) : filteredTeachers.length === 0 ? (
            <EmptyState
              title="No staff members found"
              description={
                searchQuery
                  ? `No records matched "${searchQuery}"`
                  : "Start building your faculty by adding teachers."
              }
              actionLabel={searchQuery ? "Clear Search" : "Add New Teacher"}
              onAction={() =>
                searchQuery ? setSearchQuery("") : handleOpenModal()
              }
            />
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 text-gray-400 text-[10px] uppercase font-black tracking-widest border-b border-gray-50">
                  <th className="px-8 py-4">Teacher</th>
                  <th className="px-8 py-4">Expertise</th>
                  <th className="px-8 py-4">Assigned Classes</th>
                  <th className="px-8 py-4">Account</th>
                  <th className="px-8 py-4">Online Status</th>
                  <th className="px-8 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredTeachers.map((t) => {
                  const presence = getOnlineStatus(t.user);
                  return (
                  <tr
                    key={t._id}
                    className="hover:bg-gray-50/50 transition-colors group"
                  >
                    {/* Teacher Info with online dot on avatar */}
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="relative shrink-0">
                          <div
                            className={cn(
                              "w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg shadow-sm group-hover:scale-110 transition-transform",
                              t.isActive
                                ? "bg-indigo-50 text-indigo-700"
                                : "bg-gray-100 text-gray-500",
                            )}
                          >
                            {t.firstName?.charAt(0)}
                            {t.lastName?.charAt(0)}
                          </div>
                          {/* Online indicator dot */}
                          <span
                            className={cn(
                              "absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white",
                              presence.online ? "bg-emerald-500" : "bg-gray-300"
                            )}
                          />
                          {presence.online && (
                            <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-400 animate-ping opacity-75" />
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-gray-900">
                            {t.firstName} {t.lastName}
                          </span>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-[10px] flex items-center gap-1 text-gray-400">
                              <Mail size={10} /> {t.email}
                            </span>
                            <span className="text-[10px] flex items-center gap-1 text-gray-400">
                              <Phone size={10} /> {t.phone}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Expertise */}
                    <td className="px-8 py-5">
                      <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-black uppercase tracking-wider">
                        {t.subject}
                      </span>
                    </td>

                    {/* Assigned Classes */}
                    <td className="px-8 py-5">
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {t.assignedClasses?.map((c) => (
                          <span
                            key={c}
                            className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md text-[10px] font-bold"
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Account Status (enable/disable toggle) */}
                    <td className="px-8 py-5">
                      <button
                        onClick={() => toggleStatus(t)}
                        className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                          t.isActive
                            ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                            : "bg-red-50 text-red-600 border border-red-100",
                        )}
                      >
                        {t.isActive ? <UserCheck size={14} /> : <UserMinus size={14} />}
                        {t.isActive ? "Enabled" : "Disabled"}
                      </button>
                    </td>

                    {/* ── Real-time Online Presence */}
                    <td className="px-8 py-5">
                      <div className="flex flex-col gap-1">
                        <span
                          className={cn(
                            "inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border w-fit",
                            presence.online
                              ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                              : "bg-gray-50 text-gray-500 border-gray-100"
                          )}
                        >
                          {presence.online ? (
                            <>
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                              </span>
                              <Wifi size={11} />
                              Online
                            </>
                          ) : (
                            <>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-gray-300" />
                              <WifiOff size={11} />
                              Offline
                            </>
                          )}
                        </span>
                        {presence.lastSeenText && (
                          <span className="text-[9px] text-gray-400 font-semibold flex items-center gap-1 ml-1">
                            <Clock size={9} />
                            {presence.lastSeenText}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-8 py-5 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleOpenModal(t)}
                          className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-all border border-transparent hover:border-gray-100"
                        >
                          <Edit2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedTeacher ? "Edit Staff Profile" : "Register New Teacher"}
        maxWidth="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} loading={loading}>
              {selectedTeacher ? "Save Changes" : "Complete Registration"}
            </Button>
          </>
        }
      >
        <form className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="First Name"
              value={formData.firstName}
              onChange={(e) =>
                setFormData({ ...formData, firstName: e.target.value })
              }
              error={errors.firstName}
            />
            <Input
              label="Last Name"
              value={formData.lastName}
              onChange={(e) =>
                setFormData({ ...formData, lastName: e.target.value })
              }
              error={errors.lastName}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Work Email"
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              error={errors.email}
            />
            <Input
              label="Contact Number"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              error={errors.phone}
            />
          </div>
          <Input
            label="Primary Subject"
            placeholder="e.g. Mathematics"
            value={formData.subject}
            onChange={(e) =>
              setFormData({ ...formData, subject: e.target.value })
            }
            error={errors.subject}
          />

          <div className="space-y-3">
            <label className="text-xs font-black text-gray-400 uppercase tracking-widest">
              Assign Classes
            </label>
            <div className="grid grid-cols-4 gap-2">
              {classesList.map((cls) => (
                <button
                  key={cls._id}
                  type="button"
                  onClick={() => handleClassToggle(cls.name)}
                  className={cn(
                    "px-3 py-2 rounded-xl text-xs font-bold border transition-all text-center truncate",
                    formData.assignedClasses.includes(cls.name)
                      ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100"
                      : "bg-gray-50 border-gray-100 text-gray-500 hover:border-indigo-200",
                  )}
                  title={`${cls.name} (${cls.section || ""})`}
                >
                  {cls.name}
                </button>
              ))}
              {classesList.length === 0 && (
                <p className="col-span-4 text-[10px] text-gray-400 italic">
                  No classes found. Create classes first.
                </p>
              )}
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default TeacherManagement;
