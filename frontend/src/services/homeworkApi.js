import api from './api';

export const homeworkApi = {
  // Submit new homework
  createHomework: async (formData) => {
    const response = await api.post('/homework', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Update teacher homework
  updateHomework: async (id, formData) => {
    const response = await api.put(`/homework/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Delete teacher homework
  deleteHomework: async (id) => {
    const response = await api.delete(`/homework/${id}`);
    return response.data;
  },

  // Get teacher's assigned classes & class-subject options
  getTeacherAssignedOptions: async () => {
    const response = await api.get('/homework/teacher/assigned-options');
    return response.data;
  },

  // Get teacher's own homework history
  getTeacherMyHomework: async (params) => {
    const response = await api.get('/homework/teacher/my-homework', { params });
    return response.data;
  },

  // Get Class Incharge review queue
  getInchargeClassHomework: async (params) => {
    const response = await api.get('/homework/incharge/class-homework', { params });
    return response.data;
  },

  // Class Incharge approve / reject
  inchargeReview: async (id, { action, remarks }) => {
    const response = await api.put(`/homework/incharge/${id}/status`, { action, remarks });
    return response.data;
  },

  // Admin view all homeworks
  getAllAdminHomework: async (params) => {
    const response = await api.get('/homework/admin/all', { params });
    return response.data;
  },

  // Admin approve / reject
  adminReview: async (id, { action, remarks }) => {
    const response = await api.put(`/homework/admin/${id}/status`, { action, remarks });
    return response.data;
  },

  // Admin bulk review
  adminBulkReview: async ({ homeworkIds, action, remarks }) => {
    const response = await api.put('/homework/admin/bulk-status', { homeworkIds, action, remarks });
    return response.data;
  },

  // Get consolidated homework summary (Admin)
  getConsolidatedHomework: async (params) => {
    const response = await api.get('/homework/consolidated', { params });
    return response.data;
  },

  // Get class teacher's own assigned class consolidated homework (Class Teacher)
  getClassTeacherConsolidatedHomework: async (params) => {
    const response = await api.get('/homework/class-teacher/consolidated', { params });
    return response.data;
  },

  // Get dashboard summary
  getDashboardSummary: async () => {
    const response = await api.get('/homework/dashboard-summary');
    return response.data;
  },
};

export default homeworkApi;
