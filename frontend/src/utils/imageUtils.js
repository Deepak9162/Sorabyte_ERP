/**
 * Image Utilities for School ERP
 * Normalizes Google Drive & Public Image URLs and resolves student photo URLs cleanly across the ERP.
 */

/**
 * Normalizes Google Drive and public image URLs into direct embeddable URLs.
 */
export const normalizeImageUrl = (url) => {
  if (!url || typeof url !== 'string') return '';
  let trimmed = url.trim();

  // If it's a relative backend path or data URL or blob, return as is
  if (trimmed.startsWith('/') || trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed;
  }

  // Reject unsafe protocol prefixes (http://, javascript:, file:, etc. per security rules)
  if (!trimmed.startsWith('https://') && !trimmed.startsWith('/')) {
    // If it starts with http:// convert or check
    if (trimmed.startsWith('http://')) {
      trimmed = trimmed.replace('http://', 'https://');
    } else {
      return '';
    }
  }

  // Google Drive URL transformation
  if (trimmed.includes('drive.google.com') || trimmed.includes('docs.google.com') || trimmed.includes('googleusercontent.com')) {
    let fileId = '';
    // Format 1: /file/d/FILE_ID/
    const fileDMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (fileDMatch && fileDMatch[1]) {
      fileId = fileDMatch[1];
    } else {
      // Format 2: ?id=FILE_ID or &id=FILE_ID
      const idMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (idMatch && idMatch[1]) {
        fileId = idMatch[1];
      }
    }

    if (fileId) {
      // Google's direct public CDN URL (bypasses CORS restrictions)
      return `https://lh3.googleusercontent.com/d/${fileId}`;
    }
  }

  return trimmed;
};

/**
 * Centralized Student Photo URL resolver.
 * Priority:
 * 1. If photoSource === 'link' and photoUrl is present -> normalizeImageUrl(photoUrl)
 * 2. If studentPhoto is present -> normalize or prepend apiHost
 * 3. Fallback to photoUrl
 */
export const resolveStudentPhotoUrl = (studentData, apiHost = '') => {
  if (!studentData) return null;

  // Handle case where string is passed directly
  if (typeof studentData === 'string') {
    const norm = normalizeImageUrl(studentData);
    if (!norm) return null;
    if (norm.startsWith('http://') || norm.startsWith('https://') || norm.startsWith('data:') || norm.startsWith('blob:')) {
      return norm;
    }
    return apiHost ? `${apiHost}${norm}` : norm;
  }

  // Handle case where object is passed (student object, personalDetails, or request.studentInfo)
  const personal = studentData.personalDetails || studentData.studentInfo || studentData;
  const photoSource = personal.photoSource || studentData.photoSource || 'upload';
  const photoUrl = personal.photoUrl || studentData.photoUrl || '';
  const studentPhoto = personal.studentPhoto || studentData.studentPhoto || '';

  let raw = '';
  if (photoSource === 'link' && photoUrl) {
    raw = photoUrl;
  } else if (studentPhoto) {
    raw = studentPhoto;
  } else if (photoUrl) {
    raw = photoUrl;
  }

  if (!raw) return null;

  const norm = normalizeImageUrl(raw);
  if (!norm) return null;

  if (norm.startsWith('http://') || norm.startsWith('https://') || norm.startsWith('data:') || norm.startsWith('blob:')) {
    return norm;
  }

  return apiHost ? `${apiHost}${norm}` : norm;
};
