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
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-500 max-w-[1600px] mx-auto p-1 sm:p-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Users className="text-indigo-600 shrink-0" size={24} />
            Staff Attendance History
          </h1>
          <p className="text-xs font-semibold text-gray-400 mt-0.5">
            Select a staff member to view their detailed attendance records
          </p>
        </div>
      </div>

      <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100">
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
          containerClassName="w-full max-w-md"
        />
      </div>

      {loadingData ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        </div>
      ) : data && data.records ? (
        <div className="space-y-4 sm:space-y-6 animate-in slide-in-from-bottom-4 duration-500">
          
          {/* Teacher Profile Summary */}
          <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center text-base sm:text-xl font-black shrink-0 shadow-xs">
                {data.teacherInfo?.name ? data.teacherInfo.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'ST'}
              </div>
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-black text-gray-900 tracking-tight truncate">
                  {data.teacherInfo?.name}
                </h3>
                <div className="text-xs font-semibold text-gray-500 flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                  <span>ID: <strong className="text-gray-700 font-bold">{data.teacherInfo?.employeeId || 'N/A'}</strong></span>
                  {data.teacherInfo?.phone && (
                    <>
                      <span className="text-gray-300">•</span>
                      <span>Ph: <strong className="text-gray-700 font-bold">{data.teacherInfo.phone}</strong></span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-gray-100">
              <div className="bg-indigo-50/80 border border-indigo-100 px-4 py-2.5 rounded-xl flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
                <div className="text-[10px] font-black text-indigo-400 uppercase tracking-wider">Overall Rate</div>
                <div className="text-lg sm:text-2xl font-black text-indigo-700 leading-none">{data.overallAttendance?.percentage || "0"}%</div>
              </div>
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
