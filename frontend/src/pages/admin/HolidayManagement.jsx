import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Plus, Edit2, Trash2, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import { getHolidays, createHoliday, updateHoliday, deleteHoliday } from '../../services/holidayApi';
import { formatDateString } from '../../utils/dateUtils';

const HolidayManagement = () => {
  const [holidays, setHolidays] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    type: 'School Holiday',
    description: '',
    startDate: '',
    endDate: '',
    applicableTo: 'Both',
    status: 'Active'
  });

  const fetchHolidays = async () => {
    try {
      setLoading(true);
      const data = await getHolidays({ year: currentDate.getFullYear() });
      setHolidays(data || []);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch holidays');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHolidays();
  }, [currentDate.getFullYear()]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const openModal = (holiday = null) => {
    setError(null);
    setSuccess(null);
    if (holiday) {
      setEditingHoliday(holiday);
      setFormData({
        name: holiday.name,
        type: holiday.type,
        description: holiday.description || '',
        startDate: formatDateString(holiday.startDate),
        endDate: formatDateString(holiday.endDate),
        applicableTo: holiday.applicableTo,
        status: holiday.status
      });
    } else {
      setEditingHoliday(null);
      setFormData({
        name: '',
        type: 'School Holiday',
        description: '',
        startDate: '',
        endDate: '',
        applicableTo: 'Both',
        status: 'Active'
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      
      const payload = { ...formData };
      
      if (editingHoliday) {
        await updateHoliday(editingHoliday._id, payload);
        setSuccess('Holiday updated successfully');
      } else {
        await createHoliday(payload);
        setSuccess('Holiday created successfully');
      }
      
      setIsModalOpen(false);
      fetchHolidays();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save holiday');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this holiday?')) return;
    
    try {
      setLoading(true);
      await deleteHoliday(id);
      setSuccess('Holiday deleted successfully');
      fetchHolidays();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete holiday');
    } finally {
      setLoading(false);
    }
  };

  // Calendar rendering logic
  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const renderCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);

    const days = [];
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Headers
    weekDays.forEach(day => {
      days.push(
        <div key={`header-${day}`} className="font-semibold text-center text-gray-600 py-2">
          {day}
        </div>
      );
    });

    // Empty slots
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="bg-gray-50 border border-gray-100 min-h-[80px]"></div>);
    }

    // Days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateStr = formatDateString(date);
      const isSunday = date.getDay() === 0;

      // Find holidays for this day
      const dayHolidays = holidays.filter(h => {
        const start = new Date(h.startDate);
        const end = new Date(h.endDate);
        start.setHours(0,0,0,0);
        end.setHours(23,59,59,999);
        return date >= start && date <= end && h.status === 'Active';
      });

      let bgColor = 'bg-white';
      if (isSunday) bgColor = 'bg-gray-100';
      if (dayHolidays.length > 0) bgColor = 'bg-red-50';

      days.push(
        <div key={`day-${day}`} className={`${bgColor} border border-gray-200 p-2 min-h-[80px] flex flex-col relative`}>
          <span className={`text-sm font-medium ${isSunday || dayHolidays.length > 0 ? 'text-red-600' : 'text-gray-700'}`}>
            {day}
          </span>
          <div className="mt-1 flex flex-col gap-1 overflow-y-auto max-h-[60px]">
             {isSunday && <span className="text-xs bg-gray-200 text-gray-700 rounded px-1 py-0.5 truncate">Sunday</span>}
             {dayHolidays.map((h, i) => (
                <span key={i} title={h.name} className="text-xs bg-red-100 text-red-700 border border-red-200 rounded px-1 py-0.5 truncate">
                  {h.name}
                </span>
             ))}
          </div>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden">
        {days}
      </div>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Holiday Calendar</h1>
          <p className="text-gray-500">Manage academic holidays, vacations, and emergency closures</p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
        >
          <Plus size={20} />
          Add Holiday
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center gap-2">
          <AlertCircle size={20} />
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 text-green-600 p-4 rounded-lg flex items-center gap-2">
          <AlertCircle size={20} />
          {success}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Calendar View */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold text-gray-800">
              {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </h2>
            <div className="flex gap-2">
              <button 
                onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
                className="p-2 hover:bg-gray-100 rounded-full transition"
              >
                <ChevronLeft size={20} />
              </button>
              <button 
                onClick={() => setCurrentDate(new Date())}
                className="px-3 py-1 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-md transition"
              >
                Today
              </button>
              <button 
                onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}
                className="p-2 hover:bg-gray-100 rounded-full transition"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
          {renderCalendar()}
        </div>

        {/* List View */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col h-[600px]">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Calendar size={20} className="text-indigo-600" />
            Holidays in {currentDate.getFullYear()}
          </h2>
          <div className="flex-1 overflow-y-auto space-y-3 pr-2">
            {loading && <p className="text-gray-500 text-center py-4">Loading...</p>}
            {!loading && holidays.length === 0 && (
              <p className="text-gray-500 text-center py-8 bg-gray-50 rounded-lg">No holidays declared this year.</p>
            )}
            {holidays.map(holiday => (
              <div key={holiday._id} className="border border-gray-100 rounded-lg p-4 hover:shadow-md transition bg-gray-50">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-gray-900">{holiday.name}</h3>
                  <div className="flex gap-2">
                    <button onClick={() => openModal(holiday)} className="text-gray-400 hover:text-indigo-600 transition">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => handleDelete(holiday._id)} className="text-gray-400 hover:text-red-600 transition">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Clock size={14} />
                    {new Date(holiday.startDate).toLocaleDateString()} 
                    {holiday.startDate !== holiday.endDate && ` - ${new Date(holiday.endDate).toLocaleDateString()}`}
                  </div>
                  <div className="flex gap-2 mt-2">
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-700">
                      {holiday.type}
                    </span>
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-200 text-gray-700">
                      {holiday.applicableTo}
                    </span>
                    {holiday.status === 'Inactive' && (
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
                        Inactive
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {editingHoliday ? 'Edit Holiday' : 'Add Holiday'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Holiday Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="w-full border-gray-300 rounded-lg shadow-sm p-2 border focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="e.g., Summer Vacation"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleInputChange}
                    required
                    className="w-full border-gray-300 rounded-lg shadow-sm p-2 border focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleInputChange}
                    required
                    className="w-full border-gray-300 rounded-lg shadow-sm p-2 border focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleInputChange}
                    className="w-full border-gray-300 rounded-lg shadow-sm p-2 border focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="National Holiday">National Holiday</option>
                    <option value="Festival Holiday">Festival Holiday</option>
                    <option value="Emergency Closure">Emergency Closure</option>
                    <option value="School Holiday">School Holiday</option>
                    <option value="Summer Vacation">Summer Vacation</option>
                    <option value="Winter Vacation">Winter Vacation</option>
                    <option value="Exam Break">Exam Break</option>
                    <option value="Government Order">Government Order</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Applicable To</label>
                  <select
                    name="applicableTo"
                    value={formData.applicableTo}
                    onChange={handleInputChange}
                    className="w-full border-gray-300 rounded-lg shadow-sm p-2 border focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="Both">Both (Teachers & Students)</option>
                    <option value="Teachers">Teachers Only</option>
                    <option value="Students">Students Only</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="w-full border-gray-300 rounded-lg shadow-sm p-2 border focus:ring-indigo-500 focus:border-indigo-500"
                  rows="2"
                ></textarea>
              </div>

              {editingHoliday && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full border-gray-300 rounded-lg shadow-sm p-2 border focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive (Cancelled)</option>
                  </select>
                </div>
              )}

              <div className="flex gap-3 justify-end mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Holiday'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HolidayManagement;
