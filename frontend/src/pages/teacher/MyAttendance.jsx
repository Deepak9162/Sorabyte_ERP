import React, { useState, useEffect } from 'react';
import { Calendar, Loader2 } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import AttendanceCalendar from '../../components/AttendanceCalendar';
import { getHolidays } from '../../services/holidayApi';
import { isSameDay } from '../../utils/dateUtils';

const MyAttendance = () => {
  const [data, setData] = useState(null);
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [markingState, setMarkingState] = useState('idle'); // idle, locating, marking
  const { addToast } = useToast();

  useEffect(() => {
    fetchMyAttendance();
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
            fetchMyAttendance(); // Refresh calendar
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

    // Determine current month range being viewed to inject Sundays/Holidays
    // MyAttendance is mostly showing the current month
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 1; i <= daysInMonth; i++) {
      const currDate = new Date(year, month, i);

      // Check if it's a Sunday
      const isSunday = currDate.getDay() === 0;
      
      // Check if it's a Holiday
      const isHoliday = holidays.find(h => {
        const start = new Date(h.startDate);
        const end = new Date(h.endDate);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        return currDate >= start && currDate <= end;
      });

      if (isSunday || isHoliday) {
        // Remove existing record for this day if any (e.g. Leave marked by mistake)
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

    // If it's past 12 PM and no record exists for today (and today is NOT a holiday/Sunday), visually inject an "Absent" record for today
    const isTodayHolidayOrSunday = records.find(r => isSameDay(r.date, now) && r.status === 'Holiday');
    if (!todayRecord && !isTodayHolidayOrSunday && now.getHours() >= 12) {
      const autoAbsentDate = new Date();
      autoAbsentDate.setHours(12, 0, 0, 0); // Simulate it was marked at 12:00 PM
      
      records.push({
        date: new Date().toISOString(),
        status: 'Absent',
        remarks: 'Auto-marked absent by system (did not mark before 12:00 PM)',
        markedAt: autoAbsentDate.toISOString()
      });
    }
    
    return records;
  };

  return (
    <div className="space-y-4 md:space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-gray-800 tracking-tight flex items-center gap-2">
            <Calendar className="text-indigo-605" size={24} />
            My Attendance
          </h1>
          <p className="hidden md:block text-sm font-medium text-gray-500 mt-1">
            View your daily attendance records and monthly statistics
          </p>
        </div>
        
        {data && data.overallAttendance && (
          <div className="hidden md:flex items-center gap-4">
            {getAttendanceAction()}
            <div className="bg-white px-5 py-3 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
              <div>
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Overall Rate</div>
                <div className="text-xl font-black text-indigo-700">{data.overallAttendance.percentage}%</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Summary Grid (Mobile) */}
      {data && data.records && (
        <div className="md:hidden grid grid-cols-2 gap-3">
          <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between min-h-[75px]">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Today's Action</span>
            <div className="mt-1">{getAttendanceAction()}</div>
          </div>
          <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between min-h-[75px]">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Overall Rate</span>
            <span className="text-lg font-black text-indigo-700 mt-1">
              {data.overallAttendance?.percentage || "0"}%
            </span>
          </div>
          <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between min-h-[75px]">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Presents</span>
            <span className="text-lg font-black text-emerald-600 mt-1">
              {getCalendarRecords().filter(r => r.status === 'Present').length} Days
            </span>
          </div>
          <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between min-h-[75px]">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Absents</span>
            <span className="text-lg font-black text-rose-600 mt-1">
              {getCalendarRecords().filter(r => r.status === 'Absent').length} Days
            </span>
          </div>
        </div>
      )}

      {data && data.records ? (
        <AttendanceCalendar records={getCalendarRecords()} />
      ) : (
        <div className="bg-white p-12 rounded-xl border border-dashed border-gray-200 text-center">
          <p className="text-gray-500 font-medium">No attendance records found.</p>
        </div>
      )}
    </div>
  );
};

export default MyAttendance;
