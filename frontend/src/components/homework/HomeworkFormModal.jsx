import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Select from '../ui/Select';
import DatePicker from '../ui/DatePicker';
import { useToast } from '../../context/ToastContext';
import homeworkApi from '../../services/homeworkApi';
import api from '../../services/api';
import { 
  BookOpen, 
  Calendar, 
  AlertTriangle, 
  FileText, 
  Sparkles, 
  Paperclip, 
  X, 
  Send
} from 'lucide-react';

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

        if (formData.classId) {
          updateSubjectsForClass(formData.classId, res.data.classSubjectMap, res.data.allSubjects);
        } else {
          setAvailableSubjects(res.data.allSubjects || []);
        }
      }
    } catch (err) {
      console.error('Failed to fetch assigned options', err);
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
      setAvailableSubjects(fallbackSubjects);
    }
  };

  const handleClassChange = (classId) => {
    const selectedClsDoc = allClasses.find(c => c._id === classId) || classes.find(c => c._id === classId);
    
    setFormData(prev => ({
      ...prev,
      classId,
      section: selectedClsDoc?.section || '',
      subjectId: '',
    }));

    updateSubjectsForClass(classId);
  };

  const handleQuickPhrase = (phrase) => {
    setFormData(prev => {
      const current = prev.description.trim();
      const addition = `• ${phrase}: `;
      const newText = current ? `${current}\n${addition}` : addition;
      return { ...prev, description: newText };
    });
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
      maxWidth="md"
    >
      <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-4 py-1">
        {/* Duplicate Conflict Alert Banner */}
        {duplicateConflict && (
          <div className="bg-amber-50 border-2 border-amber-300/70 rounded-2xl p-4 space-y-3 animate-in fade-in duration-200 shadow-sm">
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
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-amber-200">
              <Button type="button" variant="secondary" size="sm" onClick={() => setDuplicateConflict(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
                onClick={() => handleSubmit(null, true)}
                disabled={submitting}
              >
                {submitting ? 'Overwriting...' : 'Yes, Overwrite Existing'}
              </Button>
            </div>
          </div>
        )}

        {/* Section 1: Class & Subject */}
        <div className="bg-gray-50/80 border border-gray-200/80 rounded-2xl p-3.5 sm:p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs font-black text-indigo-700 uppercase tracking-wider">
            <BookOpen className="w-4 h-4 text-indigo-600" />
            <span>Class & Subject</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <Select
                label="Select Class"
                required
                value={formData.classId}
                onChange={handleClassChange}
                placeholder="-- Select Assigned Class --"
                options={classes.map(c => ({
                  value: c._id,
                  label: c.name
                }))}
              />
            </div>

            <div>
              <Select
                label="Select Subject"
                required
                value={formData.subjectId}
                onChange={(val) => setFormData({ ...formData, subjectId: val })}
                disabled={!formData.classId}
                placeholder={!formData.classId ? '-- First Select a Class --' : '-- Select Subject --'}
                options={availableSubjects.map(s => ({
                  value: s._id,
                  label: `${s.name} ${s.type ? `(${s.type})` : ''}`
                }))}
              />
            </div>
          </div>
        </div>

        {/* Section 2: Dates & Category */}
        <div className="bg-gray-50/80 border border-gray-200/80 rounded-2xl p-3.5 sm:p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs font-black text-indigo-700 uppercase tracking-wider">
            <Calendar className="w-4 h-4 text-indigo-600" />
            <span>Schedule & Type</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <DatePicker
                label="Homework Date"
                required
                value={formData.homeworkDate}
                onChange={(val) => setFormData({ ...formData, homeworkDate: val })}
              />
            </div>

            <div>
              <DatePicker
                label="Submission Due"
                required
                value={formData.submissionDate}
                onChange={(val) => setFormData({ ...formData, submissionDate: val })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <Select
                label="Homework Type"
                value={formData.homeworkType}
                onChange={(val) => setFormData({ ...formData, homeworkType: val })}
                options={[
                  'Home Assignment',
                  'Project Work',
                  'Classwork Revision',
                  'Reading / Practice',
                  'Other'
                ]}
              />
            </div>

            <div>
              <Select
                label="Priority"
                value={formData.priority}
                onChange={(val) => setFormData({ ...formData, priority: val })}
                options={[
                  { value: 'Low', label: 'Low Priority' },
                  { value: 'Normal', label: 'Normal Priority' },
                  { value: 'High', label: 'High Priority' }
                ]}
              />
            </div>
          </div>
        </div>

        {/* Section 3: Homework Content (Write Homework) */}
        <div className="bg-indigo-50/40 border border-indigo-100 rounded-2xl p-3.5 sm:p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-black text-indigo-800 uppercase tracking-wider">
              <FileText className="w-4 h-4 text-indigo-600" />
              <span>Homework Content</span>
            </div>
            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full">
              Large Text Mode
            </span>
          </div>

          {/* Title Input */}
          <div>
            <label className="block text-xs font-bold text-gray-800 mb-1">
              Homework Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g., Read Chapter 5 & Solve Exercises 1 to 10"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              className="w-full h-12 sm:h-13 px-4 rounded-xl border border-gray-300 text-base sm:text-lg font-bold text-gray-900 placeholder:text-gray-400 placeholder:text-sm placeholder:font-normal focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 bg-white shadow-xs transition-all"
            />
          </div>

          {/* Detailed Description Textarea */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-gray-800">
                Detailed Tasks / Instructions <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] font-medium text-gray-500">
                {formData.description.length} chars
              </span>
            </div>

            {/* Quick helper chips for teachers on mobile */}
            <div className="flex flex-wrap gap-1.5 mb-2">
              {[
                'Read & Learn',
                'Solve Exercises',
                'Write in Notebook',
                'Practice Questions',
                'Revision'
              ].map((phrase) => (
                <button
                  key={phrase}
                  type="button"
                  onClick={() => handleQuickPhrase(phrase)}
                  className="text-[11px] font-semibold text-indigo-700 bg-white border border-indigo-200 hover:bg-indigo-50 active:scale-95 px-2.5 py-1 rounded-lg shadow-2xs transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3 text-indigo-500" />
                  + {phrase}
                </button>
              ))}
            </div>

            <textarea
              rows={5}
              placeholder="Type homework instructions clearly for students here..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
              className="w-full p-4 rounded-xl border border-gray-300 text-base sm:text-lg font-medium text-gray-900 leading-relaxed placeholder:text-gray-400 placeholder:text-sm placeholder:font-normal focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 bg-white shadow-xs transition-all resize-y min-h-[150px]"
            />
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-3 border-t border-gray-200">
          <Button 
            type="button" 
            variant="secondary" 
            onClick={onClose}
            className="w-full sm:w-auto h-11 text-sm font-bold text-gray-700 rounded-xl"
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            variant="primary" 
            disabled={submitting}
            className="w-full sm:w-auto h-12 px-6 text-base font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md shadow-indigo-200 active:scale-98 transition-all flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" />
            {submitting ? 'Submitting...' : (initialData ? 'Save & Resubmit' : 'Submit Homework')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default HomeworkFormModal;
