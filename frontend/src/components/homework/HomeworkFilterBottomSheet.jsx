import React from 'react';
import { X, Filter, RotateCcw, Check } from 'lucide-react';
import Select from '../ui/Select';
import { cn } from '../../utils/cn';

const HomeworkFilterBottomSheet = ({
  isOpen,
  onClose,
  classes = [],
  subjects = [],
  teachers = [],
  filterClass = '',
  setFilterClass,
  filterSubject = '',
  setFilterSubject,
  filterTeacher = '',
  setFilterTeacher,
  filterStatus = '',
  setFilterStatus,
  onResetFilters,
  onApplyFilters,
}) => {
  if (!isOpen) return null;

  const activeCount = [filterClass, filterSubject, filterTeacher, filterStatus].filter(Boolean).length;

  const handleReset = () => {
    setFilterClass?.('');
    setFilterSubject?.('');
    setFilterTeacher?.('');
    setFilterStatus?.('');
    onResetFilters?.();
  };

  const handleApply = () => {
    onApplyFilters?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      {/* Backdrop with Blur */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Sheet Container */}
      <div
        className={cn(
          "relative w-full max-w-lg bg-white rounded-t-[28px] sm:rounded-3xl shadow-2xl border border-slate-100 flex flex-col max-h-[85vh] z-10 overflow-hidden",
          "animate-in slide-in-from-bottom duration-300 ease-out"
        )}
      >
        {/* Handlebar for Mobile Dragging Visual */}
        <div className="w-full flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-12 h-1.5 bg-slate-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold border border-orange-100">
              <Filter className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-900 tracking-tight">Filter Submissions</h3>
                {activeCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-orange-500 text-white shadow-xs">
                    {activeCount} Active
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">Narrow down homework entries</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 hover:bg-slate-200 flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body - Filter Controls */}
        <div className="p-5 space-y-4 overflow-y-auto custom-scrollbar">
          {/* Class Select */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Class Group
            </label>
            <Select
              placeholder="All Classes"
              options={[
                { value: '', label: 'All Classes' },
                ...classes.map((c) => ({
                  value: c._id || c.id,
                  label: c.name,
                })),
              ]}
              value={filterClass}
              onChange={(val) => setFilterClass?.(val)}
              className="w-full rounded-2xl border-slate-200 focus:border-orange-500 focus:ring-orange-500/20 text-sm font-semibold h-11"
            />
          </div>

          {/* Subject Select */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Subject
            </label>
            <Select
              placeholder="All Subjects"
              options={[
                { value: '', label: 'All Subjects' },
                ...subjects.map((s) => ({ value: s._id || s.id, label: s.name })),
              ]}
              value={filterSubject}
              onChange={(val) => setFilterSubject?.(val)}
              className="w-full rounded-2xl border-slate-200 focus:border-orange-500 focus:ring-orange-500/20 text-sm font-semibold h-11"
            />
          </div>

          {/* Teacher Select */}
          {teachers.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Assigned Teacher
              </label>
              <Select
                placeholder="All Teachers"
                options={[
                  { value: '', label: 'All Teachers' },
                  ...teachers.map((t) => ({
                    value: t._id || t.id,
                    label: `${t.firstName || ''} ${t.lastName || ''}`.trim() || t.name,
                  })),
                ]}
                value={filterTeacher}
                onChange={(val) => setFilterTeacher?.(val)}
                className="w-full rounded-2xl border-slate-200 focus:border-orange-500 focus:ring-orange-500/20 text-sm font-semibold h-11"
              />
            </div>
          )}

          {/* Status Select */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Submission Status
            </label>
            <Select
              placeholder="All Statuses"
              options={[
                { value: '', label: 'All Statuses' },
                { value: 'Approved', label: 'Approved' },
                { value: 'Pending Admin', label: 'Pending Admin' },
                { value: 'Pending Incharge', label: 'Pending Incharge' },
                { value: 'Rejected', label: 'Rejected' },
              ]}
              value={filterStatus}
              onChange={(val) => setFilterStatus?.(val)}
              className="w-full rounded-2xl border-slate-200 focus:border-orange-500 focus:ring-orange-500/20 text-sm font-semibold h-11"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleReset}
            className="flex-1 py-3 px-4 rounded-2xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 text-xs font-extrabold flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer shadow-2xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Filters</span>
          </button>

          <button
            type="button"
            onClick={handleApply}
            className="flex-1 py-3 px-4 rounded-xl bg-orange-600 text-white hover:bg-orange-700 text-xs font-extrabold flex items-center justify-center gap-2 transition-all active:scale-98 shadow-xs cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Apply Filters</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default HomeworkFilterBottomSheet;
