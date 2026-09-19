import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Award,
  BookOpen,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  Filter,
  AlertTriangle,
  Save,
  Search,
  User,
  XCircle,
  HelpCircle,
  Plus,
  RefreshCw,
  Clock,
  Sparkles,
  Download,
  Upload,
  FileSpreadsheet,
  X,
} from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

const MarksEntry = () => {
  const { user } = useAuth();
  const { addToast } = useToast();

  // Filter Bar State
  const [sessions, setSessions] = useState(['2026-2027', '2025-2026']);
  const [selectedSession, setSelectedSession] = useState('2026-2027');
  const [selectedExamType, setSelectedExamType] = useState('');
  
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [allExams, setAllExams] = useState([]);
  const [allClasses, setAllClasses] = useState([]);

  const [selectedExamId, setSelectedExamId] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');

  // Roster & Student Marks State
  const [rosterData, setRosterData] = useState(null);
  const [studentRows, setStudentRows] = useState([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Unsaved Changes Protection
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [pendingFilterChange, setPendingFilterChange] = useState(null);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);

  // Admin Quick Config Modal State
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminExamName, setAdminExamName] = useState('');
  const [adminExamType, setAdminExamType] = useState('MONTHLY');
  const [adminClassId, setAdminClassId] = useState('');
  const [adminSubjects, setAdminSubjects] = useState([]);

  // Result Status Control & Reopen Modal State
  const [showReopenModal, setShowReopenModal] = useState(false);
  const [reopenReason, setReopenReason] = useState('');
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [adminConfigList, setAdminConfigList] = useState([]);
  const [adminSubjectsLoading, setAdminSubjectsLoading] = useState(false);
  const [isCreatingExam, setIsCreatingExam] = useState(false);

  // Phase 18: Excel Import & Export States
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [validatingImport, setValidatingImport] = useState(false);
  const [importPreview, setImportPreview] = useState(null);
  const [confirmingImport, setConfirmingImport] = useState(false);

  // Phase 20: Correction Request Modal States
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [correctionStudent, setCorrectionStudent] = useState(null);
  const [requestedMarks, setRequestedMarks] = useState('');
  const [correctionReason, setCorrectionReason] = useState('');
  const [submittingCorrection, setSubmittingCorrection] = useState(false);

  const openCorrectionModal = (studentRow) => {
    setCorrectionStudent(studentRow);
    setRequestedMarks(studentRow.marksObtained !== null && studentRow.marksObtained !== undefined ? studentRow.marksObtained.toString() : '');
    setCorrectionReason('');
    setShowCorrectionModal(true);
  };

  const handleCorrectionSubmit = async (e) => {
    e.preventDefault();
    if (!correctionStudent || !correctionReason.trim()) {
      addToast('Please provide a valid justification reason', 'error');
      return;
    }

    try {
      setSubmittingCorrection(true);
      const payload = {
        examId: selectedExamId,
        studentId: correctionStudent.studentId || correctionStudent._id,
        subjectId: selectedSubjectId,
        requestedMarks: Number(requestedMarks),
        reason: correctionReason.trim(),
      };

      const res = await api.post('/exams/correction-requests', payload);
      if (res.data && res.data.success) {
        addToast('Marks correction request submitted successfully for Admin review!', 'success');
        setShowCorrectionModal(false);
        setCorrectionStudent(null);
        setCorrectionReason('');
      }
    } catch (err) {
      console.error('Failed to submit correction request:', err);
      addToast(err.response?.data?.message || 'Failed to submit correction request', 'error');
    } finally {
      setSubmittingCorrection(false);
    }
  };

  const handleDownloadTemplate = async () => {
    if (!selectedExamId || !selectedClassId || !selectedSubjectId) {
      addToast('Please select Exam, Class, Section, and Subject before downloading template', 'error');
      return;
    }

    try {
      const res = await api.get('/exams/marks/template', {
        params: {
          examId: selectedExamId,
          classId: selectedClassId,
          subjectId: selectedSubjectId,
          section: selectedSection !== 'All' ? selectedSection : undefined,
        },
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      const contentDisposition = res.headers['content-disposition'];
      let filename = 'Marks_Template.xlsx';
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match && match[1]) filename = match[1];
      }
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      addToast('Marks template downloaded successfully!', 'success');
    } catch (err) {
      console.error('Failed to download marks template:', err);
      addToast('Failed to download template', 'error');
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setImportFile(e.target.files[0]);
      setImportPreview(null);
    }
  };

  const handleValidateImport = async () => {
    if (!importFile) {
      addToast('Please select a spreadsheet file (.xlsx) to upload', 'error');
      return;
    }

    try {
      setValidatingImport(true);
      const formData = new FormData();
      formData.append('file', importFile);
      formData.append('examId', selectedExamId);
      formData.append('classId', selectedClassId);
      formData.append('subjectId', selectedSubjectId);
      if (selectedSection && selectedSection !== 'All') {
        formData.append('section', selectedSection);
      }

      const res = await api.post('/exams/marks/import/validate', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data && res.data.data) {
        setImportPreview(res.data.data);
        addToast('File parsed and validated successfully!', 'success');
      }
    } catch (err) {
      console.error('Import validation failed:', err);
      addToast(err.response?.data?.message || 'Failed to validate imported file', 'error');
    } finally {
      setValidatingImport(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!importPreview || !importPreview.rows || importPreview.rows.length === 0) return;

    const validRowsToSave = importPreview.rows.filter(
      (r) => (r.status === 'NEW' || r.status === 'CHANGED' || r.status === 'UNCHANGED' || r.status === 'VALID') && typeof r.importedMarks === 'number'
    );

    if (validRowsToSave.length === 0) {
      addToast('No valid marks found to import', 'error');
      return;
    }

    try {
      setConfirmingImport(true);
      const payload = {
        examId: selectedExamId,
        classId: selectedClassId,
        subjectId: selectedSubjectId,
        marks: validRowsToSave.map((r) => ({
          studentId: r.studentMongoId,
          marksObtained: r.importedMarks,
          remarks: r.remarks || '',
        })),
      };

      const res = await api.post('/exams/marks/bulk', payload);
      if (res.data && res.data.success) {
        addToast(res.data.message || 'Marks imported successfully!', 'success');
        setShowImportModal(false);
        setImportFile(null);
        setImportPreview(null);
        fetchRoster();
      }
    } catch (err) {
      console.error('Failed to confirm import:', err);
      addToast(err.response?.data?.message || 'Failed to save imported marks', 'error');
    } finally {
      setConfirmingImport(false);
    }
  };

  // Refs for keyboard navigation
  const inputRefs = useRef({});

  // ──────────────────────────────────────────────
  // 1. Fetch Dynamic Dropdown Options
  // ──────────────────────────────────────────────
  const fetchOptions = async () => {
    try {
      setOptionsLoading(true);
      const res = await api.get('/exams/options');
      if (res.data && res.data.data) {
        const { sessions: sessList, classes: clsList, exams: exList } = res.data.data;
        if (sessList && sessList.length > 0) setSessions(sessList);
        setAllClasses(clsList || []);
        setAllExams(exList || []);

        // Auto-select initial class if available
        if (clsList && clsList.length > 0 && !selectedClassId) {
          setSelectedClassId(clsList[0]._id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch options:', err);
      addToast(err.response?.data?.message || 'Failed to load examination options', 'error');
    } finally {
      setOptionsLoading(false);
    }
  };

  useEffect(() => {
    fetchOptions();
  }, []);

  // Filter available exams based on selected Session, ExamType, and Class
  const filteredExams = useMemo(() => {
    return allExams.filter((e) => {
      const sessionMatch = !selectedSession || e.session === selectedSession;
      const typeMatch = !selectedExamType || e.examType === selectedExamType;
      const classMatch = !selectedClassId || (e.class && ((e.class._id || e.class) === selectedClassId));
      return sessionMatch && typeMatch && classMatch;
    });
  }, [allExams, selectedSession, selectedExamType, selectedClassId]);

  // Auto-select first exam when filtered list changes
  useEffect(() => {
    if (filteredExams.length > 0) {
      const match = filteredExams.find((e) => e._id === selectedExamId);
      if (!match) {
        setSelectedExamId(filteredExams[0]._id);
      }
    } else {
      setSelectedExamId('');
    }
  }, [filteredExams]);

  // Get current exam object
  const currentExam = useMemo(() => {
    return allExams.find((e) => e._id === selectedExamId) || null;
  }, [allExams, selectedExamId]);

  const isReadOnly = useMemo(() => {
    return currentExam ? (currentExam.status === 'Finalized' || currentExam.status === 'Published') : false;
  }, [currentExam]);

  // Handlers for Exam Status Control
  const handleFinalizeExam = async () => {
    if (!currentExam) return;
    if (!window.confirm(`Are you sure you want to finalize results for '${currentExam.name}'? Normal teachers will no longer be able to modify marks.`)) {
      return;
    }
    try {
      setIsActionLoading(true);
      await api.post(`/exams/${currentExam._id}/finalize`);
      addToast('Exam result finalized successfully!', 'success');
      await fetchOptions();
    } catch (err) {
      console.error('Finalize exam failed:', err);
      addToast(err.response?.data?.message || 'Failed to finalize exam result', 'error');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handlePublishExam = async () => {
    if (!currentExam) return;
    if (!window.confirm(`Are you sure you want to officially publish results for '${currentExam.name}'?`)) {
      return;
    }
    try {
      setIsActionLoading(true);
      await api.post(`/exams/${currentExam._id}/publish`);
      addToast('Exam result published successfully!', 'success');
      await fetchOptions();
    } catch (err) {
      console.error('Publish exam failed:', err);
      addToast(err.response?.data?.message || 'Failed to publish exam result', 'error');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleReopenExamSubmit = async (e) => {
    e.preventDefault();
    if (!currentExam) return;
    if (!reopenReason.trim()) {
      addToast('Please provide a valid reason to reopen the exam result', 'error');
      return;
    }
    try {
      setIsActionLoading(true);
      await api.post(`/exams/${currentExam._id}/reopen`, { reason: reopenReason });
      addToast('Exam result reopened successfully for corrections', 'success');
      setShowReopenModal(false);
      setReopenReason('');
      await fetchOptions();
    } catch (err) {
      console.error('Reopen exam failed:', err);
      addToast(err.response?.data?.message || 'Failed to reopen exam result', 'error');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Subjects available for selected exam
  const availableSubjects = useMemo(() => {
    if (!currentExam || !currentExam.subjectsConfig) return [];
    return currentExam.subjectsConfig.map((sc) => sc.subject).filter(Boolean);
  }, [currentExam]);

  // Auto-select first subject when exam changes
  useEffect(() => {
    if (availableSubjects.length > 0) {
      const match = availableSubjects.find((s) => s._id === selectedSubjectId);
      if (!match) {
        setSelectedSubjectId(availableSubjects[0]._id);
      }
    } else {
      setSelectedSubjectId('');
    }
  }, [availableSubjects]);

  // ──────────────────────────────────────────────
  // 2. Fetch Class Roster & Existing Marks
  // ──────────────────────────────────────────────
  const fetchRoster = async () => {
    if (!selectedExamId || !selectedClassId || !selectedSubjectId) {
      setRosterData(null);
      setStudentRows([]);
      return;
    }

    try {
      setRosterLoading(true);
      const params = {
        examId: selectedExamId,
        classId: selectedClassId,
        subjectId: selectedSubjectId,
      };
      if (selectedSection && selectedSection !== 'All') {
        params.section = selectedSection;
      }

      const res = await api.get('/exams/roster', { params: { ...params, examId: selectedExamId, classId: selectedClassId, subjectId: selectedSubjectId } });
      if (res.data && res.data.data) {
        const data = res.data.data;
        setRosterData(data);
        setStudentRows(
          data.students.map((s) => ({
            ...s,
            originalMarks: s.marksObtained,
            originalAbsent: s.isAbsent,
            originalRemarks: s.remarks,
            isDirty: false,
            isInvalid: false,
            errorMessage: '',
          }))
        );
        setHasUnsavedChanges(false);
      }
    } catch (err) {
      console.error('Failed to fetch class roster:', err);
      addToast(err.response?.data?.message || 'Failed to load class roster for marks entry', 'error');
      setRosterData(null);
      setStudentRows([]);
    } finally {
      setRosterLoading(false);
    }
  };

  useEffect(() => {
    fetchRoster();
  }, [selectedExamId, selectedClassId, selectedSubjectId, selectedSection]);

  // ──────────────────────────────────────────────
  // 3. Unsaved Changes Guard Handler
  // ──────────────────────────────────────────────
  const handleFilterChange = (setter, value) => {
    if (hasUnsavedChanges) {
      setPendingFilterChange(() => () => setter(value));
      setShowUnsavedModal(true);
    } else {
      setter(value);
    }
  };

  const confirmFilterChange = () => {
    if (pendingFilterChange) {
      pendingFilterChange();
      setPendingFilterChange(null);
    }
    setHasUnsavedChanges(false);
    setShowUnsavedModal(false);
  };

  // ──────────────────────────────────────────────
  // 4. Mark Input & Local Real-time Validations
  // ──────────────────────────────────────────────
  const maxMarks = rosterData?.subjectConfig?.maxMarks || 100;
  const passMarks = rosterData?.subjectConfig?.passMarks || 33;

  const handleMarkChange = (studentId, val) => {
    setStudentRows((prev) =>
      prev.map((row) => {
        if (row.studentId !== studentId) return row;

        let num = val.trim();
        let isInvalid = false;
        let errMsg = '';

        if (num !== '') {
          const parsed = Number(num);
          if (isNaN(parsed)) {
            isInvalid = true;
            errMsg = 'Must be a valid number';
          } else if (parsed < 0) {
            isInvalid = true;
            errMsg = 'Cannot be negative';
          } else if (parsed > maxMarks) {
            isInvalid = true;
            errMsg = `Exceeds max marks (${maxMarks})`;
          }
        }

        const isDirty =
          num !== row.originalMarks.toString() ||
          row.isAbsent !== row.originalAbsent ||
          row.remarks !== row.originalRemarks;

        return {
          ...row,
          marksObtained: num,
          isAbsent: false, // reset absent if user enters marks
          isInvalid,
          errorMessage: errMsg,
          isDirty,
        };
      })
    );
    setHasUnsavedChanges(true);
  };

  const handleAbsentToggle = (studentId) => {
    setStudentRows((prev) =>
      prev.map((row) => {
        if (row.studentId !== studentId) return row;
        const nextAbsent = !row.isAbsent;
        return {
          ...row,
          isAbsent: nextAbsent,
          marksObtained: nextAbsent ? '' : row.marksObtained,
          isInvalid: false,
          errorMessage: '',
          isDirty: true,
        };
      })
    );
    setHasUnsavedChanges(true);
  };

  const handleRemarksChange = (studentId, remarksVal) => {
    setStudentRows((prev) =>
      prev.map((row) => {
        if (row.studentId !== studentId) return row;
        return {
          ...row,
          remarks: remarksVal,
          isDirty: true,
        };
      })
    );
    setHasUnsavedChanges(true);
  };

  // ──────────────────────────────────────────────
  // 5. Keyboard Navigation (Enter, Up, Down Arrows)
  // ──────────────────────────────────────────────
  const handleKeyDown = (e, index) => {
    const visibleRows = filteredStudentRows;
    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIdx = index + 1;
      if (nextIdx < visibleRows.length) {
        const nextId = visibleRows[nextIdx].studentId;
        if (inputRefs.current[nextId]) {
          inputRefs.current[nextId].focus();
          inputRefs.current[nextId].select();
        }
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIdx = index - 1;
      if (prevIdx >= 0) {
        const prevId = visibleRows[prevIdx].studentId;
        if (inputRefs.current[prevId]) {
          inputRefs.current[prevId].focus();
          inputRefs.current[prevId].select();
        }
      }
    }
  };

  // ──────────────────────────────────────────────
  // 6. Live In-Page Search & Live Metrics Summary
  // ──────────────────────────────────────────────
  const filteredStudentRows = useMemo(() => {
    if (!searchQuery.trim()) return studentRows;
    const q = searchQuery.toLowerCase();
    return studentRows.filter(
      (s) =>
        s.fullName.toLowerCase().includes(q) ||
        s.rollNumber.toString().toLowerCase().includes(q) ||
        (s.admissionNumber && s.admissionNumber.toLowerCase().includes(q))
    );
  }, [studentRows, searchQuery]);

  const summaryMetrics = useMemo(() => {
    const total = studentRows.length;
    let entered = 0;
    let passed = 0;
    let failed = 0;
    let sumObtained = 0;
    let highest = null;
    let lowest = null;

    studentRows.forEach((r) => {
      if (r.isAbsent) {
        entered++;
        failed++;
        if (lowest === null || 0 < lowest) lowest = 0;
        if (highest === null) highest = 0;
      } else if (r.marksObtained !== '' && !r.isInvalid) {
        entered++;
        const val = Number(r.marksObtained);
        sumObtained += val;
        if (val >= passMarks) passed++;
        else failed++;

        if (highest === null || val > highest) highest = val;
        if (lowest === null || val < lowest) lowest = val;
      }
    });

    const pending = total - entered;
    const avg = entered > 0 ? (sumObtained / (entered - (studentRows.filter(r => r.isAbsent).length))).toFixed(1) : 0;
    const progressPercent = total > 0 ? Math.round((entered / total) * 100) : 0;

    return {
      total,
      entered,
      pending,
      passed,
      failed,
      avg: isNaN(avg) ? 0 : avg,
      highest: highest !== null ? highest : '-',
      lowest: lowest !== null ? lowest : '-',
      progressPercent,
    };
  }, [studentRows, passMarks]);

  // ──────────────────────────────────────────────
  // 7. Bulk Save Action Execution
  // ──────────────────────────────────────────────
  const handleBulkSave = async () => {
    // Check if any row has invalid entries
    const invalidRows = studentRows.filter((r) => r.isInvalid);
    if (invalidRows.length > 0) {
      addToast(`Please resolve ${invalidRows.length} invalid mark entry error(s) before saving`, 'error');
      return;
    }

    // Filter only rows that are valid and have marks entered or are marked absent
    const marksToSubmit = studentRows
      .filter((r) => r.isAbsent || (r.marksObtained !== '' && !r.isInvalid))
      .map((r) => ({
        studentId: r.studentId,
        marksObtained: r.isAbsent ? 0 : Number(r.marksObtained),
        isAbsent: r.isAbsent,
        remarks: r.remarks,
      }));

    if (marksToSubmit.length === 0) {
      addToast('No marks entered to save', 'warning');
      return;
    }

    try {
      setIsSaving(true);
      const payload = {
        examId: selectedExamId,
        classId: selectedClassId,
        sectionId: selectedSection,
        subjectId: selectedSubjectId,
        marks: marksToSubmit,
      };

      const res = await api.post('/exams/marks/bulk', payload);
      if (res.data && res.data.success) {
        addToast(res.data.message || 'Marks saved successfully', 'success');
        setHasUnsavedChanges(false);
        // Refresh roster to mark saved status
        await fetchRoster();
      }
    } catch (err) {
      console.error('Bulk save failed:', err);
      const errMsgs = err.response?.data?.errors;
      if (errMsgs && Array.isArray(errMsgs) && errMsgs.length > 0) {
        addToast(`Save Failed: ${errMsgs[0]}`, 'error');
      } else {
        addToast(err.response?.data?.message || 'Failed to save marks', 'error');
      }
    } finally {
      setIsSaving(false);
    }
  };

  // ──────────────────────────────────────────────
  // 8. Admin Quick Exam / Subject Config Handler
  // ──────────────────────────────────────────────
  const openAdminConfigModal = () => {
    setAdminExamName('');
    setAdminExamType('MONTHLY');
    setAdminClassId('');
    setAdminConfigList([]);
    setShowAdminModal(true);
  };

  // Fetch subjects for selected class in Admin modal
  const fetchSubjectsForAdminClass = async (classId) => {
    if (!classId) {
      setAdminConfigList([]);
      return;
    }
    try {
      setAdminSubjectsLoading(true);

      // Try class-specific subject mappings first
      let configList = [];
      try {
        const res = await api.get(`/admin/academic/classes/${classId}/subjects`);
        const subjectsList = res.data && res.data.data ? res.data.data : [];
        if (subjectsList.length > 0) {
          configList = subjectsList.map((m) => ({
            subjectId: (m.subject && m.subject._id) ? m.subject._id : m._id,
            subjectName: (m.subject && m.subject.name) ? m.subject.name : m.name,
            maxMarks: m.maxMarks || 100,
            passMarks: m.passMarks || 33,
            selected: true,
          }));
        }
      } catch (_err) {
        // ignore, will fallback below
      }

      // If no class-specific mappings, load ALL subjects as fallback (admin will select)
      if (configList.length === 0) {
        const allRes = await api.get('/admin/academic/subjects');
        const allSubs = allRes.data && allRes.data.data ? allRes.data.data : [];
        configList = allSubs.map((s) => ({
          subjectId: s._id,
          subjectName: s.name,
          maxMarks: 100,
          passMarks: 33,
          selected: true,
        }));
      }

      setAdminConfigList(configList);
    } catch (err) {
      console.error('Failed to load subjects:', err);
      setAdminConfigList([]);
    } finally {
      setAdminSubjectsLoading(false);
    }
  };

  // Auto-fetch subjects when adminClassId changes (inside modal)
  useEffect(() => {
    if (showAdminModal) {
      fetchSubjectsForAdminClass(adminClassId);
    }
  }, [adminClassId, showAdminModal]);

  const handleAdminExamCreate = async (e) => {
    e.preventDefault();
    if (!adminExamName.trim() || !adminClassId) {
      addToast('Exam name and class are required', 'warning');
      return;
    }

    const selectedConfigs = adminConfigList
      .filter((c) => c.selected)
      .map((c) => ({
        subjectId: c.subjectId,
        maxMarks: Number(c.maxMarks),
        passMarks: Number(c.passMarks),
      }));

    if (selectedConfigs.length === 0) {
      addToast('Select at least one subject to configure for the exam', 'warning');
      return;
    }

    try {
      setIsCreatingExam(true);
      // 1. Create exam
      const createRes = await api.post('/exams', {
        name: adminExamName,
        examType: adminExamType,
        session: selectedSession,
        classId: adminClassId,
      });

      const newExam = createRes.data.data;

      // 2. Configure subjects
      await api.post(`/exams/${newExam._id}/subjects`, {
        subjectsConfig: selectedConfigs,
      });

      addToast(`Exam '${newExam.name}' created and configured successfully!`, 'success');
      setShowAdminModal(false);
      setAdminExamName('');

      // Refresh options and select new exam
      await fetchOptions();
      setSelectedClassId(adminClassId);
      setSelectedExamType(adminExamType);
      setSelectedExamId(newExam._id);
    } catch (err) {
      console.error('Failed to create exam:', err);
      addToast(err.response?.data?.message || 'Failed to create exam', 'error');
    } finally {
      setIsCreatingExam(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-16 sm:pb-0">
      {/* Top Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600 shrink-0" />
            <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">Examination Marks Console</h1>
            <span className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-extrabold uppercase bg-orange-100 text-orange-700 border border-orange-200 shrink-0">
              Phase 2 Live
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
            Enter, validate, and bulk-save student marks for Monthly, Half-Yearly, and Annual exams.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
          {user?.role === 'admin' && currentExam && (
            <>
              {(currentExam.status === 'Draft' || currentExam.status === 'Ongoing' || currentExam.status === 'Scheduled') && (
                <button
                  onClick={handleFinalizeExam}
                  disabled={isActionLoading}
                  className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95 text-center justify-center"
                >
                  Finalize Result
                </button>
              )}

              {currentExam.status === 'Finalized' && (
                <button
                  onClick={handlePublishExam}
                  disabled={isActionLoading}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95 text-center justify-center"
                >
                  Publish Result
                </button>
              )}

              {(currentExam.status === 'Finalized' || currentExam.status === 'Published') && (
                <button
                  onClick={() => setShowReopenModal(true)}
                  disabled={isActionLoading}
                  className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95 text-center justify-center"
                >
                  Reopen Result
                </button>
              )}
            </>
          )}

          {/* Download Template & Import Marks Buttons */}
          <button
            onClick={handleDownloadTemplate}
            disabled={!selectedExamId || !selectedClassId || !selectedSubjectId}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            title="Download Excel Roster Template"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="truncate">Template</span>
          </button>

          <button
            onClick={() => setShowImportModal(true)}
            disabled={!selectedExamId || !selectedClassId || !selectedSubjectId || isReadOnly}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            title="Upload Completed Excel Spreadsheet"
          >
            <Upload className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="truncate">Import</span>
          </button>

          {user?.role === 'admin' && (
            <button
              onClick={openAdminConfigModal}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95 col-span-2 sm:col-span-1"
            >
              <Plus className="w-4 h-4 text-orange-400 shrink-0" />
              <span>Create Exam</span>
            </button>
          )}

          <button
            onClick={handleBulkSave}
            disabled={isSaving || !hasUnsavedChanges || rosterLoading || studentRows.length === 0 || isReadOnly}
            className={`col-span-2 sm:col-span-1 px-4 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md active:scale-95 ${
              hasUnsavedChanges && !isReadOnly
                ? 'bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white shadow-orange-600/20'
                : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
            }`}
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Class Marks</span>
                {hasUnsavedChanges && <span className="w-2 h-2 rounded-full bg-amber-300 animate-pulse" />}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Read-Only Status Banner */}
      {isReadOnly && (
        <div className="bg-amber-50 border border-amber-200 p-3.5 sm:p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-amber-900">
          <div className="flex items-start sm:items-center gap-2">
            <span className="font-black uppercase text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full bg-amber-200 text-amber-900 shrink-0">
              {currentExam?.status}
            </span>
            <p className="text-xs font-bold leading-relaxed">
              This examination result is currently <span className="font-black">{currentExam?.status}</span>. Mark entry is locked in read-only mode.
              {user?.role === 'admin' ? ' Click "Reopen Result" above with a valid reason to enable mark editing.' : ' Contact an administrator to request a result reopen.'}
            </p>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────
          TOP FILTER BAR
      ────────────────────────────────────────────── */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3 sm:space-y-4">
        <div className="flex items-center gap-2 text-xs font-extrabold text-slate-700 uppercase tracking-wider">
          <Filter className="w-4 h-4 text-orange-600 shrink-0" />
          <span>Select Examination Context</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
          {/* Session */}
          <div>
            <label className="block text-[10px] sm:text-[11px] font-bold text-slate-500 mb-1">Academic Session</label>
            <select
              value={selectedSession}
              onChange={(e) => handleFilterChange(setSelectedSession, e.target.value)}
              className="w-full h-9 sm:h-10 px-2.5 sm:px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all cursor-pointer"
            >
              {sessions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Exam Type */}
          <div>
            <label className="block text-[10px] sm:text-[11px] font-bold text-slate-500 mb-1">Exam Type</label>
            <select
              value={selectedExamType}
              onChange={(e) => handleFilterChange(setSelectedExamType, e.target.value)}
              className="w-full h-9 sm:h-10 px-2.5 sm:px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all cursor-pointer"
            >
              <option value="">-- All Types --</option>
              <option value="MONTHLY">Monthly Exam</option>
              <option value="HALF_YEARLY">Half Yearly Exam</option>
              <option value="ANNUAL">Annual Exam</option>
            </select>
          </div>

          {/* Class */}
          <div>
            <label className="block text-[10px] sm:text-[11px] font-bold text-slate-500 mb-1">Class Group</label>
            <select
              value={selectedClassId}
              onChange={(e) => handleFilterChange(setSelectedClassId, e.target.value)}
              className="w-full h-9 sm:h-10 px-2.5 sm:px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all cursor-pointer"
            >
              {allClasses.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name} {c.section ? `(${c.section})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Exam Selection */}
          <div>
            <label className="block text-[10px] sm:text-[11px] font-bold text-slate-500 mb-1">Select Exam</label>
            <select
              value={selectedExamId}
              onChange={(e) => handleFilterChange(setSelectedExamId, e.target.value)}
              disabled={filteredExams.length === 0}
              className="w-full h-9 sm:h-10 px-2.5 sm:px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all cursor-pointer disabled:opacity-50"
            >
              {filteredExams.length === 0 ? (
                <option value="">No Exam Found</option>
              ) : (
                filteredExams.map((ex) => {
                  const typeLabel = ex.examType === 'HALF_YEARLY' ? '[Half Yearly]' : ex.examType === 'ANNUAL' ? '[Annual]' : '[Monthly]';
                  return (
                    <option key={ex._id} value={ex._id}>
                      {ex.name} {typeLabel}
                    </option>
                  );
                })
              )}
            </select>
          </div>

          {/* Section Filter */}
          <div>
            <label className="block text-[10px] sm:text-[11px] font-bold text-slate-500 mb-1">Section</label>
            <select
              value={selectedSection}
              onChange={(e) => handleFilterChange(setSelectedSection, e.target.value)}
              className="w-full h-9 sm:h-10 px-2.5 sm:px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all cursor-pointer"
            >
              <option value="">All Sections</option>
              <option value="A">Section A</option>
              <option value="B">Section B</option>
              <option value="C">Section C</option>
            </select>
          </div>

          {/* Subject Selection */}
          <div>
            <label className="block text-[10px] sm:text-[11px] font-bold text-slate-500 mb-1">Subject</label>
            <select
              value={selectedSubjectId}
              onChange={(e) => handleFilterChange(setSelectedSubjectId, e.target.value)}
              disabled={availableSubjects.length === 0}
              className="w-full h-9 sm:h-10 px-2.5 sm:px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all cursor-pointer disabled:opacity-50"
            >
              {availableSubjects.length === 0 ? (
                <option value="">No Subject Configured</option>
              ) : (
                availableSubjects.map((sub) => (
                  <option key={sub._id} value={sub._id}>
                    {sub.name} ({sub.type})
                  </option>
                ))
              )}
            </select>
          </div>
        </div>
      </div>

      {/* ──────────────────────────────────────────────
          EXAM & SUBJECT CONTEXT BANNER
      ────────────────────────────────────────────── */}
      {rosterData && rosterData.subjectConfig && (
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-4 sm:p-5 rounded-2xl shadow-md border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-[10px] sm:text-xs font-extrabold text-orange-400 uppercase tracking-widest">
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">
                {rosterData.exam.name} • {rosterData.exam.session}
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
              <span>{rosterData.subjectConfig.subjectName}</span>
              <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-bold">
                {rosterData.subjectConfig.subjectType}
              </span>
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-400">
              Class: <span className="text-slate-200 font-bold">{rosterData.exam.class.name}</span> | Target Section:{' '}
              <span className="text-slate-200 font-bold">{selectedSection || 'All'}</span>
            </p>
          </div>

          <div className="flex items-center justify-around sm:justify-center gap-4 bg-slate-800/80 px-4 py-2.5 rounded-xl border border-slate-700/80 shrink-0">
            <div className="text-center">
              <span className="block text-[9px] sm:text-[10px] font-extrabold text-slate-400 uppercase">Maximum Marks</span>
              <span className="text-base sm:text-lg font-black text-amber-400">{rosterData.subjectConfig.maxMarks}</span>
            </div>
            <div className="h-7 w-px bg-slate-700" />
            <div className="text-center">
              <span className="block text-[9px] sm:text-[10px] font-extrabold text-slate-400 uppercase">Passing Marks</span>
              <span className="text-base sm:text-lg font-black text-emerald-400">{rosterData.subjectConfig.passMarks}</span>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────
          LIVE STATS & PROGRESS SUMMARY BAR
      ────────────────────────────────────────────── */}
      {studentRows.length > 0 && (
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3 sm:space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2">
            <div className="flex items-center gap-2 text-xs font-extrabold text-slate-700 uppercase tracking-wider">
              <Clock className="w-4 h-4 text-orange-600 shrink-0" />
              <span>Real-Time Entry Metrics &amp; Progress</span>
            </div>
            <div className="text-xs font-bold text-slate-600">
              Progress: <span className="font-extrabold text-slate-900">{summaryMetrics.entered}</span> /{' '}
              <span className="font-extrabold text-slate-900">{summaryMetrics.total}</span> Students (
              <span className="text-orange-600 font-black">{summaryMetrics.progressPercent}%</span>)
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
            <div
              className="h-full bg-gradient-to-r from-orange-500 via-amber-500 to-emerald-500 transition-all duration-300"
              style={{ width: `${summaryMetrics.progressPercent}%` }}
            />
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 pt-1">
            <div className="bg-slate-50 p-2 sm:p-2.5 rounded-xl border border-slate-200/60 text-center">
              <span className="block text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase">Total</span>
              <span className="text-xs sm:text-sm font-black text-slate-900">{summaryMetrics.total}</span>
            </div>

            <div className="bg-slate-50 p-2 sm:p-2.5 rounded-xl border border-slate-200/60 text-center">
              <span className="block text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase">Entered</span>
              <span className="text-xs sm:text-sm font-black text-orange-600">{summaryMetrics.entered}</span>
            </div>

            <div className="bg-slate-50 p-2 sm:p-2.5 rounded-xl border border-slate-200/60 text-center">
              <span className="block text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase">Pending</span>
              <span className="text-xs sm:text-sm font-black text-amber-600">{summaryMetrics.pending}</span>
            </div>

            <div className="bg-slate-50 p-2 sm:p-2.5 rounded-xl border border-slate-200/60 text-center">
              <span className="block text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase">Passed</span>
              <span className="text-xs sm:text-sm font-black text-emerald-600">{summaryMetrics.passed}</span>
            </div>

            <div className="bg-slate-50 p-2 sm:p-2.5 rounded-xl border border-slate-200/60 text-center">
              <span className="block text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase">Failed</span>
              <span className="text-xs sm:text-sm font-black text-rose-600">{summaryMetrics.failed}</span>
            </div>

            <div className="bg-slate-50 p-2 sm:p-2.5 rounded-xl border border-slate-200/60 text-center">
              <span className="block text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase">Average</span>
              <span className="text-xs sm:text-sm font-black text-indigo-600">{summaryMetrics.avg}</span>
            </div>

            <div className="bg-slate-50 p-2 sm:p-2.5 rounded-xl border border-slate-200/60 text-center">
              <span className="block text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase">Highest</span>
              <span className="text-xs sm:text-sm font-black text-emerald-700">{summaryMetrics.highest}</span>
            </div>

            <div className="bg-slate-50 p-2 sm:p-2.5 rounded-xl border border-slate-200/60 text-center">
              <span className="block text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase">Lowest</span>
              <span className="text-xs sm:text-sm font-black text-rose-700">{summaryMetrics.lowest}</span>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────
          STUDENT MARKS ENTRY CONTAINER
      ────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Table Top Toolbar */}
        <div className="p-3.5 sm:p-4 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div className="relative w-full sm:max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Search student name or roll number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
            />
          </div>

          <div className="flex items-center gap-3 text-xs font-bold text-slate-500 justify-end">
            <span className="flex items-center gap-1">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
              <span>Saved</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
              <span>Unsaved</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
              <span>Invalid</span>
            </span>
          </div>
        </div>

        {/* Roster Loading / Empty States */}
        {rosterLoading ? (
          <div className="p-12 text-center space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin text-orange-600 mx-auto" />
            <p className="text-xs font-extrabold text-slate-600">Loading student roster and existing marks...</p>
          </div>
        ) : !selectedExamId || !selectedClassId || !selectedSubjectId ? (
          <div className="p-12 text-center space-y-2 bg-slate-50/30">
            <HelpCircle className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-black text-slate-700">Select Exam, Class, and Subject</p>
            <p className="text-xs text-slate-400">Choose all required filter fields to display the student marks entry table.</p>
          </div>
        ) : filteredStudentRows.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <User className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-black text-slate-700">No Students Found</p>
            <p className="text-xs text-slate-400">No active students match the selected class or search query.</p>
          </div>
        ) : (
          <>
            {/* 📱 MOBILE VIEW: User-Friendly Student Entry Cards (No Horizontal Scroll Required!) */}
            <div className="block md:hidden divide-y divide-slate-100">
              {filteredStudentRows.map((s, idx) => {
                const numVal = s.isAbsent ? 0 : Number(s.marksObtained);
                const isEntered = s.isAbsent || (s.marksObtained !== '' && !s.isInvalid);
                const isPass = isEntered && !s.isAbsent && numVal >= passMarks;

                return (
                  <div
                    key={s.studentId}
                    className={`p-3.5 space-y-3 transition-colors ${
                      s.isInvalid
                        ? 'bg-rose-50/60'
                        : s.isDirty
                        ? 'bg-amber-50/40'
                        : s.isSaved
                        ? 'bg-emerald-50/20'
                        : ''
                    }`}
                  >
                    {/* Header: Roll No + Name + Status Dot */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 font-extrabold text-xs flex items-center justify-center shrink-0">
                          {s.rollNumber || idx + 1}
                        </span>
                        <div>
                          <h4 className="text-xs font-black text-slate-900 leading-snug">{s.fullName}</h4>
                          <p className="text-[10px] text-slate-400 font-medium">
                            Sec: {s.section || 'A'} {s.fatherName ? `• ${s.fatherName}` : ''}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {s.isInvalid ? (
                          <span title="Invalid entry" className="text-rose-500">
                            <AlertTriangle className="w-4 h-4" />
                          </span>
                        ) : s.isDirty ? (
                          <span title="Unsaved changes" className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block animate-pulse" />
                        ) : s.isSaved ? (
                          <span title="Saved" className="text-emerald-500">
                            <CheckCircle2 className="w-4 h-4" />
                          </span>
                        ) : null}

                        <button
                          type="button"
                          onClick={() => openCorrectionModal(s)}
                          className="p-1 text-slate-400 hover:text-orange-600 rounded cursor-pointer"
                          title="Request Marks Correction"
                        >
                          <HelpCircle className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Marks Input & Absent Toggle */}
                    <div className="grid grid-cols-12 gap-2 items-center bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
                      <div className="col-span-7">
                        <label className="block text-[9px] font-extrabold text-slate-400 uppercase mb-0.5">
                          Marks (Max: {maxMarks})
                        </label>
                        <input
                          ref={(el) => (inputRefs.current[s.studentId] = el)}
                          type="text"
                          disabled={s.isAbsent || isReadOnly}
                          placeholder={s.isAbsent ? 'ABSENT' : `0-${maxMarks}`}
                          value={s.isAbsent ? '' : s.marksObtained}
                          onChange={(e) => handleMarkChange(s.studentId, e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, idx)}
                          className={`w-full h-10 px-3 text-center font-black rounded-xl border text-base transition-all ${
                            s.isAbsent
                              ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                              : s.isInvalid
                              ? 'bg-rose-50 border-rose-400 text-rose-900 focus:ring-2 focus:ring-rose-500/20'
                              : s.isDirty
                              ? 'bg-amber-50 border-amber-400 text-amber-900 focus:ring-2 focus:ring-amber-500/20'
                              : 'bg-white border-slate-300 text-slate-900 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500'
                          }`}
                        />
                        {s.isInvalid && (
                          <span className="block text-[9.5px] font-extrabold text-rose-600 mt-0.5">
                            {s.errorMessage}
                          </span>
                        )}
                      </div>

                      <div className="col-span-5 flex flex-col justify-end">
                        <label className="block text-[9px] font-extrabold text-slate-400 uppercase mb-0.5 text-center">
                          Attendance
                        </label>
                        <button
                          type="button"
                          disabled={isReadOnly}
                          onClick={() => handleAbsentToggle(s.studentId)}
                          className={`w-full h-10 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center ${
                            s.isAbsent
                              ? 'bg-rose-600 text-white shadow-xs'
                              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-300'
                          }`}
                        >
                          {s.isAbsent ? 'ABSENT' : 'PRESENT'}
                        </button>
                      </div>
                    </div>

                    {/* Status & Remarks Row */}
                    <div className="flex items-center gap-2">
                      <div className="shrink-0">
                        {!isEntered ? (
                          <span className="text-[10px] font-bold text-slate-400 uppercase">-</span>
                        ) : s.isAbsent ? (
                          <span className="px-2 py-1 rounded-lg text-[10px] font-extrabold bg-rose-100 text-rose-700 border border-rose-200">
                            FAIL (ABS)
                          </span>
                        ) : isPass ? (
                          <span className="px-2 py-1 rounded-lg text-[10px] font-extrabold bg-emerald-100 text-emerald-700 border border-emerald-200">
                            PASS
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded-lg text-[10px] font-extrabold bg-rose-100 text-rose-700 border border-rose-200">
                            FAIL
                          </span>
                        )}
                      </div>

                      <input
                        type="text"
                        disabled={isReadOnly}
                        placeholder="Optional remarks..."
                        value={s.remarks || ''}
                        onChange={(e) => handleRemarksChange(s.studentId, e.target.value)}
                        className="w-full h-8 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:bg-white focus:border-orange-500"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 💻 DESKTOP VIEW: Full Wide 11-Column Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100/80 border-b border-slate-200/80 text-[11px] font-extrabold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                    <th className="py-3 px-4 w-12 text-center">#</th>
                    <th className="py-3 px-4 w-20">Roll No</th>
                    <th className="py-3 px-4">Student Name</th>
                    <th className="py-3 px-4">Father's Name</th>
                    <th className="py-3 px-4 w-28 text-center">Max Marks</th>
                    <th className="py-3 px-4 w-28 text-center">Pass Marks</th>
                    <th className="py-3 px-4 w-36 text-center">Marks Obtained</th>
                    <th className="py-3 px-4 w-24 text-center">Absent</th>
                    <th className="py-3 px-4 w-24 text-center">Status</th>
                    <th className="py-3 px-4">Remarks</th>
                    <th className="py-3 px-4 w-16 text-center">State</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/60">
                  {filteredStudentRows.map((s, idx) => {
                    const numVal = s.isAbsent ? 0 : Number(s.marksObtained);
                    const isEntered = s.isAbsent || (s.marksObtained !== '' && !s.isInvalid);
                    const isPass = isEntered && !s.isAbsent && numVal >= passMarks;

                    return (
                      <tr
                        key={s.studentId}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          s.isInvalid
                            ? 'bg-rose-50/50'
                            : s.isDirty
                            ? 'bg-amber-50/30'
                            : s.isSaved
                            ? 'bg-emerald-50/20'
                            : ''
                        }`}
                      >
                        {/* Index */}
                        <td className="py-3 px-4 text-center font-bold text-slate-400">{idx + 1}</td>

                        {/* Roll No */}
                        <td className="py-3 px-4 font-black text-slate-900">{s.rollNumber}</td>

                        {/* Student Name */}
                        <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                          <div>{s.fullName}</div>
                          <span className="text-[10px] text-slate-400 font-medium">Sec: {s.section || 'A'}</span>
                        </td>

                        {/* Father Name */}
                        <td className="py-3 px-4 font-medium text-slate-600 whitespace-nowrap">
                          {s.fatherName || '-'}
                        </td>

                        {/* Max Marks */}
                        <td className="py-3 px-4 text-center font-extrabold text-slate-600">{maxMarks}</td>

                        {/* Pass Marks */}
                        <td className="py-3 px-4 text-center font-extrabold text-slate-600">{passMarks}</td>

                        {/* Marks Input */}
                        <td className="py-2 px-4 text-center">
                          <div className="relative">
                            <input
                              ref={(el) => (inputRefs.current[s.studentId] = el)}
                              type="text"
                              disabled={s.isAbsent || isReadOnly}
                              placeholder={s.isAbsent ? 'ABSENT' : '0-100'}
                              value={s.isAbsent ? '' : s.marksObtained}
                              onChange={(e) => handleMarkChange(s.studentId, e.target.value)}
                              onKeyDown={(e) => handleKeyDown(e, idx)}
                              className={`w-28 h-9 text-center font-black rounded-xl border transition-all text-sm ${
                                s.isAbsent
                                  ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                                  : s.isInvalid
                                  ? 'bg-rose-50 border-rose-400 text-rose-900 focus:ring-2 focus:ring-rose-500/20'
                                  : s.isDirty
                                  ? 'bg-amber-50 border-amber-400 text-amber-900 focus:ring-2 focus:ring-amber-500/20'
                                  : 'bg-white border-slate-300 text-slate-900 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500'
                              }`}
                            />
                            {s.isInvalid && (
                              <span className="block text-[9.5px] font-extrabold text-rose-600 mt-0.5">
                                {s.errorMessage}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Absent Toggle */}
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            disabled={isReadOnly}
                            onClick={() => handleAbsentToggle(s.studentId)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                              s.isAbsent
                                ? 'bg-rose-600 text-white shadow-xs'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200'
                            }`}
                          >
                            {s.isAbsent ? 'ABSENT' : 'PRESENT'}
                          </button>
                        </td>

                        {/* Status Preview Badge */}
                        <td className="py-3 px-4 text-center">
                          {!isEntered ? (
                            <span className="text-[10px] font-bold text-slate-400 uppercase">-</span>
                          ) : s.isAbsent ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-700 border border-rose-200">
                              FAIL (ABS)
                            </span>
                          ) : isPass ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-700 border border-emerald-200">
                              PASS
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-700 border border-rose-200">
                              FAIL
                            </span>
                          )}
                        </td>

                        {/* Remarks */}
                        <td className="py-2 px-4">
                          <input
                            type="text"
                            disabled={isReadOnly}
                            placeholder="Optional remarks"
                            value={s.remarks || ''}
                            onChange={(e) => handleRemarksChange(s.studentId, e.target.value)}
                            className="w-full h-8 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:bg-white focus:border-orange-500"
                          />
                        </td>

                        {/* State & Correction Request Actions */}
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {s.isInvalid ? (
                              <span title="Invalid entry" className="inline-block text-rose-500">
                                <AlertTriangle className="w-4 h-4" />
                              </span>
                            ) : s.isDirty ? (
                              <span title="Unsaved changes" className="inline-block text-amber-500">
                                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block animate-pulse" />
                              </span>
                            ) : s.isSaved ? (
                              <span title="Saved" className="inline-block text-emerald-500">
                                <CheckCircle2 className="w-4 h-4" />
                              </span>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}

                            <button
                              type="button"
                              onClick={() => openCorrectionModal(s)}
                              className="p-1 text-slate-400 hover:text-orange-600 rounded cursor-pointer transition-colors"
                              title="Request Marks Correction / Rechecking"
                            >
                              <HelpCircle className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Bottom Save Action Bar */}
        {studentRows.length > 0 && (
          <div className="p-4 border-t border-slate-200/80 bg-slate-50 flex items-center justify-between">
            <p className="text-xs text-slate-500 font-medium">
              Tip: Use <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-[10px] font-bold">Enter</kbd> or{' '}
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-[10px] font-bold">Arrow Down</kbd> to jump quickly to the next student.
            </p>
            <button
              onClick={handleBulkSave}
              disabled={isSaving || !hasUnsavedChanges || rosterLoading}
              className={`px-6 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer shadow-md active:scale-95 ${
                hasUnsavedChanges
                  ? 'bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white shadow-orange-600/20'
                  : 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed'
              }`}
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving Marks...' : 'Save Class Marks'}</span>
            </button>
          </div>
        )}
      </div>

      {/* ──────────────────────────────────────────────
          UNSAVED CHANGES WARNING MODAL
      ────────────────────────────────────────────── */}
      {showUnsavedModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center gap-3 text-amber-600">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-black text-slate-900">Unsaved Marks Warning</h3>
            </div>
            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              You have entered or updated marks that have not been saved yet. Changing the exam context will discard these unsaved changes.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowUnsavedModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmFilterChange}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
              >
                Discard & Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────
          ADMIN QUICK EXAM & SUBJECT CONFIG MODAL
      ────────────────────────────────────────────── */}
      {showAdminModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 max-w-xl w-full shadow-2xl border border-slate-200 space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2 text-slate-900">
                <Plus className="w-5 h-5 text-orange-600" />
                <h3 className="text-base font-black">Create & Configure Exam</h3>
              </div>
              <button
                onClick={() => setShowAdminModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdminExamCreate} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Exam Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Monthly Exam 1"
                    value={adminExamName}
                    onChange={(e) => setAdminExamName(e.target.value)}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Exam Type</label>
                  <select
                    value={adminExamType}
                    onChange={(e) => setAdminExamType(e.target.value)}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-orange-500"
                  >
                    <option value="MONTHLY">MONTHLY</option>
                    <option value="HALF_YEARLY">HALF_YEARLY</option>
                    <option value="ANNUAL">ANNUAL</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Class Group</label>
                <select
                  required
                  value={adminClassId}
                  onChange={(e) => {
                    setAdminClassId(e.target.value);
                    setAdminConfigList([]);
                  }}
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-orange-500"
                >
                  <option value="">-- Select Target Class --</option>
                  {allClasses.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name} {c.section ? `(${c.section})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Subject Configurations */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                  Configure Exam Subjects (Max & Pass Marks)
                </label>
                <div className="max-h-56 overflow-y-auto space-y-2 border border-slate-200 rounded-xl p-3 bg-slate-50">
                  {!adminClassId ? (
                    <p className="text-xs text-slate-400 text-center py-4 font-medium">👆 Select a Class Group above to load subjects</p>
                  ) : adminSubjectsLoading ? (
                    <p className="text-xs text-slate-500 text-center py-4 font-medium animate-pulse">⏳ Loading subjects...</p>
                  ) : adminConfigList.length === 0 ? (
                    <p className="text-xs text-red-500 text-center py-4 font-medium">⚠️ No subjects found. Please add subjects in Academic Management first.</p>
                  ) : (
                    adminConfigList.map((cfg, idx) => (
                      <div key={cfg.subjectId} className="flex items-center gap-3 bg-white p-2.5 rounded-lg border border-slate-200 text-xs">
                        <input
                          type="checkbox"
                          checked={cfg.selected}
                          onChange={(e) => {
                            const next = [...adminConfigList];
                            next[idx].selected = e.target.checked;
                            setAdminConfigList(next);
                          }}
                          className="w-4 h-4 text-orange-600 rounded"
                        />
                        <span className="font-bold text-slate-900 flex-1">{cfg.subjectName}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-500 font-bold">Max:</span>
                          <input
                            type="number"
                            min="1"
                            value={cfg.maxMarks}
                            onChange={(e) => {
                              const next = [...adminConfigList];
                              next[idx].maxMarks = e.target.value;
                              setAdminConfigList(next);
                            }}
                            className="w-16 h-7 px-2 border border-slate-300 rounded font-bold text-center focus:outline-none focus:border-orange-500"
                          />
                          <span className="text-[10px] text-slate-500 font-bold">Pass:</span>
                          <input
                            type="number"
                            min="1"
                            value={cfg.passMarks}
                            onChange={(e) => {
                              const next = [...adminConfigList];
                              next[idx].passMarks = e.target.value;
                              setAdminConfigList(next);
                            }}
                            className="w-16 h-7 px-2 border border-slate-300 rounded font-bold text-center focus:outline-none focus:border-orange-500"
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAdminModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingExam}
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-black shadow-sm"
                >
                  {isCreatingExam ? 'Creating Exam...' : 'Create & Save Config'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────
          REOPEN RESULT MANDATORY REASON MODAL
      ────────────────────────────────────────────── */}
      {showReopenModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-black text-slate-900">Reopen Result for Correction</h3>
              <button
                onClick={() => setShowReopenModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 font-medium">
              Reopening will revert the result status back to <span className="font-black text-orange-600">Ongoing</span> and enable mark edits for authorized teachers.
            </p>

            <form onSubmit={handleReopenExamSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mandatory Reopen Reason <span className="text-rose-600">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Correction required in Mathematics marks for Class 1-A"
                  value={reopenReason}
                  onChange={(e) => setReopenReason(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReopenModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isActionLoading || !reopenReason.trim()}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isActionLoading ? 'Reopening...' : 'Confirm Reopen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Phase 18: Excel Import & Validation Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl rounded-2xl border border-slate-200 shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-black uppercase text-slate-900 flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                  Excel Marks Spreadsheet Import
                </h3>
                <p className="text-xs text-slate-500 font-bold">
                  {currentExam?.name} • Class {currentClass?.name} ({selectedSection}) • {currentSubject?.name}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportFile(null);
                  setImportPreview(null);
                }}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Step 1: Upload Dropzone */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row items-center gap-3 p-4 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleFileChange}
                  className="text-xs font-medium text-slate-700 cursor-pointer flex-1"
                />
                <button
                  type="button"
                  onClick={handleValidateImport}
                  disabled={validatingImport || !importFile}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer transition-all shadow-xs"
                >
                  <RefreshCw className={`w-4 h-4 ${validatingImport ? 'animate-spin' : ''}`} />
                  <span>{validatingImport ? 'Validating...' : 'Parse & Validate File'}</span>
                </button>
              </div>

              {/* Step 2: Live Validation Preview */}
              {importPreview && (
                <div className="space-y-4 pt-2">
                  {/* Summary Pills */}
                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                    <div className="bg-slate-100 p-2.5 rounded-xl border border-slate-200 text-center">
                      <span className="text-[10px] font-bold text-slate-500 block uppercase">Total Rows</span>
                      <span className="text-base font-black text-slate-900 block">{importPreview.summary.totalRows}</span>
                    </div>

                    <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 text-center">
                      <span className="text-[10px] font-bold text-emerald-700 block uppercase">Valid Rows</span>
                      <span className="text-base font-black text-emerald-700 block">{importPreview.summary.valid}</span>
                    </div>

                    <div className="bg-blue-50 p-2.5 rounded-xl border border-blue-200 text-center">
                      <span className="text-[10px] font-bold text-blue-700 block uppercase">Changed</span>
                      <span className="text-base font-black text-blue-700 block">{importPreview.summary.changed}</span>
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-center">
                      <span className="text-[10px] font-bold text-slate-500 block uppercase">Unchanged</span>
                      <span className="text-base font-black text-slate-700 block">{importPreview.summary.unchanged}</span>
                    </div>

                    <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-200 text-center">
                      <span className="text-[10px] font-bold text-amber-700 block uppercase">Empty</span>
                      <span className="text-base font-black text-amber-700 block">{importPreview.summary.empty}</span>
                    </div>

                    <div className="bg-rose-50 p-2.5 rounded-xl border border-rose-200 text-center">
                      <span className="text-[10px] font-bold text-rose-700 block uppercase">Invalid</span>
                      <span className="text-base font-black text-rose-700 block">{importPreview.summary.invalid}</span>
                    </div>
                  </div>

                  {/* Validation Table */}
                  <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-900 text-white font-extrabold uppercase text-[10px] sticky top-0">
                          <th className="py-2.5 px-3">Roll</th>
                          <th className="py-2.5 px-3">Student Name</th>
                          <th className="py-2.5 px-3">Student ID</th>
                          <th className="py-2.5 px-3 text-center">Existing</th>
                          <th className="py-2.5 px-3 text-center">Imported</th>
                          <th className="py-2.5 px-3 text-center">Status</th>
                          <th className="py-2.5 px-3">Issues / Remarks</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {importPreview.rows.map((r, idx) => (
                          <tr key={idx} className={r.status === 'INVALID' ? 'bg-rose-50/60' : 'hover:bg-slate-50'}>
                            <td className="py-2 px-3 font-bold text-slate-700">{r.rollNumber || '-'}</td>
                            <td className="py-2 px-3 font-black text-slate-900">{r.fullName || '-'}</td>
                            <td className="py-2 px-3 text-slate-500 font-medium">{r.studentId}</td>
                            <td className="py-2 px-3 text-center font-bold">{r.existingMarks}</td>
                            <td className="py-2 px-3 text-center font-black text-orange-600">
                              {r.importedMarks !== null ? r.importedMarks : '-'}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                  r.status === 'CHANGED'
                                    ? 'bg-blue-100 text-blue-800'
                                    : r.status === 'NEW' || r.status === 'VALID'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : r.status === 'UNCHANGED'
                                    ? 'bg-slate-100 text-slate-600'
                                    : r.status === 'EMPTY'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-rose-600 text-white'
                                }`}
                              >
                                {r.status}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-rose-600 font-bold text-[11px]">{r.issue || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setShowImportModal(false);
                  setImportFile(null);
                  setImportPreview(null);
                }}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={
                  confirmingImport ||
                  !importPreview ||
                  importPreview.summary.invalid > 0 ||
                  importPreview.summary.valid === 0
                }
                className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-black cursor-pointer shadow-xs disabled:opacity-40"
              >
                {confirmingImport ? 'Saving Marks...' : 'Confirm & Save Marks'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Phase 20: Request Correction Modal */}
      {showCorrectionModal && correctionStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-black uppercase text-slate-900">Request Marks Correction / Rechecking</h3>
                <p className="text-xs text-slate-500 font-bold">
                  {correctionStudent.fullName} (Roll #{correctionStudent.rollNumber})
                </p>
              </div>
              <button
                onClick={() => setShowCorrectionModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCorrectionSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-500 font-bold block">Current Marks:</span>
                  <span className="font-black text-slate-900 text-sm">
                    {correctionStudent.marksObtained !== null && correctionStudent.marksObtained !== undefined
                      ? correctionStudent.marksObtained
                      : '-'}
                  </span>
                </div>

                <div>
                  <label className="text-slate-500 font-bold block mb-1">Requested Marks *</label>
                  <input
                    type="number"
                    min="0"
                    max={currentSubject?.maxMarks || 100}
                    value={requestedMarks}
                    onChange={(e) => setRequestedMarks(e.target.value)}
                    required
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg font-black text-orange-600 text-sm focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Justification Reason * (Min 5 chars)
                </label>
                <textarea
                  rows={3}
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  placeholder="e.g. Answer sheet rechecked, Question 3 marks were omitted during entry."
                  required
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCorrectionModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCorrection || !correctionReason.trim() || requestedMarks === ''}
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-black shadow-xs cursor-pointer disabled:opacity-40"
                >
                  {submittingCorrection ? 'Submitting...' : 'Submit Correction Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MarksEntry;
