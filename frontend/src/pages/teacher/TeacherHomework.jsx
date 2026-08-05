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
import HomeworkFilterBottomSheet from '../../components/homework/HomeworkFilterBottomSheet';
import HomeworkFAB from '../../components/homework/HomeworkFAB';
import ClassGroupedHomeworkCard from '../../components/homework/ClassGroupedHomeworkCard';
import { useToast } from '../../context/ToastContext';
import homeworkApi from '../../services/homeworkApi';

const TeacherHomework = () => {
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState('my-homework'); // 'my-homework' | 'class-consolidated'

  // Filter Chips state
  const [activeFilter, setActiveFilter] = useState('today'); // 'today' | 'yesterday' | 'last7days' | 'all' | 'custom'
  const [customDate, setCustomDate] = useState('');
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

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
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
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
    <div className="space-y-4 pb-24">
      {/* Top Controls Row: Segmented Tabs & Create Homework Button */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="bg-slate-200/70 p-1 rounded-2xl flex items-center justify-between max-w-md w-full sm:w-auto shadow-inner">
          <button
            type="button"
            onClick={() => setActiveTab('my-homework')}
            className={`flex-1 sm:flex-initial py-2 px-4 rounded-xl text-xs font-extrabold transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'my-homework'
                ? 'bg-orange-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>My Submissions</span>
          </button>

          {assignedClasses.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab('class-consolidated')}
              className={`flex-1 sm:flex-initial py-2 px-4 rounded-xl text-xs font-extrabold transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 ${
                activeTab === 'class-consolidated'
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Class Broadcaster</span>
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => {
            setEditHomeworkData(null);
            setIsFormOpen(true);
          }}
          className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-all active:scale-95 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Create Homework</span>
        </button>
      </div>

      {/* TAB 1: MY HOMEWORK SUBMISSIONS */}
      {activeTab === 'my-homework' && (
        <div className="space-y-4">
          <HomeworkFilterChips
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
            selectedDate={customDate}
            onDateChange={setCustomDate}
            searchQuery={mySearch}
            onSearchChange={setMySearch}
            todayCount={todayCount}
            onOpenBottomSheetFilter={() => setIsFilterSheetOpen(true)}
            activeFilterCount={myStatusFilter ? 1 : 0}
          />

          {/* Today's Submissions Header */}
          {activeFilter === 'today' && (
            <div className="flex items-center justify-between bg-emerald-50/70 border border-emerald-200/80 p-3.5 rounded-[20px]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                <h2 className="text-xs sm:text-sm font-black text-emerald-900 flex items-center gap-1.5">
                  📘 Today's Assigned Homework
                </h2>
              </div>
              <span className="text-[11px] font-extrabold text-emerald-700 bg-white px-2.5 py-1 rounded-xl border border-emerald-200 shadow-2xs">
                {classGroupedHomeworks.length} Classes
              </span>
            </div>
          )}

          {/* Submissions List Grouped By Class */}
          {loadingMy ? (
            <div className="bg-white rounded-[20px] p-12 text-center border border-slate-200 shadow-2xs">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto" />
              <p className="text-xs font-bold text-slate-400 mt-3 uppercase tracking-wider">
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
            <div className="space-y-3.5">
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

      {/* TAB 2: CLASS TEACHER CONSOLIDATED HOMEWORK */}
      {activeTab === 'class-consolidated' && assignedClasses.length > 0 && (
        <div className="space-y-4">
          <div className="bg-white rounded-[20px] p-4 sm:p-5 border border-slate-200/90 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-sm sm:text-base font-black text-slate-900">
                Class Homework WhatsApp Broadcaster
              </h2>
              <p className="text-xs text-slate-500">
                Copy all approved daily homework for your class in 1-click and send to Parents WhatsApp group.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="w-full sm:w-48">
                <Select
                  label="Select Class"
                  options={assignedClasses.map((c) => ({
                    value: c._id || c.id,
                    label: c.name,
                  }))}
                  value={selectedClassId}
                  onChange={(val) => setSelectedClassId(val)}
                  size="sm"
                />
              </div>

              <div className="w-full sm:w-44">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Homework Date
                </label>
                <input
                  type="date"
                  value={classHomeworkDate}
                  onChange={(e) => setClassHomeworkDate(e.target.value)}
                  className="w-full h-10 px-3 rounded-2xl border border-slate-200 text-xs font-bold bg-white focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
          </div>

          <ConsolidatedHomeworkCard
            consolidatedData={classConsolidatedData}
            loading={loadingClassConsolidated}
          />
        </div>
      )}

      {/* Mobile Bottom Sheet Filter Drawer */}
      <HomeworkFilterBottomSheet
        isOpen={isFilterSheetOpen}
        onClose={() => setIsFilterSheetOpen(false)}
        filterStatus={myStatusFilter}
        setFilterStatus={setMyStatusFilter}
        onResetFilters={() => {
          setMyStatusFilter('');
        }}
        onApplyFilters={() => {
          fetchMyHomeworks();
        }}
      />

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
