import React, { useState, useEffect, useRef } from 'react';
import {
  Award,
  Printer,
  XCircle,
  Download,
  History,
  X,
} from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';
import MarksheetDocument from './MarksheetDocument';

const MarksheetPreview = ({ studentId, examId, initialData = null, onClose = null }) => {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(!initialData);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [printingPdf, setPrintingPdf] = useState(false);
  const { addToast } = useToast();
  const documentRef = useRef(null);

  // Version History Modal States
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [versions, setVersions] = useState([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [selectedVersionData, setSelectedVersionData] = useState(null);

  const fetchMarksheetData = async () => {
    if (initialData) return;
    try {
      setLoading(true);
      const res = await api.get(`/exams/results/student/${studentId}/exam/${examId}`, {
        params: { studentId, examId }
      });
      if (res.data && res.data.data) {
        setData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load marksheet data:', err);
      addToast(err.response?.data?.message || 'Failed to load student marksheet data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initialData && studentId && examId) {
      fetchMarksheetData();
    }
  }, [studentId, examId, initialData]);

  const fetchVersionHistory = async () => {
    try {
      setLoadingVersions(true);
      const res = await api.get(`/exams/${examId}/student/${studentId}/versions`);
      if (res.data && res.data.data) {
        setVersions(res.data.data);
        setShowVersionModal(true);
      }
    } catch (err) {
      console.error('Failed to load version history:', err);
      addToast(err.response?.data?.message || 'No official version history available yet.', 'error');
    } finally {
      setLoadingVersions(false);
    }
  };

  const fetchVersionSnapshot = async (versionNo) => {
    try {
      const res = await api.get(`/exams/${examId}/student/${studentId}/versions/${versionNo}`);
      if (res.data && res.data.data) {
        setSelectedVersionData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load version snapshot:', err);
      addToast('Failed to load version snapshot', 'error');
    }
  };

  const activeData = selectedVersionData || data;

  /**
   * Generates a high-fidelity A4 jsPDF instance from the authoritative Marksheet DOM element.
   * Guarantees 100% visual parity with the Preview:
   * - Preserves exact typography (Cinzel, Playfair Display, Inter)
   * - Preserves Sanskrit Unicode Hindi Motto: "ज्ञानं परमं बलम्"
   * - Preserves Principal circular stamp overlay graphic
   * - Preserves Double Gold/Navy borders and watermark
   * - Deterministic A4 portrait dimensions (210mm x 297mm)
   */
  const generateMarksheetPdf = async () => {
    const element = documentRef.current;
    if (!element) {
      throw new Error('Marksheet document element not found');
    }

    // Ensure all web fonts and images are completely loaded
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }

    // High quality canvas capture with 2.5x scale factor for crisp vector-like text
    const canvas = await html2canvas(element, {
      scale: 2.5,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      allowTaint: true,
      windowWidth: 1024,
    });

    const imgData = canvas.toDataURL('image/png');

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const pdfWidth = 210;
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    const finalHeight = Math.min(pdfHeight, 297);

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, finalHeight, undefined, 'FAST');
    return pdf;
  };

  // Download Official PDF
  const handleDownloadPdf = async () => {
    if (downloadingPdf) return;
    try {
      setDownloadingPdf(true);
      const pdf = await generateMarksheetPdf();
      
      const studentName = (activeData?.student?.fullName || 'Student')
        .replace(/\s+/g, '_')
        .replace(/[^a-zA-Z0-9_-]/g, '');
      const examType = (activeData?.exam?.examType || 'Official')
        .replace(/\s+/g, '_')
        .replace(/[^a-zA-Z0-9_-]/g, '');
      const session = (activeData?.exam?.session || '2026-2027')
        .replace(/\s+/g, '_')
        .replace(/[^a-zA-Z0-9_-]/g, '');

      const fileName = `LFES_${examType}_Marksheet_${studentName}_${session}.pdf`;
      pdf.save(fileName);
      addToast('Official Marksheet PDF downloaded successfully!', 'success');
    } catch (err) {
      console.error('Failed to generate/download PDF:', err);
      // Graceful fallback to backend endpoint if DOM generation fails
      try {
        const res = await api.get(`/exams/marksheets/student/${studentId}/${examId}/pdf`, {
          responseType: 'blob',
        });
        const blob = new Blob([res.data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `LFES_Marksheet_${studentId}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        addToast('Official Marksheet PDF downloaded successfully!', 'success');
      } catch (fallbackErr) {
        addToast('Failed to download Marksheet PDF. Please try again.', 'error');
      }
    } finally {
      setDownloadingPdf(false);
    }
  };

  // Print Official PDF using high-resolution PDF iframe or native browser print
  const handlePrintPdf = async () => {
    if (printingPdf) return;
    try {
      setPrintingPdf(true);
      const pdf = await generateMarksheetPdf();
      const pdfBlob = pdf.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);

      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.src = pdfUrl;

      document.body.appendChild(iframe);
      iframe.onload = () => {
        setTimeout(() => {
          try {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
          } catch (e) {
            window.print();
          }
          setTimeout(() => {
            iframe.remove();
            URL.revokeObjectURL(pdfUrl);
          }, 3000);
        }, 300);
      };
    } catch (err) {
      console.error('Failed to print PDF:', err);
      window.print();
    } finally {
      setPrintingPdf(false);
    }
  };

  if (loading) {
    return (
      <div className={onClose ? "fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4" : "p-12 text-center"}>
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xl text-center space-y-3 max-w-sm w-full">
          <div className="w-9 h-9 border-3 border-[#0F2552] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm font-black text-[#0F2552]">Loading Official LFES Marksheet...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className={onClose ? "fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4" : "p-8 text-center"}>
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xl text-center space-y-4 max-w-md w-full">
          <XCircle className="w-10 h-10 text-rose-500 mx-auto" />
          <div>
            <p className="text-base font-black text-slate-800">Marksheet Data Unavailable</p>
            <p className="text-xs text-slate-500 mt-1">Unable to load evaluation records for this student.</p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl cursor-pointer"
            >
              Close Preview
            </button>
          )}
        </div>
      </div>
    );
  }

  const previewContent = (
    <div className="marksheet-preview-wrapper p-2 sm:p-4 my-2 max-w-4xl mx-auto print:p-0 print:m-0 print:max-w-none">
      <MarksheetDocument
        ref={documentRef}
        data={activeData}
        className="shadow-xl rounded-xl print:shadow-none print:rounded-none"
      />
    </div>
  );

  // If rendered inside Modal context (when onClose is provided)
  if (onClose) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 print:static print:bg-transparent print:p-0 font-serif">
        <div className="bg-slate-100/95 rounded-2xl border border-slate-300 max-w-5xl w-full max-h-[96vh] flex flex-col shadow-2xl overflow-hidden print:max-w-none print:max-h-none print:shadow-none print:border-none print:bg-white print:rounded-none">
          
          {/* Sticky Header Navigation Bar (Always Visible at Top, Hidden in Print) */}
          <div className="flex items-center justify-between gap-3 bg-[#0F2552] text-white p-3.5 sm:px-6 z-30 shrink-0 shadow-md print:hidden font-sans">
            <div className="flex items-center gap-2.5">
              <Award className="w-5 h-5 text-amber-400" />
              <div>
                <h2 className="text-sm font-black text-white tracking-wide uppercase">
                  LITTLE FLOWER ENGLISH SCHOOL • MARKSHEET PREVIEW
                </h2>
                <p className="text-[11px] text-slate-300 font-medium">
                  Official Academic Report Card • Session {activeData?.exam?.session || '2026-2027'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={fetchVersionHistory}
                disabled={loadingVersions}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all disabled:opacity-50"
                title="View Audit Version History"
              >
                <History className={`w-3.5 h-3.5 text-amber-300 ${loadingVersions ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Version History</span>
              </button>

              <button
                onClick={handleDownloadPdf}
                disabled={downloadingPdf}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95 transition-all disabled:opacity-50"
                title="Download Official Marksheet PDF"
              >
                <Download className={`w-3.5 h-3.5 ${downloadingPdf ? 'animate-bounce' : ''}`} />
                <span>{downloadingPdf ? 'Downloading PDF...' : 'Download PDF'}</span>
              </button>

              <button
                onClick={handlePrintPdf}
                disabled={printingPdf}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95 transition-all disabled:opacity-50"
                title="Print Official Marksheet PDF"
              >
                <Printer className={`w-3.5 h-3.5 ${printingPdf ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">{printingPdf ? 'Printing...' : 'Print'}</span>
              </button>

              {/* Big Red Close Button */}
              <button
                onClick={onClose}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black flex items-center gap-1 cursor-pointer active:scale-95 transition-all shadow-sm ml-2"
                title="Close Marksheet Preview"
              >
                <X className="w-4 h-4" />
                <span>CLOSE</span>
              </button>
            </div>
          </div>

          {/* Scrollable Marksheet Body */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-6 custom-scrollbar print:overflow-visible print:p-0">
            {previewContent}
          </div>
        </div>

        {/* Version History Modal */}
        {showVersionModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 print:hidden">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-slate-200">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <History className="w-5 h-5 text-[#0F2552]" />
                  <h3 className="text-base font-black text-slate-900 font-sans">Result Audit Version History</h3>
                </div>
                <button
                  onClick={() => {
                    setShowVersionModal(false);
                    setSelectedVersionData(null);
                  }}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-slate-500 font-sans">
                Select an official published result version snapshot to inspect historical grades.
              </p>

              <div className="space-y-2 max-h-60 overflow-y-auto font-sans">
                {versions.map((ver) => (
                  <button
                    key={ver.version}
                    onClick={() => fetchVersionSnapshot(ver.version)}
                    className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                      activeData.version === ver.version
                        ? 'border-[#0F2552] bg-[#0F2552]/5 ring-1 ring-[#0F2552]'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <span className="font-extrabold text-xs text-slate-900">
                        Version {ver.version} {ver.isCurrent ? '(Current Official)' : '(Superseded)'}
                      </span>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Published: {new Date(ver.publishedAt).toLocaleDateString()}
                      </p>
                      {ver.revisionReason && (
                        <p className="text-[10px] text-slate-600 italic">
                          Reason: {ver.revisionReason}
                        </p>
                      )}
                    </div>
                    <span className="text-xs font-bold text-[#0F2552]">View Snapshot →</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Normal inline render (if not a modal)
  return previewContent;
};

export default MarksheetPreview;
