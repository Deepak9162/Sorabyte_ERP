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
import { useLocation } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

const ExamManagement = () => {
  const location = useLocation();
  const [exams, setExams] = useState([]);
  const [classes, setClasses] = useState([]);
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
  const [editMode, setEditMode] = useState(false);
  const [managementInfo, setManagementInfo] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteInfo, setDeleteInfo] = useState(null);
  const [deleteInfoLoading, setDeleteInfoLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [impactWarning, setImpactWarning] = useState('');
  const [dashboardEditHandled, setDashboardEditHandled] = useState(false);
  const [dashboardDeleteHandled, setDashboardDeleteHandled] = useState(false);

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
  const [assignmentSubjectIndex, setAssignmentSubjectIndex] = useState(null);
  const [assignmentStudents, setAssignmentStudents] = useState([]);
  const [assignmentSearch, setAssignmentSearch] = useState('');
  const [assignmentLoading, setAssignmentLoading] = useState(false);

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
        return mappedSubjects;
      }
    } catch {
      // ignore, fallback below
    }
    // Fallback: fetch all subjects
    try {
      const subRes = await api.get('/admin/academic/subjects');
      if (subRes.data && subRes.data.data && subRes.data.data.length > 0) {
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

  const buildSubjectConfigs = (exam, availableSubjects) => {
    const existing = exam.subjectsConfig || [];
    const byId = new Map();

    (availableSubjects || []).forEach((sub) => {
      if (sub?._id) byId.set(String(sub._id), sub);
    });
    existing.forEach((sc) => {
      const subject = sc.subject;
      const subjectId = subject?._id || subject;
      if (subjectId && !byId.has(String(subjectId))) {
        byId.set(String(subjectId), {
          _id: subjectId,
          name: subject?.name || 'Existing Subject',
          type: subject?.type || 'Theoretical',
        });
      }
    });

    return [...byId.values()].map((sub) => {
      const found = existing.find(
        (sc) => String(sc.subject?._id || sc.subject) === String(sub._id)
      );
      return {
        subjectId: sub._id,
        subjectName: sub.name,
        type: sub.type || 'Theoretical',
        maxMarks: found ? found.maxMarks : 100,
        passMarks: found ? found.passMarks : 33,
        applicability: found?.applicability === 'OPTIONAL' ? 'OPTIONAL' : 'COMPULSORY',
        applicableStudents: found?.applicableStudents
          ? found.applicableStudents.map((student) => student?._id || student)
          : [],
        selected: !!found,
      };
    });
  };

  const populateExamForm = (exam) => {
    setNewExamName(exam.name || '');
    setNewExamType(exam.examType || 'MONTHLY');
    setNewSession(exam.session || '2026-2027');
    setNewClassId(exam.class?._id || exam.class || '');
    setNewSection(exam.section ?? '');
    setNewStartDate(exam.startDate ? String(exam.startDate).slice(0, 10) : '');
    setNewEndDate(exam.endDate ? String(exam.endDate).slice(0, 10) : '');
  };

  const openConfigureSubjects = async (exam) => {
    setEditMode(false);
    setManagementInfo(null);
    setSelectedExam(exam);
    const targetClassId = exam.class?._id || exam.class;
    const availSubs = await fetchClassSubjects(targetClassId);
    setSubjectConfigs(buildSubjectConfigs(exam, availSubs));
    setShowSubjectModal(true);
  };

  const openEditExam = async (exam) => {
    try {
      setSubmitting(true);
      const infoRes = await api.get('/exams/' + exam._id + '/management-info');
      const info = infoRes.data?.data;
      const freshExam = info?.exam || exam;

      setManagementInfo(info || null);
      setSelectedExam(freshExam);
      populateExamForm(freshExam);

      const targetClassId = freshExam.class?._id || freshExam.class;
      const availSubs = await fetchClassSubjects(targetClassId);
      setSubjectConfigs(buildSubjectConfigs(freshExam, availSubs));

      setEditMode(true);
      setShowSubjectModal(true);
    } catch (err) {
      console.error('Failed to open exam editor:', err);
      addToast(err.response?.data?.message || 'Failed to load exam for editing', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    const editExamId = location.state?.editExamId;
    if (!editExamId || dashboardEditHandled || exams.length === 0) return;

    const exam = exams.find((item) => item._id === editExamId);
    if (exam) {
      setDashboardEditHandled(true);
      openEditExam(exam);
    }
  }, [location.state, dashboardEditHandled, exams]);

  const openAssignmentModal = async (index) => {
    const targetClassId = selectedExam?.class?._id || selectedExam?.class;
    if (!targetClassId) return;

    try {
      setAssignmentLoading(true);
      setAssignmentSearch('');
      setAssignmentSubjectIndex(index);
      const res = await api.get('/exams/applicability/students', {
        params: { classId: targetClassId },
      });
      setAssignmentStudents(res.data?.data || []);
    } catch (err) {
      console.error('Failed to load applicability students:', err);
      addToast(err.response?.data?.message || 'Failed to load class students', 'error');
      setAssignmentSubjectIndex(null);
    } finally {
      setAssignmentLoading(false);
    }
  };

  const toggleAssignedStudent = (studentId) => {
    if (assignmentSubjectIndex === null) return;
    setSubjectConfigs((prev) =>
      prev.map((config, index) => {
        if (index !== assignmentSubjectIndex) return config;
        const current = new Set(config.applicableStudents || []);
        if (current.has(studentId)) current.delete(studentId);
        else current.add(studentId);
        return { ...config, applicableStudents: [...current] };
      })
    );
  };

  const setAllAssignedStudents = (selected) => {
    if (assignmentSubjectIndex === null) return;
    const ids = selected ? assignmentStudents.map((student) => student._id) : [];
    setSubjectConfigs((prev) =>
      prev.map((config, index) =>
        index === assignmentSubjectIndex
          ? { ...config, applicableStudents: ids }
          : config
      )
    );
  };

  const submitSubjectConfiguration = async (confirmExistingMarksImpact = false) => {
    if (!selectedExam) return;

    const activeConfigs = subjectConfigs.filter((sc) => sc.selected);
    if (activeConfigs.length === 0) {
      addToast('Please select at least one subject to configure', 'error');
      return;
    }

    const subjectsConfig = activeConfigs.map((sc) => ({
      subjectId: sc.subjectId,
      maxMarks: Number(sc.maxMarks),
      passMarks: Number(sc.passMarks),
      applicability: sc.applicability === 'OPTIONAL' ? 'OPTIONAL' : 'COMPULSORY',
      applicableStudents:
        sc.applicability === 'OPTIONAL' ? (sc.applicableStudents || []) : [],
    }));

    try {
      setSubmitting(true);

      let res;
      if (editMode) {
        const editPayload = {
          name: newExamName.trim(),
          startDate: newStartDate || undefined,
          endDate: newEndDate || undefined,
          subjectsConfig,
          confirmExistingMarksImpact,
        };

        const existingClassId = String(
          selectedExam.class?._id || selectedExam.class || ''
        );
        const existingExamType = String(selectedExam.examType || '').trim();
        const existingSession = String(selectedExam.session || '').trim();
        const existingSection = String(selectedExam.section ?? '').trim();

        if (String(newExamType || '').trim() !== existingExamType) {
          editPayload.examType = newExamType;
        }
        if (String(newSession || '').trim() !== existingSession) {
          editPayload.session = newSession;
        }
        if (String(newClassId || '') !== existingClassId) {
          editPayload.classId = newClassId;
        }
        if (String(newSection ?? '').trim() !== existingSection) {
          editPayload.section = newSection;
        }

        res = await api.put('/exams/' + selectedExam._id, editPayload);
      } else {
        res = await api.post('/exams/' + selectedExam._id + '/subjects', {
          subjectsConfig,
          confirmExistingMarksImpact,
        });
      }

      if (res.data?.data) {
        addToast(
          editMode
            ? 'Exam updated successfully. Existing marks were preserved.'
            : 'Exam subjects and marks configured successfully!',
          'success'
        );
        setImpactWarning('');
        setShowSubjectModal(false);
        setEditMode(false);
        setManagementInfo(null);
        await fetchInitialData();
      }
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to save exam configuration';
      if (
        err.response?.status === 409 &&
        message.toLowerCase().includes('applicability') &&
        !confirmExistingMarksImpact
      ) {
        setImpactWarning(message);
      } else {
        console.error('Failed to save exam configuration:', err);
        addToast(message, 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveSubjects = async () => {
    await submitSubjectConfiguration(false);
  };

  const handleCheckReadiness = async (examId) => {
    try {
      const res = await api.get(`/exams/${examId}/readiness`);
      if (res.data && res.data.data) {
        setReadinessInfo(res.data.data);
      }
    } catch {
      addToast('Failed to check readiness status', 'error');
    }
  };

  const handleDeleteExam = async (exam) => {
    try {
      setDeleteTarget(exam);
      setDeleteInfo(null);
      setDeleteInfoLoading(true);
      const res = await api.get('/exams/' + exam._id + '/management-info');
      setDeleteInfo(res.data?.data || null);
    } catch (err) {
      console.error('Failed to inspect exam dependencies:', err);
      addToast(err.response?.data?.message || 'Failed to inspect exam before deletion', 'error');
      setDeleteTarget(null);
    } finally {
      setDeleteInfoLoading(false);
    }
  };

  const confirmDeleteExam = async () => {
    if (!deleteTarget || !deleteInfo?.canDelete || deleting) return;

    try {
      setDeleting(true);
      await api.delete('/exams/' + deleteTarget._id);
      addToast('Examination deleted successfully', 'success');
      setDeleteTarget(null);
      setDeleteInfo(null);
      await fetchInitialData();
    } catch (err) {
      console.error('Failed to delete exam:', err);
      addToast(err.response?.data?.message || 'Failed to delete examination', 'error');
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    const deleteExamId = location.state?.deleteExamId;
    if (!deleteExamId || dashboardDeleteHandled || exams.length === 0) return;

    const exam = exams.find((item) => item._id === deleteExamId);
    if (exam) {
      setDashboardDeleteHandled(true);
      handleDeleteExam(exam);
    }
  }, [location.state, dashboardDeleteHandled, exams]);

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
                          onClick={() => openEditExam(ex)}
                          className="px-2.5 py-1 bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 rounded-lg font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-all"
                          title="Edit Exam"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>

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
                          className="p-1.5 bg-slate-100 hover:bg-rose-50 text-rose-600 rounded-lg cursor-pointer transition-all"
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
                <h3 className="text-sm font-black uppercase text-slate-900">
                  {editMode ? 'Edit & Configure Exam' : 'Configure Exam Subjects & Marks'}
                </h3>
                <p className="text-xs text-slate-500 font-bold">{selectedExam.name} • {selectedExam.class?.name}</p>
              </div>
              <button onClick={() => setShowSubjectModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {editMode && (
              <div className="space-y-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                {managementInfo?.locks?.structuralLocked && (
                  <div className="flex gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] font-bold text-amber-900">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>
                      This exam is Finalized/Published. Reopen the result before structural editing.
                    </span>
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Exam Name *</label>
                  <input
                    type="text"
                    value={newExamName}
                    onChange={(e) => setNewExamName(e.target.value)}
                    disabled={managementInfo?.locks?.structuralLocked}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold disabled:bg-slate-100 disabled:text-slate-400"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Exam Type</label>
                    <select
                      value={newExamType}
                      onChange={(e) => setNewExamType(e.target.value)}
                      disabled={managementInfo?.locks?.identityLocked || managementInfo?.locks?.structuralLocked}
                      className="w-full bg-white border border-slate-200 rounded-xl px-2 py-2 text-xs font-bold disabled:bg-slate-100 disabled:text-slate-400"
                    >
                      <option value="MONTHLY">MONTHLY</option>
                      <option value="HALF_YEARLY">HALF_YEARLY</option>
                      <option value="ANNUAL">ANNUAL</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Academic Session</label>
                    <select
                      value={newSession}
                      onChange={(e) => setNewSession(e.target.value)}
                      disabled={managementInfo?.locks?.identityLocked || managementInfo?.locks?.structuralLocked}
                      className="w-full bg-white border border-slate-200 rounded-xl px-2 py-2 text-xs font-bold disabled:bg-slate-100 disabled:text-slate-400"
                    >
                      <option value="2026-2027">2026-2027</option>
                      <option value="2025-2026">2025-2026</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Class Group</label>
                    <select
                      value={newClassId}
                      onChange={(e) => setNewClassId(e.target.value)}
                      disabled={managementInfo?.locks?.identityLocked || managementInfo?.locks?.structuralLocked}
                      className="w-full bg-white border border-slate-200 rounded-xl px-2 py-2 text-xs font-bold disabled:bg-slate-100 disabled:text-slate-400"
                    >
                      {classes.map((c) => (
                        <option key={c._id} value={c._id}>{c.name} ({c.section})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Section</label>
                    <input value={newSection} onChange={(e) => setNewSection(e.target.value)} disabled={managementInfo?.locks?.identityLocked || managementInfo?.locks?.structuralLocked} className="w-full bg-white border border-slate-200 rounded-xl px-2 py-2 text-xs font-bold disabled:bg-slate-100" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Start Date</label>
                    <input type="date" value={newStartDate} onChange={(e) => setNewStartDate(e.target.value)} disabled={managementInfo?.locks?.structuralLocked} className="w-full bg-white border border-slate-200 rounded-xl px-2 py-2 text-xs font-bold disabled:bg-slate-100" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">End Date</label>
                    <input type="date" value={newEndDate} onChange={(e) => setNewEndDate(e.target.value)} disabled={managementInfo?.locks?.structuralLocked} className="w-full bg-white border border-slate-200 rounded-xl px-2 py-2 text-xs font-bold disabled:bg-slate-100" />
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {subjectConfigs.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">No mapped subjects found for this class.</p>
              ) : (
                subjectConfigs.map((sc, idx) => (
                  <div key={sc.subjectId} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                    <input
                      type="checkbox"
                      checked={sc.selected}
                      disabled={editMode && managementInfo?.locks?.structuralLocked}
                      onChange={(e) => {
                        const copy = [...subjectConfigs];
                        copy[idx].selected = e.target.checked;
                        setSubjectConfigs(copy);
                      }}
                      className="w-4 h-4 accent-orange-600 cursor-pointer"
                    />

                    <div className="flex-1 min-w-[150px]">
                      <span className="text-xs font-black text-slate-900 block">{sc.subjectName}</span>
                      <span className="text-[10px] text-slate-500 font-bold block">{sc.type}</span>
                      {sc.selected && (
                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                          <select
                            value={sc.applicability || 'COMPULSORY'}
                            disabled={editMode && managementInfo?.locks?.structuralLocked}
                            onChange={(e) => {
                              const copy = [...subjectConfigs];
                              copy[idx] = {
                                ...copy[idx],
                                applicability: e.target.value,
                                applicableStudents:
                                  e.target.value === 'OPTIONAL'
                                    ? (copy[idx].applicableStudents || [])
                                    : [],
                              };
                              setSubjectConfigs(copy);
                            }}
                            className="h-7 px-2 bg-white border border-slate-200 rounded-lg text-[10px] font-black text-slate-700"
                          >
                            <option value="COMPULSORY">Compulsory</option>
                            <option value="OPTIONAL">Optional</option>
                          </select>

                          {sc.applicability === 'OPTIONAL' && (
                            <button
                              type="button"
                              onClick={() => openAssignmentModal(idx)}
                              disabled={editMode && managementInfo?.locks?.structuralLocked}
                              className="h-7 px-2.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-black cursor-pointer"
                            >
                              Assign Students ({(sc.applicableStudents || []).length})
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block">Max Marks</span>
                        <input
                          type="number"
                          value={sc.maxMarks}
                          disabled={!sc.selected || (editMode && managementInfo?.locks?.structuralLocked)}
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
                          disabled={!sc.selected || (editMode && managementInfo?.locks?.structuralLocked)}
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
                disabled={submitting || (editMode && managementInfo?.locks?.structuralLocked)}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-black cursor-pointer shadow-xs disabled:opacity-50"
              >
                {submitting ? 'Saving...' : editMode ? 'Save Changes' : 'Save Configuration'}
              </button>
            </div>
          </div>
        </div>
      )}

      {assignmentSubjectIndex !== null && (
        <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl border border-slate-200 shadow-2xl p-5 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900">Assign Optional Subject Students</h3>
                <p className="text-[11px] text-slate-500 font-bold">
                  {subjectConfigs[assignmentSubjectIndex]?.subjectName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAssignmentSubjectIndex(null)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <input
              type="text"
              value={assignmentSearch}
              onChange={(e) => setAssignmentSearch(e.target.value)}
              placeholder="Search student name or roll number..."
              className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-orange-500"
            />

            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setAllAssignedStudents(true)} className="px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 text-[10px] font-black border border-indigo-200">
                Select All
              </button>
              <button type="button" onClick={() => setAllAssignedStudents(false)} className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-[10px] font-black border border-slate-200">
                Clear All
              </button>
            </div>

            <div className="overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
              {assignmentLoading ? (
                <p className="p-6 text-center text-xs font-bold text-slate-500">Loading students...</p>
              ) : assignmentStudents
                  .filter((student) => {
                    const q = assignmentSearch.trim().toLowerCase();
                    if (!q) return true;
                    return (
                      (student.fullName || '').toLowerCase().includes(q) ||
                      String(student.rollNumber || '').toLowerCase().includes(q)
                    );
                  })
                  .map((student) => {
                    const selected = (subjectConfigs[assignmentSubjectIndex]?.applicableStudents || [])
                      .includes(student._id);
                    return (
                      <label key={student._id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleAssignedStudent(student._id)}
                          className="w-4 h-4 accent-orange-600"
                        />
                        <span className="w-12 text-[10px] font-black text-slate-500">
                          Roll {student.rollNumber || '-'}
                        </span>
                        <span className="text-xs font-bold text-slate-900 flex-1">{student.fullName}</span>
                      </label>
                    );
                  })}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setAssignmentSubjectIndex(null)}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-black"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {impactWarning && (
        <div className="fixed inset-0 z-[70] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl border border-slate-200 shadow-2xl p-5 space-y-4">
            <div className="flex gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-black text-slate-900">Confirm Applicability Change</h3>
                <p className="text-xs text-slate-600 font-medium mt-1">{impactWarning}</p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setImpactWarning('')} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold">
                Cancel
              </button>
              <button type="button" disabled={submitting} onClick={() => submitSubjectConfiguration(true)} className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black disabled:opacity-50">
                {submitting ? 'Saving...' : 'Confirm Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-[70] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl border border-slate-200 shadow-2xl p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-black text-slate-900">Delete Exam?</h3>
                <p className="text-xs font-black text-slate-800 mt-1">{deleteTarget.name}</p>
                <p className="text-[11px] text-slate-500 font-bold mt-0.5">
                  Class: {deleteTarget.class?.name || '-'} ({deleteTarget.section || deleteTarget.class?.section || 'A'}) • Session: {deleteTarget.session}
                </p>
              </div>
              <button type="button" onClick={() => { setDeleteTarget(null); setDeleteInfo(null); }} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {deleteInfoLoading ? (
              <div className="py-6 flex items-center justify-center gap-2 text-xs font-bold text-slate-500">
                <RefreshCw className="w-4 h-4 animate-spin" /> Checking academic dependencies...
              </div>
            ) : deleteInfo ? (
              <div className={deleteInfo.canDelete ? "p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-900" : "p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-900"}>
                {deleteInfo.deleteMessage}
              </div>
            ) : null}

            {deleteInfo && !deleteInfo.canDelete && (
              <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-slate-600">
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-2">Marks: {deleteInfo.dependencies?.marksCount || 0}</div>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-2">Result Versions: {deleteInfo.dependencies?.resultVersionsCount || 0}</div>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-2">Student Details: {deleteInfo.dependencies?.studentDetailsCount || 0}</div>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-2">Schedule Entries: {deleteInfo.dependencies?.scheduleEntriesCount || 0}</div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button type="button" disabled={deleting} onClick={() => { setDeleteTarget(null); setDeleteInfo(null); }} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold disabled:opacity-50">
                Cancel
              </button>
              <button
                type="button"
                disabled={!deleteInfo?.canDelete || deleting || deleteInfoLoading}
                onClick={confirmDeleteExam}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {deleting ? 'Deleting...' : 'Delete Exam'}
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
