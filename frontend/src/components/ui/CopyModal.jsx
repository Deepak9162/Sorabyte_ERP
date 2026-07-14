import React, { useState } from 'react';
import { Copy, AlertCircle, Loader2, ArrowRight, CheckCircle2, Save } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';
import api from '../../services/api';

const CopyModal = ({ 
  isOpen, 
  onClose, 
  sourceDay, 
  workingDays, 
  timetableId, 
  onSuccess 
}) => {
  const [destinationDays, setDestinationDays] = useState([]);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [overwriteMode, setOverwriteMode] = useState('merge'); // 'merge' or 'replace'

  const handleCheckboxChange = (day) => {
    if (destinationDays.includes(day)) {
      setDestinationDays(destinationDays.filter(d => d !== day));
    } else {
      setDestinationDays([...destinationDays, day]);
    }
  };

  const handlePreview = async () => {
    if (destinationDays.length === 0) return;
    try {
      setLoading(true);
      const res = await api.post('/admin/timetable/copy/preview', {
        timetableId,
        sourceDay,
        destinationDays
      });
      if (res.data.success) {
        setPreview(res.data.data);
      }
    } catch (error) {
      console.error('Failed to load preview:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      setLoading(true);
      const res = await api.post('/admin/timetable/copy', {
        timetableId,
        sourceDay,
        destinationDays,
        overwriteMode
      });
      if (res.data.success) {
        onSuccess(res.data.data.auditLogId);
      }
    } catch (error) {
      console.error('Failed to copy timetable:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetState = () => {
    setDestinationDays([]);
    setPreview(null);
    setOverwriteMode('merge');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={resetState} title={`Copy ${sourceDay} Schedule`}>
      <div className="space-y-6">
        
        {!preview ? (
          <>
            <div>
              <label className="text-sm font-bold text-gray-700 mb-2 block">
                Select Destination Days
              </label>
              <div className="grid grid-cols-2 gap-3">
                {workingDays.filter(d => d !== sourceDay).map(day => (
                  <label key={day} className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors">
                    <input 
                      type="checkbox"
                      className="w-4 h-4 text-indigo-600 rounded"
                      checked={destinationDays.includes(day)}
                      onChange={() => handleCheckboxChange(day)}
                    />
                    <span className="text-sm font-semibold text-gray-700">{day}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <Button variant="outline" onClick={resetState}>Cancel</Button>
              <Button 
                onClick={handlePreview} 
                disabled={destinationDays.length === 0 || loading}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Preview Copy'}
              </Button>
            </div>
          </>
        ) : (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Preview Summary */}
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className="font-bold text-gray-800">{sourceDay}</div>
                <ArrowRight size={16} className="text-gray-400" />
                <div className="font-bold text-indigo-700">{destinationDays.join(', ')}</div>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-white p-2 rounded-lg border border-gray-100 shadow-sm">
                  <div className="text-xl font-black text-gray-800">{preview.periodsCount}</div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1">Periods</div>
                </div>
                <div className="bg-white p-2 rounded-lg border border-gray-100 shadow-sm">
                  <div className="text-xl font-black text-gray-800">{preview.teachersCount}</div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1">Teachers</div>
                </div>
                <div className="bg-white p-2 rounded-lg border border-gray-100 shadow-sm">
                  <div className="text-xl font-black text-gray-800">{preview.subjectsCount}</div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1">Subjects</div>
                </div>
              </div>
            </div>

            {/* Conflicts */}
            {preview.conflicts.length > 0 && (
              <div className="bg-rose-50 p-4 rounded-xl border border-rose-100">
                <h4 className="flex items-center gap-2 font-bold text-rose-800 mb-2">
                  <AlertCircle size={16} />
                  Conflicts Detected
                </h4>
                <ul className="text-xs font-semibold text-rose-700/80 space-y-1 pl-6 list-disc">
                  {preview.conflicts.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
                <p className="text-[10px] font-bold text-rose-600 mt-3 opacity-80 uppercase tracking-wider">
                  Conflicts will not be copied automatically.
                </p>
              </div>
            )}

            {/* Overwrite Protection */}
            {preview.hasExistingDestinations && (
              <div className="space-y-3">
                <label className="text-sm font-bold text-gray-800">Destination has existing timetable</label>
                <div className="grid grid-cols-1 gap-3">
                  <label className="flex items-start gap-3 p-3 border border-gray-100 rounded-xl hover:bg-gray-50 cursor-pointer">
                    <input 
                      type="radio" 
                      name="overwriteMode" 
                      value="merge" 
                      checked={overwriteMode === 'merge'} 
                      onChange={(e) => setOverwriteMode(e.target.value)}
                      className="mt-1"
                    />
                    <div>
                      <div className="text-sm font-bold text-gray-800">Merge (Recommended)</div>
                      <div className="text-xs text-gray-500 font-medium">Keep existing periods, insert non-conflicting copied periods.</div>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 p-3 border border-gray-100 rounded-xl hover:bg-gray-50 cursor-pointer">
                    <input 
                      type="radio" 
                      name="overwriteMode" 
                      value="replace" 
                      checked={overwriteMode === 'replace'} 
                      onChange={(e) => setOverwriteMode(e.target.value)}
                      className="mt-1"
                    />
                    <div>
                      <div className="text-sm font-bold text-gray-800">Replace All</div>
                      <div className="text-xs text-gray-500 font-medium">Delete all existing periods on destination days and insert new ones.</div>
                    </div>
                  </label>
                </div>
              </div>
            )}

            <div className="flex justify-between items-center pt-4 border-t border-gray-100">
              <button 
                onClick={() => setPreview(null)}
                className="text-sm font-bold text-gray-500 hover:text-gray-700"
              >
                Back to Selection
              </button>
              <Button 
                onClick={handleCopy} 
                disabled={loading}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Copy size={16} /> Confirm Copy</>}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default CopyModal;
