import React, { useState, useRef, useEffect } from 'react';
import { Plus, Sparkles, RefreshCw, Share2, FileDown, Layers, X } from 'lucide-react';
import { cn } from '../../utils/cn';

const HomeworkFAB = ({
  onRefresh,
  onExport,
  onWhatsApp,
  onCreate,
  role = 'admin',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div ref={menuRef} className="fixed bottom-6 right-5 z-[90] flex flex-col items-end">
      {/* Quick Action Popover Menu */}
      {isOpen && (
        <div className="mb-3 space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-200 flex flex-col items-end">
          {onCreate && (
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onCreate();
              }}
              className="flex items-center gap-2.5 px-4 py-2.5 bg-white text-slate-800 rounded-2xl shadow-xl border border-slate-100 font-extrabold text-xs hover:bg-orange-50 hover:text-orange-600 transition-all active:scale-95 cursor-pointer"
            >
              <div className="w-7 h-7 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
                <Plus className="w-4 h-4" />
              </div>
              <span>Create Homework</span>
            </button>
          )}

          {onRefresh && (
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onRefresh();
              }}
              className="flex items-center gap-2.5 px-4 py-2.5 bg-white text-slate-800 rounded-2xl shadow-xl border border-slate-100 font-extrabold text-xs hover:bg-orange-50 hover:text-orange-600 transition-all active:scale-95 cursor-pointer"
            >
              <div className="w-7 h-7 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                <RefreshCw className="w-3.5 h-3.5" />
              </div>
              <span>Refresh Data</span>
            </button>
          )}

          {onWhatsApp && (
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onWhatsApp();
              }}
              className="flex items-center gap-2.5 px-4 py-2.5 bg-white text-slate-800 rounded-2xl shadow-xl border border-slate-100 font-extrabold text-xs hover:bg-emerald-50 hover:text-emerald-600 transition-all active:scale-95 cursor-pointer"
            >
              <div className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <Share2 className="w-3.5 h-3.5" />
              </div>
              <span>WhatsApp Export</span>
            </button>
          )}

          {onExport && (
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onExport();
              }}
              className="flex items-center gap-2.5 px-4 py-2.5 bg-white text-slate-800 rounded-2xl shadow-xl border border-slate-100 font-extrabold text-xs hover:bg-blue-50 hover:text-blue-600 transition-all active:scale-95 cursor-pointer"
            >
              <div className="w-7 h-7 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                <FileDown className="w-3.5 h-3.5" />
              </div>
              <span>PDF Export</span>
            </button>
          )}
        </div>
      )}

      {/* Main Floating Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          "w-14 h-14 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-xl shadow-orange-500/30 flex items-center justify-center transition-all duration-300 active:scale-95 cursor-pointer hover:shadow-orange-500/50 hover:scale-105 border border-white/20",
          isOpen && "rotate-45 bg-slate-900 from-slate-900 to-slate-800 shadow-slate-900/40"
        )}
        aria-label="Quick Actions"
        title="Quick Actions"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Plus className="w-6 h-6 stroke-[2.5]" />}
      </button>
    </div>
  );
};

export default HomeworkFAB;
