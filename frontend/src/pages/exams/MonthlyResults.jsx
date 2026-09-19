import React, { useState, useEffect, useMemo } from 'react';
import {
  Award,
  BookOpen,
  Calendar,
  Download,
  FileSpreadsheet,
  Filter,
  Printer,
  RefreshCw,
  Search,
  Sparkles,
  Users,
} from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

const MonthlyResults = () => {
  const { addToast } = useToast();

  const [sessions, setSessions] = useState(['2026-2027', '2025-2026']);
  const [selectedSession, setSelectedSession] = useState('2026-2027');
  const [allExams, setAllExams] = useState([]);
  const [allClasses, setAllClasses] = useState([]);

  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedExamId, setSelectedExamId] = useState('');
  const [selectedSection, setSelectedSection] = useState('');

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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

  // Filter Monthly Exams matching session & class
  const monthlyExams = useMemo(() => {
    return allExams.filter((e) => {
      const isMonthly = e.examType === 'MONTHLY';
      const sessionMatch = !selectedSession || e.session === selectedSession;
      const classMatch = !selectedClassId || (e.class && ((e.class._id || e.class) === selectedClassId));
      return isMonthly && sessionMatch && classMatch;
    });
  }, [allExams, selectedSession, selectedClassId]);

  useEffect(() => {
    if (monthlyExams.length > 0) {
      const match = monthlyExams.find((e) => e._id === selectedExamId);
      if (!match) setSelectedExamId(monthlyExams[0]._id);
    } else {
      setSelectedExamId('');
    }
  }, [monthlyExams]);

  // 2. Fetch Monthly Class Result Matrix
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
      console.error('Failed to fetch monthly report:', err);
      addToast(err.response?.data?.message || 'Failed to load class monthly result report', 'error');
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [selectedClassId, selectedExamId]);

  // Filter student rows by search query & calculate ranks
  const rankedStudentRows = useMemo(() => {
    if (!report || !report.studentRows) return [];

    let list = [...report.studentRows];

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (s) =>
          s.fullName.toLowerCase().includes(q) ||
          s.rollNumber.toString().toLowerCase().includes(q) ||
          (s.admissionNumber && s.admissionNumber.toLowerCase().includes(q))
      );
    }

    // Sort by Total Marks Obtained (Descending) to assign ranks
    list.sort((a, b) => b.summary.totalMarksObtained - a.summary.totalMarksObtained);

    return list.map((s, idx) => ({
      ...s,
      rank: idx + 1,
    }));
  }, [report, searchQuery]);

  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const handleDownloadMatrixPdf = async () => {
    if (!selectedClassId || !selectedExamId) return;
    try {
      setDownloadingPdf(true);
      const res = await api.get(`/exams/results/monthly/class/${selectedClassId}/exam/${selectedExamId}/pdf`, {
        responseType: 'blob',
      });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Class_Monthly_Result_Matrix_LFES.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      addToast('Class Monthly Result Matrix PDF downloaded successfully!', 'success');
    } catch (err) {
      console.error('Failed to download Matrix PDF:', err);
      addToast('Failed to download Matrix PDF', 'error');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Top Banner (Hidden on Print) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600 shrink-0" />
            <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">Class Monthly Results Matrix</h1>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
            Class-wise monthly examination summary report showing subject score breakdowns, ranks, and percentages.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 shrink-0">
          <button
            onClick={handleDownloadMatrixPdf}
            disabled={!report || rankedStudentRows.length === 0 || downloadingPdf}
            className="px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer disabled:opacity-50"
          >
            <Download className={`w-3.5 h-3.5 text-orange-400 ${downloadingPdf ? 'animate-bounce' : ''} shrink-0`} />
            <span className="truncate">{downloadingPdf ? 'Downloading...' : 'Matrix PDF'}</span>
          </button>

          <button
            onClick={handlePrint}
            disabled={!report || rankedStudentRows.length === 0}
            className="px-3.5 py-2.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer disabled:opacity-50"
          >
            <Printer className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Print Report</span>
          </button>
        </div>
      </div>

      {/* ──────────────────────────────────────────────
          FILTER BAR (Hidden on Print)
      ────────────────────────────────────────────── */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3 sm:space-y-4 print:hidden">
        <div className="flex items-center gap-2 text-xs font-extrabold text-slate-700 uppercase tracking-wider">
          <Filter className="w-4 h-4 text-orange-600 shrink-0" />
          <span>Report Filters</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3">
          <div>
            <label className="block text-[10px] sm:text-[11px] font-bold text-slate-500 mb-1">Academic Session</label>
            <select
              value={selectedSession}
              onChange={(e) => setSelectedSession(e.target.value)}
              className="w-full h-9 sm:h-10 px-2.5 sm:px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-orange-500 transition-all cursor-pointer"
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
              className="w-full h-9 sm:h-10 px-2.5 sm:px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-orange-500 transition-all cursor-pointer"
            >
              {allClasses.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name} {c.section ? `(${c.section})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] sm:text-[11px] font-bold text-slate-500 mb-1">Monthly Exam</label>
            <select
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
              disabled={monthlyExams.length === 0}
              className="w-full h-9 sm:h-10 px-2.5 sm:px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-orange-500 disabled:opacity-50 transition-all cursor-pointer"
            >
              {monthlyExams.length === 0 ? (
                <option value="">No Monthly Exam Found</option>
              ) : (
                monthlyExams.map((e) => (
                  <option key={e._id} value={e._id}>
                    {e.name}
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="block text-[10px] sm:text-[11px] font-bold text-slate-500 mb-1">Section</label>
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="w-full h-9 sm:h-10 px-2.5 sm:px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-orange-500 transition-all cursor-pointer"
            >
              <option value="">All Sections</option>
              <option value="A">Section A</option>
              <option value="B">Section B</option>
            </select>
          </div>
        </div>
      </div>

      {/* ──────────────────────────────────────────────
          CLASS REPORT MATRIX CONTAINER & PRINT AREA
      ────────────────────────────────────────────── */}
      <div className="monthly-print-area bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden print:border-none print:shadow-none">
        {/* Report Top Header */}
        {report && report.exam && (
          <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
            <div>
              <div className="flex items-center gap-2 text-[10px] sm:text-xs font-extrabold text-orange-400 uppercase tracking-widest">
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {report.exam.name} • {report.exam.session}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-white mt-0.5 leading-snug">
                Class: {report.exam.class?.name || 'Class'} Monthly Result Summary Matrix
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
                className="w-full h-9 pl-9 pr-3 bg-slate-800 border border-slate-700 text-white placeholder-slate-400 rounded-xl text-xs font-medium focus:outline-none focus:border-orange-500 transition-all"
              />
            </div>
          </div>
        )}

        {/* Matrix Table Content */}
        {loading ? (
          <div className="p-12 text-center space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin text-orange-600 mx-auto" />
            <p className="text-xs font-extrabold text-slate-600">Generating class-wise monthly result report...</p>
          </div>
        ) : !report || !report.subjects ? (
          <div className="p-12 text-center space-y-2 bg-slate-50/30">
            <FileSpreadsheet className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-black text-slate-700">Select Class &amp; Monthly Exam</p>
            <p className="text-xs text-slate-400">Choose all required filter fields to display the class matrix result.</p>
          </div>
        ) : rankedStudentRows.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Users className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-black text-slate-700">No Student Results Found</p>
            <p className="text-xs text-slate-400">No student records match the search query for this exam.</p>
          </div>
        ) : (
          <>
            {/* 📱 MOBILE VIEW: User-Friendly Student Result Cards (No Horizontal Scrolling Required!) */}
            <div className="block md:hidden divide-y divide-slate-100 print:hidden">
              {rankedStudentRows.map((s) => {
                const isOverallPass = s.summary.overallStatus === 'Pass';
                return (
                  <div key={s.studentId} className="p-3.5 space-y-3">
                    {/* Header: Rank + Student Name & Roll + Status */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-xl bg-orange-100 text-orange-700 font-black text-xs flex items-center justify-center shrink-0 border border-orange-200">
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

                    {/* Overall Summary Matrix Box */}
                    <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 text-center">
                      <div>
                        <span className="block text-[9px] font-extrabold text-slate-400 uppercase">Total Score</span>
                        <span className="text-xs font-black text-slate-900">
                          {s.summary.totalMarksObtained} / {s.summary.totalMaxMarks}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[9px] font-extrabold text-slate-400 uppercase">Percentage</span>
                        <span className="text-xs font-black text-orange-600">{s.summary.percentage}%</span>
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
                  </div>
                );
              })}
            </div>

            {/* 💻 DESKTOP VIEW: Full Matrix Table */}
            <div className="hidden md:block print:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs border-b border-slate-200">
                <thead>
                  <tr className="bg-slate-100/90 border-b border-slate-300 text-[11px] font-black text-slate-700 uppercase tracking-wider whitespace-nowrap">
                    <th className="py-3 px-3 text-center w-12 border-r border-slate-200">Rank</th>
                    <th className="py-3 px-3 w-16 text-center border-r border-slate-200">Roll</th>
                    <th className="py-3 px-4 border-r border-slate-200">Student Name</th>

                    {/* Dynamic Subject Headers */}
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
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {rankedStudentRows.map((s) => {
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

                        {/* Dynamic Subject Scores */}
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

                        {/* Summary Columns */}
                        <td className="py-3 px-3 text-center font-black text-slate-900 border-r border-slate-200 whitespace-nowrap">
                          {s.summary.totalMarksObtained} / {s.summary.totalMaxMarks}
                        </td>

                        <td className="py-3 px-3 text-center font-black text-orange-600 border-r border-slate-200 whitespace-nowrap">
                          {s.summary.percentage}%
                        </td>

                        <td className="py-3 px-3 text-center font-black text-amber-700 border-r border-slate-200 whitespace-nowrap">
                          {s.summary.grade}
                        </td>

                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              isOverallPass ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                            }`}
                          >
                            {s.summary.overallStatus}
                          </span>
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

      {/* ──────────────────────────────────────────────
          PRINT MEDIA SPECIFIC STYLES
      ────────────────────────────────────────────── */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .monthly-print-area, .monthly-print-area * {
            visibility: visible;
          }
          .monthly-print-area {
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

export default MonthlyResults;
