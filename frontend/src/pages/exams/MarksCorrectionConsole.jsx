import React, { useState, useEffect } from 'react';
import {
  HelpCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  RefreshCw,
  User,
  BookOpen,
  AlertTriangle,
  Send,
  X,
  MessageSquare,
} from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';

const MarksCorrectionConsole = () => {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [options, setOptions] = useState(null);
  const [selectedSession, setSelectedSession] = useState('2026-2027');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('PENDING');

  const [requests, setRequests] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });
  const [loading, setLoading] = useState(false);

  // Review Modal State
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [reviewAction, setReviewAction] = useState('APPROVE'); // APPROVE or REJECT
  const [reviewRemarks, setReviewRemarks] = useState('');
  const [processing, setProcessing] = useState(false);

  const fetchOptions = async () => {
    try {
      const res = await api.get('/exams/options');
      if (res.data && res.data.data) {
        setOptions(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load filter options:', err);
    }
  };

  useEffect(() => {
    fetchOptions();
  }, []);

  const fetchRequests = async (pageNo = 1) => {
    try {
      setLoading(true);
      const params = {
        session: selectedSession,
        page: pageNo,
        limit: 15,
      };
      if (selectedClassId) params.classId = selectedClassId;
      if (selectedStatus && selectedStatus !== 'ALL') params.status = selectedStatus;

      const res = await api.get('/exams/correction-requests', { params });
      if (res.data && res.data.data) {
        setRequests(res.data.data.requests || []);
        setPagination(res.data.data.pagination || { page: 1, total: 0, pages: 1 });
      }
    } catch (err) {
      console.error('Failed to fetch correction requests:', err);
      addToast(err.response?.data?.message || 'Failed to load correction requests', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests(1);
  }, [selectedSession, selectedClassId, selectedStatus]);

  const handleOpenReview = (reqDoc, actionType) => {
    setSelectedRequest(reqDoc);
    setReviewAction(actionType);
    setReviewRemarks('');
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRequest) return;

    try {
      setProcessing(true);
      const endpoint =
        reviewAction === 'APPROVE'
          ? `/exams/correction-requests/${selectedRequest._id}/approve`
          : `/exams/correction-requests/${selectedRequest._id}/reject`;

      const res = await api.post(endpoint, { reviewRemarks });
      if (res.data && res.data.data) {
        addToast(
          reviewAction === 'APPROVE'
            ? 'Marks correction request approved and applied successfully!'
            : 'Marks correction request rejected',
          'success'
        );
        setSelectedRequest(null);
        fetchRequests(pagination.page);
      }
    } catch (err) {
      console.error('Action failed:', err);
      addToast(err.response?.data?.message || 'Failed to process request action', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const isAdmin = user?.role === 'admin';

  return (
    <div className="space-y-4 sm:space-y-6 pb-12">
      {/* Top Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-orange-100 text-orange-600 rounded-xl shrink-0">
              <HelpCircle className="w-5 h-5" />
            </span>
            <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">Marks Correction &amp; Rechecking Queue</h1>
          </div>
          <p className="text-xs font-bold text-slate-500 mt-1 leading-relaxed">
            Review, approve, or reject student marks correction and answer sheet rechecking requests
          </p>
        </div>

        <button
          onClick={() => fetchRequests(pagination.page)}
          className="w-full sm:w-auto px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all shrink-0"
        >
          <RefreshCw className={`w-4 h-4 text-orange-600 ${loading ? 'animate-spin' : ''} shrink-0`} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3 sm:space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
          <Filter className="w-4 h-4 text-orange-600 shrink-0" />
          <span className="text-xs font-black uppercase text-slate-800 tracking-wider">Filter Requests</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
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
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Class</label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-orange-500 transition-all cursor-pointer"
            >
              <option value="">All Classes</option>
              {(options?.classes || []).map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name} ({c.section})
                </option>
              ))}
            </select>
          </div>

          <div className="col-span-2 sm:col-span-1">
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Request Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-orange-500 transition-all cursor-pointer"
            >
              <option value="PENDING">Pending Approval</option>
              <option value="COMPLETED">Approved &amp; Completed</option>
              <option value="REJECTED">Rejected</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="ALL">All Statuses</option>
            </select>
          </div>
        </div>
      </div>

      {/* Requests Container */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin text-orange-600 mx-auto" />
            <p className="text-xs font-extrabold text-slate-600">Loading correction requests...</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-black text-slate-700">No Correction Requests Found</h3>
            <p className="text-xs text-slate-400">
              There are no {selectedStatus !== 'ALL' ? selectedStatus.toLowerCase() : ''} marks correction requests for the selected filters.
            </p>
          </div>
        ) : (
          <>
            {/* 📱 MOBILE VIEW: Correction Request Cards (No Horizontal Clipping) */}
            <div className="block md:hidden divide-y divide-slate-100">
              {requests.map((r) => {
                const diff = r.requestedMarks - (r.existingMarks ?? 0);
                const isPositive = diff > 0;

                return (
                  <div key={r._id} className="p-3.5 space-y-3">
                    {/* Header: Date + Status Badge */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold text-slate-400">
                        {new Date(r.createdAt).toLocaleDateString()}
                      </span>

                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          r.status === 'COMPLETED'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : r.status === 'PENDING'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : r.status === 'REJECTED'
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {r.status}
                      </span>
                    </div>

                    {/* Student & Exam Info */}
                    <div>
                      <h4 className="text-xs font-black text-slate-900 leading-snug">{r.student?.fullName || 'Student'}</h4>
                      <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                        Roll #{r.student?.rollNumber || '-'} • Class {r.class?.name || '-'} ({r.section})
                      </p>
                      <p className="text-xs font-black text-orange-600 mt-1">
                        Subject: {r.subject?.name || 'Subject'} <span className="text-slate-400 font-bold">• {r.exam?.name}</span>
                      </p>
                    </div>

                    {/* Marks Difference Box */}
                    <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 text-center">
                      <div>
                        <span className="block text-[9px] font-extrabold text-slate-400 uppercase">Baseline Mark</span>
                        <span className="text-xs font-black text-slate-700">
                          {r.existingMarks !== null && r.existingMarks !== undefined ? r.existingMarks : '-'}
                        </span>
                      </div>

                      <div>
                        <span className="block text-[9px] font-extrabold text-slate-400 uppercase">Requested Mark</span>
                        <div className="flex items-center justify-center gap-1">
                          <span className="text-xs font-black text-slate-900">{r.requestedMarks}</span>
                          <span className={`text-[10px] font-black ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                            ({isPositive ? `+${diff}` : `${diff}`})
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Reason */}
                    {r.reason && (
                      <div className="bg-amber-50/60 p-2 rounded-lg border border-amber-100/80 text-xs">
                        <span className="block text-[9px] font-extrabold text-amber-800 uppercase mb-0.5">Reason</span>
                        <p className="text-[11px] font-medium text-slate-700 leading-relaxed italic">"{r.reason}"</p>
                      </div>
                    )}

                    {/* Actions */}
                    {r.status === 'PENDING' && isAdmin ? (
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          onClick={() => handleOpenReview(r, 'APPROVE')}
                          className="py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black cursor-pointer shadow-xs text-center"
                        >
                          Approve &amp; Apply
                        </button>
                        <button
                          onClick={() => handleOpenReview(r, 'REJECT')}
                          className="py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black cursor-pointer shadow-xs text-center"
                        >
                          Reject
                        </button>
                      </div>
                    ) : r.reviewedBy ? (
                      <p className="text-[10px] text-slate-400 font-bold text-center">
                        Reviewed by {r.reviewedBy.name}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>

            {/* 💻 DESKTOP VIEW: Full Wide 9-Column Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900 text-white font-extrabold uppercase text-[10px]">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Exam / Class</th>
                    <th className="py-3 px-4">Subject</th>
                    <th className="py-3 px-4 text-center">Baseline</th>
                    <th className="py-3 px-4 text-center">Requested</th>
                    <th className="py-3 px-4">Reason</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {requests.map((r) => {
                    const diff = r.requestedMarks - (r.existingMarks ?? 0);
                    const isPositive = diff > 0;

                    return (
                      <tr key={r._id} className="hover:bg-slate-50/80">
                        <td className="py-3 px-4 text-slate-500 font-bold whitespace-nowrap">
                          {new Date(r.createdAt).toLocaleDateString()}
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-black text-slate-900">{r.student?.fullName || 'Student'}</div>
                          <div className="text-[10px] text-slate-400 font-bold">
                            Roll #{r.student?.rollNumber || '-'} • ID: {r.student?.studentId || '-'}
                          </div>
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-bold text-slate-800">{r.exam?.name}</div>
                          <div className="text-[10px] text-slate-400">
                            Class {r.class?.name || '-'} ({r.section})
                          </div>
                        </td>

                        <td className="py-3 px-4 font-black text-orange-600 whitespace-nowrap">{r.subject?.name || 'Subject'}</td>

                        <td className="py-3 px-4 text-center font-bold text-slate-600 whitespace-nowrap">
                          {r.existingMarks !== null && r.existingMarks !== undefined ? r.existingMarks : '-'}
                        </td>

                        <td className="py-3 px-4 text-center font-black text-slate-900 whitespace-nowrap">
                          {r.requestedMarks}
                          <span className={`block text-[9.5px] font-black ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                            ({isPositive ? `+${diff}` : `${diff}`})
                          </span>
                        </td>

                        <td className="py-3 px-4 max-w-xs truncate text-slate-700 font-medium" title={r.reason}>
                          {r.reason}
                        </td>

                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              r.status === 'COMPLETED'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : r.status === 'PENDING'
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : r.status === 'REJECTED'
                                ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {r.status}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          {r.status === 'PENDING' && isAdmin ? (
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleOpenReview(r, 'APPROVE')}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-black cursor-pointer shadow-xs"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleOpenReview(r, 'REJECT')}
                                className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-black cursor-pointer shadow-xs"
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-bold">
                              {r.reviewedBy ? `Reviewed by ${r.reviewedBy.name}` : '-'}
                            </span>
                          )}
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

      {/* Review Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-2xl border border-slate-200 shadow-2xl p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-xs sm:text-sm font-black uppercase text-slate-900">
                  {reviewAction === 'APPROVE' ? 'Approve & Apply Marks Correction' : 'Reject Correction Request'}
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-500 font-bold mt-0.5">
                  Student: {selectedRequest.student?.fullName} • {selectedRequest.subject?.name}
                </p>
              </div>
              <button onClick={() => setSelectedRequest(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReviewSubmit} className="space-y-4">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-500 font-bold block text-[10px] uppercase">Baseline Mark</span>
                    <span className="font-black text-slate-800 text-xs">{selectedRequest.existingMarks ?? '-'}</span>
                  </div>

                  <div>
                    <span className="text-slate-500 font-bold block text-[10px] uppercase">Requested Mark</span>
                    <span className="font-black text-orange-600 text-sm">{selectedRequest.requestedMarks}</span>
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 font-bold block text-[10px] uppercase">Justification Reason</span>
                  <p className="text-slate-800 font-medium italic text-xs mt-0.5">"{selectedRequest.reason}"</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Admin Review Remarks {reviewAction === 'REJECT' ? '*' : '(Optional)'}
                </label>
                <textarea
                  rows={3}
                  value={reviewRemarks}
                  onChange={(e) => setReviewRemarks(e.target.value)}
                  placeholder={reviewAction === 'APPROVE' ? 'e.g. Approved after answer sheet verification.' : 'e.g. Rechecking confirmed existing marks are accurate.'}
                  required={reviewAction === 'REJECT'}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-orange-500 transition-all"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedRequest(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processing}
                  className={`px-4 sm:px-5 py-2 rounded-xl text-xs font-black text-white cursor-pointer shadow-xs ${
                    reviewAction === 'APPROVE' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {processing
                    ? 'Processing...'
                    : reviewAction === 'APPROVE'
                    ? 'Confirm Approval & Recalculate'
                    : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MarksCorrectionConsole;
