import React, { useState, useEffect } from 'react';
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
  RefreshCw
} from 'lucide-react';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import Select from '../../components/ui/Select';
import HomeworkFormModal from '../../components/homework/HomeworkFormModal';
import ApprovalHistoryModal from '../../components/homework/ApprovalHistoryModal';
import ConsolidatedHomeworkCard from '../../components/homework/ConsolidatedHomeworkCard';
import { useToast } from '../../context/ToastContext';
import homeworkApi from '../../services/homeworkApi';
import api from '../../services/api';

const TeacherHomework = () => {
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState('my-homework'); // 'my-homework' | 'class-consolidated'

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

  useEffect(() => {
    fetchDashboardSummary();
    fetchMyHomeworks();
    fetchInchargeQueue();
  }, [myStatusFilter, mySearch, myPagination.page]);

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
        search: mySearch,
        page: myPagination.page,
        limit: 10,
      });
      if (res.success) {
        setMyHomeworks(res.data.homeworks);
        setMyPagination(res.data.pagination);
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

  const handleDeleteMyHomework = async (id) => {
    if (!window.confirm('Are you sure you want to delete this homework submission?')) return;
    try {
      await homeworkApi.deleteHomework(id);
      addToast('Homework deleted successfully', 'success');
      fetchMyHomeworks();
      fetchDashboardSummary();
      if (activeTab === 'class-consolidated') fetchClassTeacherConsolidated();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to delete homework', 'error');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Approved':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Active</span>;
      case 'Pending Admin':
      case 'Pending Incharge':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">Active</span>;
      case 'Rejected':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">Rejected</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-gray-50 text-gray-700 border border-gray-200">{status}</span>;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Homework Management</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Submit daily subject homework and copy consolidated WhatsApp messages for your assigned class.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditHomeworkData(null);
            setIsFormOpen(true);
          }}
          variant="primary"
          className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700 text-white shadow-sm justify-center"
        >
          <Plus className="w-4 h-4" />
          Create Homework
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">My Submissions</p>
            <h3 className="text-2xl font-black text-gray-900 mt-1">{summary.pending + summary.approved}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold">
            <BookOpen className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Active Homeworks</p>
            <h3 className="text-2xl font-black text-emerald-600 mt-1">{summary.approved || summary.pending}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {assignedClasses.length > 0 && (
          <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl p-4 border border-indigo-200/80 shadow-2xs flex items-center justify-between">
            <div className="space-y-1 pr-2">
              <p className="text-xs font-bold text-indigo-700 uppercase tracking-wider">Assigned Class Incharge</p>
              <h3 className="text-xl font-black text-indigo-900">{assignedClasses.length} {assignedClasses.length === 1 ? 'Class' : 'Classes'} Assigned</h3>
              <div className="flex flex-wrap gap-1 mt-1.5">
                {assignedClasses.slice(0, 5).map(c => (
                  <span key={c._id || c.id} className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white text-indigo-700 border border-indigo-200 shadow-2xs">
                    {c.name}{c.section ? `-${c.section}` : ''}
                  </span>
                ))}
                {assignedClasses.length > 5 && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-100 text-indigo-800">
                    +{assignedClasses.length - 5} more
                  </span>
                )}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold flex-shrink-0">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
        )}
      </div>

      {/* Workspace Tabs */}
      <div className="flex border-b border-gray-200 overflow-x-auto whitespace-nowrap scrollbar-none gap-1 sm:gap-2">
        <button
          onClick={() => setActiveTab('my-homework')}
          className={`pb-3 px-4 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
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
            className={`pb-3 px-4 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'class-consolidated'
                ? 'border-b-2 border-indigo-600 text-indigo-600'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Class Homework (WhatsApp Copy)</span>
          </button>
        )}
      </div>

      {/* TAB 1: MY HOMEWORK SUBMISSIONS */}
      {activeTab === 'my-homework' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search title, subject, class..."
                value={mySearch}
                onChange={(e) => setMySearch(e.target.value)}
                className="w-full pl-9 pr-3 h-10 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-orange-500 bg-gray-50/50"
              />
            </div>
          </div>

          {/* Submissions Table / Cards */}
          {loadingMy ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-gray-200">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
            </div>
          ) : myHomeworks.length === 0 ? (
            <EmptyState
              title="No Homework Submissions Found"
              description="Click 'Create Homework' to submit your subject homework."
            />
          ) : (
            <div className="space-y-4">
              {/* Desktop Table View (≥ md) */}
              <div className="hidden md:block bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-gray-700">
                    <thead className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                      <tr>
                        <th className="p-3.5">Class / Subject</th>
                        <th className="p-3.5">Homework Title</th>
                        <th className="p-3.5">Assigned Date</th>
                        <th className="p-3.5">Due Date</th>
                        <th className="p-3.5">Status</th>
                        <th className="p-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {myHomeworks.map((hw) => (
                        <tr key={hw._id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="p-3.5">
                            <div className="font-bold text-gray-900">{hw.className} {hw.section ? `(${hw.section})` : ''}</div>
                            <div className="text-[11px] font-medium text-indigo-600">{hw.subjectName}</div>
                          </td>

                          <td className="p-3.5 max-w-xs">
                            <div className="font-bold text-gray-900 truncate" title={hw.title}>{hw.title}</div>
                            <div className="text-[11px] text-gray-500 line-clamp-1">{hw.description}</div>
                            {hw.attachment && (
                              <a
                                href={hw.attachment.filePath}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-[10px] text-orange-600 hover:underline mt-0.5 font-semibold"
                              >
                                <Paperclip className="w-3 h-3" /> {hw.attachment.fileName}
                              </a>
                            )}
                          </td>

                          <td className="p-3.5 font-medium whitespace-nowrap">
                            {new Date(hw.homeworkDate).toLocaleDateString('en-GB')}
                          </td>

                          <td className="p-3.5 font-medium whitespace-nowrap">
                            {new Date(hw.submissionDate).toLocaleDateString('en-GB')}
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

                            <button
                              title="Edit Homework"
                              onClick={() => {
                                setEditHomeworkData(hw);
                                setIsFormOpen(true);
                              }}
                              className="p-1.5 rounded-lg text-gray-500 hover:text-orange-600 hover:bg-orange-50 transition-all"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>

                            <button
                              title="Delete Submission"
                              onClick={() => handleDeleteMyHomework(hw._id)}
                              className="p-1.5 rounded-lg text-gray-500 hover:text-rose-600 hover:bg-rose-50 transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile Cards View (< md) */}
              <div className="md:hidden space-y-3">
                {myHomeworks.map((hw) => (
                  <div key={hw._id} className="bg-white rounded-2xl p-4 border border-gray-200 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black uppercase text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-md border border-indigo-100">
                          {hw.className} {hw.section ? `(${hw.section})` : ''}
                        </span>
                        <span className="text-xs font-extrabold uppercase text-orange-600 bg-orange-50 px-2.5 py-0.5 rounded-md border border-orange-100">
                          {hw.subjectName}
                        </span>
                      </div>
                      {getStatusBadge(hw.status)}
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-gray-900">{hw.title}</h4>
                      <p className="text-xs text-gray-600 bg-gray-50 p-2.5 rounded-xl border border-gray-100 mt-1 leading-relaxed">
                        {hw.description}
                      </p>
                      {hw.attachment && (
                        <a
                          href={hw.attachment.filePath}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-orange-600 hover:underline mt-2 font-semibold"
                        >
                          <Paperclip className="w-3.5 h-3.5" /> {hw.attachment.fileName}
                        </a>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-gray-500 pt-2 border-t border-gray-100">
                      <span>Assigned: <span className="font-semibold text-gray-700">{new Date(hw.homeworkDate).toLocaleDateString('en-GB')}</span></span>
                      <span>Due: <span className="font-semibold text-gray-700">{new Date(hw.submissionDate).toLocaleDateString('en-GB')}</span></span>
                    </div>

                    <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
                      <button
                        onClick={() => setSelectedHistoryHomework(hw)}
                        className="flex-1 py-2 px-3 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100 flex items-center justify-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5 text-indigo-600" /> History
                      </button>

                      <button
                        onClick={() => {
                          setEditHomeworkData(hw);
                          setIsFormOpen(true);
                        }}
                        className="flex-1 py-2 px-3 rounded-xl border border-orange-200 text-xs font-semibold text-orange-700 bg-orange-50 hover:bg-orange-100 flex items-center justify-center gap-1.5"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-orange-600" /> Edit
                      </button>

                      <button
                        onClick={() => handleDeleteMyHomework(hw._id)}
                        className="py-2 px-3 rounded-xl border border-rose-200 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 flex items-center justify-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CLASS TEACHER CONSOLIDATED HOMEWORK (WHATSAPP COPY) */}
      {activeTab === 'class-consolidated' && assignedClasses.length > 0 && (
        <div className="space-y-6">
          {/* Top Summary Card & Filters */}
          <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                  Class Teacher Console
                </span>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                  Active View: <span className="font-extrabold">{assignedClasses.find(c => (c._id || c.id) === selectedClassId)?.name || 'Class Selected'} {assignedClasses.find(c => (c._id || c.id) === selectedClassId)?.section ? `(${assignedClasses.find(c => (c._id || c.id) === selectedClassId)?.section})` : ''}</span>
                </span>
              </div>
              <h2 className="text-base font-bold text-gray-900 mt-1">
                Consolidated Homework Exporter
              </h2>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full md:w-auto">
              <div className="w-full sm:w-64">
                <Select
                  label="Select Assigned Class"
                  value={selectedClassId}
                  onChange={(val) => setSelectedClassId(val)}
                  options={assignedClasses.map((c) => ({
                    value: c._id || c.id,
                    label: `${c.name} ${c.section ? `(${c.section})` : ''}`,
                  }))}
                />
              </div>

              <div className="w-full sm:w-auto">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Select Homework Date
                </label>
                <input
                  type="date"
                  value={classHomeworkDate}
                  onChange={(e) => setClassHomeworkDate(e.target.value)}
                  className="w-full sm:w-auto h-10 px-3 rounded-xl border border-gray-300 text-xs font-bold text-gray-800 bg-gray-50/50 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <Button
                variant="secondary"
                size="sm"
                onClick={fetchClassTeacherConsolidated}
                className="w-full sm:w-auto sm:mt-4 justify-center"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Refresh
              </Button>
            </div>
          </div>

          {/* Consolidated Output Component */}
          <ConsolidatedHomeworkCard
            consolidatedData={classConsolidatedData}
            loading={loadingClassConsolidated}
          />
        </div>
      )}

      {/* Form Modal */}
      <HomeworkFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={() => {
          fetchMyHomeworks();
          fetchDashboardSummary();
          if (activeTab === 'class-consolidated') fetchClassTeacherConsolidated();
        }}
        initialData={editHomeworkData}
      />

      {/* History Audit Modal */}
      <ApprovalHistoryModal
        isOpen={!!selectedHistoryHomework}
        onClose={() => setSelectedHistoryHomework(null)}
        homework={selectedHistoryHomework}
      />
    </div>
  );
};

export default TeacherHomework;
