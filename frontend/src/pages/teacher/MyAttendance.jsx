import React, { useState, useEffect } from 'react';
import { Calendar, Loader2 } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import AttendanceCalendar from '../../components/AttendanceCalendar';

const MyAttendance = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
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
          <div className="bg-white px-5 py-3 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div>
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Overall Rate</div>
              <div className="text-xl font-black text-indigo-700">{data.overallAttendance.percentage}%</div>
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
