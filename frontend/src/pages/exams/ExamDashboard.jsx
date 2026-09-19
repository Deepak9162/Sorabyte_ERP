import React, { useState, useEffect, useMemo } from 'react';
import {
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Edit3,
  FileSpreadsheet,
  FileText,
  Filter,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Users,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const ExamDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('ALL');

  const fetchExams = async () => {
    try {
      setLoading(true);
      const res = await api.get('/exams');
      if (res.data && res.data.data) {
        setExams(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load exams:', err);
      addToast(err.response?.data?.message || 'Failed to load examinations', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, []);

  // Compute Summary Metrics
  const metrics = useMemo(() => {
    const total = exams.length;
    const monthly = exams.filter((e) => e.examType === 'MONTHLY').length;
    const halfYearly = exams.filter((e) => e.examType === 'HALF_YEARLY').length;
    const annual = exams.filter((e) => e.examType === 'ANNUAL').length;
    const pending = exams.filter((e) => e.status === 'Draft' || e.status === 'Ongoing').length;
    const published = exams.filter((e) => e.status === 'Published' || e.status === 'Completed').length;

    return { total, monthly, halfYearly, annual, pending, published };
  }, [exams]);

  // Filtered Exams Table List
  const filteredExams = useMemo(() => {
    return exams.filter((e) => {
      const typeMatch = selectedTypeFilter === 'ALL' || e.examType === selectedTypeFilter;
      const searchMatch =
        !searchQuery.trim() ||
        e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (e.class && e.class.name.toLowerCase().includes(searchQuery.toLowerCase()));
      return typeMatch && searchMatch;
    });
  }, [exams, selectedTypeFilter, searchQuery]);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Top Banner & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600 shrink-0" />
            <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">Examinations Dashboard</h1>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
            Manage academic exams, configure subjects, enter marks, and generate class &amp; student marksheets.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => navigate('/academic/marks-entry')}
            className="w-full sm:w-auto px-4 py-2.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
          >
            <Edit3 className="w-4 h-4 shrink-0" />
            <span>Enter Marks</span>
          </button>
        </div>
      </div>

      {/* ──────────────────────────────────────────────
          SUMMARY METRICS CARDS
      ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
        <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
          <span className="text-[9px] sm:text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block truncate">Total Exams</span>
          <p className="text-xl sm:text-2xl font-black text-slate-900">{metrics.total}</p>
        </div>

        <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
          <span className="text-[9px] sm:text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block truncate">Monthly Exams</span>
          <p className="text-xl sm:text-2xl font-black text-orange-600">{metrics.monthly}</p>
        </div>

        <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
          <span className="text-[9px] sm:text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block truncate">Half Yearly</span>
          <p className="text-xl sm:text-2xl font-black text-amber-600">{metrics.halfYearly}</p>
        </div>

        <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
          <span className="text-[9px] sm:text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block truncate">Annual Exams</span>
          <p className="text-xl sm:text-2xl font-black text-emerald-600">{metrics.annual}</p>
        </div>

        <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
          <span className="text-[9px] sm:text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block truncate">Marks Pending</span>
          <p className="text-xl sm:text-2xl font-black text-indigo-600">{metrics.pending}</p>
        </div>

        <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
          <span className="text-[9px] sm:text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block truncate">Completed</span>
          <p className="text-xl sm:text-2xl font-black text-teal-600">{metrics.published}</p>
        </div>
      </div>

      {/* ──────────────────────────────────────────────
          QUICK ACTIONS BAR
      ────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-4 sm:p-5 rounded-2xl shadow-md border border-slate-800 space-y-3">
        <div className="flex items-center gap-2 text-xs font-extrabold text-orange-400 uppercase tracking-widest">
          <Sparkles className="w-4 h-4 shrink-0" />
          <span>Examination Quick Access Hub</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 pt-1">
          <Link
            to="/academic/marks-entry"
            className="p-3 sm:p-3.5 bg-slate-800/90 hover:bg-slate-800 border border-slate-700 rounded-xl flex items-center gap-3 group transition-all"
          >
            <div className="w-9 h-9 rounded-lg bg-orange-600/20 text-orange-400 flex items-center justify-center font-bold group-hover:scale-105 transition-transform shrink-0">
              <Edit3 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black text-white group-hover:text-orange-400 transition-colors truncate">
                Enter Marks Console
              </p>
              <p className="text-[10px] text-slate-400 truncate">Class &amp; Subject marks entry</p>
            </div>
          </Link>

          <Link
            to="/academic/exams/monthly-results"
            className="p-3 sm:p-3.5 bg-slate-800/90 hover:bg-slate-800 border border-slate-700 rounded-xl flex items-center gap-3 group transition-all"
          >
            <div className="w-9 h-9 rounded-lg bg-amber-600/20 text-amber-400 flex items-center justify-center font-bold group-hover:scale-105 transition-transform shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black text-white group-hover:text-amber-400 transition-colors truncate">
                Monthly Class Results
              </p>
              <p className="text-[10px] text-slate-400 truncate">Class-wise monthly report matrix</p>
            </div>
          </Link>

          <Link
            to="/academic/exams/half-yearly-results"
            className="p-3 sm:p-3.5 bg-slate-800/90 hover:bg-slate-800 border border-slate-700 rounded-xl flex items-center gap-3 group transition-all"
          >
            <div className="w-9 h-9 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center font-bold group-hover:scale-105 transition-transform shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black text-white group-hover:text-emerald-400 transition-colors truncate">
                Half Yearly Results
              </p>
              <p className="text-[10px] text-slate-400 truncate">Class matrix &amp; student marksheet</p>
            </div>
          </Link>

          <Link
            to="/academic/exams/annual-results"
            className="p-3 sm:p-3.5 bg-slate-800/90 hover:bg-slate-800 border border-slate-700 rounded-xl flex items-center gap-3 group transition-all"
          >
            <div className="w-9 h-9 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold group-hover:scale-105 transition-transform shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black text-white group-hover:text-indigo-400 transition-colors truncate">
                Annual Results &amp; Marksheets
              </p>
              <p className="text-[10px] text-slate-400 truncate">Final annual report &amp; PDF print</p>
            </div>
          </Link>
        </div>
      </div>

      {/* ──────────────────────────────────────────────
          RECENT EXAMINATIONS TABLE
      ────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Search & Filter Bar */}
        <div className="p-3.5 sm:p-4 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div className="relative w-full sm:max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Search exam name or class..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-orange-500 transition-all"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 max-w-full shrink-0 scrollbar-none">
            {['ALL', 'MONTHLY', 'HALF_YEARLY', 'ANNUAL'].map((type) => (
              <button
                key={type}
                onClick={() => setSelectedTypeFilter(type)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  selectedTypeFilter === type
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {type === 'HALF_YEARLY' ? 'Half Yearly' : type === 'MONTHLY' ? 'Monthly' : type === 'ANNUAL' ? 'Annual' : 'All'}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin text-orange-600 mx-auto" />
            <p className="text-xs font-extrabold text-slate-600">Loading examinations list...</p>
          </div>
        ) : filteredExams.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-black text-slate-700">No Examinations Found</p>
            <p className="text-xs text-slate-400">No active exams match the selected filter or search query.</p>
          </div>
        ) : (
          <>
            {/* 📱 MOBILE VIEW: User-Friendly Cards (No Horizontal Scrolling Required!) */}
            <div className="block md:hidden divide-y divide-slate-100">
              {filteredExams.map((e) => (
                <div key={e._id} className="p-3.5 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <h3 className="text-xs font-black text-slate-900 leading-snug">{e.name}</h3>
                      <p className="text-[11px] font-bold text-slate-500">
                        Class: {e.class ? `${e.class.name} (${e.class.section || 'A'})` : '-'} • {e.session}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                          e.examType === 'MONTHLY'
                            ? 'bg-orange-100 text-orange-700 border border-orange-200'
                            : e.examType === 'HALF_YEARLY'
                            ? 'bg-amber-100 text-amber-700 border border-amber-200'
                            : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {e.examType === 'HALF_YEARLY' ? 'Half Yearly' : e.examType}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                          e.status === 'Published' || e.status === 'Completed'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {e.status}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-600 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200/60">
                    <span className="font-bold text-slate-600">
                      Configured Subjects
                    </span>
                    <span className="font-black text-slate-900 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                      {e.subjectsConfig ? e.subjectsConfig.length : 0} Subjects
                    </span>
                  </div>

                  {/* Touch Friendly Mobile Buttons */}
                  <div className="grid grid-cols-2 gap-2 pt-0.5">
                    <button
                      onClick={() => navigate('/academic/marks-entry')}
                      className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-slate-600" />
                      <span>Enter Marks</span>
                    </button>
                    <button
                      onClick={() => {
                        if (e.examType === 'MONTHLY') navigate('/academic/exams/monthly-results');
                        else if (e.examType === 'HALF_YEARLY') navigate('/academic/exams/half-yearly-results');
                        else navigate('/academic/exams/annual-results');
                      }}
                      className="w-full py-2 bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 rounded-xl font-bold text-xs flex items-center justify-center gap-1 transition-all cursor-pointer active:scale-95"
                    >
                      <span>View Results</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* 💻 DESKTOP VIEW: Full Wide Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100/80 border-b border-slate-200/80 text-[11px] font-extrabold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                    <th className="py-3 px-4">Exam Name</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Class</th>
                    <th className="py-3 px-4">Session</th>
                    <th className="py-3 px-4 text-center">Configured Subjects</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/60">
                  {filteredExams.map((e) => (
                    <tr key={e._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-black text-slate-900 whitespace-nowrap">{e.name}</td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                            e.examType === 'MONTHLY'
                              ? 'bg-orange-100 text-orange-700 border border-orange-200'
                              : e.examType === 'HALF_YEARLY'
                              ? 'bg-amber-100 text-amber-700 border border-amber-200'
                              : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {e.examType === 'HALF_YEARLY' ? 'Half Yearly' : e.examType}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-800 whitespace-nowrap">
                        {e.class ? `${e.class.name} (${e.class.section || 'A'})` : '-'}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-600 whitespace-nowrap">{e.session}</td>
                      <td className="py-3.5 px-4 text-center font-extrabold text-slate-700 whitespace-nowrap">
                        {e.subjectsConfig ? e.subjectsConfig.length : 0} Subjects
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                            e.status === 'Published' || e.status === 'Completed'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {e.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                          <button
                            onClick={() => navigate('/academic/marks-entry')}
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-[11px] transition-all cursor-pointer shrink-0"
                          >
                            Enter Marks
                          </button>
                          <button
                            onClick={() => {
                              if (e.examType === 'MONTHLY') navigate('/academic/exams/monthly-results');
                              else if (e.examType === 'HALF_YEARLY') navigate('/academic/exams/half-yearly-results');
                              else navigate('/academic/exams/annual-results');
                            }}
                            className="px-2.5 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-lg font-bold text-[11px] border border-orange-200 transition-all cursor-pointer shrink-0"
                          >
                            View Results
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ExamDashboard;
