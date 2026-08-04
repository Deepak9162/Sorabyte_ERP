import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Search,
  Eye,
  Filter,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Edit2,
  Trash2,
  Send,
  FileText,
  UserCheck,
} from "lucide-react";
import Button from "../../components/ui/Button";
import Skeleton, { TableSkeleton } from "../../components/ui/Skeleton";
import EmptyState from "../../components/ui/EmptyState";
import ConfirmModal from "../../components/ui/ConfirmModal";
import { useToast } from "../../context/ToastContext";
import { cn } from "../../utils/cn";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";

const AdmissionRequestList = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [requests, setRequests] = useState([]);
  const [stats, setStats] = useState({
    pending: 0,
    underReview: 0,
    approved: 0,
    rejected: 0,
    today: 0,
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isSubmitOpen, setIsSubmitOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);

  // Filters & Search
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [classFilter, setClassFilter] = useState("all");
  const [sortBy, setSortBy] = useState("latest");

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Available classes for filters (static list matching school levels)
  const classesList = [
    "Nursery",
    "LKG",
    "UKG",
    "1st",
    "2nd",
    "3rd",
    "4th",
    "5th",
    "6th",
    "7th",
    "8th",
    "9th",
    "10th",
    "11th",
    "12th",
  ];

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: 10,
        sort: sortBy,
      };

      if (search.trim()) params.search = search;
      if (statusFilter !== "all") params.status = statusFilter;
      if (classFilter !== "all") params.admissionClass = classFilter;

      const res = await api.get("/admission-requests", { params });
      if (res.data.success) {
        setRequests(res.data.data.requests || []);
        setTotalCount(res.data.data.pagination.total);
        setTotalPages(res.data.data.pagination.pages);
      }
    } catch (err) {
      addToast(
        err.response?.data?.message || "Failed to fetch admission requests",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      // Fetch all requests without pagination limit to compute stats
      const res = await api.get("/admission-requests", {
        params: { limit: 10000 },
      });
      if (res.data.success) {
        const allReqs = res.data.data.requests || [];
        const todayStr = new Date().toDateString();

        const counts = allReqs.reduce(
          (acc, req) => {
            if (req.status === "Submitted") acc.pending++;
            else if (req.status === "Under Review") acc.underReview++;
            else if (req.status === "Approved") acc.approved++;
            else if (req.status === "Rejected") acc.rejected++;

            if (new Date(req.createdAt).toDateString() === todayStr) {
              acc.today++;
            }
            return acc;
          },
          { pending: 0, underReview: 0, approved: 0, rejected: 0, today: 0 },
        );

        setStats({
          ...counts,
          total: allReqs.length,
        });
      }
    } catch (err) {
      console.error("Failed to fetch dashboard stats", err);
    }
  };

  useEffect(() => {
    fetchRequests();
    if (user.role === "admin") {
      fetchStats();
    }
  }, [page, statusFilter, classFilter, sortBy]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchRequests();
  };

  const handleDeleteClick = (req) => {
    setSelectedRequest(req);
    setIsDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedRequest) return;
    try {
      const res = await api.delete(
        `/admission-requests/${selectedRequest._id}`,
      );
      if (res.data.success) {
        addToast("Admission request deleted successfully", "success");
        fetchRequests();
        if (user.role === "admin") fetchStats();
      }
    } catch (err) {
      addToast(
        err.response?.data?.message || "Failed to delete request",
        "error",
      );
    } finally {
      setIsDeleteOpen(false);
      setSelectedRequest(null);
    }
  };

  const handleSubmitClick = (req) => {
    setSelectedRequest(req);
    setIsSubmitOpen(true);
  };

  const handleConfirmSubmit = async () => {
    if (!selectedRequest) return;
    try {
      const res = await api.post(
        `/admission-requests/${selectedRequest._id}/submit`,
      );
      if (res.data.success) {
        addToast("Admission request submitted for review", "success");
        fetchRequests();
        if (user.role === "admin") fetchStats();
      }
    } catch (err) {
      addToast(
        err.response?.data?.message || "Failed to submit request",
        "error",
      );
    } finally {
      setIsSubmitOpen(false);
      setSelectedRequest(null);
    }
  };

  const handleDuplicate = (req) => {
    // Navigate to create new request but passing state to duplicate
    navigate("/admissions/requests/new", { state: { duplicateData: req } });
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "Draft":
        return "bg-gray-100 text-gray-700 border-gray-200";
      case "Submitted":
        return "bg-blue-50 text-blue-700 border-blue-100";
      case "Under Review":
        return "bg-amber-50 text-amber-700 border-amber-100";
      case "Approved":
        return "bg-emerald-50 text-emerald-700 border-emerald-100";
      case "Rejected":
        return "bg-rose-50 text-rose-700 border-rose-100";
      case "Cancelled":
        return "bg-purple-50 text-purple-700 border-purple-100";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "Draft":
        return <FileText size={12} className="inline mr-1" />;
      case "Submitted":
        return <Clock size={12} className="inline mr-1" />;
      case "Under Review":
        return <AlertCircle size={12} className="inline mr-1 animate-pulse" />;
      case "Approved":
        return <CheckCircle2 size={12} className="inline mr-1" />;
      case "Rejected":
        return <XCircle size={12} className="inline mr-1" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Top Header Action Bar */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
          Admission Registry
        </h2>
        {user.role === "teacher" && (
          <button
            type="button"
            onClick={() => navigate("/admissions/requests/new")}
            className="px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-all active:scale-95 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>New Request</span>
          </button>
        )}
        {user.role === "admin" && (
          <button
            type="button"
            onClick={() => navigate("/admissions/requests/direct")}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-all active:scale-95 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>New Admission</span>
          </button>
        )}
      </div>

      {/* Compact Admin Stat Cards */}
      {user.role === "admin" && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Pending</span>
              <span className="text-lg font-black text-blue-600 leading-tight">{stats.pending}</span>
            </div>
            <div className="p-2 bg-blue-50 text-blue-500 rounded-xl shrink-0">
              <Clock size={16} />
            </div>
          </div>
          <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Under Review</span>
              <span className="text-lg font-black text-amber-600 leading-tight">{stats.underReview}</span>
            </div>
            <div className="p-2 bg-amber-50 text-amber-500 rounded-xl shrink-0">
              <AlertCircle size={16} />
            </div>
          </div>
          <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Approved</span>
              <span className="text-lg font-black text-emerald-600 leading-tight">{stats.approved}</span>
            </div>
            <div className="p-2 bg-emerald-50 text-emerald-500 rounded-xl shrink-0">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Rejected</span>
              <span className="text-lg font-black text-rose-600 leading-tight">{stats.rejected}</span>
            </div>
            <div className="p-2 bg-rose-50 text-rose-500 rounded-xl shrink-0">
              <XCircle size={16} />
            </div>
          </div>
        </div>
      )}

      {/* Lightweight Search & Filter Bar */}
      <div className="space-y-2.5">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search student, father, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white border border-slate-200/90 text-slate-900 text-xs sm:text-sm rounded-xl pl-9 pr-8 py-2 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 font-medium shadow-2xs transition-all h-10"
            />
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={15}
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setPage(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <XCircle size={14} />
              </button>
            )}
          </div>
          <button
            type="submit"
            className="px-4 h-10 rounded-xl bg-slate-900 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer hover:bg-slate-800 shrink-0 active:scale-95"
          >
            <span>Search</span>
          </button>
        </form>

        {/* Scrollable Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar select-none">
          {/* Status Select Chip */}
          <div className="relative shrink-0">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className={cn(
                "text-xs font-extrabold rounded-xl px-3 py-2 border appearance-none outline-none cursor-pointer shadow-2xs pr-7 transition-all min-h-[36px]",
                statusFilter !== "all"
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white text-slate-700 border-slate-200 hover:border-indigo-300"
              )}
            >
              <option value="all" className="bg-white text-slate-800">Status: All</option>
              <option value="Draft" className="bg-white text-slate-800">Draft</option>
              <option value="Submitted" className="bg-white text-slate-800">Submitted</option>
              <option value="Under Review" className="bg-white text-slate-800">Under Review</option>
              <option value="Approved" className="bg-white text-slate-800">Approved</option>
              <option value="Rejected" className="bg-white text-slate-800">Rejected</option>
            </select>
            <Filter className={cn("w-3 h-3 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none", statusFilter !== "all" ? "text-white" : "text-slate-400")} />
          </div>

          {/* Class Filter Chip */}
          <div className="relative shrink-0">
            <select
              value={classFilter}
              onChange={(e) => {
                setClassFilter(e.target.value);
                setPage(1);
              }}
              className={cn(
                "text-xs font-extrabold rounded-xl px-3 py-2 border appearance-none outline-none cursor-pointer shadow-2xs pr-7 transition-all min-h-[36px]",
                classFilter !== "all"
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white text-slate-700 border-slate-200 hover:border-indigo-300"
              )}
            >
              <option value="all" className="bg-white text-slate-800">Class: All</option>
              {classesList.map((c) => (
                <option key={c} value={c} className="bg-white text-slate-800">
                  {c}
                </option>
              ))}
            </select>
            <Filter className={cn("w-3 h-3 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none", classFilter !== "all" ? "text-white" : "text-slate-400")} />
          </div>

          {/* Sort Chip */}
          <div className="relative shrink-0">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-white text-slate-700 border border-slate-200 hover:border-indigo-300 text-xs font-extrabold rounded-xl px-3 py-2 appearance-none outline-none cursor-pointer shadow-2xs pr-7 transition-all min-h-[36px]"
            >
              <option value="latest" className="bg-white text-slate-800">Newest</option>
              <option value="oldest" className="bg-white text-slate-800">Oldest</option>
              <option value="alphabetical" className="bg-white text-slate-800">A-Z</option>
              <option value="status" className="bg-white text-slate-800">By Status</option>
            </select>
            <Filter className="w-3 h-3 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Grid / List Results */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {loading ? (
          <TableSkeleton rows={5} cols={6} />
        ) : requests.length === 0 ? (
          <EmptyState
            title="No admission requests found"
            description="Adjust your search query or create a new request form if you are a teacher."
          />
        ) : (
          <>
            {/* Desktop View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-150 bg-gray-50/30">
                    <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-wider">
                      Student Details
                    </th>
                    <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-wider">
                      Class Info
                    </th>
                    <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-wider">
                      Parent/Phone
                    </th>
                    {user.role === "admin" && (
                      <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-wider">
                        Submitted By
                      </th>
                    )}
                    <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-wider text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {requests.map((req) => (
                    <tr
                      key={req._id}
                      className="hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center font-black text-indigo-700 uppercase">
                            {req.studentInfo.fullName.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-black text-gray-900">
                              {req.studentInfo.fullName}
                            </p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">
                              {req.studentInfo.gender}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-gray-700">
                          Class {req.studentInfo.admissionClass}
                        </p>
                        {req.studentInfo.section && (
                          <p className="text-[10px] text-gray-400 font-bold mt-0.5">
                            Section: {req.studentInfo.section}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-semibold text-gray-700">
                          {req.parentInfo.fatherName}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {req.parentInfo.phone}
                        </p>
                      </td>
                      {user.role === "admin" && (
                        <td className="px-6 py-4">
                          <p className="text-sm font-semibold text-gray-700">
                            {req.teacher
                              ? `${req.teacher.firstName} ${req.teacher.lastName}`
                              : "System Admin"}
                          </p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
                            Teacher
                          </p>
                        </td>
                      )}
                      <td className="px-6 py-4 text-xs font-medium text-gray-500">
                        {new Date(req.createdAt).toLocaleDateString([], {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={cn(
                            "inline-flex items-center px-3 py-1 rounded-full text-xs font-black tracking-wide border",
                            getStatusBadgeClass(req.status),
                          )}
                        >
                          {getStatusIcon(req.status)}
                          {req.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end items-center gap-2">
                          {/* Always show View Details */}
                          <button
                            onClick={() =>
                              navigate(
                                `/admissions/requests/details/${req._id}`,
                              )
                            }
                            className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                            title="View Details"
                          >
                            <Eye size={18} />
                          </button>

                          {/* Teacher actions for draft */}
                          {user.role === "teacher" &&
                            req.status === "Draft" && (
                              <>
                                <button
                                  onClick={() => handleSubmitClick(req)}
                                  className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                  title="Submit Request"
                                >
                                  <Send size={18} />
                                </button>
                                <button
                                  onClick={() =>
                                    navigate(
                                      `/admissions/requests/edit/${req._id}`,
                                    )
                                  }
                                  className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all"
                                  title="Edit Request"
                                >
                                  <Edit2 size={18} />
                                </button>
                                <button
                                  onClick={() => handleDeleteClick(req)}
                                  className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                                  title="Delete Draft"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </>
                            )}

                          {/* Teacher action duplicate on rejected */}
                          {user.role === "teacher" &&
                            req.status === "Rejected" && (
                              <button
                                onClick={() => handleDuplicate(req)}
                                className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                                title="Duplicate & Re-apply"
                              >
                                <UserCheck size={18} />
                              </button>
                            )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile View */}
            <div className="md:hidden divide-y divide-gray-150">
              {requests.map((req) => (
                <div key={req._id} className="p-4 space-y-3 bg-white">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-indigo-50 border border-indigo-100 rounded-lg flex items-center justify-center font-black text-indigo-700 uppercase text-xs">
                        {req.studentInfo.fullName.charAt(0)}
                      </div>
                      <div>
                        <h5 className="font-black text-gray-900 text-sm">
                          {req.studentInfo.fullName}
                        </h5>
                        <p className="text-[10px] text-gray-450 font-bold uppercase tracking-wider mt-0.5">
                          Class {req.studentInfo.admissionClass} •{" "}
                          {req.studentInfo.gender}
                        </p>
                      </div>
                    </div>
                    <span
                      className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black tracking-wide border uppercase",
                        getStatusBadgeClass(req.status),
                      )}
                    >
                      {getStatusIcon(req.status)}
                      {req.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs border-t border-gray-50 pt-2 text-gray-600">
                    <div>
                      <span className="text-[9px] text-gray-400 uppercase font-bold block">
                        Parent
                      </span>
                      <span className="font-bold text-gray-800">
                        {req.parentInfo.fatherName}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-gray-400 uppercase font-bold block">
                        Phone
                      </span>
                      <span className="font-bold text-gray-800">
                        {req.parentInfo.phone}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-gray-400 uppercase font-bold block">
                        Applied Date
                      </span>
                      <span className="font-bold text-gray-800">
                        {new Date(req.createdAt).toLocaleDateString([], {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    {user.role === "admin" && (
                      <div>
                        <span className="text-[9px] text-gray-400 uppercase font-bold block">
                          Submitted By
                        </span>
                        <span className="font-bold text-gray-800 truncate block">
                          {req.teacher
                            ? `${req.teacher.firstName} ${req.teacher.lastName.charAt(0)}.`
                            : "System Admin"}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-1.5 pt-2 border-t border-gray-50">
                    <button
                      onClick={() =>
                        navigate(`/admissions/requests/details/${req._id}`)
                      }
                      className="h-9 px-3 text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-750 rounded-lg flex items-center gap-1.5 font-bold transition-all cursor-pointer border border-indigo-100/50"
                    >
                      <Eye size={14} />
                      View
                    </button>
                    {user.role === "teacher" && req.status === "Draft" && (
                      <>
                        <button
                          onClick={() => handleSubmitClick(req)}
                          className="h-9 px-3 text-xs bg-blue-50 hover:bg-blue-100 text-blue-750 rounded-lg flex items-center gap-1.5 font-bold transition-all cursor-pointer border border-blue-100/50"
                        >
                          <Send size={14} />
                          Submit
                        </button>
                        <button
                          onClick={() =>
                            navigate(`/admissions/requests/edit/${req._id}`)
                          }
                          className="h-9 px-3 text-xs bg-amber-50 hover:bg-amber-100 text-amber-750 rounded-lg flex items-center gap-1.5 font-bold transition-all cursor-pointer border border-amber-100/50"
                        >
                          <Edit2 size={14} />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteClick(req)}
                          className="h-9 w-9 text-xs bg-rose-50 hover:bg-rose-100 text-rose-750 rounded-lg flex items-center justify-center font-bold transition-all cursor-pointer border border-rose-100/50"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                    {user.role === "teacher" && req.status === "Rejected" && (
                      <button
                        onClick={() => handleDuplicate(req)}
                        className="h-9 px-3 text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-755 rounded-lg flex items-center gap-1.5 font-bold transition-all cursor-pointer border border-emerald-100/50"
                      >
                        <UserCheck size={14} />
                        Re-apply
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-500 font-bold">
              Showing {(page - 1) * 10 + 1} to {Math.min(page * 10, totalCount)}{" "}
              of {totalCount} requests
            </span>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                className="rounded-xl px-4 py-2 font-black text-xs uppercase"
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                className="rounded-xl px-4 py-2 font-black text-xs uppercase"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modals */}
      <ConfirmModal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Admission Draft"
        message="Are you sure you want to delete this admission request draft? This action is permanent and cannot be undone."
        confirmText="Delete"
        variant="danger"
      />

      <ConfirmModal
        isOpen={isSubmitOpen}
        onClose={() => setIsSubmitOpen(false)}
        onConfirm={handleConfirmSubmit}
        title="Submit Admission Request"
        message="Are you sure you want to submit this admission request for review? Once submitted, the Admin will review and process this student enrolment request."
        confirmText="Submit"
        variant="primary"
      />
    </div>
  );
};

export default AdmissionRequestList;
