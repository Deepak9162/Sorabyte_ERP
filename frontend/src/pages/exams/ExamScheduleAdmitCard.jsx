import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  Download,
  Printer,
  FileText,
  Save,
  Send,
  RefreshCw,
  Filter,
  Users,
  Sparkles,
} from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';

const ExamScheduleAdmitCard = () => {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [options, setOptions] = useState(null);
  const [selectedSession, setSelectedSession] = useState('2026-2027');
  const [selectedExamType, setSelectedExamType] = useState('ANNUAL');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSection, setSelectedSection] = useState('A');
  const [selectedExamId, setSelectedExamId] = useState('');

  const [scheduleData, setScheduleData] = useState(null);
  const [scheduleItems, setScheduleItems] = useState([]);
  const [instructions, setInstructions] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchOptions = async () => {
    try {
      const res = await api.get('/exams/options');
      if (res.data && res.data.data) {
        const optData = res.data.data;
        setOptions(optData);
        if (optData.classes && optData.classes.length > 0) {
          setSelectedClassId(optData.classes[0]._id);
        }
      }
    } catch (err) {
      console.error('Failed to load filter options:', err);
    }
  };

  useEffect(() => {
    fetchOptions();
  }, []);

  // Filter available exams
  useEffect(() => {
    if (options && options.exams && options.exams.length > 0 && selectedClassId) {
      const matchingExams = options.exams.filter(
        (e) =>
          e.examType === selectedExamType &&
          e.session === selectedSession &&
          ((e.class && e.class._id === selectedClassId) || e.class === selectedClassId)
      );

      if (matchingExams.length > 0) {
        setSelectedExamId(matchingExams[0]._id);
      } else {
        setSelectedExamId('');
      }
    }
  }, [options, selectedSession, selectedExamType, selectedClassId]);

  const fetchSchedule = async () => {
    if (!selectedExamId) return;

    try {
      setLoading(true);
      const [schRes, exDetailRes] = await Promise.all([
        api.get(`/exams/${selectedExamId}/schedule`).catch(() => null),
        api.get(`/exams/${selectedExamId}`).catch(() => null),
      ]);

      let scheduleObj = schRes?.data?.data || null;
      let examObj = exDetailRes?.data?.data || null;

      if (scheduleObj) {
        setScheduleData(scheduleObj);
        setInstructions(
          scheduleObj.instructions ||
            '1. Report 30 minutes before exam commencement.\n2. Carry your official printed Admit Card to the examination hall.\n3. Mobile phones and electronic gadgets are strictly prohibited.'
        );

        // Map configured subjects to schedule entries
        const configuredSubs = examObj?.subjectsConfig || [];
        const existingScheduleMap = {};
        (scheduleObj.schedule || []).forEach((s) => {
          const sId = s.subject?._id || s.subject;
          if (sId) existingScheduleMap[sId.toString()] = s;
        });

        const items = configuredSubs.map((sc) => {
          const sObj = sc.subject;
          const sId = sObj?._id || sObj;
          const found = existingScheduleMap[sId.toString()];

          let formattedDate = '';
          if (found && found.examDate) {
            const dt = new Date(found.examDate);
            if (!isNaN(dt.getTime())) {
              formattedDate = dt.toISOString().split('T')[0];
            }
          }

          return {
            subjectId: sId,
            subjectName: sObj?.name || 'Subject',
            subjectType: sObj?.type || 'Theoretical',
            examDate: formattedDate,
            startTime: found?.startTime || '09:00 AM',
            endTime: found?.endTime || '12:00 PM',
            reportingTime: found?.reportingTime || '08:30 AM',
            room: found?.room || '',
          };
        });

        setScheduleItems(items);
      }
    } catch (err) {
      console.error('Failed to fetch schedule:', err);
      addToast(err.response?.data?.message || 'Failed to load exam schedule', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedExamId) {
      fetchSchedule();
    } else {
      setScheduleData(null);
      setScheduleItems([]);
    }
  }, [selectedExamId]);

  const handleSaveSchedule = async () => {
    if (!selectedExamId) return;

    try {
      setSaving(true);
      const payload = {
        schedule: scheduleItems
          .filter((item) => item.examDate)
          .map((item) => ({
            subjectId: item.subjectId,
            examDate: item.examDate,
            startTime: item.startTime,
            endTime: item.endTime,
            reportingTime: item.reportingTime,
            room: item.room,
          })),
        instructions,
      };

      const res = await api.post(`/exams/${selectedExamId}/schedule`, payload);
      if (res.data && res.data.data) {
        addToast('Exam date sheet schedule saved successfully!', 'success');
        fetchSchedule();
      }
    } catch (err) {
      console.error('Failed to save schedule:', err);
      addToast(err.response?.data?.message || 'Failed to save exam schedule', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handlePublishSchedule = async () => {
    if (!selectedExamId) return;

    try {
      setSaving(true);
      const res = await api.post(`/exams/${selectedExamId}/schedule/publish`);
      if (res.data && res.data.data) {
        addToast('Exam date sheet published successfully! Now visible to teachers & students.', 'success');
        fetchSchedule();
      }
    } catch (err) {
      console.error('Failed to publish schedule:', err);
      addToast(err.response?.data?.message || 'Failed to publish exam date sheet', 'error');
    } finally {
      setSaving(false);
    }
  };

  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const handleDownloadDateSheetPdf = async () => {
    if (!selectedExamId) return;
    try {
      setIsDownloadingPdf(true);
      addToast('Generating Date Sheet PDF...', 'info');
      const res = await api.get(`/exams/${selectedExamId}/date-sheet/pdf`, {
        responseType: 'blob',
      });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `DateSheet_${selectedExamId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      addToast('Date Sheet downloaded successfully!', 'success');
    } catch (err) {
      console.error('Failed to download Date Sheet PDF:', err);
      addToast(err.response?.data?.message || 'Failed to download Date Sheet PDF', 'error');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleDownloadBulkAdmitCards = async () => {
    if (!selectedExamId || !selectedClassId) return;
    try {
      setIsDownloadingPdf(true);
      addToast('Generating Bulk Admit Cards PDF...', 'info');
      const res = await api.get(`/exams/${selectedExamId}/admit-cards/pdf`, {
        params: {
          classId: selectedClassId,
          section: selectedSection && selectedSection !== 'All' ? selectedSection : undefined,
        },
        responseType: 'blob',
      });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `AdmitCards_Class_${selectedClassId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      addToast('Bulk Admit Cards downloaded successfully!', 'success');
    } catch (err) {
      console.error('Failed to download Bulk Admit Cards PDF:', err);
      addToast(err.response?.data?.message || 'Failed to download Bulk Admit Cards PDF', 'error');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const availableExams = (options?.exams || []).filter(
    (e) =>
      e.examType === selectedExamType &&
      e.session === selectedSession &&
      ((e.class && e.class._id === selectedClassId) || e.class === selectedClassId)
  );

  const isAdmin = user?.role === 'admin';

  return (
    <div className="space-y-4 sm:space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-orange-100 text-orange-600 rounded-xl shrink-0">
              <Calendar className="w-5 h-5" />
            </span>
            <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">Exam Date Sheet &amp; Admit Cards Console</h1>
          </div>
          <p className="text-xs font-bold text-slate-500 mt-1 leading-relaxed">
            Configure subject-wise exam schedules, publish date sheets, and stream bulk A4 admit cards
          </p>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 shrink-0">
          <button
            onClick={handleDownloadDateSheetPdf}
            disabled={!selectedExamId || scheduleItems.length === 0 || isDownloadingPdf}
            className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
          >
            <Download className="w-4 h-4 text-orange-600 shrink-0" />
            <span className="truncate">{isDownloadingPdf ? 'Downloading...' : 'Date Sheet PDF'}</span>
          </button>

          {(selectedExamType === 'HALF_YEARLY' || selectedExamType === 'ANNUAL') && (
            <button
              onClick={handleDownloadBulkAdmitCards}
              disabled={!selectedExamId || scheduleItems.length === 0 || isDownloadingPdf}
              className="px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-xs"
            >
              <Printer className="w-4 h-4 text-orange-400 shrink-0" />
              <span className="truncate">{isDownloadingPdf ? 'Downloading...' : 'Bulk Admit Cards'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3 sm:space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
          <Filter className="w-4 h-4 text-orange-600 shrink-0" />
          <span className="text-xs font-black uppercase text-slate-800 tracking-wider">Select Examination Scope</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 sm:gap-3">
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Academic Session</label>
            <select
              value={selectedSession}
              onChange={(e) => setSelectedSession(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-orange-500 transition-all cursor-pointer"
            >
              {(options?.sessions || ['2026-2027', '2025-2026']).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Exam Type</label>
            <select
              value={selectedExamType}
              onChange={(e) => setSelectedExamType(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-orange-500 transition-all cursor-pointer"
            >
              <option value="MONTHLY">Monthly Exam</option>
              <option value="HALF_YEARLY">Half-Yearly Exam</option>
              <option value="ANNUAL">Annual Exam</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Class</label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-orange-500 transition-all cursor-pointer"
            >
              {(options?.classes || []).map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name} ({c.section})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Section</label>
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-orange-500 transition-all cursor-pointer"
            >
              {['A', 'B', 'C', 'D'].map((sec) => (
                <option key={sec} value={sec}>
                  Section {sec}
                </option>
              ))}
            </select>
          </div>

          <div className="col-span-2 sm:col-span-1">
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Target Exam</label>
            <select
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-orange-500 transition-all cursor-pointer"
            >
              {availableExams.length > 0 ? (
                availableExams.map((ex) => (
                  <option key={ex._id} value={ex._id}>
                    {ex.name}
                  </option>
                ))
              ) : (
                <option value="">No Exam Found</option>
              )}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin text-orange-600 mx-auto" />
          <p className="text-xs font-extrabold text-slate-600">Loading subject-wise exam schedule...</p>
        </div>
      ) : !selectedExamId ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-2">
          <Calendar className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-black text-slate-700">No Examination Selected</h3>
          <p className="text-xs text-slate-400">Please select an exam to manage date sheet schedule and admit cards.</p>
        </div>
      ) : (
        <div className="space-y-4 sm:space-y-6">
          {/* Status Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <span
                className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
                  scheduleData?.scheduleStatus === 'Published'
                    ? 'bg-emerald-500 text-white'
                    : 'bg-amber-500 text-white'
                }`}
              >
                Status: {scheduleData?.scheduleStatus || 'Draft'}
              </span>

              {scheduleData?.scheduleStatus === 'Published' && (
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4 shrink-0" /> Published &amp; Visible to Students
                </span>
              )}
            </div>

            {isAdmin && (
              <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={handleSaveSchedule}
                  disabled={saving}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition-all"
                >
                  <Save className="w-4 h-4 text-orange-400 shrink-0" />
                  <span>Save Schedule</span>
                </button>

                <button
                  onClick={handlePublishSchedule}
                  disabled={saving || scheduleData?.scheduleStatus === 'Published'}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-40 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition-all"
                >
                  <Send className="w-4 h-4 shrink-0" />
                  <span>Publish Date Sheet</span>
                </button>
              </div>
            )}
          </div>

          {/* Subject Exam Date Sheet Container */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden p-4 sm:p-5 space-y-4">
            <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">
              Subject-Wise Examination Date Sheet Schedule
            </h3>

            {scheduleItems.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">
                No configured subjects found for this examination. Please configure subjects in Exam Setup console first.
              </p>
            ) : (
              <>
                {/* 📱 MOBILE VIEW: Subject Schedule Cards (No Table Clipping) */}
                <div className="block md:hidden space-y-3">
                  {scheduleItems.map((item, idx) => (
                    <div key={item.subjectId} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-xs font-black text-slate-900">{item.subjectName}</h4>
                        <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] font-extrabold text-slate-600 uppercase">
                          {item.subjectType}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[9.5px] font-extrabold uppercase text-slate-400">Exam Date *</label>
                        <input
                          type="date"
                          value={item.examDate}
                          disabled={!isAdmin}
                          onChange={(e) => {
                            const copy = [...scheduleItems];
                            copy[idx].examDate = e.target.value;
                            setScheduleItems(copy);
                          }}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-orange-500"
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[9px] font-extrabold uppercase text-slate-400 mb-0.5">Start Time</label>
                          <input
                            type="text"
                            value={item.startTime}
                            disabled={!isAdmin}
                            placeholder="09:00 AM"
                            onChange={(e) => {
                              const copy = [...scheduleItems];
                              copy[idx].startTime = e.target.value;
                              setScheduleItems(copy);
                            }}
                            className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-800 text-center"
                          />
                        </div>

                        <div>
                          <label className="block text-[9px] font-extrabold uppercase text-slate-400 mb-0.5">End Time</label>
                          <input
                            type="text"
                            value={item.endTime}
                            disabled={!isAdmin}
                            placeholder="12:00 PM"
                            onChange={(e) => {
                              const copy = [...scheduleItems];
                              copy[idx].endTime = e.target.value;
                              setScheduleItems(copy);
                            }}
                            className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-800 text-center"
                          />
                        </div>

                        <div>
                          <label className="block text-[9px] font-extrabold uppercase text-slate-400 mb-0.5">Reporting</label>
                          <input
                            type="text"
                            value={item.reportingTime}
                            disabled={!isAdmin}
                            placeholder="08:30 AM"
                            onChange={(e) => {
                              const copy = [...scheduleItems];
                              copy[idx].reportingTime = e.target.value;
                              setScheduleItems(copy);
                            }}
                            className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-800 text-center"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 💻 DESKTOP VIEW: Full Wide 6-Column Schedule Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-900 text-white font-extrabold uppercase text-[10px]">
                        <th className="py-2.5 px-3">Subject Name</th>
                        <th className="py-2.5 px-3">Type</th>
                        <th className="py-2.5 px-3">Exam Date *</th>
                        <th className="py-2.5 px-3">Start Time</th>
                        <th className="py-2.5 px-3">End Time</th>
                        <th className="py-2.5 px-3">Reporting Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {scheduleItems.map((item, idx) => (
                        <tr key={item.subjectId} className="hover:bg-slate-50/80">
                          <td className="py-3 px-3 font-black text-slate-900">{item.subjectName}</td>
                          <td className="py-3 px-3 text-slate-500 font-bold">{item.subjectType}</td>
                          <td className="py-3 px-3">
                            <input
                              type="date"
                              value={item.examDate}
                              disabled={!isAdmin}
                              onChange={(e) => {
                                const copy = [...scheduleItems];
                                copy[idx].examDate = e.target.value;
                                setScheduleItems(copy);
                              }}
                              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-orange-500"
                            />
                          </td>
                          <td className="py-3 px-3">
                            <input
                              type="text"
                              value={item.startTime}
                              disabled={!isAdmin}
                              placeholder="09:00 AM"
                              onChange={(e) => {
                                const copy = [...scheduleItems];
                                copy[idx].startTime = e.target.value;
                                setScheduleItems(copy);
                              }}
                              className="w-24 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800"
                            />
                          </td>
                          <td className="py-3 px-3">
                            <input
                              type="text"
                              value={item.endTime}
                              disabled={!isAdmin}
                              placeholder="12:00 PM"
                              onChange={(e) => {
                                const copy = [...scheduleItems];
                                copy[idx].endTime = e.target.value;
                                setScheduleItems(copy);
                              }}
                              className="w-24 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800"
                            />
                          </td>
                          <td className="py-3 px-3">
                            <input
                              type="text"
                              value={item.reportingTime}
                              disabled={!isAdmin}
                              placeholder="08:30 AM"
                              onChange={(e) => {
                                const copy = [...scheduleItems];
                                copy[idx].reportingTime = e.target.value;
                                setScheduleItems(copy);
                              }}
                              className="w-24 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

          {/* Instructions Box */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
            <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">
              Examination Instructions (Printed on Admit Cards &amp; Date Sheets)
            </h3>
            <textarea
              rows={3}
              value={instructions}
              disabled={!isAdmin}
              onChange={(e) => setInstructions(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-800 focus:outline-none focus:border-orange-500 transition-all"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamScheduleAdmitCard;
