import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { useToast } from '../../context/ToastContext';
import homeworkApi from '../../services/homeworkApi';
import api from '../../services/api';
import { BookOpen, Upload, Calendar, AlertTriangle, CheckCircle2, Check } from 'lucide-react';

const HomeworkFormModal = ({ isOpen, onClose, onSuccess, initialData = null }) => {
  const { addToast } = useToast();

  const [classes, setClasses] = useState([]);
  const [allClasses, setAllClasses] = useState([]);
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [classSubjectMap, setClassSubjectMap] = useState({});
  const [allSubjects, setAllSubjects] = useState([]);

  const [formData, setFormData] = useState({
    classId: '',
    section: '',
    subjectId: '',
    homeworkDate: new Date().toISOString().split('T')[0],
    submissionDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    title: '',
    description: '',
    homeworkType: 'Home Assignment',
    priority: 'Normal',
  });

  const [selectedFile, setSelectedFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [duplicateConflict, setDuplicateConflict] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchTeacherAssignedData();
      if (initialData) {
        setFormData({
          classId: initialData.class || initialData.classId || '',
          section: initialData.section || '',
          subjectId: initialData.subject || initialData.subjectId || '',
          homeworkDate: initialData.homeworkDate ? new Date(initialData.homeworkDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          submissionDate: initialData.submissionDate ? new Date(initialData.submissionDate).toISOString().split('T')[0] : new Date(Date.now() + 86400000).toISOString().split('T')[0],
          title: initialData.title || '',
          description: initialData.description || '',
          homeworkType: initialData.homeworkType || 'Home Assignment',
          priority: initialData.priority || 'Normal',
        });
      } else {
        setFormData({
          classId: '',
          section: '',
          subjectId: '',
          homeworkDate: new Date().toISOString().split('T')[0],
          submissionDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
          title: '',
          description: '',
          homeworkType: 'Home Assignment',
          priority: 'Normal',
        });
      }
      setSelectedFile(null);
      setDuplicateConflict(null);
    }
  }, [isOpen, initialData]);

  const fetchTeacherAssignedData = async () => {
    try {
      const res = await homeworkApi.getTeacherAssignedOptions();
      if (res.success) {
        setClasses(res.data.assignedClasses || []);
        setAllClasses(res.data.allClasses || []);
        setAllSubjects(res.data.allSubjects || []);
        setClassSubjectMap(res.data.classSubjectMap || {});

        // If editing or class selected, update subjects dropdown
        if (formData.classId) {
          updateSubjectsForClass(formData.classId, res.data.classSubjectMap, res.data.allSubjects);
        } else {
          setAvailableSubjects(res.data.allSubjects || []);
        }
      }
    } catch (err) {
      console.error('Failed to fetch assigned options', err);
      // Fallback to basic endpoints
      try {
        const [clsRes, subRes] = await Promise.all([
          api.get('/admin/classes'),
          api.get('/admin/academic/subjects'),
        ]);
        if (clsRes.data.success) {
          setClasses(clsRes.data.data);
          setAllClasses(clsRes.data.data);
        }
        if (subRes.data.success) {
          setAllSubjects(subRes.data.data);
          setAvailableSubjects(subRes.data.data);
        }
      } catch (e) {
        console.error(e);
      }
    }
  };

  const updateSubjectsForClass = (classId, mapObj = classSubjectMap, fallbackSubjects = allSubjects) => {
    if (!classId) {
      setAvailableSubjects(fallbackSubjects);
      return;
    }

    const mappedSubjects = mapObj[classId];
    if (mappedSubjects && mappedSubjects.length > 0) {
      setAvailableSubjects(mappedSubjects);
    } else {
      // If no specific subject mapping exists for this class, display all active subjects as fallback
      setAvailableSubjects(fallbackSubjects);
    }
  };

  const handleClassChange = (e) => {
    const classId = e.target.value;
    const selectedClsDoc = allClasses.find(c => c._id === classId) || classes.find(c => c._id === classId);
    
    setFormData(prev => ({
      ...prev,
      classId,
      section: selectedClsDoc?.section || '',
      subjectId: '', // Reset subject when class changes
    }));

    updateSubjectsForClass(classId);
  };

  const handleSubmit = async (e, forceOverwrite = false) => {
    if (e) e.preventDefault();

    if (!formData.classId || !formData.subjectId || !formData.title || !formData.description) {
      addToast('Please fill in all required fields (Class, Subject, Title, Description)', 'error');
      return;
    }

    setSubmitting(true);
    setDuplicateConflict(null);

    try {
      const payload = new FormData();
      payload.append('classId', formData.classId);
      payload.append('section', formData.section);
      payload.append('subjectId', formData.subjectId);
      payload.append('homeworkDate', formData.homeworkDate);
      payload.append('submissionDate', formData.submissionDate);
      payload.append('title', formData.title);
      payload.append('description', formData.description);
      payload.append('homeworkType', formData.homeworkType);
      payload.append('priority', formData.priority);

      if (forceOverwrite) {
        payload.append('overwrite', 'true');
      }

      if (selectedFile) {
        payload.append('attachment', selectedFile);
      }

      if (initialData && initialData._id) {
        await homeworkApi.updateHomework(initialData._id, payload);
        addToast('Homework updated & resubmitted for Class Incharge review!', 'success');
      } else {
        await homeworkApi.createHomework(payload);
        addToast('Homework submitted successfully for Class Incharge review!', 'success');
      }

      onSuccess();
      onClose();
    } catch (error) {
      if (error.response && error.response.status === 409) {
        setDuplicateConflict(error.response.data.message || 'Homework already submitted for this subject and date');
      } else {
        addToast(error.response?.data?.message || 'Failed to submit homework', 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit & Resubmit Homework' : 'Create & Submit Homework'}
      maxWidth="max-w-2xl"
    >
      <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-4 py-2">
        {/* Duplicate Conflict Alert Banner */}
        {duplicateConflict && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3 animate-in fade-in duration-200">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-amber-900">Duplicate Homework Detected</h4>
                <p className="text-xs text-amber-700 mt-0.5">{duplicateConflict}</p>
                <p className="text-xs font-semibold text-amber-800 mt-2">
                  Do you want to overwrite the existing homework record with these new details?
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-amber-200/60">
              <Button type="button" variant="secondary" size="sm" onClick={() => setDuplicateConflict(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                className="bg-amber-600 hover:bg-amber-700 text-white"
                onClick={() => handleSubmit(null, true)}
                disabled={submitting}
              >
                {submitting ? 'Overwriting...' : 'Yes, Overwrite Existing'}
              </Button>
            </div>
          </div>
        )}

        {/* Form Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Class <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.classId}
              onChange={handleClassChange}
              required
              className="w-full h-10 px-3 rounded-xl border border-gray-300 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
            >
              <option value="">-- Select Assigned Class --</option>
              {classes.map(c => (
                <option key={c._id} value={c._id}>
                  {c.name} {c.section ? `(${c.section})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Subject <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.subjectId}
              onChange={(e) => setFormData({ ...formData, subjectId: e.target.value })}
              required
              disabled={!formData.classId}
              className="w-full h-10 px-3 rounded-xl border border-gray-300 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white disabled:bg-gray-100 disabled:text-gray-400"
            >
              <option value="">
                {!formData.classId ? '-- First Select a Class --' : '-- Select Subject --'}
              </option>
              {availableSubjects.map(s => (
                <option key={s._id} value={s._id}>
                  {s.name} {s.type ? `(${s.type})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Homework Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.homeworkDate}
              onChange={(e) => setFormData({ ...formData, homeworkDate: e.target.value })}
              required
              className="w-full h-10 px-3 rounded-xl border border-gray-300 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Submission Due Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.submissionDate}
              onChange={(e) => setFormData({ ...formData, submissionDate: e.target.value })}
              required
              className="w-full h-10 px-3 rounded-xl border border-gray-300 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Homework Type
            </label>
            <select
              value={formData.homeworkType}
              onChange={(e) => setFormData({ ...formData, homeworkType: e.target.value })}
              className="w-full h-10 px-3 rounded-xl border border-gray-300 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
            >
              <option value="Home Assignment">Home Assignment</option>
              <option value="Project Work">Project Work</option>
              <option value="Classwork Revision">Classwork Revision</option>
              <option value="Reading / Practice">Reading / Practice</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Priority Level
            </label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              className="w-full h-10 px-3 rounded-xl border border-gray-300 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
            >
              <option value="Low">Low</option>
              <option value="Normal">Normal</option>
              <option value="High">High</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
            Homework Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            placeholder="e.g., Read Chapter 5 & Solve Exercises 1 to 10"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
            className="w-full h-10 px-3 rounded-xl border border-gray-300 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
            Detailed Description / Tasks <span className="text-red-500">*</span>
          </label>
          <textarea
            rows={4}
            placeholder="Provide clear instructions for students..."
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            required
            className="w-full p-3 rounded-xl border border-gray-300 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
          />
        </div>



        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting ? 'Submitting...' : (initialData ? 'Save & Resubmit' : 'Submit Homework')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default HomeworkFormModal;
