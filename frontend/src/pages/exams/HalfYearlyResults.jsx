import React, { useState, useEffect, useMemo } from 'react';
import {
  Award,
  BookOpen,
  Calendar,
  Download,
  Eye,
  FileSpreadsheet,
  Filter,
  Printer,
  RefreshCw,
  Search,
  Sparkles,
  Users,
  XCircle,
} from 'lucide-react';
import api from '../../services/api';
import MarksheetPreview from '../../components/exams/MarksheetPreview';
import MarksheetDocument from '../../components/exams/MarksheetDocument';
import { generateBulkMarksheetPdf } from '../../utils/bulkMarksheetPdf';
import { useToast } from '../../context/ToastContext';

const HalfYearlyResults = () => {
  const { addToast } = useToast();

  const [sessions, setSessions] = useState(['2026-2027', '2025-2026']);
  const [selectedSession, setSelectedSession] = useState('2026-2027');
  const [allExams, setAllExams] = useState([]);
  const [allClasses, setAllClasses] = useState([]);

  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedExamId, setSelectedExamId] = useState('');
  const [activeTab, setActiveTab] = useState('CLASS_MATRIX'); // 'CLASS_MATRIX' | 'INDIVIDUAL'

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Selected student for Marksheet Preview Modal
  const [selectedStudentForModal, setSelectedStudentForModal] = useState(null);

  // 1. Fetch Options
  const fetchOptions = async () => {
    try {
      const res = await api.get('/exams/options');
      if (res.data && res.data.data) {
        const { sessions: sessList, classes: clsList, exams: exList } = res.data.data;
        if (sessList) setSessions(sessList);
        setAllClasses(clsList || []);
        setAllExams(exList || []);

        if (clsList && clsList.length > 0 && !selectedClassId) {
          setSelectedClassId(clsList[0]._id);
        }
      }
    } catch (err) {
      console.error('Failed to load options:', err);
    }
  };

  useEffect(() => {
    fetchOptions();
  }, []);

  // Filter Half Yearly Exams matching session & class
  const halfYearlyExams = useMemo(() => {
    return allExams.filter((e) => {
      const isHalfYearly = e.examType === 'HALF_YEARLY';
      const sessionMatch = !selectedSession || e.session === selectedSession;
      const classMatch = !selectedClassId || (e.class && ((e.class._id || e.class) === selectedClassId));
      return isHalfYearly && sessionMatch && classMatch;
    });
  }, [allExams, selectedSession, selectedClassId]);

  useEffect(() => {
    if (halfYearlyExams.length > 0) {
      const match = halfYearlyExams.find((e) => e._id === selectedExamId);
      if (!match) setSelectedExamId(halfYearlyExams[0]._id);
    } else {
      setSelectedExamId('');
    }
  }, [halfYearlyExams]);

  // 2. Fetch Class Result Report
  const fetchReport = async () => {
    if (!selectedClassId || !selectedExamId) {
      setReport(null);
      return;
    }

    try {
      setLoading(true);
      const res = await api.get(`/exams/results/monthly/class/${selectedClassId}/exam/${selectedExamId}`);
      if (res.data && res.data.data) {
        setReport(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch half-yearly report:', err);
      addToast(err.response?.data?.message || 'Failed to load class half-yearly report', 'error');
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [selectedClassId, selectedExamId]);

  // ─────────────────────────────────────────────────────
  // ROLL NUMBER SORT HELPER
  // Converts a roll number value (may be String, Number, null, empty)
  // to a finite integer for numeric comparison, or null for invalid values.
  // ─────────────────────────────────────────────────────
  const getNumericRoll = (value) => {
    if (value === null || value === undefined || value === '') return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  };

  // Filter student rows by search query & sort by roll number ascending.
  // Rank is assigned by the BACKEND (by percentage desc) and is preserved here —
  // we only change DISPLAY ORDER to roll-number ascending.
  const filteredStudentRows = useMemo(() => {
    if (!report || !report.studentRows) return [];
    let list = [...report.studentRows];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (s) =>
          s.fullName.toLowerCase().includes(q) ||
          s.rollNumber.toString().toLowerCase().includes(q) ||
          (s.admissionNumber && s.admissionNumber.toLowerCase().includes(q))
      );
    }

    // Sort by ROLL NUMBER ASCENDING (numeric-aware to prevent '1,10,11,2' ordering).
    // Invalid / missing rolls are placed at the end.
    // Duplicate rolls are given a stable secondary sort by name.
    list.sort((a, b) => {
      const rollA = getNumericRoll(a.rollNumber);
      const rollB = getNumericRoll(b.rollNumber);
      if (rollA === null && rollB === null) return (a.fullName || '').localeCompare(b.fullName || '');
      if (rollA === null) return 1;
      if (rollB === null) return -1;
      if (rollA !== rollB) return rollA - rollB;
      return (a.fullName || '').localeCompare(b.fullName || '');
    });

    // Rank values come from the backend (percentage-based). Preserve them.
    return list;
  }, [report, searchQuery]);

  const [downloadingBulkPdf, setDownloadingBulkPdf] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(null);
  const [bulkRenderList, setBulkRenderList] = useState(null);

  const handleDownloadBulkPdf = async () => {
    if (!selectedClassId || !selectedExamId || downloadingBulkPdf) return;

    const totalStart = performance.now();
    try {
      setDownloadingBulkPdf(true);
      setBulkProgress('Preparing marksheet data...');

      const dataStart = performance.now();
      const res = await api.get(`/exams/marksheets/class/${selectedClassId}/${selectedExamId}/bulk-data`);
      const studentsData = res.data?.data;
      const dataFetchMs = performance.now() - dataStart;

      if (!studentsData || studentsData.length === 0) {
        throw new Error('No marksheet records found for this class');
      }

      setBulkRenderList(studentsData);
      setBulkProgress(`Rendering ${studentsData.length} marksheets...`);

      const metrics = await generateBulkMarksheetPdf({
        count: studentsData.length,
        getElement: (index) => document.getElementById(`halfyearly-bulk-student-doc-${index}`),
        fileName: 'Class_Half_Yearly_Marksheets_LFES.pdf',
        captureScale: 2,
        concurrency: 2,
        onProgress: (completed, total) => {
          setBulkProgress(`Creating PDF ${completed} / ${total}...`);
        },
      });

      if (import.meta.env.DEV) {
        console.info('[LFES Half-Yearly Bulk PDF]', {
          dataFetchMs: Math.round(dataFetchMs),
          pdfPipelineMs: Math.round(metrics.totalMs),
          totalMs: Math.round(performance.now() - totalStart),
          pages: studentsData.length,
        });
      }

      addToast(`All ${studentsData.length} Class Marksheets PDF downloaded successfully!`, 'success');
    } catch (err) {
      console.error('Failed to download Bulk Marksheets PDF:', err);
      addToast('Failed to generate Class Marksheets PDF', 'error');
    } finally {
      setBulkRenderList(null);
      setDownloadingBulkPdf(false);
      setBulkProgress(null);
    }
  };

  const handlePrintClassReport = () => {
    window.print();
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Top Banner (Hidden on Print) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600 shrink-0" />
            <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">Half Yearly Examination Results</h1>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
            View class matrix performance or generate official student marksheets for printing and PDF download.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {/* Mode Switcher */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center justify-center gap-1 border border-slate-200 shrink-0">
            <button
              onClick={() => setActiveTab('CLASS_MATRIX')}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer text-center ${
                activeTab === 'CLASS_MATRIX' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Class Matrix
            </button>
            <button
              onClick={() => setActiveTab('INDIVIDUAL')}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer text-center ${
                activeTab === 'INDIVIDUAL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Individual Marksheets
            </button>
          </div>

          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2">
            <button
              onClick={handleDownloadBulkPdf}
              disabled={!report || filteredStudentRows.length === 0 || downloadingBulkPdf}
              className="px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              <Download className={`w-3.5 h-3.5 text-amber-400 ${downloadingBulkPdf ? 'animate-bounce' : ''} shrink-0`} />
              <span className="truncate">{downloadingBulkPdf ? (bulkProgress || 'Generating PDF...') : 'All Marksheets PDF'}</span>
            </button>

            <button
              onClick={handlePrintClassReport}
              disabled={!report || filteredStudentRows.length === 0}
              className="px-3.5 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              <Printer className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Print Report</span>
            </button>
          </div>
        </div>
      </div>

      {/* ──────────────────────────────────────────────
          FILTER BAR (Hidden on Print)
      ────────────────────────────────────────────── */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3 sm:space-y-4 print:hidden">
        <div className="flex items-center gap-2 text-xs font-extrabold text-slate-700 uppercase tracking-wider">
          <Filter className="w-4 h-4 text-amber-600 shrink-0" />
          <span>Report Filters</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
          <div>
            <label className="block text-[10px] sm:text-[11px] font-bold text-slate-500 mb-1">Academic Session</label>
            <select
              value={selectedSession}
              onChange={(e) => setSelectedSession(e.target.value)}
              className="w-full h-9 sm:h-10 px-2.5 sm:px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500 transition-all cursor-pointer"
            >
              {sessions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] sm:text-[11px] font-bold text-slate-500 mb-1">Class Group</label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full h-9 sm:h-10 px-2.5 sm:px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500 transition-all cursor-pointer"
            >
              {allClasses.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name} {c.section ? `(${c.section})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="col-span-2 sm:col-span-1">
            <label className="block text-[10px] sm:text-[11px] font-bold text-slate-500 mb-1">Half Yearly Exam</label>
            <select
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
              disabled={halfYearlyExams.length === 0}
              className="w-full h-9 sm:h-10 px-2.5 sm:px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500 disabled:opacity-50 transition-all cursor-pointer"
            >
              {halfYearlyExams.length === 0 ? (
                <option value="">No Half Yearly Exam Found</option>
              ) : (
                halfYearlyExams.map((e) => (
                  <option key={e._id} value={e._id}>
                    {e.name}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>
      </div>

      {/* ──────────────────────────────────────────────
          TAB 1: CLASS MATRIX RESULTS
      ────────────────────────────────────────────── */}
      {activeTab === 'CLASS_MATRIX' && (
        <div className="halfyearly-print-area bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden print:border-none print:shadow-none">
          {report && report.exam && (
            <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
              <div>
                <div className="flex items-center gap-2 text-[10px] sm:text-xs font-extrabold text-amber-400 uppercase tracking-widest">
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    {report.exam.name} • {report.exam.session}
                  </span>
                </div>
                <h2 className="text-base sm:text-lg font-black text-white mt-0.5 leading-snug">
                  Class: {report.exam.class?.name || 'Class'} Half Yearly Result Summary
                </h2>
                <p className="text-xs text-slate-400">Total Enrolled Students: {report.totalStudents}</p>
              </div>

              <div className="relative w-full md:max-w-xs print:hidden">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Search student or roll no..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-9 pl-9 pr-3 bg-slate-800 border border-slate-700 text-white placeholder-slate-400 rounded-xl text-xs font-medium focus:outline-none focus:border-amber-500 transition-all"
                />
              </div>
            </div>
          )}

          {loading ? (
            <div className="p-12 text-center space-y-3">
              <RefreshCw className="w-8 h-8 animate-spin text-amber-600 mx-auto" />
              <p className="text-xs font-extrabold text-slate-600">Loading Half Yearly class results...</p>
            </div>
          ) : !report || !report.subjects ? (
            <div className="p-12 text-center space-y-2 bg-slate-50/30">
              <Award className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm font-black text-slate-700">Select Class &amp; Half Yearly Exam</p>
              <p className="text-xs text-slate-400">Choose all required filter fields to display the results table.</p>
            </div>
          ) : filteredStudentRows.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <Users className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm font-black text-slate-700">No Student Results Found</p>
              <p className="text-xs text-slate-400">No student records match the search query for this exam.</p>
            </div>
          ) : (
            <>
              {/* 📱 MOBILE VIEW: User-Friendly Student Result Cards (No Horizontal Scroll Required!) */}
              <div className="block md:hidden divide-y divide-slate-100 print:hidden">
                {filteredStudentRows.map((s) => {
                  const isOverallPass = s.summary.overallStatus === 'Pass';
                  return (
                    <div key={s.studentId} className="p-3.5 space-y-3">
                      {/* Header: Rank + Name & Roll + Status */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="w-7 h-7 rounded-xl bg-amber-100 text-amber-800 font-black text-xs flex items-center justify-center shrink-0 border border-amber-200">
                            #{s.rank}
                          </span>
                          <div>
                            <h3 className="text-xs font-black text-slate-900 leading-snug">{s.fullName}</h3>
                            <p className="text-[10px] font-bold text-slate-400">
                              Roll No: <span className="text-slate-700 font-extrabold">{s.rollNumber}</span>
                            </p>
                          </div>
                        </div>

                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase shrink-0 ${
                            isOverallPass ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-rose-100 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {s.summary.overallStatus}
                        </span>
                      </div>

                      {/* Overall Summary Box */}
                      <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 text-center">
                        <div>
                          <span className="block text-[9px] font-extrabold text-slate-400 uppercase">Total Score</span>
                          <span className="text-xs font-black text-slate-900">
                            {s.summary.totalMarksObtained} / {s.summary.totalMaxMarks}
                          </span>
                        </div>
                        <div>
                          <span className="block text-[9px] font-extrabold text-slate-400 uppercase">Percentage</span>
                          <span className="text-xs font-black text-amber-600">{s.summary.percentage}%</span>
                        </div>
                        <div>
                          <span className="block text-[9px] font-extrabold text-slate-400 uppercase">Grade</span>
                          <span className="text-xs font-black text-amber-700">{s.summary.grade}</span>
                        </div>
                      </div>

                      {/* Subject Scores Pill Grid */}
                      <div className="space-y-1">
                        <span className="block text-[9.5px] font-extrabold text-slate-400 uppercase tracking-wider">
                          Subject Breakdown
                        </span>
                        <div className="grid grid-cols-2 gap-1.5">
                          {s.subjectMarks.map((sm) => (
                            <div
                              key={sm.subjectId}
                              className="flex items-center justify-between px-2.5 py-1.5 bg-slate-50 rounded-lg border border-slate-100 text-xs"
                            >
                              <span className="font-bold text-slate-700 truncate pr-1">{sm.subjectName}</span>
                              <span className="font-black shrink-0">
                                {sm.marksObtained === null ? (
                                  <span className="text-slate-400">-</span>
                                ) : sm.isAbsent ? (
                                  <span className="text-rose-600">ABS</span>
                                ) : (
                                  <span className={sm.status === 'Pass' ? 'text-slate-900' : 'text-rose-600'}>
                                    {sm.marksObtained}
                                  </span>
                                )}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="pt-1">
                        <button
                          onClick={() =>
                            setSelectedStudentForModal({ studentId: s.studentId, examId: selectedExamId })
                          }
                          className="w-full py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-xl font-extrabold text-xs border border-amber-200 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                        >
                          <Eye className="w-4 h-4 text-amber-700" />
                          <span>View Official Marksheet</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 💻 DESKTOP VIEW: Full Dynamic Table */}
              <div className="hidden md:block print:block overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs border-b border-slate-200">
                  <thead>
                    <tr className="bg-slate-100/90 border-b border-slate-300 text-[11px] font-black text-slate-700 uppercase tracking-wider whitespace-nowrap">
                      <th className="py-3 px-3 text-center w-12 border-r border-slate-200">Rank</th>
                      <th className="py-3 px-3 w-16 text-center border-r border-slate-200">Roll</th>
                      <th className="py-3 px-4 border-r border-slate-200">Student Name</th>

                      {report.subjects.map((sub) => (
                        <th key={sub.subjectId} className="py-3 px-3 text-center border-r border-slate-200 min-w-[90px]">
                          <div>{sub.name}</div>
                          <span className="text-[9px] text-slate-400 font-extrabold lowercase">Max: {sub.maxMarks}</span>
                        </th>
                      ))}

                      <th className="py-3 px-3 text-center border-r border-slate-200 w-24">Total Marks</th>
                      <th className="py-3 px-3 text-center border-r border-slate-200 w-20">%</th>
                      <th className="py-3 px-3 text-center border-r border-slate-200 w-16">Grade</th>
                      <th className="py-3 px-3 text-center w-24">Status</th>
                      <th className="py-3 px-3 text-center w-28 print:hidden">Marksheet</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredStudentRows.map((s) => {
                      const isOverallPass = s.summary.overallStatus === 'Pass';
                      return (
                        <tr key={s.studentId} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-3 text-center font-black text-slate-500 border-r border-slate-200">
                            #{s.rank}
                          </td>
                          <td className="py-3 px-3 text-center font-black text-slate-900 border-r border-slate-200">
                            {s.rollNumber}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900 border-r border-slate-200 whitespace-nowrap">
                            {s.fullName}
                          </td>

                          {s.subjectMarks.map((sm) => (
                            <td key={sm.subjectId} className="py-3 px-3 text-center font-black border-r border-slate-200 whitespace-nowrap">
                              {sm.marksObtained === null ? (
                                <span className="text-slate-300">-</span>
                              ) : sm.isAbsent ? (
                                <span className="text-rose-600">ABS</span>
                              ) : (
                                <span className={sm.status === 'Pass' ? 'text-slate-900' : 'text-rose-600'}>
                                  {sm.marksObtained}
                                </span>
                              )}
                            </td>
                          ))}

                          <td className="py-3 px-3 text-center font-black text-slate-900 border-r border-slate-200 whitespace-nowrap">
                            {s.summary.totalMarksObtained} / {s.summary.totalMaxMarks}
                          </td>

                          <td className="py-3 px-3 text-center font-black text-amber-600 border-r border-slate-200 whitespace-nowrap">
                            {s.summary.percentage}%
                          </td>

                          <td className="py-3 px-3 text-center font-black text-amber-700 border-r border-slate-200 whitespace-nowrap">
                            {s.summary.grade}
                          </td>

                          <td className="py-3 px-3 text-center border-r border-slate-200 whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                isOverallPass ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                              }`}
                            >
                              {s.summary.overallStatus}
                            </span>
                          </td>

                          <td className="py-2 px-3 text-center print:hidden whitespace-nowrap">
                            <button
                              onClick={() =>
                                setSelectedStudentForModal({ studentId: s.studentId, examId: selectedExamId })
                              }
                              className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg font-extrabold text-[11px] border border-amber-200 flex items-center justify-center gap-1 mx-auto transition-all cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* ──────────────────────────────────────────────
          TAB 2: INDIVIDUAL STUDENT MARKSHEET DIRECTORY
      ────────────────────────────────────────────── */}
      {activeTab === 'INDIVIDUAL' && (
        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4 print:hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <h3 className="text-sm font-black text-slate-900">Individual Student Marksheet Directory</h3>
            <div className="relative w-full sm:max-w-xs">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search student name or roll..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-amber-500 transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredStudentRows.map((s) => (
              <div
                key={s.studentId}
                className="p-3.5 sm:p-4 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200 flex items-center justify-between gap-2 transition-all"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-black text-slate-900 truncate">{s.fullName}</p>
                  <p className="text-[10px] text-slate-500 font-bold mt-0.5 truncate">
                    Roll: <span className="text-slate-800 font-extrabold">{s.rollNumber}</span> • Total: {s.summary.totalMarksObtained} ({s.summary.percentage}%)
                  </p>
                </div>
                <button
                  onClick={() =>
                    setSelectedStudentForModal({ studentId: s.studentId, examId: selectedExamId })
                  }
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-extrabold flex items-center gap-1 cursor-pointer shadow-xs shrink-0"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Marksheet</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────
          OFFICIAL MARKSHEET MODAL PREVIEW
      ────────────────────────────────────────────── */}
      {selectedStudentForModal && (
        <MarksheetPreview
          studentId={selectedStudentForModal.studentId}
          examId={selectedStudentForModal.examId}
          onClose={() => setSelectedStudentForModal(null)}
        />
      )}

      {/* ──────────────────────────────────────────────
          OFFSCREEN BULK MARKSHEET CAPTURE HOST
      ────────────────────────────────────────────── */}
      {bulkRenderList && bulkRenderList.length > 0 && (
        <div
          className="fixed top-0 pointer-events-none bg-white"
          style={{ left: '-10000px', width: '210mm' }}
          aria-hidden="true"
        >
          {bulkRenderList.map((stData, idx) => (
            <MarksheetDocument
              key={stData.student?._id || idx}
              id={`halfyearly-bulk-student-doc-${idx}`}
              data={stData}
            />
          ))}
        </div>
      )}

      {/* Print Isolated CSS */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .halfyearly-print-area, .halfyearly-print-area * {
            visibility: visible;
          }
          .halfyearly-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 10mm !important;
            margin: 0 !important;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default HalfYearlyResults;
