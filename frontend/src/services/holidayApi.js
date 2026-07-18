import api from './api';

export const getHolidays = async (filters = {}) => {
  const { data } = await api.get('/holidays', { params: filters });
  return data.data; // Assuming successResponse format { success: true, data: [...] }
};

export const createHoliday = async (holidayData) => {
  const { data } = await api.post('/holidays', holidayData);
  return data.data;
};

export const updateHoliday = async (id, holidayData) => {
  const { data } = await api.put(`/holidays/${id}`, holidayData);
  return data.data;
};

export const deleteHoliday = async (id) => {
  const { data } = await api.delete(`/holidays/${id}`);
  return data.data;
};

export const checkHolidayStatus = async (date, applicableTo) => {
  const { data } = await api.get('/holidays/status', {
    params: { date, applicableTo }
  });
  return data.data;
};
