import React, { useState, useEffect } from "react";
import { BookOpen, Search, Plus, Edit2, Trash2 } from "lucide-react";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Modal from "../components/ui/Modal";
import EmptyState from "../components/ui/EmptyState";
import { useToast } from "../context/ToastContext";
import api from "../services/api";

const SubjectMaster = () => {
  const { addToast } = useToast();
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    type: "Theoretical",
    description: "",
  });

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      setLoading(true);
      const res = await api.get("/admin/academic/subjects");
      if (res.data.success) {
        setSubjects(res.data.data);
      }
    } catch (error) {
      addToast(
        error.response?.data?.message || "Failed to fetch subjects",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (subject = null) => {
    if (subject) {
      setEditingSubject(subject);
      setFormData({
        name: subject.name,
        type: subject.type,
        description: subject.description || "",
      });
    } else {
      setEditingSubject(null);
      setFormData({
        name: "",
        type: "Theoretical",
        description: "",
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingSubject) {
        await api.put(
          `/admin/academic/subjects/${editingSubject._id}`,
          formData,
        );
        addToast("Subject updated successfully", "success");
      } else {
        await api.post("/admin/academic/subjects", formData);
        addToast("Subject created successfully", "success");
      }
      setIsModalOpen(false);
      fetchSubjects();
    } catch (error) {
      addToast(error.response?.data?.message || "Operation failed", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this subject?"))
      return;
    try {
      await api.delete(`/admin/academic/subjects/${id}`);
      addToast("Subject deleted successfully", "success");
      fetchSubjects();
    } catch (error) {
      addToast(
        error.response?.data?.message ||
          "Failed to delete subject. It might be in use.",
        "error",
      );
    }
  };

  const filteredSubjects = subjects.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <BookOpen className="text-indigo-600" size={26} />
            Subject Master
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            Manage academic subjects across the institution.
          </p>
        </div>
        <Button onClick={() => handleOpenModal()} icon={Plus}>
          Add Subject
        </Button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden text-sm">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center gap-4">
          <div className="relative w-full max-w-sm">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Search subjects..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-gray-700"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="p-8 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : filteredSubjects.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 text-xs uppercase tracking-widest font-black text-gray-400 border-b border-gray-200">
                  <th className="px-6 py-4">Subject</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredSubjects.map((subject) => (
                  <tr
                    key={subject._id}
                    className="hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900">
                        {subject.name}
                      </div>
                      {subject.description && (
                        <div className="text-xs text-gray-500 mt-1 truncate max-w-md">
                          {subject.description}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-600">
                      <span
                        className={`px-2.5 py-1 text-xs font-bold rounded-md border ${
                          subject.type === "Theoretical"
                            ? "bg-blue-50 text-blue-600 border-blue-100"
                            : subject.type === "Practical"
                              ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                              : "bg-purple-50 text-purple-600 border-purple-100"
                        }`}
                      >
                        {subject.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenModal(subject)}
                          className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(subject._id)}
                          className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No subjects found"
            description="Get started by creating your first academic subject."
            icon={BookOpen}
            action={
              <Button onClick={() => handleOpenModal()}>Add Subject</Button>
            }
          />
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingSubject ? "Edit Subject" : "New Subject"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Subject Name"
            name="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g. Mathematics"
            required
          />

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-gray-700">
              Subject Type
            </label>
            <select
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-medium"
              value={formData.type}
              onChange={(e) =>
                setFormData({ ...formData, type: e.target.value })
              }
            >
              <option value="Theoretical">Theoretical</option>
              <option value="Practical">Practical</option>
              <option value="Both">Both</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-gray-700">
              Description (Optional)
            </label>
            <textarea
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-medium resize-none h-24"
              placeholder="Brief description of the subject..."
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {editingSubject ? "Save Changes" : "Create Subject"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default SubjectMaster;
