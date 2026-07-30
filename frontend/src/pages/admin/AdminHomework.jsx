import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  XCircle,
  ShieldCheck,
  Calendar,
  CheckSquare,
  Square,
  Eye,
  FileText,
  Paperclip,
  Check,
  RefreshCw,
  Copy,
  FileDown
} from 'lucide-react';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import ConsolidatedHomeworkCard from '../../components/homework/ConsolidatedHomeworkCard';
import ApprovalHistoryModal from '../../components/homework/ApprovalHistoryModal';
import { useToast } from '../../context/ToastContext';
import homeworkApi from '../../services/homeworkApi';
import api from '../../services/api';

const AdminHomework = () => {
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState('consolidated'); // 'consolidated' | 'submissions'

  // Master Data
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);

  // Stats
  const [stats, setStats] = useState({
    pendingIncharge: 0,
    pendingAdmin: 0,
    totalPending: 0,
    approvedToday: 0,
    rejected: 0,
    total: 0,
  });

  // Consolidated View State
  const [consClassId, setConsClassId] = useState('');
  const [consSection, setConsSection] = useState('');
  const [consDate, setConsDate] = useState(new Date().toISOString().split('T')[0]);
  const [consolidatedData, setConsolidatedData] = useState(null);
  const [loadingCons, setLoadingCons] = useState(false);

  // Submissions Workspace State
  const [homeworks, setHomeworks] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);

  // Submissions Filters
  const [filterClass, setFilterClass] = useState('');
  const [filterTeacher, setFilterTeacher] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [datePreset, setDatePreset] = useState('all'); // 'today', 'yesterday', 'this_week', 'custom', 'all'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [search, setSearch] = useState('');

  // Selection & Bulk Actions
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkActioning, setBulkActioning] = useState(false);

  // Audit History Modal
  const [selectedHistoryHomework, setSelectedHistoryHomework] = useState(null);

  // Reject Modal
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectHomeworkId, setRejectHomeworkId] = useState(null);
  const [rejectRemarks, setRejectRemarks] = useState('');

  useEffect(() => {
    fetchMasterData();
    fetchDashboardSummary();
  }, []);

  useEffect(() => {
    if (classes.length > 0 && !consClassId) {
      setConsClassId(classes[0]._id);
      setConsSection(classes[0].section || '');
    }
  }, [classes]);

  useEffect(() => {
    if (activeTab === 'consolidated' && consClassId) {
      fetchConsolidatedHomework();
    } else if (activeTab === 'submissions') {
      fetchAdminSubmissions();
    }
  }, [activeTab, consClassId, consSection, consDate, filterClass, filterTeacher, filterSubject, filterStatus, datePreset, startDate, endDate, search, pagination.page]);

  const fetchMasterData = async () => {
    try {
      const [clsRes, tchRes, subRes] = await Promise.all([
        api.get('/admin/classes'),
        api.get('/teachers'),
        api.get('/admin/academic/subjects'),
      ]);
      if (clsRes.data.success) setClasses(clsRes.data.data);
      if (tchRes.data.success) setTeachers(tchRes.data.data.teachers || []);
      if (subRes.data.success) setSubjects(subRes.data.data);
    } catch (err) {
      console.error('Failed to fetch master data', err);
    }
  };

  const fetchDashboardSummary = async () => {
    try {
      const res = await homeworkApi.getDashboardSummary();
      if (res.success) setStats(res.data);
    } catch (err) {
      console.error('Failed to fetch summary stats', err);
    }
  };

  const fetchConsolidatedHomework = async () => {
    if (!consClassId) return;
    setLoadingCons(true);
    try {
      const res = await homeworkApi.getConsolidatedHomework({
        classId: consClassId,
        section: consSection,
        date: consDate,
      });
      if (res.success) {
        setConsolidatedData(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch consolidated homework', err);
    } finally {
      setLoadingCons(false);
    }
  };

  const fetchAdminSubmissions = async () => {
    setLoadingSubmissions(true);

    let start = startDate;
    let end = endDate;

    if (datePreset === 'today') {
      start = new Date().toISOString().split('T')[0];
      end = new Date().toISOString().split('T')[0];
    } else if (datePreset === 'yesterday') {
      const y = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      start = y;
      end = y;
    } else if (datePreset === 'this_week') {
      const curr = new Date();
      const first = curr.getDate() - curr.getDay();
      start = new Date(curr.setDate(first)).toISOString().split('T')[0];
      end = new Date().toISOString().split('T')[0];
    }

    try {
      const res = await homeworkApi.getAllAdminHomework({
        page: pagination.page,
        limit: 15,
        classId: filterClass,
        teacherId: filterTeacher,
        subjectId: filterSubject,
        status: filterStatus,
        startDate: start,
        endDate: end,
        search,
      });

      if (res.success) {
        setHomeworks(res.data.homeworks);
        setPagination(res.data.pagination);
        setSelectedIds([]);
      }
    } catch (err) {
      console.error('Failed to fetch submissions', err);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const handleAdminApprove = async (id) => {
    try {
      await homeworkApi.adminReview(id, { action: 'approve', remarks: 'Final Approved by Admin' });
      addToast('Homework Final Approved by Admin!', 'success');
      fetchAdminSubmissions();
      fetchDashboardSummary();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to approve homework', 'error');
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectHomeworkId) return;
    try {
      await homeworkApi.adminReview(rejectHomeworkId, { action: 'reject', remarks: rejectRemarks });
      addToast('Homework rejected by Admin', 'info');
      setRejectModalOpen(false);
      fetchAdminSubmissions();
      fetchDashboardSummary();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to reject homework', 'error');
    }
  };

  const handleBulkAction = async (action) => {
    if (selectedIds.length === 0) {
      addToast('Please select at least one homework item.', 'error');
      return;
    }

    setBulkActioning(true);
    try {
      await homeworkApi.adminBulkReview({
        homeworkIds: selectedIds,
        action,
        remarks: `Bulk ${action} by Admin`,
      });
      addToast(`Selected ${selectedIds.length} homework items ${action === 'approve' ? 'Final Approved' : 'Rejected'}!`, 'success');
      setSelectedIds([]);
      fetchAdminSubmissions();
      fetchDashboardSummary();
    } catch (err) {
      addToast(err.response?.data?.message || `Failed to bulk ${action}`, 'error');
    } finally {
      setBulkActioning(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === homeworks.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(homeworks.map(h => h._id));
    }
  };

  const toggleSelectId = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Approved':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Final Approved</span>;
      case 'Pending Admin':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">Pending Admin</span>;
      case 'Pending Incharge':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">Pending Incharge</span>;
      case 'Rejected':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">Rejected</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-gray-50 text-gray-700 border border-gray-200">{status}</span>;
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Admin Homework Management Console</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Review submissions, grant final approvals, and export class-wise consolidated WhatsApp messages & PDFs.
          </p>
        </div>
      </div>

      {/* Stats Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Pending Admin Approval</p>
            <h3 className="text-2xl font-black text-blue-600 mt-1">{stats.pendingAdmin || 0}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Pending Incharge</p>
            <h3 className="text-2xl font-black text-amber-600 mt-1">{stats.pendingIncharge || 0}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Approved Today</p>
            <h3 className="text-2xl font-black text-emerald-600 mt-1">{stats.approvedToday || 0}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Submissions</p>
            <h3 className="text-2xl font-black text-gray-900 mt-1">{stats.total || 0}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <BookOpen className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Mode Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('consolidated')}
          className={`pb-3 px-5 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === 'consolidated'
              ? 'border-b-2 border-orange-500 text-orange-600'
              : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          Class Consolidated View & Export
        </button>
        <button
          onClick={() => setActiveTab('submissions')}
          className={`pb-3 px-5 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'submissions'
              ? 'border-b-2 border-indigo-600 text-indigo-600'
              : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          <span>All Submissions Management</span>
          {stats.pendingAdmin > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-800">
              {stats.pendingAdmin}
            </span>
          )}
        </button>
      </div>

      {/* MODE 1: CONSOLIDATED EXPORTER VIEW */}
      {activeTab === 'consolidated' && (
        <div className="space-y-6">
          {/* Class & Date Filter Bar */}
          <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Select Class
                </label>
                <select
                  value={consClassId}
                  onChange={(e) => {
                    setConsClassId(e.target.value);
                    const selected = classes.find(c => c._id === e.target.value);
                    if (selected) setConsSection(selected.section || '');
                  }}
                  className="h-10 px-3 rounded-xl border border-gray-300 text-xs font-bold text-gray-800 bg-gray-50/50 focus:ring-2 focus:ring-orange-500"
                >
                  {classes.map(c => (
                    <option key={c._id} value={c._id}>
                      {c.name} {c.section ? `(${c.section})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Select Homework Date
                </label>
                <input
                  type="date"
                  value={consDate}
                  onChange={(e) => setConsDate(e.target.value)}
                  className="h-10 px-3 rounded-xl border border-gray-300 text-xs font-bold text-gray-800 bg-gray-50/50 focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={fetchConsolidatedHomework}
              className="w-full md:w-auto justify-center"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh Summary
            </Button>
          </div>

          {/* Consolidated Output Component */}
          <ConsolidatedHomeworkCard
            consolidatedData={consolidatedData}
            loading={loadingCons}
          />
        </div>
      )}

      {/* MODE 2: SUBMISSIONS WORKSPACE & BULK ACTIONS */}
      {activeTab === 'submissions' && (
        <div className="space-y-4">
          {/* Multi-Column Filter Bar */}
          <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-2xs space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search title, teacher, subject..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-8 pr-3 h-9 rounded-xl border border-gray-300 text-xs bg-gray-50/50 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Class Filter */}
              <select
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
                className="h-9 px-2.5 rounded-xl border border-gray-300 text-xs bg-white focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Classes</option>
                {classes.map(c => (
                  <option key={c._id} value={c._id}>{c.name} {c.section ? `(${c.section})` : ''}</option>
                ))}
              </select>

              {/* Subject Filter */}
              <select
                value={filterSubject}
                onChange={(e) => setFilterSubject(e.target.value)}
                className="h-9 px-2.5 rounded-xl border border-gray-300 text-xs bg-white focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Subjects</option>
                {subjects.map(s => (
                  <option key={s._id} value={s._id}>{s.name}</option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="h-9 px-2.5 rounded-xl border border-gray-300 text-xs bg-white focus:ring-2 focus:ring-indigo-500 font-semibold"
              >
                <option value="">All Statuses</option>
                <option value="Pending Incharge">Pending Incharge</option>
                <option value="Pending Admin">Pending Admin</option>
                <option value="Approved">Final Approved</option>
                <option value="Rejected">Rejected</option>
              </select>

              {/* Date Preset */}
              <select
                value={datePreset}
                onChange={(e) => setDatePreset(e.target.value)}
                className="h-9 px-2.5 rounded-xl border border-gray-300 text-xs bg-white focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All Dates</option>
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="this_week">This Week</option>
              </select>
            </div>
          </div>

          {/* Bulk Action Toolbar */}
          {selectedIds.length > 0 && (
            <div className="bg-indigo-600 text-white rounded-2xl p-3 px-5 flex items-center justify-between shadow-md animate-in fade-in duration-150">
              <div className="text-xs font-bold flex items-center gap-2">
                <CheckSquare className="w-4 h-4" />
                <span>{selectedIds.length} Homework Submissions Selected</span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleBulkAction('reject')}
                  disabled={bulkActioning}
                  className="bg-white/10 text-white hover:bg-rose-600 border-transparent"
                >
                  <XCircle className="w-3.5 h-3.5" /> Bulk Reject
                </Button>

                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => handleBulkAction('approve')}
                  disabled={bulkActioning}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white border-transparent"
                >
                  <Check className="w-3.5 h-3.5" /> Bulk Final Approve
                </Button>
              </div>
            </div>
          )}

          {/* Submissions Table */}
          {loadingSubmissions ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-gray-200">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
            </div>
          ) : homeworks.length === 0 ? (
            <EmptyState
              title="No Homework Submissions Found"
              description="No submissions match your filter criteria."
            />
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-gray-700">
                  <thead className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    <tr>
                      <th className="p-3.5 w-10 text-center">
                        <button onClick={toggleSelectAll} className="cursor-pointer">
                          {selectedIds.length === homeworks.length ? (
                            <CheckSquare className="w-4 h-4 text-indigo-600" />
                          ) : (
                            <Square className="w-4 h-4 text-gray-400" />
                          )}
                        </button>
                      </th>
                      <th className="p-3.5">Class / Subject</th>
                      <th className="p-3.5">Teacher</th>
                      <th className="p-3.5">Homework Title & Details</th>
                      <th className="p-3.5">Assigned Date</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {homeworks.map((hw) => (
                      <tr key={hw._id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="p-3.5 text-center">
                          <button onClick={() => toggleSelectId(hw._id)} className="cursor-pointer">
                            {selectedIds.includes(hw._id) ? (
                              <CheckSquare className="w-4 h-4 text-indigo-600" />
                            ) : (
                              <Square className="w-4 h-4 text-gray-300" />
                            )}
                          </button>
                        </td>

                        <td className="p-3.5">
                          <div className="font-bold text-gray-900">{hw.className} {hw.section ? `(${hw.section})` : ''}</div>
                          <div className="text-[11px] font-semibold text-indigo-600">{hw.subjectName}</div>
                        </td>

                        <td className="p-3.5 font-semibold text-gray-800 whitespace-nowrap">
                          {hw.teacherName}
                        </td>

                        <td className="p-3.5 max-w-xs">
                          <div className="font-bold text-gray-900">{hw.title}</div>
                          <div className="text-[11px] text-gray-500 line-clamp-1">{hw.description}</div>
                          {hw.attachment && (
                            <a
                              href={hw.attachment.filePath}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] text-orange-600 hover:underline mt-0.5 font-semibold"
                            >
                              <Paperclip className="w-3 h-3" /> Attachment ({hw.attachment.fileName})
                            </a>
                          )}
                        </td>

                        <td className="p-3.5 font-medium whitespace-nowrap">
                          {new Date(hw.homeworkDate).toLocaleDateString('en-GB')}
                        </td>

                        <td className="p-3.5 whitespace-nowrap">
                          {getStatusBadge(hw.status)}
                        </td>

                        <td className="p-3.5 text-right whitespace-nowrap space-x-1">
                          <button
                            title="View Audit History"
                            onClick={() => setSelectedHistoryHomework(hw)}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {hw.status !== 'Approved' && (
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => handleAdminApprove(hw._id)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                              <Check className="w-3.5 h-3.5" /> Approve
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* History Audit Modal */}
      <ApprovalHistoryModal
        isOpen={!!selectedHistoryHomework}
        onClose={() => setSelectedHistoryHomework(null)}
        homework={selectedHistoryHomework}
      />
    </div>
  );
};

export default AdminHomework;
