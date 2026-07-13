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
  UserCheck
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
    total: 0
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
  const classesList = ["Nursery", "LKG", "UKG", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th", "11th", "12th"];

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: 10,
        sort: sortBy
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
      addToast(err.response?.data?.message || "Failed to fetch admission requests", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      // Fetch all requests without pagination limit to compute stats
      const res = await api.get("/admission-requests", { params: { limit: 10000 } });
      if (res.data.success) {
        const allReqs = res.data.data.requests || [];
        const todayStr = new Date().toDateString();
        
        const counts = allReqs.reduce((acc, req) => {
          if (req.status === 'Submitted') acc.pending++;
          else if (req.status === 'Under Review') acc.underReview++;
          else if (req.status === 'Approved') acc.approved++;
          else if (req.status === 'Rejected') acc.rejected++;
          
          if (new Date(req.createdAt).toDateString() === todayStr) {
            acc.today++;
          }
          return acc;
        }, { pending: 0, underReview: 0, approved: 0, rejected: 0, today: 0 });

        setStats({
          ...counts,
          total: allReqs.length
        });
      }
    } catch (err) {
      console.error("Failed to fetch dashboard stats", err);
    }
  };

  useEffect(() => {
    fetchRequests();
    if (user.role === 'admin') {
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
      const res = await api.delete(`/admission-requests/${selectedRequest._id}`);
      if (res.data.success) {
        addToast("Admission request deleted successfully", "success");
        fetchRequests();
        if (user.role === 'admin') fetchStats();
      }
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to delete request", "error");
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
      const res = await api.post(`/admission-requests/${selectedRequest._id}/submit`);
      if (res.data.success) {
        addToast("Admission request submitted for review", "success");
        fetchRequests();
        if (user.role === 'admin') fetchStats();
      }
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to submit request", "error");
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
      case "Draft": return "bg-gray-100 text-gray-700 border-gray-200";
      case "Submitted": return "bg-blue-50 text-blue-700 border-blue-100";
      case "Under Review": return "bg-amber-50 text-amber-700 border-amber-100";
      case "Approved": return "bg-emerald-50 text-emerald-700 border-emerald-100";
      case "Rejected": return "bg-rose-50 text-rose-700 border-rose-100";
      case "Cancelled": return "bg-purple-50 text-purple-700 border-purple-100";
      default: return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "Draft": return <FileText size={12} className="inline mr-1" />;
      case "Submitted": return <Clock size={12} className="inline mr-1" />;
      case "Under Review": return <AlertCircle size={12} className="inline mr-1 animate-pulse" />;
      case "Approved": return <CheckCircle2 size={12} className="inline mr-1" />;
      case "Rejected": return <XCircle size={12} className="inline mr-1" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-8 p-1 sm:p-2">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-[2rem] border border-gray-200 shadow-sm">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
            Admission Registry
          </h2>
          <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mt-1">
            {user.role === 'admin' ? "Manage and Enrol Students" : "Submit New Admission Requests"}
          </p>
        </div>
        {user.role === 'teacher' && (
          <Button
            onClick={() => navigate("/admissions/requests/new")}
            className="rounded-2xl px-5 py-3 shadow-lg shadow-indigo-100 flex items-center gap-2 hover:scale-[1.02]"
          >
            <Plus size={18} />
            New Request
          </Button>
        )}
      </div>

      {/* Admin Stat Cards */}
      {user.role === 'admin' && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white p-6 rounded-[2.2rem] border border-gray-150 shadow-sm flex flex-col justify-between">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pending</span>
            <div className="flex items-end justify-between mt-4">
              <span className="text-2xl sm:text-3xl font-black text-blue-600">{stats.pending}</span>
              <div className="p-2.5 bg-blue-50 text-blue-500 rounded-2xl"><Clock size={20} /></div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-[2.2rem] border border-gray-150 shadow-sm flex flex-col justify-between">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Under Review</span>
            <div className="flex items-end justify-between mt-4">
              <span className="text-2xl sm:text-3xl font-black text-amber-600">{stats.underReview}</span>
              <div className="p-2.5 bg-amber-50 text-amber-500 rounded-2xl"><AlertCircle size={20} /></div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-[2.2rem] border border-gray-150 shadow-sm flex flex-col justify-between">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Approved</span>
            <div className="flex items-end justify-between mt-4">
              <span className="text-2xl sm:text-3xl font-black text-emerald-600">{stats.approved}</span>
              <div className="p-2.5 bg-emerald-50 text-emerald-500 rounded-2xl"><CheckCircle2 size={20} /></div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-[2.2rem] border border-gray-150 shadow-sm flex flex-col justify-between">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Rejected</span>
            <div className="flex items-end justify-between mt-4">
              <span className="text-2xl sm:text-3xl font-black text-rose-600">{stats.rejected}</span>
              <div className="p-2.5 bg-rose-50 text-rose-500 rounded-2xl"><XCircle size={20} /></div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-[2.2rem] border border-gray-150 shadow-sm flex flex-col justify-between col-span-2 lg:col-span-1">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Today's Total</span>
            <div className="flex items-end justify-between mt-4">
              <span className="text-2xl sm:text-3xl font-black text-indigo-600">{stats.today}</span>
              <div className="p-2.5 bg-indigo-50 text-indigo-500 rounded-2xl"><Calendar size={20} /></div>
            </div>
          </div>
        </div>
      )}

      {/* Filters Bar */}
      <div className="bg-white p-6 rounded-[2rem] border border-gray-200 shadow-sm space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search by Student Name, Father Name, or Phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-2xl pl-12 pr-4 py-3 outline-none focus:bg-white focus:border-indigo-600 transition-all font-semibold"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          </div>

          <div className="flex flex-wrap gap-3">
            {/* Status Filter */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                className="bg-gray-50 border border-gray-200 text-gray-700 text-xs font-black uppercase tracking-wider rounded-2xl pl-4 pr-10 py-3 appearance-none outline-none cursor-pointer focus:bg-white focus:border-indigo-600"
              >
                <option value="all">Status: All</option>
                <option value="Draft">Draft</option>
                <option value="Submitted">Submitted</option>
                <option value="Under Review">Under Review</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>
              <Filter className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
            </div>

            {/* Class Filter */}
            <div className="relative">
              <select
                value={classFilter}
                onChange={(e) => { setClassFilter(e.target.value); setPage(1); }}
                className="bg-gray-50 border border-gray-200 text-gray-700 text-xs font-black uppercase tracking-wider rounded-2xl pl-4 pr-10 py-3 appearance-none outline-none cursor-pointer focus:bg-white focus:border-indigo-600"
              >
                <option value="all">Class: All</option>
                {classesList.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <Filter className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
            </div>

            {/* Sort */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-gray-50 border border-gray-200 text-gray-700 text-xs font-black uppercase tracking-wider rounded-2xl pl-4 pr-10 py-3 appearance-none outline-none cursor-pointer focus:bg-white focus:border-indigo-600"
              >
                <option value="latest">Sort: Newest</option>
                <option value="oldest">Sort: Oldest</option>
                <option value="alphabetical">Sort: A-Z</option>
                <option value="status">Sort: Status</option>
              </select>
              <Filter className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
            </div>
            
            <Button type="submit" variant="secondary" className="rounded-2xl px-5 py-3 font-black text-xs uppercase tracking-widest border border-gray-200">
              Apply
            </Button>
          </div>
        </form>
      </div>

      {/* Grid / List Results */}
      <div className="bg-white rounded-[2rem] border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <TableSkeleton rows={5} cols={6} />
        ) : requests.length === 0 ? (
          <EmptyState
            title="No admission requests found"
            description="Adjust your search query or create a new request form if you are a teacher."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-150 bg-gray-55/30">
                  <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-wider">Student Details</th>
                  <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-wider">Class Info</th>
                  <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-wider">Parent/Phone</th>
                  {user.role === 'admin' && (
                    <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-wider">Submitted By</th>
                  )}
                  <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {requests.map((req) => (
                  <tr key={req._id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center font-black text-indigo-700 uppercase">
                          {req.studentInfo.fullName.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-black text-gray-900">{req.studentInfo.fullName}</p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">{req.studentInfo.gender}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-gray-700">Class {req.studentInfo.admissionClass}</p>
                      {req.studentInfo.section && (
                        <p className="text-[10px] text-gray-400 font-bold mt-0.5">Section: {req.studentInfo.section}</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-semibold text-gray-700">{req.parentInfo.fatherName}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{req.parentInfo.phone}</p>
                    </td>
                    {user.role === 'admin' && (
                      <td className="px-6 py-4">
                        <p className="text-sm font-semibold text-gray-700">
                          {req.teacher ? `${req.teacher.firstName} ${req.teacher.lastName}` : "System Admin"}
                        </p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Teacher</p>
                      </td>
                    )}
                    <td className="px-6 py-4 text-xs font-medium text-gray-500">
                      {new Date(req.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "inline-flex items-center px-3 py-1 rounded-full text-xs font-black tracking-wide border",
                        getStatusBadgeClass(req.status)
                      )}>
                        {getStatusIcon(req.status)}
                        {req.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end items-center gap-2">
                        {/* Always show View Details */}
                        <button
                          onClick={() => navigate(`/admissions/requests/details/${req._id}`)}
                          className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                          title="View Details"
                        >
                          <Eye size={18} />
                        </button>

                        {/* Teacher actions for draft */}
                        {user.role === 'teacher' && req.status === 'Draft' && (
                          <>
                            <button
                              onClick={() => handleSubmitClick(req)}
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                              title="Submit Request"
                            >
                              <Send size={18} />
                            </button>
                            <button
                              onClick={() => navigate(`/admissions/requests/edit/${req._id}`)}
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
                        {user.role === 'teacher' && req.status === 'Rejected' && (
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
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-500 font-bold">
              Showing {(page - 1) * 10 + 1} to {Math.min(page * 10, totalCount)} of {totalCount} requests
            </span>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(p - 1, 1))}
                className="rounded-xl px-4 py-2 font-black text-xs uppercase"
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                disabled={page === totalPages}
                onClick={() => setPage(p => Math.min(p + 1, totalPages))}
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
