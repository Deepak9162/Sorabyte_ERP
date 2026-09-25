import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(() => resolve()));

const waitForRenderedPages = async (getElement, count, maxFrames = 180) => {
  for (let frame = 0; frame < maxFrames; frame += 1) {
    let ready = true;
    for (let i = 0; i < count; i += 1) {
      if (!getElement(i)) {
        ready = false;
        break;
      }
    }
    if (ready) return;
    await nextFrame();
  }
  throw new Error('Bulk marksheet render container did not become ready in time');
};

const preloadSharedImages = async (elements) => {
  const sources = new Set();
  elements.forEach((element) => {
    element.querySelectorAll('img').forEach((img) => {
      const src = img.currentSrc || img.src;
      if (src) sources.add(src);
    });
  });

  await Promise.all(
    [...sources].map(
      (src) =>
        new Promise((resolve) => {
          const image = new Image();
          image.crossOrigin = 'anonymous';
          image.onload = async () => {
            if (typeof image.decode === 'function') {
              try {
                await image.decode();
              } catch {
                // Loading succeeded; decode failure does not block html2canvas.
              }
            }
            resolve();
          };
          image.onerror = resolve;
          image.src = src;
          if (image.complete && image.naturalWidth > 0) resolve();
        })
    )
  );
};

const downloadBlob = (blob, fileName) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

/**
 * Capture an already-rendered offscreen set of official A4 marksheets.
 * Uses bounded concurrency to improve throughput without keeping the full
 * class worth of high-resolution canvases in memory.
 */
export const generateBulkMarksheetPdf = async ({
  count,
  getElement,
  fileName,
  onProgress,
  captureScale = 2,
  concurrency = 2,
}) => {
  const timings = {
    renderReadyMs: 0,
    assetReadyMs: 0,
    captureAndAddMs: 0,
    serializationMs: 0,
    totalMs: 0,
    pages: count,
    captureScale,
    concurrency,
    perPage: [],
  };
  const totalStart = performance.now();

  const renderStart = performance.now();
  await waitForRenderedPages(getElement, count);
  // Two frames allow React layout/styles to settle without a fixed sleep.
  await nextFrame();
  await nextFrame();
  timings.renderReadyMs = performance.now() - renderStart;

  const elements = Array.from({ length: count }, (_, i) => getElement(i));
  if (elements.some((element) => !element)) {
    throw new Error('One or more marksheet pages are missing from the render host');
  }

  const assetStart = performance.now();
  if (document.fonts?.ready) {
    await document.fonts.ready;
  }
  await preloadSharedImages(elements);
  timings.assetReadyMs = performance.now() - assetStart;

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const captureStart = performance.now();

  // Process only a small batch at once; add to PDF in original index order.
  for (let batchStart = 0; batchStart < count; batchStart += concurrency) {
    const batchIndexes = Array.from(
      { length: Math.min(concurrency, count - batchStart) },
      (_, offset) => batchStart + offset
    );

    const captures = await Promise.all(
      batchIndexes.map(async (index) => {
        const pageStart = performance.now();
        const canvas = await html2canvas(elements[index], {
          scale: captureScale,
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false,
          allowTaint: true,
          windowWidth: 1024,
          imageTimeout: 0,
        });
        return {
          index,
          canvas,
          captureMs: performance.now() - pageStart,
        };
      })
    );

    captures.sort((a, b) => a.index - b.index);

    for (const result of captures) {
      const addStart = performance.now();
      if (result.index > 0) {
        pdf.addPage('a4', 'portrait');
      }

      const pdfWidth = 210;
      const pdfHeight = (result.canvas.height * pdfWidth) / result.canvas.width;
      const finalHeight = Math.min(pdfHeight, 297);

      // jsPDF accepts an HTMLCanvasElement directly, avoiding an explicit
      // base64 canvas.toDataURL() allocation for every page.
      pdf.addImage(
        result.canvas,
        'PNG',
        0,
        0,
        pdfWidth,
        finalHeight,
        undefined,
        'FAST'
      );

      timings.perPage[result.index] = {
        captureMs: result.captureMs,
        addToPdfMs: performance.now() - addStart,
        width: result.canvas.width,
        height: result.canvas.height,
      };

      // Release the large backing store immediately after this page is embedded.
      result.canvas.width = 1;
      result.canvas.height = 1;
    }

    onProgress?.(
      Math.min(batchStart + captures.length, count),
      count
    );

    // Yield briefly so the loading UI can paint between batches.
    await nextFrame();
  }

  timings.captureAndAddMs = performance.now() - captureStart;

  const serializationStart = performance.now();
  const blob = pdf.output('blob');
  timings.serializationMs = performance.now() - serializationStart;

  downloadBlob(blob, fileName);

  timings.totalMs = performance.now() - totalStart;

  if (import.meta.env.DEV) {
    console.groupCollapsed('[LFES Bulk Marksheet PDF] Performance');
    console.table({
      pages: timings.pages,
      captureScale: timings.captureScale,
      concurrency: timings.concurrency,
      renderReadyMs: Math.round(timings.renderReadyMs),
      assetReadyMs: Math.round(timings.assetReadyMs),
      captureAndAddMs: Math.round(timings.captureAndAddMs),
      serializationMs: Math.round(timings.serializationMs),
      totalMs: Math.round(timings.totalMs),
    });
    console.table(
      timings.perPage.map((row, index) => ({
        page: index + 1,
        captureMs: Math.round(row?.captureMs || 0),
        addToPdfMs: Math.round(row?.addToPdfMs || 0),
        canvas: row ? `${row.width}x${row.height}` : '-',
      }))
    );
    console.groupEnd();
  }

  return timings;
};
