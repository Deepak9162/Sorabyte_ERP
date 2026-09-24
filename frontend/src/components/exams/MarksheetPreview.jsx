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
  const previewViewportRef = useRef(null);
  const [previewScale, setPreviewScale] = useState(1);

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

  // Keep the authoritative marksheet fixed at A4 internally, and scale only
  // its preview shell on smaller screens. This preserves Preview/PDF parity
  // while making the full page readable and centered on phones.
  useEffect(() => {
    const viewport = previewViewportRef.current;
    if (!viewport || !activeData) return undefined;

    const A4_WIDTH_PX = (210 / 25.4) * 96;
    const updateScale = () => {
      const availableWidth = Math.max(0, viewport.clientWidth - 12);
      const nextScale = Math.min(1, availableWidth / A4_WIDTH_PX);
      setPreviewScale(Number.isFinite(nextScale) && nextScale > 0 ? nextScale : 1);
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(viewport);
    window.addEventListener('orientationchange', updateScale);

    return () => {
      observer.disconnect();
      window.removeEventListener('orientationchange', updateScale);
    };
  }, [activeData]);

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

    const images = Array.from(element.querySelectorAll('img'));
    await Promise.all(
      images.map(async (img) => {
        if (img.complete && img.naturalWidth > 0) return;
        if (typeof img.decode === 'function') {
          try {
            await img.decode();
            return;
          } catch {
            // Fall through to load/error listeners for older/cross-origin browsers.
          }
        }
        await new Promise((resolve) => {
          const done = () => resolve();
          img.addEventListener('load', done, { once: true });
          img.addEventListener('error', done, { once: true });
        });
      })
    );

    // High quality canvas capture with 2.5x scale factor for crisp print output
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
      addToast('Failed to generate the official marksheet PDF. Please try again.', 'error');
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
          } catch {
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
    <div
      ref={previewViewportRef}
      className="marksheet-preview-viewport print:overflow-visible print:m-0"
    >
      <div
        className="marksheet-preview-stage"
        style={{
          width: `${((210 / 25.4) * 96) * previewScale}px`,
          height: `${((297 / 25.4) * 96) * previewScale}px`,
        }}
      >
        <div
          className="marksheet-preview-transform"
          style={{ transform: `scale(${previewScale})` }}
        >
          <MarksheetDocument
            ref={documentRef}
            data={activeData}
          />
        </div>
      </div>
    </div>
  );

  // If rendered inside Modal context (when onClose is provided)
  if (onClose) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-0 sm:p-4 print:static print:bg-transparent print:p-0 font-serif">
        <div className="bg-slate-100/95 rounded-none sm:rounded-2xl border-0 sm:border border-slate-300 max-w-5xl w-full h-[100dvh] sm:h-auto sm:max-h-[96vh] flex flex-col shadow-2xl overflow-hidden print:max-w-none print:max-h-none print:shadow-none print:border-none print:bg-white print:rounded-none">
          
          {/* Compact responsive toolbar. Official A4 document itself stays unchanged. */}
          <div className="marksheet-preview-toolbar bg-[#0F2552] text-white z-30 shrink-0 shadow-md print:hidden font-sans">
            <div className="marksheet-preview-toolbar__title">
              <Award className="w-5 h-5 text-amber-400 shrink-0" />
              <div className="min-w-0">
                <h2 className="text-xs sm:text-sm font-black text-white tracking-wide uppercase truncate">
                  <span className="sm:hidden">LFES • Marksheet Preview</span>
                  <span className="hidden sm:inline">LITTLE FLOWER ENGLISH SCHOOL • MARKSHEET PREVIEW</span>
                </h2>
                <p className="text-[10px] sm:text-[11px] text-slate-300 font-medium truncate">
                  Official Report Card • Session {activeData?.exam?.session || '2026-2027'}
                </p>
              </div>
            </div>

            <div className="marksheet-preview-toolbar__actions">
              <button
                onClick={fetchVersionHistory}
                disabled={loadingVersions}
                className="marksheet-preview-action marksheet-preview-action--secondary"
                title="View Audit Version History"
                aria-label="Version history"
              >
                <History className={`w-4 h-4 text-amber-300 ${loadingVersions ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Version History</span>
              </button>

              <button
                onClick={handleDownloadPdf}
                disabled={downloadingPdf}
                className="marksheet-preview-action marksheet-preview-action--download"
                title="Download Official Marksheet PDF"
              >
                <Download className={`w-4 h-4 ${downloadingPdf ? 'animate-bounce' : ''}`} />
                <span>{downloadingPdf ? 'Downloading...' : 'Download PDF'}</span>
              </button>

              <button
                onClick={handlePrintPdf}
                disabled={printingPdf}
                className="marksheet-preview-action marksheet-preview-action--print"
                title="Print Official Marksheet PDF"
                aria-label="Print marksheet"
              >
                <Printer className={`w-4 h-4 ${printingPdf ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">{printingPdf ? 'Printing...' : 'Print'}</span>
              </button>

              <button
                onClick={onClose}
                className="marksheet-preview-action marksheet-preview-action--close"
                title="Close Marksheet Preview"
                aria-label="Close marksheet preview"
              >
                <X className="w-4 h-4" />
                <span className="hidden sm:inline">Close</span>
              </button>
            </div>
          </div>

          {/* Scrollable Marksheet Body */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 sm:p-6 custom-scrollbar print:overflow-visible print:p-0">
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
