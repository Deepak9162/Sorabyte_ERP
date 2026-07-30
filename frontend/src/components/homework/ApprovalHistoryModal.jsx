import React from 'react';
import Modal from '../ui/Modal';
import { Clock, CheckCircle2, XCircle, FileText, UserCheck, ShieldCheck } from 'lucide-react';

const ApprovalHistoryModal = ({ isOpen, onClose, homework }) => {
  if (!homework) return null;

  const history = homework.history || [];

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Approved':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Pending Admin':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Pending Incharge':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Rejected':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'admin':
        return <ShieldCheck className="w-4 h-4 text-purple-600" />;
      case 'incharge':
        return <UserCheck className="w-4 h-4 text-blue-600" />;
      default:
        return <FileText className="w-4 h-4 text-emerald-600" />;
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Homework Approval Audit History" maxWidth="max-w-2xl">
      <div className="space-y-6 py-2">
        {/* Homework Header Summary */}
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {homework.className} {homework.section ? `(${homework.section})` : ''} • {homework.subjectName}
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getStatusBadge(homework.status)}`}>
              {homework.status}
            </span>
          </div>
          <h3 className="text-base font-bold text-gray-900">{homework.title}</h3>
          <p className="text-xs text-gray-600">
            Assigned Date: {new Date(homework.homeworkDate).toLocaleDateString('en-GB')} | Submitted by: <span className="font-semibold text-gray-800">{homework.teacherName}</span>
          </p>
        </div>

        {/* Audit Trail Timeline */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-indigo-600" /> Complete Audit Timeline ({history.length} events)
          </h4>

          {history.length === 0 ? (
            <p className="text-xs text-gray-500 italic py-4 text-center">No history logs recorded.</p>
          ) : (
            <div className="relative pl-6 border-l-2 border-indigo-100 space-y-6 my-2">
              {history.map((log, index) => (
                <div key={log._id || index} className="relative group">
                  {/* Timeline Dot */}
                  <div className="absolute -left-[31px] top-0.5 w-6 h-6 rounded-full bg-white border-2 border-indigo-600 flex items-center justify-center shadow-xs">
                    {getRoleIcon(log.role)}
                  </div>

                  <div className="bg-white border border-gray-200 rounded-xl p-3.5 shadow-2xs space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-900">{log.action}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full uppercase">
                          {log.role}
                        </span>
                      </div>
                      <span className="text-[10px] font-semibold text-gray-400">
                        {new Date(log.timestamp).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
                      </span>
                    </div>

                    <p className="text-xs font-medium text-gray-700">
                      Performed by: <span className="font-bold text-indigo-900">{log.name}</span>
                    </p>

                    {log.remarks && (
                      <div className="mt-1.5 text-xs text-gray-600 bg-gray-50 p-2 rounded-lg border border-gray-100 italic">
                        "{log.remarks}"
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default ApprovalHistoryModal;
