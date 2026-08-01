import React, { useState, useEffect, useMemo } from 'react';
import {
  BookOpen,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  XCircle,
  ShieldCheck,
  Calendar as CalendarIcon,
  CheckSquare,
  Square,
  Eye,
  FileText,
  Paperclip,
  Check,
  RefreshCw,
  Copy,
  FileDown,
  Sparkles,
  Trash2,
} from 'lucide-react';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import Select from '../../components/ui/Select';
import DatePicker from '../../components/ui/DatePicker';
import ConfirmModal from '../../components/ui/ConfirmModal';
import ConsolidatedHomeworkCard from '../../components/homework/ConsolidatedHomeworkCard';
import ApprovalHistoryModal from '../../components/homework/ApprovalHistoryModal';
import HomeworkFilterChips from '../../components/homework/HomeworkFilterChips';
import ClassGroupedHomeworkCard from '../../components/homework/ClassGroupedHomeworkCard';
import { useToast } from '../../context/ToastContext';
import homeworkApi from '../../services/homeworkApi';
import api from '../../services/api';

const AdminHomework = () => {
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState('submissions'); // 'submissions' | 'consolidated'

  // Filter Chips state for Submissions
  const [activeFilter, setActiveFilter] = useState('today'); // 'today' | 'yesterday' | 'last7days' | 'all' | 'custom'
  const [customDate, setCustomDate] = useState('');

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

  // Manual Delete Confirmation Modal
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
  }, [
    activeTab,
    consClassId,
    consSection,
    consDate,
    filterClass,
    filterTeacher,
    filterSubject,
    filterStatus,
    activeFilter,
    customDate,
    search,
    pagination.page,
  ]);

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

    let start = '';
    let end = '';

    if (activeFilter === 'today') {
      start = new Date().toISOString().split('T')[0];
      end = new Date().toISOString().split('T')[0];
    } else if (activeFilter === 'yesterday') {
      const y = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      start = y;
      end = y;
    } else if (activeFilter === 'last7days') {
      const d = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
      start = d;
      end = new Date().toISOString().split('T')[0];
    } else if (activeFilter === 'custom' && customDate) {
      start = customDate;
      end = customDate;
    }

    try {
      const res = await homeworkApi.getAllAdminHomework({
        page: pagination.page,
        limit: 50,
        classId: filterClass,
        teacherId: filterTeacher,
        subjectId: filterSubject,
        status: filterStatus,
        startDate: start,
        endDate: end,
        search,
      });

      if (res.success) {
        setHomeworks(res.data.homeworks || []);
        setPagination(res.data.pagination || { page: 1, totalPages: 1 });
        setSelectedIds([]);
      }
    } catch (err) {
      console.error('Failed to fetch submissions', err);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmId) return;
    setIsDeleting(true);
    try {
      await homeworkApi.deleteHomework(deleteConfirmId);
      addToast('Homework record deleted permanently', 'success');
      setDeleteConfirmId(null);
      fetchAdminSubmissions();
      fetchDashboardSummary();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to delete homework', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const todayCount = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return homeworks.filter((hw) => {
      if (!hw || !hw.homeworkDate) return false;
      const dStr = new Date(hw.homeworkDate).toISOString().split('T')[0];
      return dStr === todayStr;
    }).length;
  }, [homeworks]);

  // Group Submissions By Class & Date (One Card Per Class!)
  const classGroupedHomeworks = useMemo(() => {
    if (!homeworks || homeworks.length === 0) return [];
    const map = new Map();

    homeworks.forEach((hw) => {
      const dateStr = hw.homeworkDate
        ? new Date(hw.homeworkDate).toISOString().split('T')[0]
        : '';
      const key = `${hw.className || 'Class'}_${hw.section || ''}_${dateStr}`;

      if (!map.has(key)) {
        map.set(key, {
          key,
          className: hw.className,
          section: hw.section,
          homeworkDate: hw.homeworkDate,
          submissionDate: hw.submissionDate,
          homeworks: [],
        });
      }
      map.get(key).homeworks.push(hw);
    });

    return Array.from(map.values());
  }, [homeworks]);

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-gray-900 tracking-tight">
            Homework Management Console
          </h1>
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
      <div className="flex border-b border-gray-200 gap-2">
        <button
          onClick={() => setActiveTab('submissions')}
          className={`pb-3 px-4 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
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

        <button
          onClick={() => setActiveTab('consolidated')}
          className={`pb-3 px-4 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === 'consolidated'
              ? 'border-b-2 border-orange-500 text-orange-600'
              : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          Class Consolidated View & Export
        </button>
      </div>

      {/* MODE 1: SUBMISSIONS WORKSPACE (GROUPED BY CLASS) */}
      {activeTab === 'submissions' && (
        <div className="space-y-5">
          {/* Filter Chips Bar (Today, Yesterday, Last 7 Days, All, Select Date, Search) */}
          <HomeworkFilterChips
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
            selectedDate={customDate}
            onDateChange={setCustomDate}
            searchQuery={search}
            onSearchChange={setSearch}
            todayCount={todayCount}
          />

          {/* Secondary Select Dropdown Filters (Class, Subject, Teacher, Status) */}
          <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-2xs grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <Select
              placeholder="All Classes"
              options={[
                { value: '', label: 'All Classes' },
                ...classes.map((c) => ({
                  value: c._id,
                  label: `${c.name}${c.section ? ` (${c.section})` : ''}`,
                })),
              ]}
              value={filterClass}
              onChange={(val) => setFilterClass(val)}
              size="sm"
            />

            <Select
              placeholder="All Subjects"
              options={[
                { value: '', label: 'All Subjects' },
                ...subjects.map((s) => ({ value: s._id, label: s.name })),
              ]}
              value={filterSubject}
              onChange={(val) => setFilterSubject(val)}
              size="sm"
            />

            <Select
              placeholder="All Teachers"
              options={[
                { value: '', label: 'All Teachers' },
                ...teachers.map((t) => ({
                  value: t._id,
                  label: `${t.firstName} ${t.lastName}`,
                })),
              ]}
              value={filterTeacher}
              onChange={(val) => setFilterTeacher(val)}
              size="sm"
            />

            <Select
              placeholder="All Statuses"
              options={[
                { value: '', label: 'All Statuses' },
                { value: 'Approved', label: 'Approved' },
                { value: 'Pending Admin', label: 'Pending Admin' },
                { value: 'Pending Incharge', label: 'Pending Incharge' },
                { value: 'Rejected', label: 'Rejected' },
              ]}
              value={filterStatus}
              onChange={(val) => setFilterStatus(val)}
              size="sm"
            />
          </div>

          {/* Today's Homework Title Header */}
          {activeFilter === 'today' && (
            <div className="flex items-center justify-between bg-emerald-50/70 border border-emerald-200/80 p-3.5 rounded-2xl">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
                <h2 className="text-sm sm:text-base font-black text-emerald-900 flex items-center gap-1.5">
                  📘 Today's Homework Submissions
                </h2>
              </div>
              <span className="text-xs font-extrabold text-emerald-700 bg-white px-2.5 py-1 rounded-xl border border-emerald-200">
                {classGroupedHomeworks.length} Classes Assigned
              </span>
            </div>
          )}

          {/* Grouped Homework Cards (1 Card Per Class) */}
          {loadingSubmissions ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-gray-200 shadow-2xs">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="text-xs font-bold text-gray-400 mt-3 uppercase tracking-wider">
                Loading submissions...
              </p>
            </div>
          ) : classGroupedHomeworks.length === 0 ? (
            <EmptyState
              title={
                activeFilter === 'today'
                  ? 'No homework assigned today.'
                  : 'No Homework Records Found'
              }
              description="No homework records match your current date filter or search parameters."
            />
          ) : (
            <div className="space-y-4">
              {classGroupedHomeworks.map((group) => (
                <ClassGroupedHomeworkCard
                  key={group.key}
                  group={group}
                  onViewHistory={(h) => setSelectedHistoryHomework(h)}
                  onDelete={(id) => setDeleteConfirmId(id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODE 2: CONSOLIDATED EXPORTER VIEW */}
      {activeTab === 'consolidated' && (
        <div className="space-y-6">
          {/* Class & Date Filter Bar */}
          <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="w-full sm:w-48">
                <Select
                  label="Select Class"
                  options={classes.map((c) => ({
                    value: c._id,
                    label: `${c.name}${c.section ? ` (${c.section})` : ''}`,
                  }))}
                  value={consClassId}
                  onChange={(val) => {
                    setConsClassId(val);
                    const selected = classes.find((c) => c._id === val);
                    if (selected) setConsSection(selected.section || '');
                  }}
                  size="sm"
                />
              </div>

              <div className="w-full sm:w-44">
                <DatePicker
                  label="Select Homework Date"
                  value={consDate}
                  onChange={(val) => val && setConsDate(val)}
                  size="sm"
                />
              </div>
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={fetchConsolidatedHomework}
              className="w-full md:w-auto justify-center font-bold"
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

      {/* Audit History Modal */}
      {selectedHistoryHomework && (
        <ApprovalHistoryModal
          isOpen={!!selectedHistoryHomework}
          onClose={() => setSelectedHistoryHomework(null)}
          homework={selectedHistoryHomework}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Homework?"
        message="Are you sure you want to delete this homework record? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        loading={isDeleting}
      />
    </div>
  );
};

export default AdminHomework;
