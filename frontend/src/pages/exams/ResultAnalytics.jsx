import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  Award,
  AlertTriangle,
  Users,
  CheckCircle2,
  XCircle,
  Filter,
  RefreshCw,
  Search,
  BookOpen,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
} from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

const ResultAnalytics = () => {
  const [options, setOptions] = useState(null);
  const [selectedSession, setSelectedSession] = useState('2026-2027');
  const [selectedExamType, setSelectedExamType] = useState('ANNUAL');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSection, setSelectedSection] = useState('A');
  const [selectedExamId, setSelectedExamId] = useState('');

  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const { addToast } = useToast();

  const fetchOptions = async () => {
    try {
      setLoadingOptions(true);
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
      addToast('Failed to load exam filter options', 'error');
    } finally {
      setLoadingOptions(false);
    }
  };

  useEffect(() => {
    fetchOptions();
  }, []);

  // Update selected exam when examType/classId changes
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

  const fetchAnalytics = async () => {
    if (!selectedExamId) return;
    try {
      setLoading(true);
      const res = await api.get(`/exams/${selectedExamId}/analytics`, {
        params: { classId: selectedClassId, section: selectedSection },
      });
      if (res.data && res.data.data) {
        setAnalytics(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
      addToast(err.response?.data?.message || 'Failed to load exam analytics', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedExamId) {
      fetchAnalytics();
    } else {
      setAnalytics(null);
    }
  }, [selectedExamId, selectedSection]);

  const availableExams = (options?.exams || []).filter(
    (e) =>
      e.examType === selectedExamType &&
      e.session === selectedSession &&
      ((e.class && e.class._id === selectedClassId) || e.class === selectedClassId)
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-orange-100 text-orange-600 rounded-xl">
              <BarChart3 className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-black text-slate-900">Academic Result Analytics</h1>
          </div>
          <p className="text-xs font-bold text-slate-500 mt-1">
            Comprehensive class performance metrics, subject averages, top performers & academic support insights
          </p>
        </div>

        <button
          onClick={fetchAnalytics}
          disabled={loading || !selectedExamId}
          className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Analytics</span>
        </button>
      </div>

      {/* Dependent Filter Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Filter className="w-4 h-4 text-orange-600" />
          <span className="text-xs font-black uppercase text-slate-800 tracking-wider">Analytics Filter Criteria</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {/* Session */}
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Academic Session</label>
            <select
              value={selectedSession}
              onChange={(e) => setSelectedSession(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-orange-500"
            >
              {(options?.sessions || ['2026-2027', '2025-2026']).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Exam Type */}
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Exam Type</label>
            <select
              value={selectedExamType}
              onChange={(e) => setSelectedExamType(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-orange-500"
            >
              <option value="MONTHLY">Monthly Exam</option>
              <option value="HALF_YEARLY">Half-Yearly Exam</option>
              <option value="ANNUAL">Annual Exam</option>
            </select>
          </div>

          {/* Class */}
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Class</label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-orange-500"
            >
              {(options?.classes || []).map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name} ({c.section})
                </option>
              ))}
            </select>
          </div>

          {/* Section */}
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Section</label>
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-orange-500"
            >
              {['A', 'B', 'C', 'D'].map((sec) => (
                <option key={sec} value={sec}>
                  Section {sec}
                </option>
              ))}
            </select>
          </div>

          {/* Target Exam */}
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Select Exam</label>
            <select
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-orange-500"
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
          <p className="text-xs font-extrabold text-slate-600">Computing class academic analytics & statistics...</p>
        </div>
      ) : !analytics ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-2">
          <BarChart3 className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-black text-slate-700">No Analytics Data Available</h3>
          <p className="text-xs text-slate-400">Please select a valid exam and class filter criteria to view analytics.</p>
        </div>
      ) : (
        <>
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-extrabold uppercase">Enrolled Students</span>
                <Users className="w-4 h-4 text-blue-500" />
              </div>
              <p className="text-2xl font-black text-slate-900">{analytics.summary.totalStudents}</p>
              <p className="text-[10px] font-bold text-slate-400">
                {analytics.summary.completed} evaluated / {analytics.summary.pending} pending
              </p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-extrabold uppercase">Pass Count</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-2xl font-black text-emerald-600">{analytics.summary.passed}</p>
              <p className="text-[10px] font-bold text-emerald-600">{analytics.summary.passPercentage} Pass Rate</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-extrabold uppercase">Fail Count</span>
                <XCircle className="w-4 h-4 text-rose-500" />
              </div>
              <p className="text-2xl font-black text-rose-600">{analytics.summary.failed}</p>
              <p className="text-[10px] font-bold text-rose-500">Requires Support</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-extrabold uppercase">Class Average</span>
                <TrendingUp className="w-4 h-4 text-orange-500" />
              </div>
              <p className="text-2xl font-black text-orange-600">{analytics.summary.averagePercentage}</p>
              <p className="text-[10px] font-bold text-slate-400">Mean Aggregate</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-extrabold uppercase">Highest Score</span>
                <ArrowUpRight className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-2xl font-black text-emerald-700">{analytics.summary.highestPercentage}</p>
              <p className="text-[10px] font-bold text-slate-400">Top Performer</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-extrabold uppercase">Lowest Score</span>
                <ArrowDownRight className="w-4 h-4 text-amber-500" />
              </div>
              <p className="text-2xl font-black text-amber-700">{analytics.summary.lowestPercentage}</p>
              <p className="text-[10px] font-bold text-slate-400">Minimum Aggregate</p>
            </div>
          </div>

          {/* Grade Distribution Pills */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
            <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">Overall Grade Distribution</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
              {analytics.gradeDistribution.map((g) => (
                <div key={g.grade} className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center space-y-0.5">
                  <span className="text-xs font-black text-orange-600 block">{g.grade}</span>
                  <span className="text-lg font-black text-slate-900 block">{g.count}</span>
                  <span className="text-[10px] font-bold text-slate-400 block">{g.percentage}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Subject Performance Breakdown Table */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">Subject-Wise Performance Breakdown</h3>
              <span className="text-xs font-bold text-slate-500">{analytics.subjectPerformance.length} Subjects Evaluated</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900 text-white font-extrabold uppercase text-[10px]">
                    <th className="py-2.5 px-3 rounded-l-lg">Subject Name</th>
                    <th className="py-2.5 px-3 text-center">Type</th>
                    <th className="py-2.5 px-3 text-center">Max Marks</th>
                    <th className="py-2.5 px-3 text-center">Class Average</th>
                    <th className="py-2.5 px-3 text-center">Highest Marks</th>
                    <th className="py-2.5 px-3 text-center">Lowest Marks</th>
                    <th className="py-2.5 px-3 text-center">Passed</th>
                    <th className="py-2.5 px-3 text-center">Failed</th>
                    <th className="py-2.5 px-3 text-center rounded-r-lg">Pass Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {analytics.subjectPerformance.map((sub) => (
                    <tr key={sub.subjectId} className="hover:bg-slate-50/80">
                      <td className="py-3 px-3 font-extrabold text-slate-900">{sub.subjectName}</td>
                      <td className="py-3 px-3 text-center text-slate-500 font-bold">{sub.subjectType}</td>
                      <td className="py-3 px-3 text-center font-bold">{sub.maxMarks}</td>
                      <td className="py-3 px-3 text-center font-black text-orange-600">{sub.averageMarks}</td>
                      <td className="py-3 px-3 text-center font-bold text-emerald-600">{sub.highestMarks}</td>
                      <td className="py-3 px-3 text-center font-bold text-amber-600">{sub.lowestMarks}</td>
                      <td className="py-3 px-3 text-center font-bold text-emerald-700">{sub.passCount}</td>
                      <td className="py-3 px-3 text-center font-bold text-rose-600">{sub.failCount}</td>
                      <td className="py-3 px-3 text-center font-black text-slate-900">{sub.passPercentage}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Dual Lists: Top Performers & Students Requiring Attention */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Top Performers */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Award className="w-5 h-5 text-amber-500" />
                <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">Top Class Performers</h3>
              </div>

              <div className="space-y-2">
                {analytics.topPerformers.length > 0 ? (
                  analytics.topPerformers.map((tp, idx) => (
                    <div key={tp.studentId} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                            idx === 0
                              ? 'bg-amber-400 text-slate-900'
                              : idx === 1
                              ? 'bg-slate-300 text-slate-900'
                              : idx === 2
                              ? 'bg-amber-600 text-white'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {idx + 1}
                        </span>
                        <div>
                          <p className="text-xs font-black text-slate-900">{tp.fullName}</p>
                          <p className="text-[10px] font-bold text-slate-400">Roll: {tp.rollNumber} • Sec {tp.section}</p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-black text-orange-600 block">{tp.percentage}%</span>
                        <span className="text-[10px] font-extrabold text-emerald-600 block">{tp.overallGrade} ({tp.division})</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 text-center py-4">No evaluated top performers found.</p>
                )}
              </div>
            </div>

            {/* Students Requiring Attention */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <AlertTriangle className="w-5 h-5 text-rose-500" />
                <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">Students Requiring Academic Attention</h3>
              </div>

              <div className="space-y-2">
                {analytics.attentionRequired.length > 0 ? (
                  analytics.attentionRequired.map((st) => (
                    <div key={st.studentId} className="flex items-center justify-between p-3 bg-rose-50/50 rounded-xl border border-rose-100">
                      <div>
                        <p className="text-xs font-black text-slate-900">{st.fullName}</p>
                        <p className="text-[10px] font-bold text-rose-600 mt-0.5">{st.reason}</p>
                      </div>

                      <div className="text-right">
                        <span className="px-2.5 py-0.5 bg-rose-600 text-white rounded-full text-[10px] font-black uppercase">
                          {st.resultStatus}
                        </span>
                        {typeof st.percentage === 'number' && (
                          <span className="text-[10px] font-bold text-slate-500 block mt-1">{st.percentage}% Aggregate</span>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center text-xs text-slate-400 font-bold space-y-1">
                    <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto" />
                    <p>All evaluated students passed successfully!</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ResultAnalytics;
