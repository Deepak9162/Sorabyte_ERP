import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../utils/cn';

const AttendanceCalendar = ({ records = [] }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();

  // Create a map for fast lookup of records for the current month
  const attendanceMap = useMemo(() => {
    const map = {};
    records.forEach(r => {
      const d = new Date(r.date);
      if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
        map[d.getDate()] = {
          status: r.status,
          markedAt: r.markedAt ? new Date(r.markedAt) : null
        };
      }
    });
    return map;
  }, [records, currentYear, currentMonth]);

  const handlePrevMonth = () => setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  
  // Calculate stats for current month only
  const monthStats = useMemo(() => {
    let present = 0, absent = 0, leave = 0, late = 0;
    Object.values(attendanceMap).forEach(record => {
      if (record.status === 'Present') present++;
      if (record.status === 'Absent') absent++;
      if (record.status === 'Leave') leave++;
      if (record.status === 'Late') late++;
    });
    return { present, absent, leave, late };
  }, [attendanceMap]);

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const getStatusColor = (status) => {
    switch (status) {
      case 'Present': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'Absent': return 'bg-red-100 text-red-700 border-red-200';
      case 'Leave': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'Late': return 'bg-orange-100 text-orange-700 border-orange-200';
      default: return 'bg-gray-50 text-gray-500 border-gray-100';
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-gray-800">
          {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </h2>
        <div className="flex gap-2">
          <button onClick={handlePrevMonth} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronLeft size={20} className="text-gray-600" />
          </button>
          <button onClick={handleNextMonth} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronRight size={20} className="text-gray-600" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100">
          <div className="text-xs font-semibold text-emerald-600 uppercase">Present</div>
          <div className="text-2xl font-black text-emerald-700">{monthStats.present}</div>
        </div>
        <div className="p-3 bg-red-50 rounded-lg border border-red-100">
          <div className="text-xs font-semibold text-red-600 uppercase">Absent</div>
          <div className="text-2xl font-black text-red-700">{monthStats.absent}</div>
        </div>
        <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
          <div className="text-xs font-semibold text-amber-600 uppercase">Leave</div>
          <div className="text-2xl font-black text-amber-700">{monthStats.leave}</div>
        </div>
        <div className="p-3 bg-orange-50 rounded-lg border border-orange-100">
          <div className="text-xs font-semibold text-orange-600 uppercase">Late</div>
          <div className="text-2xl font-black text-orange-700">{monthStats.late}</div>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {days.map(day => (
          <div key={day} className="text-center text-xs font-bold text-gray-400 py-2">
            {day}
          </div>
        ))}
        
        {Array.from({ length: firstDayOfMonth }).map((_, i) => (
          <div key={`empty-${i}`} className="h-24 bg-gray-50/50 rounded-lg border border-gray-100 border-dashed" />
        ))}
        
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const dateNum = i + 1;
          const record = attendanceMap[dateNum];
          const status = record?.status;
          const markedAt = record?.markedAt;

          return (
            <div 
              key={dateNum} 
              className={cn(
                "h-24 p-2 rounded-lg border flex flex-col items-center justify-center gap-1 transition-all",
                status ? getStatusColor(status) : "bg-white text-gray-400 border-gray-100 hover:border-gray-200"
              )}
            >
              <span className={cn("text-lg font-bold", status ? "" : "opacity-50")}>{dateNum}</span>
              {status && (
                <div className="flex flex-col items-center gap-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/60 shadow-sm">
                    {status}
                  </span>
                  {markedAt && (
                    <span className="text-[9px] font-semibold opacity-75 mt-0.5">
                      {markedAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AttendanceCalendar;
