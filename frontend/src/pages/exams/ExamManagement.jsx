import React, { useState, useEffect } from 'react';
import {
  Settings,
  Plus,
  Filter,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  Calendar,
  Layers,
  Trash2,
  Edit3,
  Copy,
  RefreshCw,
  X,
  FileCheck,
} from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

const ExamManagement = () => {
  const [exams, setExams] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjectsList, setSubjectsList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterSession, setFilterSession] = useState('2026-2027');
  const [filterExamType, setFilterExamType] = useState('ALL');
  const [filterClassId, setFilterClassId] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [selectedExam, setSelectedExam] = useState(null);
  const [readinessInfo, setReadinessInfo] = useState(null);

  // Form State: Create Exam
  const [newExamName, setNewExamName] = useState('');
  const [newExamType, setNewExamType] = useState('MONTHLY');
  const [newSession, setNewSession] = useState('2026-2027');
  const [newClassId, setNewClassId] = useState('');
  const [newSection, setNewSection] = useState('A');
  const [newStartDate, setNewStartDate] = useState('');
  const [newEndDate, setNewEndDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Form State: Configure Subjects
  const [subjectConfigs, setSubjectConfigs] = useState([]);

  const { addToast } = useToast();

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [exRes, optRes] = await Promise.all([
        api.get('/exams'),
        api.get('/exams/options'),
      ]);

      if (exRes.data && exRes.data.data) {
        setExams(exRes.data.data);
      }

      if (optRes.data && optRes.data.data) {
        const clsList = optRes.data.data.classes || [];
        setClasses(clsList);
        if (clsList.length > 0 && !newClassId) {
          setNewClassId(clsList[0]._id);
        }
      }
    } catch (err) {
      console.error('Failed to load exam management data:', err);
      addToast('Failed to fetch examinations list', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  // Fetch subjects when selected class changes in Configure Modal
  const fetchClassSubjects = async (classId) => {
    try {
      // Try class-specific subject mappings first
      const res = await api.get(`/admin/academic/classes/${classId}/subjects`);
      if (res.data && res.data.data && res.data.data.length > 0) {
        const mappedSubjects = res.data.data.map((m) =>
          m.subject ? m.subject : m
        ).filter(Boolean);
        setSubjectsList(mappedSubjects);
        return mappedSubjects;
      }
    } catch (err) {
      // ignore, fallback below
    }
    // Fallback: fetch all subjects
    try {
      const subRes = await api.get('/admin/academic/subjects');
      if (subRes.data && subRes.data.data && subRes.data.data.length > 0) {
        setSubjectsList(subRes.data.data);
        return subRes.data.data;
      }
    } catch (e) {
      console.error('Failed to fetch subjects:', e);
    }
    return [];
  };

  const handleCreateExam = async (e) => {
    e.preventDefault();
    if (!newExamName.trim() || !newClassId) {
      addToast('Please provide exam name and select target class', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        name: newExamName.trim(),
        examType: newExamType,
        session: newSession,
        classId: newClassId,
        section: newSection,
        startDate: newStartDate || undefined,
        endDate: newEndDate || undefined,
      };

      const res = await api.post('/exams', payload);
      if (res.data && res.data.data) {
        addToast('Examination created successfully!', 'success');
        setShowCreateModal(false);
        setNewExamName('');
        fetchInitialData();
      }
    } catch (err) {
      console.error('Failed to create exam:', err);
      addToast(err.response?.data?.message || 'Failed to create examination', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const openConfigureSubjects = async (exam) => {
    setSelectedExam(exam);
    const targetClassId = exam.class?._id || exam.class;
    const availSubs = await fetchClassSubjects(targetClassId);

    // Populate existing configs or defaults
    const existing = exam.subjectsConfig || [];
    const initialConfigs = availSubs.map((sub) => {
      const found = existing.find(
        (sc) => (sc.subject?._id || sc.subject) === sub._id
      );
      return {
        subjectId: sub._id,
        subjectName: sub.name,
        type: sub.type || 'Theoretical',
        maxMarks: found ? found.maxMarks : 100,
        passMarks: found ? found.passMarks : 33,
        selected: !!found,
      };
    });

    setSubjectConfigs(initialConfigs);
    setShowSubjectModal(true);
  };

  const handleSaveSubjects = async () => {
    if (!selectedExam) return;
    const activeConfigs = subjectConfigs.filter((sc) => sc.selected);
    if (activeConfigs.length === 0) {
      addToast('Please select at least one subject to configure', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        subjectsConfig: activeConfigs.map((sc) => ({
          subjectId: sc.subjectId,
          maxMarks: Number(sc.maxMarks),
          passMarks: Number(sc.passMarks),
        })),
      };

      const res = await api.post(`/exams/${selectedExam._id}/subjects`, payload);
      if (res.data && res.data.data) {
        addToast('Exam subjects and marks configured successfully!', 'success');
        setShowSubjectModal(false);
        fetchInitialData();
      }
    } catch (err) {
      console.error('Failed to save subject configuration:', err);
      addToast(err.response?.data?.message || 'Failed to save subject configuration', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckReadiness = async (examId) => {
    try {
      const res = await api.get(`/exams/${examId}/readiness`);
      if (res.data && res.data.data) {
        setReadinessInfo(res.data.data);
      }
    } catch (err) {
      addToast('Failed to check readiness status', 'error');
    }
  };

  const handleDeleteExam = async (exam) => {
    if (!window.confirm(`Are you sure you want to delete '${exam.name}'?`)) return;

    try {
      await api.delete(`/exams/${exam._id}`);
      addToast('Examination deleted successfully', 'success');
      fetchInitialData();
    } catch (err) {
      console.error('Failed to delete exam:', err);
      addToast(err.response?.data?.message || 'Failed to delete examination', 'error');
    }
  };

  const filteredExams = exams.filter((ex) => {
    if (filterSession !== 'ALL' && ex.session !== filterSession) return false;
    if (filterExamType !== 'ALL' && ex.examType !== filterExamType) return false;
    if (filterClassId !== 'ALL' && (ex.class?._id || ex.class) !== filterClassId) return false;
    if (filterStatus !== 'ALL' && ex.status !== filterStatus) return false;
    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-orange-100 text-orange-600 rounded-xl">
              <Settings className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-black text-slate-900">Exam Setup & Administration</h1>
          </div>
          <p className="text-xs font-bold text-slate-500 mt-1">
            Configure examinations, assign classes, subjects, maximum/passing marks, and verify readiness
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>+ Create Examination</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Filter className="w-4 h-4 text-orange-600" />
          <span className="text-xs font-black uppercase text-slate-800 tracking-wider">Filter Examinations</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Session</label>
            <select
              value={filterSession}
              onChange={(e) => setFilterSession(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-orange-500"
            >
              <option value="ALL">All Sessions</option>
              <option value="2026-2027">2026-2027</option>
              <option value="2025-2026">2025-2026</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Exam Type</label>
            <select
              value={filterExamType}
              onChange={(e) => setFilterExamType(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-orange-500"
            >
              <option value="ALL">All Types</option>
              <option value="MONTHLY">MONTHLY</option>
              <option value="HALF_YEARLY">HALF_YEARLY</option>
              <option value="ANNUAL">ANNUAL</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Class</label>
            <select
              value={filterClassId}
              onChange={(e) => setFilterClassId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-orange-500"
            >
              <option value="ALL">All Classes</option>
              {classes.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name} ({c.section})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-orange-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="Draft">Draft</option>
              <option value="Ongoing">Ongoing</option>
              <option value="Finalized">Finalized</option>
              <option value="Published">Published</option>
            </select>
          </div>
        </div>
      </div>

      {/* Examinations Table */}
      {loading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin text-orange-600 mx-auto" />
          <p className="text-xs font-extrabold text-slate-600">Loading examinations data...</p>
        </div>
      ) : filteredExams.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-2">
          <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-black text-slate-700">No Examinations Found</h3>
          <p className="text-xs text-slate-400">Create an examination or adjust filter criteria.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-900 text-white font-extrabold uppercase text-[10px]">
                  <th className="py-3 px-4">Exam Name</th>
                  <th className="py-3 px-3 text-center">Type</th>
                  <th className="py-3 px-3 text-center">Session</th>
                  <th className="py-3 px-3">Class & Section</th>
                  <th className="py-3 px-3 text-center">Configured Subjects</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredExams.map((ex) => (
                  <tr key={ex._id} className="hover:bg-slate-50/80">
                    <td className="py-3.5 px-4 font-extrabold text-slate-900">{ex.name}</td>
                    <td className="py-3.5 px-3 text-center">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded font-black text-[10px]">
                        {ex.examType}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-center font-bold text-slate-600">{ex.session}</td>
                    <td className="py-3.5 px-3 font-bold text-slate-800">
                      {ex.class?.name || 'Class'} ({ex.section || 'A'})
                    </td>
                    <td className="py-3.5 px-3 text-center font-black text-orange-600">
                      {ex.subjectsConfig ? ex.subjectsConfig.length : 0} Subjects
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          ex.status === 'Published'
                            ? 'bg-emerald-500 text-white'
                            : ex.status === 'Finalized'
                            ? 'bg-blue-600 text-white'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {ex.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => openConfigureSubjects(ex)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-all"
                        >
                          <Settings className="w-3.5 h-3.5 text-orange-600" />
                          <span>Configure</span>
                        </button>

                        <button
                          onClick={() => handleCheckReadiness(ex._id)}
                          className="p-1.5 bg-slate-100 hover:bg-blue-50 text-blue-600 rounded-lg cursor-pointer transition-all"
                          title="Check Readiness"
                        >
                          <FileCheck className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleDeleteExam(ex)}
                          disabled={ex.status === 'Published' || ex.status === 'Finalized'}
                          className="p-1.5 bg-slate-100 hover:bg-rose-50 text-rose-600 disabled:opacity-30 rounded-lg cursor-pointer transition-all"
                          title="Delete Exam"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal 1: Create Examination */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black uppercase text-slate-900">Create New Examination</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateExam} className="space-y-3">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Exam Name *</label>
                <input
                  type="text"
                  placeholder="e.g. August Monthly Examination"
                  value={newExamName}
                  onChange={(e) => setNewExamName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-orange-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Exam Type *</label>
                  <select
                    value={newExamType}
                    onChange={(e) => setNewExamType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-orange-500"
                  >
                    <option value="MONTHLY">MONTHLY</option>
                    <option value="HALF_YEARLY">HALF_YEARLY</option>
                    <option value="ANNUAL">ANNUAL</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Academic Session *</label>
                  <select
                    value={newSession}
                    onChange={(e) => setNewSession(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-orange-500"
                  >
                    <option value="2026-2027">2026-2027</option>
                    <option value="2025-2026">2025-2026</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Target Class *</label>
                  <select
                    value={newClassId}
                    onChange={(e) => setNewClassId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-orange-500"
                    required
                  >
                    {classes.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name} ({c.section})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Section</label>
                  <input
                    type="text"
                    value={newSection}
                    onChange={(e) => setNewSection(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={newStartDate}
                    onChange={(e) => setNewStartDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">End Date</label>
                  <input
                    type="date"
                    value={newEndDate}
                    onChange={(e) => setNewEndDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-black cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create Examination'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Configure Subjects & Marks */}
      {showSubjectModal && selectedExam && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl border border-slate-200 shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-black uppercase text-slate-900">Configure Exam Subjects & Marks</h3>
                <p className="text-xs text-slate-500 font-bold">{selectedExam.name} • {selectedExam.class?.name}</p>
              </div>
              <button onClick={() => setShowSubjectModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              {subjectConfigs.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">No mapped subjects found for this class.</p>
              ) : (
                subjectConfigs.map((sc, idx) => (
                  <div key={sc.subjectId} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                    <input
                      type="checkbox"
                      checked={sc.selected}
                      onChange={(e) => {
                        const copy = [...subjectConfigs];
                        copy[idx].selected = e.target.checked;
                        setSubjectConfigs(copy);
                      }}
                      className="w-4 h-4 accent-orange-600 cursor-pointer"
                    />

                    <div className="flex-1">
                      <span className="text-xs font-black text-slate-900 block">{sc.subjectName}</span>
                      <span className="text-[10px] text-slate-500 font-bold block">{sc.type}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block">Max Marks</span>
                        <input
                          type="number"
                          value={sc.maxMarks}
                          disabled={!sc.selected}
                          onChange={(e) => {
                            const copy = [...subjectConfigs];
                            copy[idx].maxMarks = e.target.value;
                            setSubjectConfigs(copy);
                          }}
                          className="w-20 bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-black text-center"
                        />
                      </div>

                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block">Pass Marks</span>
                        <input
                          type="number"
                          value={sc.passMarks}
                          disabled={!sc.selected}
                          onChange={(e) => {
                            const copy = [...subjectConfigs];
                            copy[idx].passMarks = e.target.value;
                            setSubjectConfigs(copy);
                          }}
                          className="w-20 bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-black text-center"
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
              <button
                onClick={() => setShowSubjectModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSubjects}
                disabled={submitting}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-black cursor-pointer shadow-xs disabled:opacity-50"
              >
                {submitting ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Readiness Popup */}
      {readinessInfo && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black uppercase text-slate-900">Marks-Entry Readiness Verification</h3>
              <button onClick={() => setReadinessInfo(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                {readinessInfo.isReady ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-amber-500" />
                )}
                <div>
                  <h4 className="text-xs font-black text-slate-900">{readinessInfo.name}</h4>
                  <span
                    className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                      readinessInfo.isReady ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {readinessInfo.status}
                  </span>
                </div>
              </div>

              {readinessInfo.missingItems && readinessInfo.missingItems.length > 0 ? (
                <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-xs space-y-1">
                  <span className="font-bold text-amber-900 block">Missing Items:</span>
                  <ul className="list-disc pl-4 text-amber-800 font-medium space-y-0.5">
                    {readinessInfo.missingItems.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 text-xs text-emerald-900 font-bold">
                  All configuration requirements met! Examination is 100% ready for teacher marks entry.
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setReadinessInfo(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-black cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamManagement;
