import React, { useState, useEffect } from 'react';
import { Calendar, Loader2 } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import AttendanceCalendar from '../../components/AttendanceCalendar';

const MyAttendance = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [markingState, setMarkingState] = useState('idle'); // idle, locating, marking
  const { addToast } = useToast();

  useEffect(() => {
    fetchMyAttendance();
  }, []);

  const fetchMyAttendance = async () => {
    try {
      setLoading(true);
      const response = await api.get('/attendance/staff/my-analysis');
      if (response.data.success) {
        setData(response.data.data);
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
    // Check if attendance already exists for today
    const todayRecord = data.records?.find(r => {
      const recordDate = new Date(r.date);
      return recordDate.getFullYear() === now.getFullYear() && 
             recordDate.getMonth() === now.getMonth() && 
             recordDate.getDate() === now.getDate();
    });

    if (todayRecord) {
      const colorClass = todayRecord.status === 'Present' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                         todayRecord.status === 'Late' ? 'bg-orange-100 text-orange-800 border-orange-200' :
                         todayRecord.status === 'Absent' ? 'bg-red-100 text-red-800 border-red-200' :
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

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-800 tracking-tight flex items-center gap-2">
            <Calendar className="text-indigo-600" size={28} />
            My Attendance History
          </h1>
          <p className="text-sm font-medium text-gray-500 mt-1">
            View your daily attendance records and monthly statistics
          </p>
        </div>
        
        {data && data.overallAttendance && (
          <div className="flex items-center gap-4">
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

      {data && data.records ? (
        <AttendanceCalendar records={data.records} />
      ) : (
        <div className="bg-white p-12 rounded-xl border border-dashed border-gray-200 text-center">
          <p className="text-gray-500 font-medium">No attendance records found.</p>
        </div>
      )}
    </div>
  );
};

export default MyAttendance;
