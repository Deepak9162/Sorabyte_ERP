import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { cn } from '../utils/cn';

const AttendanceCalendar = ({ records = [] }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isCollapsed, setIsCollapsed] = useState(false);

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
      case 'Present': return 'bg-emerald-100 text-emerald-705 border-emerald-200';
      case 'Absent': return 'bg-red-100 text-red-705 border-red-200';
      case 'Leave': return 'bg-amber-100 text-amber-705 border-amber-200';
      case 'Late': return 'bg-orange-100 text-orange-705 border-orange-200';
      default: return 'bg-gray-50 text-gray-500 border-gray-100';
    }
  };

  return (
    <div className="bg-white p-3.5 md:p-6 rounded-2xl shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-sm md:text-lg font-black text-gray-800">
            {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </h2>
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)} 
            className="md:hidden flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-indigo-605 bg-indigo-50 border border-indigo-100/50 px-2.5 py-1 rounded-lg active:scale-95 transition-all cursor-pointer"
          >
            <CalendarDays size={12} />
            {isCollapsed ? "Show Grid" : "Hide Grid"}
          </button>
        </div>
        <div className="flex gap-1.5">
          <button onClick={handlePrevMonth} className="p-1.5 md:p-2 hover:bg-gray-150 rounded-lg transition-colors cursor-pointer">
            <ChevronLeft size={18} className="text-gray-600" />
          </button>
          <button onClick={handleNextMonth} className="p-1.5 md:p-2 hover:bg-gray-150 rounded-lg transition-colors cursor-pointer">
            <ChevronRight size={18} className="text-gray-600" />
          </button>
        </div>
      </div>

      {/* Month Stats Grid */}
      {!isCollapsed && (
        <div className="grid grid-cols-4 gap-2 mb-4">
          <div className="p-2 bg-emerald-50/70 rounded-xl border border-emerald-100">
            <div className="text-[9px] font-bold text-emerald-600 uppercase font-black">Present</div>
            <div className="text-base md:text-2xl font-black text-emerald-700">{monthStats.present}</div>
          </div>
          <div className="p-2 bg-red-50/70 rounded-xl border border-red-100">
            <div className="text-[9px] font-bold text-red-600 uppercase font-black">Absent</div>
            <div className="text-base md:text-2xl font-black text-red-700">{monthStats.absent}</div>
          </div>
          <div className="p-2 bg-amber-50/70 rounded-xl border border-amber-100">
            <div className="text-[9px] font-bold text-amber-600 uppercase font-black">Leave</div>
            <div className="text-base md:text-2xl font-black text-amber-705">{monthStats.leave}</div>
          </div>
          <div className="p-2 bg-orange-50/70 rounded-xl border border-orange-100">
            <div className="text-[9px] font-bold text-orange-600 uppercase font-black">Late</div>
            <div className="text-base md:text-2xl font-black text-orange-700">{monthStats.late}</div>
          </div>
        </div>
      )}

      {/* Days Grid */}
      {!isCollapsed && (
        <div className="grid grid-cols-7 gap-1 md:gap-2">
          {days.map(day => (
            <div key={day} className="text-center text-[10px] md:text-xs font-bold text-gray-400 py-1.5">
              {day}
            </div>
          ))}
          
          {Array.from({ length: firstDayOfMonth }).map((_, i) => (
            <div key={`empty-${i}`} className="h-12 md:h-24 bg-gray-50/30 rounded-xl border border-gray-105 border-dashed" />
          ))}
          
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dateNum = i + 1;
            const record = attendanceMap[dateNum];
            const status = record?.status;
            const markedAt = record?.markedAt;

            const tooltipText = status 
              ? `${status} on ${currentDate.toLocaleString('default', { month: 'short' })} ${dateNum}${markedAt ? ` at ${markedAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}` : ''}`
              : `No record for ${currentDate.toLocaleString('default', { month: 'short' })} ${dateNum}`;

            return (
              <div 
                key={dateNum}
                title={tooltipText}
                className={cn(
                  "h-12 md:h-24 p-1 md:p-2 rounded-xl border flex flex-col items-center justify-center gap-0.5 md:gap-1 transition-all duration-200 hover:scale-105 hover:shadow-md cursor-pointer",
                  status ? getStatusColor(status) : "bg-gray-50/40 text-gray-400 border-gray-100 hover:border-gray-250 hover:bg-white"
                )}
              >
                <span className={cn("text-xs md:text-lg font-black", status ? "" : "opacity-50")}>{dateNum}</span>
                {status && (
                  <>
                    <div className="hidden md:flex flex-col items-center gap-0.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/60 shadow-sm animate-in fade-in duration-300">
                        {status}
                      </span>
                      {markedAt && (
                        <span className="text-[9px] font-semibold opacity-75 mt-0.5">
                          {markedAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                        </span>
                      )}
                    </div>
                    <div className={cn(
                      "md:hidden w-1.5 h-1.5 rounded-full bg-current",
                      status === 'Present' && "text-emerald-700",
                      status === 'Absent' && "text-red-700",
                      status === 'Leave' && "text-amber-700",
                      status === 'Late' && "text-orange-700",
                    )} />
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AttendanceCalendar;
