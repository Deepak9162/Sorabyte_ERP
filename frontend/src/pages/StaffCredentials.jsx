import React, { useState, useEffect, useCallback } from "react";
import {
  KeyRound,
  Search,
  RefreshCw,
  Copy,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
  UserCheck,
  UserX,
  Lock,
  Wifi,
  WifiOff,
  Clock,
} from "lucide-react";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Modal from "../components/ui/Modal";
import { TableSkeleton } from "../components/ui/Skeleton";
import EmptyState from "../components/ui/EmptyState";
import { useToast } from "../context/ToastContext";
import { cn } from "../utils/cn";
import api from "../services/api";

const StaffCredentials = () => {
  const { addToast } = useToast();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [lastRefreshed, setLastRefreshed] = useState(null);
  
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fetchStaffCredentials = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.get("/admin/staff-credentials");
      if (res.data.success) {
        setStaff(res.data.data || []);
        setLastRefreshed(new Date());
      }
    } catch (error) {
      console.error("Failed to fetch staff credentials:", error);
      if (!silent) addToast("Failed to load staff credentials data", "error");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchStaffCredentials();
    // ── Auto-refresh every 30 seconds for live online status
    const interval = setInterval(() => fetchStaffCredentials(true), 30_000);
    return () => clearInterval(interval);
  }, [fetchStaffCredentials]);

  // Mixed password generator (letters, numbers, special characters)
  const handleGeneratePassword = () => {
    const lowercase = "abcdefghijklmnopqrstuvwxyz";
    const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const numbers = "0123456789";
    const symbols = "!@#$%^&*()_+=-{}[]|:;?><";
    
    let password = "";
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];
    
    const allChars = lowercase + uppercase + numbers + symbols;
    for (let i = 0; i < 8; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }
    
    // Shuffle the character array for randomness
    const shuffled = password.split('').sort(() => 0.5 - Math.random()).join('');
    setNewPassword(shuffled);
    setIsCopied(false);
  };

  const handleOpenResetModal = (teacher) => {
    setSelectedTeacher(teacher);
    setNewPassword("");
    setShowPassword(true);
    setIsCopied(false);
    setIsResetModalOpen(true);
  };

  const handleCopyPassword = () => {
    if (!newPassword) return;
    navigator.clipboard.writeText(newPassword);
    setIsCopied(true);
    addToast("Password copied to clipboard", "success");
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleResetPasswordSubmit = async () => {
    if (!selectedTeacher || !newPassword) return;
    if (newPassword.length < 6) {
      addToast("Password must be at least 6 characters", "error");
      return;
    }

    setIsSaving(true);
    try {
      const res = await api.post("/admin/staff-credentials/reset-password", {
        teacherId: selectedTeacher._id,
        newPassword: newPassword,
      });

      if (res.data.success) {
        addToast(`Credentials updated for ${selectedTeacher.firstName}`, "success");
        setIsResetModalOpen(false);
        fetchStaffCredentials();
      }
    } catch (error) {
      console.error("Failed to reset password:", error);
      const message = error.response?.data?.message || "Failed to update password";
      addToast(message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  // ── Helper: determine if teacher is truly online
  // Consider online if isOnline=true AND lastSeen within last 3 minutes
  const getOnlineStatus = (userObj) => {
    if (!userObj) return { online: false, label: "No Account", lastSeenText: null };
    if (!userObj.isOnline) {
      const lastSeenText = userObj.lastSeen
        ? getLastSeenText(userObj.lastSeen)
        : null;
      return { online: false, label: "Offline", lastSeenText };
    }
    // isOnline=true — verify lastSeen is recent (within 5 minutes)
    const threshold = 5 * 60 * 1000; // 5 minutes
    const diff = userObj.lastSeen ? Date.now() - new Date(userObj.lastSeen).getTime() : Infinity;
    if (diff > threshold) {
      return { online: false, label: "Offline", lastSeenText: getLastSeenText(userObj.lastSeen) };
    }
    return { online: true, label: "Online", lastSeenText: "Active now" };
  };

  const getLastSeenText = (lastSeen) => {
    if (!lastSeen) return null;
    const diff = Math.floor((Date.now() - new Date(lastSeen).getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return new Date(lastSeen).toLocaleDateString();
  };

  const filteredStaff = staff.filter((s) => {
    const fullName = `${s.firstName} ${s.lastName}`.toLowerCase();
    const email = (s.email || "").toLowerCase();
    const query = searchQuery.toLowerCase();
    return fullName.includes(query) || email.includes(query) || (s.subject && s.subject.toLowerCase().includes(query));
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <KeyRound size={28} className="text-indigo-600" />
            Credentials Manager
          </h2>
          <p className="text-gray-500 font-medium italic mt-1">
            Manage teacher system logins. Live online status updates every 30 seconds.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastRefreshed && (
            <span className="text-[10px] text-gray-400 font-bold flex items-center gap-1">
              <Clock size={11} />
              Refreshed {getLastSeenText(lastRefreshed)}
            </span>
          )}
          <button
            onClick={() => fetchStaffCredentials()}
            className="p-2.5 bg-gray-50 hover:bg-indigo-50 text-gray-400 hover:text-indigo-600 border border-gray-100 rounded-xl transition-all"
            title="Refresh now"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-4">
        <div className="relative group max-w-xl">
          <Search
            className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors"
            size={18}
          />
          <input
            type="text"
            placeholder="Search by name, email/User ID, or subject..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-13 pr-5 py-3.5 bg-gray-50/50 border border-gray-100 rounded-2xl text-sm font-semibold focus:ring-4 focus:ring-indigo-50/50 focus:bg-white outline-none transition-all"
          />
        </div>
      </div>

      {/* main Grid Table */}
      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden min-h-[400px] flex flex-col justify-between">
        <div className="flex-1">
          {loading ? (
            <div className="p-8">
              <TableSkeleton rows={6} columns={5} />
            </div>
          ) : filteredStaff.length === 0 ? (
            <EmptyState
              title="No staff records found"
              description={
                searchQuery
                  ? `No records matched your search query "${searchQuery}"`
                  : "Start enrolling staff members to manage credentials."
              }
              actionLabel={searchQuery ? "Clear Search" : "Manage Staff Profiles"}
              onAction={() => (searchQuery ? setSearchQuery("") : window.location.href = "/teachers")}
            />
          ) : (
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100">
                    <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-wider">
                      Staff Member
                    </th>
                    <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-wider">
                      User ID / Email
                    </th>
                    <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-wider">
                      Access Role
                    </th>
                    <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-wider">
                      Account Status
                    </th>
                    <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-wider">
                      Online Presence
                    </th>
                    <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-wider text-right">
                      Credentials Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredStaff.map((teacher) => {
                    const isLinked = !!teacher.user;
                    const isActive = isLinked ? teacher.user.isActive : false;
                    const presence = getOnlineStatus(teacher.user);

                    return (
                      <tr
                        key={teacher._id}
                        className="group hover:bg-gray-50/50 transition-all duration-300"
                      >
                        <td className="px-8 py-4.5">
                          <div className="flex items-center gap-4">
                            {/* Avatar with online indicator dot */}
                            <div className="relative shrink-0">
                              <div className="w-11 h-11 bg-indigo-50 text-indigo-700 rounded-xl flex items-center justify-center font-black shadow-inner uppercase">
                                {teacher.firstName ? teacher.firstName.charAt(0) : "T"}
                                {teacher.lastName ? teacher.lastName.charAt(0) : "S"}
                              </div>
                              {/* Online indicator dot on avatar */}
                              <span
                                className={cn(
                                  "absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white",
                                  presence.online
                                    ? "bg-emerald-500"
                                    : "bg-gray-300"
                                )}
                              />
                              {presence.online && (
                                <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-400 animate-ping opacity-75" />
                              )}
                            </div>
                            <div>
                              <p className="font-bold text-gray-900 capitalize">
                                {teacher.firstName} {teacher.lastName}
                              </p>
                              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">
                                Subject: {teacher.subject || "N/A"}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-4.5">
                          <span className="font-semibold text-xs text-gray-700 font-mono bg-gray-50 border border-gray-100 px-2.5 py-1 rounded-lg">
                            {teacher.email}
                          </span>
                        </td>
                        <td className="px-8 py-4.5">
                          <span className="px-3 py-1 bg-indigo-50/50 text-indigo-700 rounded-lg text-[10px] font-bold uppercase border border-indigo-100/30">
                            Teacher Role
                          </span>
                        </td>
                        <td className="px-8 py-4.5">
                          {isLinked ? (
                            <span
                              className={cn(
                                "px-3 py-1 rounded-full text-[10px] font-bold uppercase inline-flex items-center gap-1.5 border",
                                isActive
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                  : "bg-rose-50 text-rose-700 border-rose-100"
                              )}
                            >
                              <span
                                className={cn(
                                  "w-1.5 h-1.5 rounded-full",
                                  isActive ? "bg-emerald-500" : "bg-rose-500"
                                )}
                              />
                              {isActive ? "ACTIVE LOGIN" : "DEACTIVATED"}
                            </span>
                          ) : (
                            <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase inline-flex items-center gap-1.5 border bg-amber-50 text-amber-700 border-amber-100">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              LOGIN NOT GENERATED
                            </span>
                          )}
                        </td>

                        {/* ── Real-time Online Presence Column */}
                        <td className="px-8 py-4.5">
                          <div className="flex flex-col gap-1">
                            <span
                              className={cn(
                                "inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border w-fit",
                                presence.online
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-100/80"
                                  : isLinked
                                  ? "bg-gray-50 text-gray-500 border-gray-100"
                                  : "bg-gray-50 text-gray-400 border-gray-100"
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
                                  <span className="relative flex h-2 w-2">
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-gray-400" />
                                  </span>
                                  <WifiOff size={11} />
                                  {isLinked ? "Offline" : "—"}
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

                        <td className="px-8 py-4.5 text-right">
                          <Button
                            variant="secondary"
                            onClick={() => handleOpenResetModal(teacher)}
                            icon={Lock}
                            className="text-xs px-4 py-2 border-indigo-100 hover:bg-indigo-50/40 text-indigo-600 rounded-xl"
                          >
                            {!isLinked ? "Generate Access" : "Reset Password"}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Reset/Generate Modal */}
      <Modal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        title={selectedTeacher && !selectedTeacher.user ? `Generate Access for ${selectedTeacher.firstName}` : `Reset Password for ${selectedTeacher?.firstName}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsResetModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleResetPasswordSubmit}
              loading={isSaving}
              disabled={!newPassword}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              Update Credentials
            </Button>
          </>
        }
      >
        <div className="space-y-6 py-2">
          {selectedTeacher && (
            <div className="bg-indigo-50/40 border border-indigo-100/50 rounded-2xl p-4 space-y-2">
              <p className="text-xs text-indigo-700 font-bold uppercase tracking-wide">User Account Info</p>
              <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-gray-600">
                <div>
                  <span className="text-gray-400">Full Name:</span>
                  <p className="text-gray-800 font-bold text-sm mt-0.5">{selectedTeacher.firstName} {selectedTeacher.lastName}</p>
                </div>
                <div>
                  <span className="text-gray-400">Login ID / Email:</span>
                  <p className="text-gray-800 font-bold text-sm mt-0.5 font-mono">{selectedTeacher.email}</p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                New Secure Password
              </label>
              <button
                type="button"
                onClick={handleGeneratePassword}
                className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 active:scale-95 transition-transform"
              >
                <RefreshCw size={11} /> Auto-Generate Mixed Password
              </button>
            </div>
            
            <div className="relative group">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter password or auto-generate..."
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setIsCopied(false);
                }}
                className="w-full pl-5 pr-28 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-semibold outline-none focus:ring-4 focus:ring-indigo-100 transition-all font-mono"
              />
              
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1.5 text-gray-400 hover:text-indigo-600 transition-colors"
                  title={showPassword ? "Hide Password" : "Show Password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
                {newPassword && (
                  <button
                    type="button"
                    onClick={handleCopyPassword}
                    className="p-1.5 text-gray-400 hover:text-indigo-600 transition-colors"
                    title="Copy Password"
                  >
                    <Copy size={16} />
                  </button>
                )}
              </div>
            </div>
            <p className="text-[10px] text-gray-400 font-medium ml-1">
              * The auto-generated password will contain a mixture of letters, numbers, and symbols. Minimum length: 6 characters.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default StaffCredentials;
