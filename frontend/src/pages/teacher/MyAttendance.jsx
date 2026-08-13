import React, { useState, useEffect } from 'react';
import { Calendar, Loader2, Plus, FileText, CheckCircle2, XCircle, Clock, AlertTriangle, X, Send } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import AttendanceCalendar from '../../components/AttendanceCalendar';
import { getHolidays } from '../../services/holidayApi';
import { isSameDay } from '../../utils/dateUtils';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { cn } from '../../utils/cn';

const MyAttendance = () => {
  const [data, setData] = useState(null);
  const [holidays, setHolidays] = useState([]);
  const [myLeaves, setMyLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [markingState, setMarkingState] = useState('idle'); // idle, locating, marking
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [isLeaveHistoryOpen, setIsLeaveHistoryOpen] = useState(false);
  const [submittingLeave, setSubmittingLeave] = useState(false);
  const { addToast } = useToast();

  // Form State
  const [durationType, setDurationType] = useState('single'); // 'single' | 'multiple'
  const [leaveForm, setLeaveForm] = useState({
    leaveType: 'Casual Leave',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    reason: '',
  });

  useEffect(() => {
    fetchMyAttendance();
    fetchMyLeaves();
  }, []);

  const fetchMyAttendance = async () => {
    try {
      setLoading(true);
      const [attendanceRes, holidaysData] = await Promise.all([
        api.get('/attendance/staff/my-analysis'),
        getHolidays({ year: new Date().getFullYear(), applicableTo: 'Teachers' }).catch(() => [])
      ]);
      
      if (attendanceRes.data.success) {
        setData(attendanceRes.data.data);
      }
      if (holidaysData) {
        setHolidays(holidaysData);
      }
    } catch (error) {
      console.error(error);
      addToast('Failed to load your attendance history', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchMyLeaves = async () => {
    try {
      const res = await api.get('/leaves/my');
      if (res.data.success) {
        setMyLeaves(res.data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch my leaves:', error);
    }
  };

  const handleMarkAttendance = () => {
    if (!navigator.geolocation) {
      addToast('Geolocation is not supported by your browser', 'error');
      return;
    }

    setMarkingState('locating');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          setMarkingState('marking');
          const payload = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
          
          const response = await api.post('/attendance/staff/self-mark', payload);
          if (response.data.success) {
            addToast(response.data.message, 'success');
            fetchMyAttendance();
          }
        } catch (error) {
          const msg = error.response?.data?.message || 'Failed to mark attendance';
          addToast(msg, 'error');
        } finally {
          setMarkingState('idle');
        }
      },
      (error) => {
        setMarkingState('idle');
        addToast('Location access denied or unavailable. Please enable GPS.', 'error');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Calculate inclusive total days
  const calculateTotalDays = () => {
    if (durationType === 'single') return 1;
    if (!leaveForm.startDate || !leaveForm.endDate) return 0;
    const start = new Date(leaveForm.startDate);
    const end = new Date(leaveForm.endDate);
    if (start > end) return 0;
    const diffMs = end.getTime() - start.getTime();
    return Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;
  };

  const handleApplyLeave = async (e) => {
    e.preventDefault();
    if (!leaveForm.reason.trim()) {
      addToast('Please provide a reason for leave', 'error');
      return;
    }

    const startDate = leaveForm.startDate;
    const endDate = durationType === 'single' ? leaveForm.startDate : leaveForm.endDate;

    if (new Date(startDate) > new Date(endDate)) {
      addToast('Start date cannot be after End date', 'error');
      return;
    }

    setSubmittingLeave(true);
    try {
      const payload = {
        leaveType: leaveForm.leaveType,
        startDate,
        endDate,
        reason: leaveForm.reason.trim(),
      };

      const res = await api.post('/leaves', payload);
      if (res.data.success) {
        addToast('Leave request submitted successfully!', 'success');
        window.dispatchEvent(new Event("notification-updated"));
        setIsLeaveModalOpen(false);
        setLeaveForm({
          leaveType: 'Casual Leave',
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date().toISOString().split('T')[0],
          reason: '',
        });
        fetchMyLeaves();
        fetchMyAttendance();
      }
    } catch (error) {
      console.error(error);
      const msg = error.response?.data?.message || 'Failed to submit leave request';
      addToast(msg, 'error');
    } finally {
      setSubmittingLeave(false);
    }
  };

  const handleCancelLeave = async (leaveId) => {
    if (!window.confirm('Are you sure you want to cancel this pending leave request?')) return;
    try {
      const res = await api.put(`/leaves/${leaveId}/cancel`, { reason: 'Cancelled by teacher' });
      if (res.data.success) {
        addToast('Leave request cancelled', 'info');
        window.dispatchEvent(new Event("notification-updated"));
        fetchMyLeaves();
        fetchMyAttendance();
      }
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to cancel leave';
      addToast(msg, 'error');
    }
  };

  const getAttendanceAction = () => {
    if (!data) return null;
    
    const now = new Date();
    const recordsToUse = getCalendarRecords();
    const todayRecord = recordsToUse.find(r => isSameDay(r.date, now));

    if (todayRecord) {
      const colorClass = todayRecord.status === 'Present' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                         todayRecord.status === 'Late' ? 'bg-orange-100 text-orange-800 border-orange-200' :
                         todayRecord.status === 'Absent' ? 'bg-red-100 text-red-800 border-red-200' :
                         todayRecord.status === 'Holiday' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                         todayRecord.status === 'Leave' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                         'bg-yellow-100 text-yellow-800 border-yellow-200';
                         
      return (
        <div className={`px-5 py-3 rounded-xl shadow-sm border text-sm font-bold flex items-center gap-2 ${colorClass}`}>
          Today: {todayRecord.status}
        </div>
      );
    }

    if (now.getHours() >= 12) {
      return (
        <div className="px-5 py-3 rounded-xl shadow-sm border border-red-200 bg-red-100 text-red-800 text-sm font-bold flex items-center gap-2">
          You are absent today
        </div>
      );
    }

    return (
      <button 
        onClick={handleMarkAttendance}
        disabled={markingState !== 'idle'}
        className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-xl shadow-sm text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
      >
        {markingState === 'locating' ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Locating...</>
        ) : markingState === 'marking' ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Marking...</>
        ) : (
          'Mark Present (GPS)'
        )}
      </button>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  // Determine the final records to display in the calendar
  const getCalendarRecords = () => {
    if (!data || !data.records) return [];
    const records = [...data.records];
    
    const now = new Date();
    const todayRecord = records.find(r => isSameDay(r.date, now));

    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 1; i <= daysInMonth; i++) {
      const currDate = new Date(year, month, i);

      const isSunday = currDate.getDay() === 0;
      
      const isHoliday = holidays.find(h => {
        const start = new Date(h.startDate);
        const end = new Date(h.endDate);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        return currDate >= start && currDate <= end;
      });

      if (isSunday || isHoliday) {
        const existingIdx = records.findIndex(r => isSameDay(r.date, currDate));
        if (existingIdx !== -1) {
          records.splice(existingIdx, 1);
        }
        
        records.push({
          date: currDate.toISOString(),
          status: 'Holiday',
          remarks: isHoliday ? isHoliday.name : 'Sunday',
          markedAt: null
        });
      }
    }

    const isTodayHolidayOrSunday = records.find(r => isSameDay(r.date, now) && r.status === 'Holiday');
    if (!todayRecord && !isTodayHolidayOrSunday && now.getHours() >= 12) {
      const autoAbsentDate = new Date();
      autoAbsentDate.setHours(12, 0, 0, 0);
      
      records.push({
        date: new Date().toISOString(),
        status: 'Absent',
        remarks: 'Auto-marked absent by system (did not mark before 12:00 PM)',
        markedAt: autoAbsentDate.toISOString()
      });
    }
    
    return records;
  };

  const pendingLeavesCount = myLeaves.filter(l => l.status === 'Pending').length;

  return (
    <div className="space-y-4 md:space-y-6 animate-in fade-in duration-500 max-w-[1600px] mx-auto p-2 sm:p-4">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Calendar className="text-indigo-600" size={24} />
            My Attendance & Leaves
          </h1>
          <p className="text-xs font-bold text-gray-400 mt-1">
            View daily presence, track monthly statistics, and request leaves
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setIsLeaveHistoryOpen(true)}
            className="px-4 py-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer relative"
          >
            <FileText size={16} className="text-gray-500" />
            My Leave Requests
            {pendingLeavesCount > 0 && (
              <span className="px-2 py-0.5 bg-amber-500 text-white rounded-full text-[10px] font-black animate-pulse">
                {pendingLeavesCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setIsLeaveModalOpen(true)}
            className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg shadow-indigo-100 transition-all cursor-pointer"
          >
            <Plus size={16} />
            Apply For Leave
          </button>

          {data && data.overallAttendance && (
            <div className="hidden md:flex items-center gap-3">
              {getAttendanceAction()}
              <div className="bg-indigo-50 border border-indigo-100 px-4 py-2.5 rounded-xl flex items-center gap-3">
                <div>
                  <div className="text-[10px] font-black text-indigo-400 uppercase tracking-wider">Overall Rate</div>
                  <div className="text-lg font-black text-indigo-700">{data.overallAttendance.percentage}%</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Summary Grid (Mobile) */}
      {data && data.records && (
        <div className="md:hidden grid grid-cols-2 gap-3">
          <div className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Today's Status</span>
            <div className="mt-1">{getAttendanceAction()}</div>
          </div>
          <div className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Attendance Rate</span>
            <span className="text-lg font-black text-indigo-700 mt-1">
              {data.overallAttendance?.percentage || "0"}%
            </span>
          </div>
        </div>
      )}

      {/* Main Calendar View */}
      {data && data.records ? (
        <AttendanceCalendar records={getCalendarRecords()} />
      ) : (
        <div className="bg-white p-12 rounded-2xl border border-dashed border-gray-200 text-center">
          <p className="text-gray-500 font-medium">No attendance records found.</p>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────── */}
      {/* APPLY FOR LEAVE MODAL                                    */}
      {/* ───────────────────────────────────────────────────────── */}
      <Modal
        isOpen={isLeaveModalOpen}
        onClose={() => setIsLeaveModalOpen(false)}
        title="Apply For Leave"
        maxWidth="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsLeaveModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleApplyLeave} loading={submittingLeave}>
              <Send size={14} className="mr-1.5" /> Submit Request
            </Button>
          </>
        }
      >
        <form onSubmit={handleApplyLeave} className="space-y-5">
          {/* Leave Type Selector */}
          <div>
            <label className="text-xs font-black text-gray-500 uppercase tracking-wider block mb-2">
              Leave Type <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {['Casual Leave', 'Sick Leave', 'Emergency Leave', 'Personal Leave', 'Other'].map((lt) => (
                <button
                  key={lt}
                  type="button"
                  onClick={() => setLeaveForm({ ...leaveForm, leaveType: lt })}
                  className={cn(
                    "px-3 py-2.5 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer",
                    leaveForm.leaveType === lt
                      ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100"
                      : "bg-gray-50 border-gray-100 text-gray-600 hover:border-indigo-200"
                  )}
                >
                  {lt}
                </button>
              ))}
            </div>
          </div>

          {/* Duration Type Switcher */}
          <div>
            <label className="text-xs font-black text-gray-500 uppercase tracking-wider block mb-2">
              Duration Type
            </label>
            <div className="flex bg-gray-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setDurationType('single')}
                className={cn(
                  "flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer",
                  durationType === 'single' ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500"
                )}
              >
                Single Day
              </button>
              <button
                type="button"
                onClick={() => setDurationType('multiple')}
                className={cn(
                  "flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer",
                  durationType === 'multiple' ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500"
                )}
              >
                Multiple Days
              </button>
            </div>
          </div>

          {/* Date Pickers */}
          {durationType === 'single' ? (
            <Input
              label="Select Date"
              type="date"
              value={leaveForm.startDate}
              onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value, endDate: e.target.value })}
            />
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Start Date"
                type="date"
                value={leaveForm.startDate}
                onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value })}
              />
              <Input
                label="End Date"
                type="date"
                value={leaveForm.endDate}
                onChange={(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })}
              />
            </div>
          )}

          {/* Total Days Calculated Badge */}
          <div className="p-3.5 bg-indigo-50/70 border border-indigo-100 rounded-xl flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-700">Calculated Duration:</span>
            <span className="px-3 py-1 bg-indigo-600 text-white rounded-lg font-black text-xs">
              {calculateTotalDays()} Day(s)
            </span>
          </div>

          {/* Reason Text Area */}
          <div>
            <label className="text-xs font-black text-gray-500 uppercase tracking-wider block mb-1.5">
              Reason For Leave <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              placeholder="Provide specific details or reason for requesting leave..."
              value={leaveForm.reason}
              onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-xs font-semibold focus:outline-none focus:border-indigo-600 transition-all"
            />
          </div>
        </form>
      </Modal>

      {/* ───────────────────────────────────────────────────────── */}
      {/* MY LEAVE REQUESTS DRAWER / MODAL                         */}
      {/* ───────────────────────────────────────────────────────── */}
      <Modal
        isOpen={isLeaveHistoryOpen}
        onClose={() => setIsLeaveHistoryOpen(false)}
        title="My Leave Applications History"
        maxWidth="lg"
        footer={
          <Button variant="secondary" onClick={() => setIsLeaveHistoryOpen(false)}>
            Close
          </Button>
        }
      >
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          {myLeaves.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-gray-200 rounded-2xl">
              <FileText className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-gray-500">No leave requests submitted yet.</p>
            </div>
          ) : (
            myLeaves.map((leave) => {
              const startStr = new Date(leave.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
              const endStr = new Date(leave.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

              return (
                <div key={leave._id} className="p-4 rounded-2xl border border-gray-100 bg-gray-50/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 bg-indigo-50 text-indigo-700 font-black text-[10px] uppercase rounded-lg border border-indigo-100">
                        {leave.leaveType}
                      </span>
                      <span className="text-xs font-bold text-gray-500">
                        {startStr === endStr ? startStr : `${startStr} - ${endStr}`}
                      </span>
                    </div>

                    <span
                      className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border",
                        leave.status === "Approved" && "bg-emerald-50 text-emerald-700 border-emerald-200",
                        leave.status === "Pending" && "bg-amber-50 text-amber-700 border-amber-200",
                        leave.status === "Rejected" && "bg-rose-50 text-rose-700 border-rose-200",
                        leave.status === "Cancelled" && "bg-gray-100 text-gray-500 border-gray-200"
                      )}
                    >
                      {leave.status}
                    </span>
                  </div>

                  <p className="text-xs text-gray-700 font-semibold bg-white p-3 rounded-xl border border-gray-100">
                    "{leave.reason}"
                  </p>

                  {leave.adminRemarks && (
                    <div className="p-2.5 bg-amber-50/60 border border-amber-100 rounded-xl text-[11px] font-bold text-amber-800">
                      Admin Remarks: {leave.adminRemarks}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[10px] text-gray-400 font-bold pt-1">
                    <span>Applied: {new Date(leave.appliedAt || leave.createdAt).toLocaleDateString('en-IN')}</span>

                    {leave.status === 'Pending' && (
                      <button
                        onClick={() => handleCancelLeave(leave._id)}
                        className="text-rose-600 hover:text-rose-700 font-black hover:underline cursor-pointer"
                      >
                        Cancel Request
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Modal>
    </div>
  );
};

export default MyAttendance;
