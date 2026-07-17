import React, { useState, useEffect } from 'react';
import { Users, Loader2, Calendar } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import AttendanceCalendar from '../../components/AttendanceCalendar';
import AppCombobox from '../../components/ui/AppCombobox';

const StaffAttendanceHistory = () => {
  const [teachers, setTeachers] = useState([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [data, setData] = useState(null);
  const [loadingTeachers, setLoadingTeachers] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    fetchTeachers();
  }, []);

  useEffect(() => {
    if (selectedTeacherId) {
      fetchTeacherAttendance(selectedTeacherId);
    } else {
      setData(null);
    }
  }, [selectedTeacherId]);

  const fetchTeachers = async () => {
    try {
      setLoadingTeachers(true);
      const response = await api.get('/teachers');
      if (response.data.success) {
        setTeachers(response.data.data.teachers || []);
      }
    } catch (error) {
      console.error(error);
      addToast('Failed to load staff list', 'error');
    } finally {
      setLoadingTeachers(false);
    }
  };

  const fetchTeacherAttendance = async (teacherId) => {
    try {
      setLoadingData(true);
      const response = await api.get(`/attendance/staff/analysis/${teacherId}`);
      if (response.data.success) {
        setData(response.data.data);
      }
    } catch (error) {
      console.error(error);
      addToast('Failed to load attendance history', 'error');
    } finally {
      setLoadingData(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-800 tracking-tight flex items-center gap-2">
            <Users className="text-indigo-600" size={28} />
            Staff Attendance History
          </h1>
          <p className="text-sm font-medium text-gray-500 mt-1">
            Select a staff member to view their detailed attendance records
          </p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <AppCombobox
          label="Select Staff Member"
          placeholder="Select Staff Member..."
          searchPlaceholder="Search by name or ID..."
          emptyText="No staff members found"
          loading={loadingTeachers}
          value={selectedTeacherId}
          onChange={(val) => setSelectedTeacherId(val)}
          options={teachers.map((t) => ({
            value: t._id,
            label: `${t.firstName} ${t.lastName}`,
            badge: t.employeeId || undefined,
          }))}
          containerClassName="max-w-md"
        />
      </div>

      {loadingData ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        </div>
      ) : data && data.records ? (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
          
          {/* Teacher Profile Summary */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-6">
            <div className="w-16 h-16 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xl font-black shrink-0">
              {data.teacherInfo.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-800">{data.teacherInfo.name}</h3>
              <div className="text-sm font-medium text-gray-500 flex items-center gap-4 mt-1">
                <span>Employee ID: {data.teacherInfo.employeeId}</span>
                <span>•</span>
                <span>Phone: {data.teacherInfo.phone}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Overall Rate</div>
              <div className="text-2xl font-black text-indigo-700">{data.overallAttendance.percentage}%</div>
            </div>
          </div>

          <AttendanceCalendar records={data.records} />
          
        </div>
      ) : selectedTeacherId ? (
        <div className="bg-white p-12 rounded-xl border border-dashed border-gray-200 text-center">
          <p className="text-gray-500 font-medium">No attendance records found for this staff member.</p>
        </div>
      ) : null}
    </div>
  );
};

export default StaffAttendanceHistory;
