import React, { useState, useEffect, useMemo } from 'react';
import {
  BookOpen,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
  UserCheck,
  Eye,
  Edit2,
  Trash2,
  Paperclip,
  Check,
  AlertCircle,
  Share2,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import Select from '../../components/ui/Select';
import ConfirmModal from '../../components/ui/ConfirmModal';
import HomeworkFormModal from '../../components/homework/HomeworkFormModal';
import ApprovalHistoryModal from '../../components/homework/ApprovalHistoryModal';
import ConsolidatedHomeworkCard from '../../components/homework/ConsolidatedHomeworkCard';
import HomeworkFilterChips from '../../components/homework/HomeworkFilterChips';
import ClassGroupedHomeworkCard from '../../components/homework/ClassGroupedHomeworkCard';
import { useToast } from '../../context/ToastContext';
import homeworkApi from '../../services/homeworkApi';

const TeacherHomework = () => {
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState('my-homework'); // 'my-homework' | 'class-consolidated'

  // Filter Chips state
  const [activeFilter, setActiveFilter] = useState('today'); // 'today' | 'yesterday' | 'last7days' | 'all' | 'custom'
  const [customDate, setCustomDate] = useState('');

  // Summary counts
  const [summary, setSummary] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    inchargePending: 0,
  });

  // My Homework State
  const [myHomeworks, setMyHomeworks] = useState([]);
  const [myPagination, setMyPagination] = useState({ page: 1, totalPages: 1 });
  const [myStatusFilter, setMyStatusFilter] = useState('');
  const [mySearch, setMySearch] = useState('');
  const [loadingMy, setLoadingMy] = useState(false);

  // Class Teacher Assigned Info & Class Consolidated State
  const [assignedClasses, setAssignedClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [classHomeworkDate, setClassHomeworkDate] = useState(new Date().toISOString().split('T')[0]);
  const [classConsolidatedData, setClassConsolidatedData] = useState(null);
  const [loadingClassConsolidated, setLoadingClassConsolidated] = useState(false);

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editHomeworkData, setEditHomeworkData] = useState(null);
  const [selectedHistoryHomework, setSelectedHistoryHomework] = useState(null);

  // Delete Confirmation Modal
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchDashboardSummary();
    fetchMyHomeworks();
    fetchInchargeQueue();
  }, [myStatusFilter, myPagination.page]);

  useEffect(() => {
    if (activeTab === 'class-consolidated' && assignedClasses.length > 0) {
      fetchClassTeacherConsolidated();
    }
  }, [activeTab, selectedClassId, classHomeworkDate]);

  const fetchDashboardSummary = async () => {
    try {
      const res = await homeworkApi.getDashboardSummary();
      if (res.success) setSummary(res.data);
    } catch (err) {
      console.error('Failed to fetch summary stats', err);
    }
  };

  const fetchMyHomeworks = async () => {
    setLoadingMy(true);
    try {
      const res = await homeworkApi.getTeacherMyHomework({
        status: myStatusFilter,
        page: myPagination.page,
        limit: 50,
      });
      if (res.success) {
        setMyHomeworks(res.data.homeworks || []);
        setMyPagination(res.data.pagination || { page: 1, totalPages: 1 });
      }
    } catch (err) {
      console.error('Failed to fetch my homeworks', err);
    } finally {
      setLoadingMy(false);
    }
  };

  const fetchInchargeQueue = async () => {
    try {
      const res = await homeworkApi.getInchargeClassHomework({});
      if (res.success) {
        const classes = res.data.assignedClasses || [];
        setAssignedClasses(classes);
        if (classes.length > 0 && !selectedClassId) {
          setSelectedClassId(classes[0]._id || classes[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch assigned classes', err);
    }
  };

  const fetchClassTeacherConsolidated = async () => {
    setLoadingClassConsolidated(true);
    try {
      const res = await homeworkApi.getClassTeacherConsolidatedHomework({
        classId: selectedClassId || (assignedClasses[0] ? assignedClasses[0]._id : undefined),
        date: classHomeworkDate,
      });
      if (res.success) {
        setClassConsolidatedData(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch class teacher consolidated homework', err);
      addToast(err.response?.data?.message || 'Failed to fetch class consolidated homework', 'error');
    } finally {
      setLoadingClassConsolidated(false);
    }
  };

  // Confirm delete submission
  const handleConfirmDelete = async () => {
    if (!deleteConfirmId) return;
    setIsDeleting(true);
    try {
      await homeworkApi.deleteHomework(deleteConfirmId);
      addToast('Homework deleted successfully', 'success');
      setDeleteConfirmId(null);
      fetchMyHomeworks();
      fetchDashboardSummary();
      if (activeTab === 'class-consolidated') fetchClassTeacherConsolidated();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to delete homework', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Today's Homework Count
  const todayCount = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return myHomeworks.filter((hw) => {
      if (!hw || !hw.homeworkDate) return false;
      const dStr = new Date(hw.homeworkDate).toISOString().split('T')[0];
      return dStr === todayStr;
    }).length;
  }, [myHomeworks]);

  // Filtered Homeworks List based on active chip & search
  const filteredMyHomeworks = useMemo(() => {
    if (!myHomeworks || !Array.isArray(myHomeworks)) return [];

    const todayStr = new Date().toISOString().split('T')[0];
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = yesterdayDate.toISOString().split('T')[0];

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.setDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    return myHomeworks.filter((hw) => {
      if (!hw) return false;
      const hwDateObj = hw.homeworkDate ? new Date(hw.homeworkDate) : null;
      const hwDateStr = hwDateObj ? hwDateObj.toISOString().split('T')[0] : '';

      // Date Filter Chips
      if (activeFilter === 'today') {
        if (hwDateStr !== todayStr) return false;
      } else if (activeFilter === 'yesterday') {
        if (hwDateStr !== yesterdayStr) return false;
      } else if (activeFilter === 'last7days') {
        if (!hwDateObj || hwDateObj < sevenDaysAgo) return false;
      } else if (activeFilter === 'custom' && customDate) {
        if (hwDateStr !== customDate) return false;
      }

      // Search Query Filter
      if (mySearch.trim()) {
        const q = mySearch.toLowerCase();
        const titleMatch = hw.title?.toLowerCase().includes(q);
        const descMatch = hw.description?.toLowerCase().includes(q);
        const subjectMatch = hw.subjectName?.toLowerCase().includes(q);
        const classMatch = hw.className?.toLowerCase().includes(q);
        const teacherMatch = hw.teacherName?.toLowerCase().includes(q);
        if (!titleMatch && !descMatch && !subjectMatch && !classMatch && !teacherMatch) {
          return false;
        }
      }

      return true;
    });
  }, [myHomeworks, activeFilter, customDate, mySearch]);

  // Group Filtered Homeworks By Class & Date (One Card Per Class!)
  const classGroupedHomeworks = useMemo(() => {
    if (!filteredMyHomeworks || filteredMyHomeworks.length === 0) return [];
    const map = new Map();

    filteredMyHomeworks.forEach((hw) => {
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
  }, [filteredMyHomeworks]);

  return (
    <div className="space-y-4 sm:space-y-6 pb-12">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight">Homework Center</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Submit daily subject homework and copy consolidated WhatsApp messages.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditHomeworkData(null);
            setIsFormOpen(true);
          }}
          variant="primary"
          className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700 text-white shadow-sm justify-center font-bold text-xs sm:text-sm py-2.5"
        >
          <Plus className="w-4 h-4" />
          Create Homework
        </Button>
      </div>

      {/* Mobile-Friendly Compact Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4">
        <div className="bg-white rounded-2xl p-3 sm:p-4 border border-gray-200/90 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider">My Submissions</p>
            <h3 className="text-lg sm:text-2xl font-black text-gray-900 mt-0.5">{summary.pending + summary.approved}</h3>
          </div>
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold shrink-0">
            <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-3 sm:p-4 border border-gray-200/90 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider">Today Assigned</p>
            <h3 className="text-lg sm:text-2xl font-black text-emerald-600 mt-0.5">{todayCount}</h3>
          </div>
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>

        {assignedClasses.length > 0 && (
          <div className="col-span-2 sm:col-span-1 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl p-3 sm:p-4 border border-indigo-200/80 shadow-2xs flex items-center justify-between">
            <div className="space-y-0.5 pr-2">
              <p className="text-[10px] sm:text-xs font-bold text-indigo-700 uppercase tracking-wider">Class Incharge</p>
              <h3 className="text-sm sm:text-xl font-black text-indigo-900">{assignedClasses.length} Classes Assigned</h3>
              <div className="hidden sm:flex flex-wrap gap-1 mt-1">
                {assignedClasses.slice(0, 4).map(c => (
                  <span key={c._id || c.id} className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-white text-indigo-700 border border-indigo-200">
                    {c.name}{c.section ? `-${c.section}` : ''}
                  </span>
                ))}
              </div>
            </div>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shrink-0">
              <UserCheck className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
        )}
      </div>

      {/* Workspace Tabs */}
      <div className="flex border-b border-gray-200 overflow-x-auto whitespace-nowrap scrollbar-none gap-1 sm:gap-2">
        <button
          onClick={() => setActiveTab('my-homework')}
          className={`pb-2.5 px-3 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === 'my-homework'
              ? 'border-b-2 border-orange-500 text-orange-600'
              : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          My Homework Submissions
        </button>

        {assignedClasses.length > 0 && (
          <button
            onClick={() => setActiveTab('class-consolidated')}
            className={`pb-2.5 px-3 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'class-consolidated'
                ? 'border-b-2 border-indigo-600 text-indigo-600'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Class Broadcaster</span>
          </button>
        )}
      </div>

      {/* TAB 1: MY HOMEWORK SUBMISSIONS (GROUPED BY CLASS) */}
      {activeTab === 'my-homework' && (
        <div className="space-y-3 sm:space-y-5">
          {/* Filter Chips Bar (Today, Yesterday, Last 7 Days, All, Select Date, Search) */}
          <HomeworkFilterChips
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
            selectedDate={customDate}
            onDateChange={setCustomDate}
            searchQuery={mySearch}
            onSearchChange={setMySearch}
            todayCount={todayCount}
          />

          {/* Today's Homework Section Title */}
          {activeFilter === 'today' && (
            <div className="flex items-center justify-between bg-emerald-50/70 border border-emerald-200/80 p-3 rounded-xl">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                <h2 className="text-xs sm:text-base font-black text-emerald-900 flex items-center gap-1.5">
                  📘 Today's Homework
                </h2>
              </div>
              <span className="text-[11px] sm:text-xs font-extrabold text-emerald-700 bg-white px-2 py-0.5 rounded-lg border border-emerald-200">
                {classGroupedHomeworks.length} Classes Assigned
              </span>
            </div>
          )}

          {/* Submissions List Grouped By Class */}
          {loadingMy ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-gray-200 shadow-2xs">
              <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-orange-500 mx-auto"></div>
              <p className="text-xs font-bold text-gray-400 mt-2 uppercase tracking-wider">
                Loading homework records...
              </p>
            </div>
          ) : classGroupedHomeworks.length === 0 ? (
            <EmptyState
              title={
                activeFilter === 'today'
                  ? 'No homework assigned today.'
                  : 'No Homework Records Found'
              }
              description={
                activeFilter === 'today'
                  ? "Click 'Create Homework' to assign today's subject homework."
                  : 'Try selecting a different filter chip or date.'
              }
            />
          ) : (
            <div className="space-y-3">
              {classGroupedHomeworks.map((group) => (
                <ClassGroupedHomeworkCard
                  key={group.key}
                  group={group}
                  onViewHistory={(h) => setSelectedHistoryHomework(h)}
                  onEdit={(h) => {
                    setEditHomeworkData(h);
                    setIsFormOpen(true);
                  }}
                  onDelete={(id) => setDeleteConfirmId(id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CLASS TEACHER CONSOLIDATED HOMEWORK (WHATSAPP COPY) */}
      {activeTab === 'class-consolidated' && assignedClasses.length > 0 && (
        <div className="space-y-4 sm:space-y-6">
          {/* Top Summary Card & Filters */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-200 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-sm sm:text-base font-black text-gray-900">
                Class Homework WhatsApp Broadcaster
              </h2>
              <p className="text-xs text-gray-500">
                Copy all approved daily homework for your class in 1-click and send to Parents WhatsApp group.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="w-full sm:w-48">
                <Select
                  label="Select Class"
                  options={assignedClasses.map((c) => ({
                    value: c._id || c.id,
                    label: `${c.name}${c.section ? ` (${c.section})` : ''}`,
                  }))}
                  value={selectedClassId}
                  onChange={(val) => setSelectedClassId(val)}
                  size="sm"
                />
              </div>

              <div className="w-full sm:w-44">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Homework Date
                </label>
                <input
                  type="date"
                  value={classHomeworkDate}
                  onChange={(e) => setClassHomeworkDate(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-gray-300 text-xs font-bold bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Consolidated Card */}
          <ConsolidatedHomeworkCard
            consolidatedData={classConsolidatedData}
            loading={loadingClassConsolidated}
          />
        </div>
      )}

      {/* Create / Edit Homework Form Modal */}
      {isFormOpen && (
        <HomeworkFormModal
          isOpen={isFormOpen}
          onClose={() => {
            setIsFormOpen(false);
            setEditHomeworkData(null);
          }}
          homeworkData={editHomeworkData}
          onSuccess={() => {
            fetchMyHomeworks();
            fetchDashboardSummary();
            if (activeTab === 'class-consolidated') fetchClassTeacherConsolidated();
          }}
        />
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

export default TeacherHomework;
