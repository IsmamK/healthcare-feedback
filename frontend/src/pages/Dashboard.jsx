import React, { useEffect, useMemo, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis, restrictToWindowEdges } from '@dnd-kit/modifiers';
import { apiFetch, AUTH_BASE_URL, authHeaders, formatDate, formatDateTime, hasUsablePhone } from '../config/api';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

const cls = (...args) => args.filter(Boolean).join(' ');
const BULK_SMS_API_URL = window.__APP_CONFIG__?.BULK_SMS_API_URL || import.meta.env.VITE_BULK_SMS_API_URL || 'https://bulksmsbd.net/api/smsapi';

const statusOptions = [
  { value: 'all', label: 'All Statuses' },
  { value: 'new', label: 'New' },
  { value: 'reviewed', label: 'Reviewed' },
  { value: 'action_taken', label: 'Action Taken' },
  { value: 'resolved', label: 'Resolved' },
];

function statusBadgeClass(status) {
  if (status === 'new') return 'bg-blue-100 text-blue-800 ring-blue-200';
  if (status === 'reviewed') return 'bg-amber-100 text-amber-800 ring-amber-200';
  if (status === 'action_taken') return 'bg-emerald-100 text-emerald-800 ring-emerald-200';
  if (status === 'resolved') return 'bg-gray-100 text-gray-800 ring-gray-200';
  return 'bg-slate-100 text-slate-700 ring-slate-200';
}

function ratingStars(value = 0) {
  const rating = Math.max(0, Math.min(5, Math.round(Number(value) || 0)));
  return '★'.repeat(rating) + '☆'.repeat(5 - rating);
}

function getDoctorInfo(feedback) {
  if (!feedback) return null;

  if (feedback.doctor_info && typeof feedback.doctor_info === 'object') {
    return feedback.doctor_info;
  }

  if (feedback.doctor && typeof feedback.doctor === 'object') {
    return feedback.doctor;
  }

  return null;
}

function getDoctorName(feedback) {
  const doctor = getDoctorInfo(feedback);
  return doctor?.name || 'No Doctor Selected';
}


function StatCard({ label, value, icon, tone = 'cyan' }) {
  const toneMap = {
    cyan: 'bg-cyan-100 text-cyan-700',
    emerald: 'bg-emerald-100 text-emerald-700',
    amber: 'bg-amber-100 text-amber-700',
    purple: 'bg-purple-100 text-purple-700',
    red: 'bg-red-100 text-red-700',
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 transition-all hover:-translate-y-1 hover:shadow-xl">
      <div className="flex items-center gap-4">
        <div className={cls('w-12 h-12 rounded-2xl flex items-center justify-center text-2xl', toneMap[tone] || toneMap.cyan)}>
          {icon}
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-500">{label}</h3>
          <p className="text-2xl font-black text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

function SortableQuestionItem({ question, onEdit, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: question.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.55 : 1 };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cls(
        'bg-white rounded-2xl p-4 mb-3 shadow-sm border border-gray-100 transition-all',
        isDragging && 'shadow-xl ring-2 ring-cyan-200'
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start min-w-0">
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="p-2 mr-3 cursor-grab text-gray-400 hover:text-cyan-600 active:cursor-grabbing bg-gray-50 rounded-xl"
            title="Drag to reorder"
          >
            ≡
          </button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <h4 className="font-bold text-gray-900 break-all">{question.id_name}</h4>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-100 text-cyan-800">
                {question.question_type}
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-700">
                Order: {question.order}
              </span>
              {question.is_additional && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                  Additional
                </span>
              )}
            </div>
            <p className="text-sm text-gray-700">{question.english_text}</p>
            <p className="text-sm text-emerald-700 mt-1">{question.bangla_text}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={() => onEdit(question)}
            className="px-3 py-2 text-sm font-bold text-cyan-700 hover:bg-cyan-50 rounded-xl"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => onDelete(question.id)}
            className="px-3 py-2 text-sm font-bold text-red-700 hover:bg-red-50 rounded-xl"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function QuestionFormModal({ question, isOpen, onClose, onSave }) {
  const emptyForm = {
    id_name: '',
    english_text: '',
    bangla_text: '',
    question_type: 'rating',
    is_active: true,
    order: 0,
    is_additional: false,
  };

  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => {
    if (question) {
      setFormData({
        id_name: question.id_name || '',
        english_text: question.english_text || '',
        bangla_text: question.bangla_text || '',
        question_type: question.question_type || 'rating',
        is_active: question.is_active !== undefined ? question.is_active : true,
        order: question.order || 0,
        is_additional: Boolean(question.is_additional),
      });
    } else {
      setFormData(emptyForm);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question, isOpen]);

  if (!isOpen) return null;

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : name === 'order' ? Number(value) : value,
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="flex items-center justify-between gap-3 mb-2">
            <h2 className="text-2xl font-black text-gray-900">{question ? 'Edit Question' : 'Add New Question'}</h2>
            <button type="button" onClick={onClose} className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600">✕</button>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">ID Name</label>
            <input
              type="text"
              name="id_name"
              value={formData.id_name}
              onChange={handleChange}
              className="w-full p-3 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-cyan-100 focus:border-cyan-500 outline-none"
              placeholder="e.g., doctor-communication"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">English Text</label>
            <textarea
              name="english_text"
              value={formData.english_text}
              onChange={handleChange}
              rows="2"
              className="w-full p-3 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-cyan-100 focus:border-cyan-500 outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Bangla Text</label>
            <textarea
              name="bangla_text"
              value={formData.bangla_text}
              onChange={handleChange}
              rows="2"
              className="w-full p-3 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-cyan-100 focus:border-cyan-500 outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Question Type</label>
              <select
                name="question_type"
                value={formData.question_type}
                onChange={handleChange}
                className="w-full p-3 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-cyan-100 focus:border-cyan-500 outline-none"
              >
                <option value="rating">Rating</option>
                <option value="textarea">Text Area</option>
                <option value="yesno">Yes/No</option>
                <option value="date">Date</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Order</label>
              <input
                type="number"
                name="order"
                value={formData.order}
                onChange={handleChange}
                className="w-full p-3 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-cyan-100 focus:border-cyan-500 outline-none"
              />
            </div>
          </div>

          <label className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50 cursor-pointer">
            <input type="checkbox" name="is_active" checked={formData.is_active} onChange={handleChange} className="h-5 w-5 text-cyan-600 rounded" />
            <span className="text-sm font-bold text-gray-700">Active</span>
          </label>

          <label className="flex items-center gap-3 p-3 rounded-2xl bg-amber-50 cursor-pointer">
            <input type="checkbox" name="is_additional" checked={formData.is_additional} onChange={handleChange} className="h-5 w-5 text-cyan-600 rounded" />
            <span className="text-sm font-bold text-amber-800">Additional question for low ratings</span>
          </label>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-5 py-3 rounded-2xl bg-gray-100 text-gray-700 font-bold hover:bg-gray-200">
              Cancel
            </button>
            <button type="submit" className="px-5 py-3 rounded-2xl bg-gradient-to-r from-cyan-600 to-emerald-600 text-white font-bold hover:from-cyan-700 hover:to-emerald-700">
              {question ? 'Update' : 'Create'} Question
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


function DoctorFormModal({ doctor, isOpen, onClose, onSave }) {
  const emptyForm = {
    name: '',
    specialization: '',
    qualifications: '',
    chamber_time: '',
    fee: '',
    is_active: true,
    order: 0,
  };

  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => {
    if (doctor) {
      setFormData({
        name: doctor.name || '',
        specialization: doctor.specialization || '',
        qualifications: doctor.qualifications || '',
        chamber_time: doctor.chamber_time || '',
        fee: doctor.fee || '',
        is_active: doctor.is_active !== undefined ? doctor.is_active : true,
        order: doctor.order || 0,
      });
    } else {
      setFormData(emptyForm);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctor, isOpen]);

  if (!isOpen) return null;

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : name === 'order' ? Number(value) : value,
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div>
              <h2 className="text-2xl font-black text-gray-900">
                {doctor ? 'Edit Doctor' : 'Add New Doctor'}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Manage doctors shown in the patient feedback form.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600"
            >
              ✕
            </button>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Doctor Name *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full p-3 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-cyan-100 focus:border-cyan-500 outline-none"
              placeholder="e.g., Dr. Md. Example"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Specialization</label>
            <input
              type="text"
              name="specialization"
              value={formData.specialization}
              onChange={handleChange}
              className="w-full p-3 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-cyan-100 focus:border-cyan-500 outline-none"
              placeholder="e.g., Medicine Specialist"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Qualifications</label>
            <textarea
              name="qualifications"
              value={formData.qualifications}
              onChange={handleChange}
              rows="2"
              className="w-full p-3 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-cyan-100 focus:border-cyan-500 outline-none"
              placeholder="e.g., MBBS, FCPS"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-gray-700 mb-1">Chamber Time</label>
              <input
                type="text"
                name="chamber_time"
                value={formData.chamber_time}
                onChange={handleChange}
                className="w-full p-3 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-cyan-100 focus:border-cyan-500 outline-none"
                placeholder="e.g., Saturday–Thursday, 5:30 PM - 7:00 PM"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Fee</label>
              <input
                type="text"
                name="fee"
                value={formData.fee}
                onChange={handleChange}
                className="w-full p-3 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-cyan-100 focus:border-cyan-500 outline-none"
                placeholder="700 BDT"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Order</label>
              <input
                type="number"
                name="order"
                value={formData.order}
                onChange={handleChange}
                className="w-full p-3 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-cyan-100 focus:border-cyan-500 outline-none"
              />
            </div>

            <label className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50 cursor-pointer mt-6">
              <input
                type="checkbox"
                name="is_active"
                checked={formData.is_active}
                onChange={handleChange}
                className="h-5 w-5 text-cyan-600 rounded"
              />
              <span className="text-sm font-bold text-gray-700">Active</span>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 rounded-2xl bg-gray-100 text-gray-700 font-bold hover:bg-gray-200"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-cyan-600 to-emerald-600 text-white font-bold hover:from-cyan-700 hover:to-emerald-700"
            >
              {doctor ? 'Update' : 'Create'} Doctor
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
export default function HealthcareDashboard() {
  const [stats, setStats] = useState({ total_feedbacks: 0, average_rating: 0, status_counts: {}, rating_distribution: {}, question_stats: [] });
  const [feedbacks, setFeedbacks] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [doctors, setDoctors] = useState([]);

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [editingDoctor, setEditingDoctor] = useState(null);
const [isDoctorModalOpen, setIsDoctorModalOpen] = useState(false);
const [doctorSearchTerm, setDoctorSearchTerm] = useState('');
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [questionViewMode, setQuestionViewMode] = useState('normal');
  const [selectedFeedbackIds, setSelectedFeedbackIds] = useState([]);
  const [copySuccess, setCopySuccess] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [bulkSmsStatus, setBulkSmsStatus] = useState(null);
  const [error, setError] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const fetchDashboardData = async () => {
    const data = await apiFetch('dashboard/analytics/');
    setStats(data);
  };

  const fetchFeedbacks = async () => {
    const data = await apiFetch('feedback/');
    setFeedbacks(Array.isArray(data) ? data : []);
  };

  const fetchQuestions = async () => {
    const data = await apiFetch('questions/');
    setQuestions(Array.isArray(data) ? data.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)) : []);
  };
  const fetchDoctors = async () => {
  const data = await apiFetch('doctors/');
  const list = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];

  setDoctors(
    list.sort((a, b) => {
      const orderA = a.order ?? 0;
      const orderB = b.order ?? 0;
      if (orderA !== orderB) return orderA - orderB;
      return String(a.name || '').localeCompare(String(b.name || ''));
    })
  );
};

const refreshAll = async () => {
  setError('');
  await Promise.all([fetchDashboardData(), fetchFeedbacks(), fetchQuestions(), fetchDoctors()]);
};

  useEffect(() => {
    refreshAll().catch((err) => setError(err.message || 'Failed to load dashboard.')).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!copySuccess) return undefined;
    const timer = setTimeout(() => setCopySuccess(''), 1800);
    return () => clearTimeout(timer);
  }, [copySuccess]);

  const logout = async () => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 5000);
    try {
      await fetch(`${AUTH_BASE_URL}token/logout/`, {
        method: 'POST',
        headers: authHeaders(),
        signal: controller.signal,
      });
    } catch {
      // Always remove the local session even when the network is unavailable.
    } finally {
      window.clearTimeout(timeout);
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
  };

  const updateFeedbackStatus = async (feedbackId, newStatus) => {
    await apiFetch(`dashboard/update-status/${feedbackId}/`, {
      method: 'POST',
      body: JSON.stringify({ status: newStatus }),
    });
    await Promise.all([fetchFeedbacks(), fetchDashboardData()]);
    setSelectedFeedback((prev) => (prev?.id === feedbackId ? { ...prev, status: newStatus } : prev));
  };

  const handleSaveQuestion = async (questionData) => {
    const url = editingQuestion ? `questions/${editingQuestion.id}/` : 'questions/';
    await apiFetch(url, {
      method: editingQuestion ? 'PUT' : 'POST',
      body: JSON.stringify(questionData),
    });
    setIsQuestionModalOpen(false);
    setEditingQuestion(null);
    await fetchQuestions();
  };

  const handleDeleteQuestion = async (questionId) => {
    if (!window.confirm('Are you sure you want to delete this question?')) return;
    await apiFetch(`questions/${questionId}/`, { method: 'DELETE' });
    await fetchQuestions();
  };

  const handleSaveDoctor = async (doctorData) => {
  const url = editingDoctor ? `doctors/${editingDoctor.id}/` : 'doctors/';

  await apiFetch(url, {
    method: editingDoctor ? 'PUT' : 'POST',
    body: JSON.stringify(doctorData),
  });

  setIsDoctorModalOpen(false);
  setEditingDoctor(null);

  await Promise.all([fetchDoctors(), fetchFeedbacks()]);
};

const handleDeleteDoctor = async (doctorId) => {
  const doctor = doctors.find((item) => item.id === doctorId);
  const doctorName = doctor?.name || 'this doctor';

  if (!window.confirm(`Delete ${doctorName}? Existing feedbacks for this doctor will show "No Doctor Selected".`)) {
    return;
  }

  await apiFetch(`doctors/${doctorId}/`, { method: 'DELETE' });

  await Promise.all([fetchDoctors(), fetchFeedbacks()]);
};

  const handleDragEnd = async ({ active, over }) => {
    if (!over || active.id === over.id) return;

    const activeIndex = questions.findIndex((q) => q.id === active.id);
    const overIndex = questions.findIndex((q) => q.id === over.id);
    if (activeIndex < 0 || overIndex < 0) return;

    const reordered = arrayMove(questions, activeIndex, overIndex).map((question, index) => ({ ...question, order: index }));
    setQuestions(reordered);

    try {
      await apiFetch('questions/update_order/', {
        method: 'POST',
        body: JSON.stringify({ questions: reordered.map((q, index) => ({ id: q.id, order: index })) }),
      });
      await fetchQuestions();
    } catch (err) {
      setError(err.message || 'Failed to update question order.');
      await fetchQuestions();
    }
  };

  const filteredFeedbacks = useMemo(() => {
    const now = new Date();
    return feedbacks.filter((feedback) => {
      const search = searchTerm.trim().toLowerCase();
     const phone = String(feedback.phone_number || '').toLowerCase();
const doctor = getDoctorInfo(feedback);
const doctorText = [
  doctor?.name,
  doctor?.specialization,
  doctor?.qualifications,
  doctor?.chamber_time,
  doctor?.fee,
]
  .filter(Boolean)
  .join(' ')
  .toLowerCase();

const answerText = (feedback.answers || [])
        .map((answer) => [answer.question_english, answer.question_bangla, answer.text_value, answer.date_value].filter(Boolean).join(' '))
        .join(' ')
        .toLowerCase();
const matchesSearch = !search || phone.includes(search) || answerText.includes(search) || doctorText.includes(search);
      const matchesStatus = statusFilter === 'all' || feedback.status === statusFilter;

      let matchesDate = true;
      if (dateFilter !== 'all' && feedback.created_at) {
        const created = new Date(feedback.created_at);
        if (dateFilter === 'today') {
          matchesDate = created.toDateString() === now.toDateString();
        } else if (dateFilter === 'week') {
          const weekAgo = new Date(now);
          weekAgo.setDate(now.getDate() - 7);
          matchesDate = created >= weekAgo;
        } else if (dateFilter === 'month') {
          matchesDate = created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
        }
      }

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [feedbacks, searchTerm, statusFilter, dateFilter]);

  const filteredQuestions = useMemo(() => {
    if (questionViewMode === 'normal') return questions.filter((q) => !q.is_additional);
    if (questionViewMode === 'additional') return questions.filter((q) => q.is_additional);
    return questions;
  }, [questions, questionViewMode]);

  const toggleSelectedFeedback = (feedbackId) => {
    setSelectedFeedbackIds((prev) => (prev.includes(feedbackId) ? prev.filter((id) => id !== feedbackId) : [...prev, feedbackId]));
  };

  const toggleSelectAllFiltered = () => {
    const filteredIds = filteredFeedbacks.map((feedback) => feedback.id);
    const allSelected = filteredIds.length > 0 && filteredIds.every((id) => selectedFeedbackIds.includes(id));
    setSelectedFeedbackIds(allSelected ? [] : filteredIds);
  };

  const copyText = async (text, message) => {
    await navigator.clipboard.writeText(text);
    setCopySuccess(message);
  };

  const copyAllPhones = async () => {
    const numbers = filteredFeedbacks
      .map((feedback) => feedback.phone_number)
      .filter(hasUsablePhone)
      .join('\n');

    if (!numbers) {
      setCopySuccess('No phone numbers to copy');
      return;
    }

    await copyText(numbers, 'Phone numbers copied');
  };

  const deleteFeedbacks = async (mode) => {
    const ids = mode === 'selected' ? selectedFeedbackIds : filteredFeedbacks.map((feedback) => feedback.id);
    if (!ids.length) return;

    const label = mode === 'selected' ? `${ids.length} selected feedbacks` : `${ids.length} filtered feedbacks`;
    if (!window.confirm(`Delete ${label}? This cannot be undone.`)) return;

    setIsDeleting(true);
    setError('');
    try {
      await Promise.all(ids.map((id) => apiFetch(`feedback/${id}/`, { method: 'DELETE' })));
      setSelectedFeedbackIds([]);
      setSelectedFeedback((prev) => (prev && ids.includes(prev.id) ? null : prev));
      await Promise.all([fetchFeedbacks(), fetchDashboardData()]);
    } catch (err) {
      setError(err.message || 'Failed to delete feedbacks.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cyan-50 via-white to-emerald-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-cyan-600 border-t-transparent mx-auto mb-4" />
          <p className="text-gray-600 font-bold">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-emerald-50">
      <div className="bg-gradient-to-r from-cyan-600 via-cyan-500 to-emerald-500 text-white p-6 shadow-lg relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.25),transparent_30%)]" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 backdrop-blur-sm w-16 h-14 rounded-2xl flex items-center justify-center shadow-lg border border-white/20">
              <span className="text-2xl font-black">JG</span>
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black">JG Healthcare Dashboard</h1>
              <p className="text-cyan-50/90">Patient Feedback Management System</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-4 py-2 border border-white/20 text-sm">
              Last updated: {new Date().toLocaleTimeString()}
            </div>
            <button onClick={refreshAll} className="px-4 py-2 bg-white/10 backdrop-blur-sm rounded-2xl hover:bg-white/20 transition-colors text-sm font-bold">
              Refresh
            </button>
            <button onClick={logout} className="px-4 py-2 bg-white text-cyan-700 rounded-2xl hover:bg-cyan-50 transition-colors text-sm font-black">
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white/80 backdrop-blur-xl shadow-sm sticky top-0 z-20 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 overflow-x-auto">
          <nav className="flex gap-1 min-w-max">
{['overview', 'responses', 'questions', 'doctors', 'analytics', 'bulk'].map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={cls(
                  'py-4 px-5 font-bold text-sm capitalize transition-all relative rounded-t-2xl',
                  activeTab === tab ? 'text-cyan-700 bg-white shadow-sm' : 'text-gray-600 hover:text-cyan-600 hover:bg-white/50'
                )}
              >
                {tab === 'bulk' ? 'Bulk SMS' : tab}
                {activeTab === tab && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-gradient-to-r from-cyan-500 to-emerald-500 rounded-full" />}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl">{error}</div>}
        {copySuccess && <div className="fixed top-5 right-5 z-50 bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-xl font-bold">{copySuccess}</div>}

        {activeTab === 'overview' && <OverviewTab stats={stats} feedbacks={feedbacks} />}
        {activeTab === 'responses' && (
          <ResponsesTab
            feedbacks={filteredFeedbacks}
            selectedFeedback={selectedFeedback}
            setSelectedFeedback={setSelectedFeedback}
            updateFeedbackStatus={updateFeedbackStatus}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            dateFilter={dateFilter}
            setDateFilter={setDateFilter}
            selectedFeedbackIds={selectedFeedbackIds}
            toggleSelectedFeedback={toggleSelectedFeedback}
            toggleSelectAllFiltered={toggleSelectAllFiltered}
            copyAllPhones={copyAllPhones}
            copyText={copyText}
            deleteFeedbacks={deleteFeedbacks}
            isDeleting={isDeleting}
          />
        )}
        {activeTab === 'questions' && (
          <QuestionsTab
            questions={filteredQuestions}
            allQuestions={questions}
            onAddQuestion={() => { setEditingQuestion(null); setIsQuestionModalOpen(true); }}
            onEditQuestion={(question) => { setEditingQuestion(question); setIsQuestionModalOpen(true); }}
            onDeleteQuestion={handleDeleteQuestion}
            onDragEnd={handleDragEnd}
            sensors={sensors}
            questionViewMode={questionViewMode}
            setQuestionViewMode={setQuestionViewMode}
          />
        )}
        {activeTab === 'doctors' && (
  <DoctorsTab
    doctors={doctors}
    searchTerm={doctorSearchTerm}
    setSearchTerm={setDoctorSearchTerm}
    onAddDoctor={() => {
      setEditingDoctor(null);
      setIsDoctorModalOpen(true);
    }}
    onEditDoctor={(doctor) => {
      setEditingDoctor(doctor);
      setIsDoctorModalOpen(true);
    }}
    onDeleteDoctor={handleDeleteDoctor}
  />
)}
        {activeTab === 'analytics' && <AnalyticsTab stats={stats} />}
        {activeTab === 'bulk' && <BulkSMSTab status={bulkSmsStatus} setStatus={setBulkSmsStatus} defaultNumbers={filteredFeedbacks.map((f) => f.phone_number).filter(hasUsablePhone)} />}
      </main>

      <QuestionFormModal
        question={editingQuestion}
        isOpen={isQuestionModalOpen}
        onClose={() => { setIsQuestionModalOpen(false); setEditingQuestion(null); }}
        onSave={handleSaveQuestion}
      />
      <DoctorFormModal
  doctor={editingDoctor}
  isOpen={isDoctorModalOpen}
  onClose={() => {
    setIsDoctorModalOpen(false);
    setEditingDoctor(null);
  }}
  onSave={handleSaveDoctor}
/>
    </div>
  );
}

function OverviewTab({ stats, feedbacks }) {
  const recentFeedbacks = feedbacks.slice(0, 5);

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Total Feedbacks" value={stats.total_feedbacks || 0} icon="📊" tone="cyan" />
        <StatCard label="Average Rating" value={`${stats.average_rating || 0}/5`} icon="⭐" tone="emerald" />
        <StatCard label="Pending Reviews" value={stats.status_counts?.new || 0} icon="⏰" tone="amber" />
        <StatCard label="Resolved Issues" value={stats.status_counts?.resolved || 0} icon="✅" tone="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-black text-gray-900">Recent Feedbacks</h3>
            <span className="text-sm text-cyan-700 font-bold">{feedbacks.length} total</span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead>
                <tr>
                <th className="px-4 py-3 text-left text-xs font-black text-gray-500 uppercase">Doctor</th>
<th className="px-4 py-3 text-left text-xs font-black text-gray-500 uppercase">Phone</th>
<th className="px-4 py-3 text-left text-xs font-black text-gray-500 uppercase">Rating</th>
<th className="px-4 py-3 text-left text-xs font-black text-gray-500 uppercase">Status</th>
<th className="px-4 py-3 text-left text-xs font-black text-gray-500 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentFeedbacks.map((feedback) => (
                  <tr key={feedback.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-bold text-gray-900">{hasUsablePhone(feedback.phone_number) ? feedback.phone_number : <span className="text-amber-700">No Phone</span>}</td>
                    <td className="px-4 py-3 text-sm">
  <div className="font-black text-gray-900 max-w-[220px] truncate">
    {getDoctorName(feedback)}
  </div>
  {getDoctorInfo(feedback)?.specialization && (
    <div className="text-xs text-cyan-700 max-w-[220px] truncate">
      {getDoctorInfo(feedback).specialization}
    </div>
  )}
</td>
                    <td className="px-4 py-3 text-sm"><span className="text-yellow-400">★</span> {feedback.average_rating}</td>
                    <td className="px-4 py-3"><span className={cls('px-2.5 py-1 text-xs font-bold rounded-full ring-1', statusBadgeClass(feedback.status))}>{String(feedback.status || '').replace('_', ' ')}</span></td>
                    <td className="px-4 py-3 text-sm text-gray-700">{formatDate(feedback.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <h3 className="text-lg font-black text-gray-900 mb-4">Feedback Status Distribution</h3>
          <div className="h-64">
            <Doughnut
              data={{
                labels: Object.keys(stats.status_counts || {}).map((key) => key.replace('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())),
                datasets: [{ data: Object.values(stats.status_counts || {}), backgroundColor: ['#3B82F6', '#F59E0B', '#10B981', '#6B7280'], borderWidth: 2, borderColor: '#fff' }],
              }}
              options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, cutout: '62%' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function ResponsesTab({
  feedbacks,
  selectedFeedback,
  setSelectedFeedback,
  updateFeedbackStatus,
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  dateFilter,
  setDateFilter,
  selectedFeedbackIds,
  toggleSelectedFeedback,
  toggleSelectAllFiltered,
  copyAllPhones,
  copyText,
  deleteFeedbacks,
  isDeleting,
}) {
  const allSelected = feedbacks.length > 0 && feedbacks.every((feedback) => selectedFeedbackIds.includes(feedback.id));

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 relative">
        {isDeleting && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-2xl">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-red-600 border-t-transparent mx-auto mb-3" />
              <p className="font-bold text-gray-700">Deleting feedbacks...</p>
            </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
          <div>
            <h3 className="text-xl font-black text-gray-900">All Feedback Responses</h3>
            <p className="text-sm text-gray-500 mt-1">{feedbacks.length} result(s), {selectedFeedbackIds.length} selected</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={copyAllPhones} className="px-3 py-2 rounded-xl bg-cyan-50 text-cyan-700 text-sm font-bold hover:bg-cyan-100">Copy Numbers</button>
            <button onClick={() => deleteFeedbacks('selected')} disabled={!selectedFeedbackIds.length} className="px-3 py-2 rounded-xl bg-red-50 text-red-700 text-sm font-bold hover:bg-red-100 disabled:opacity-40">Delete Selected</button>
            <button onClick={() => deleteFeedbacks('all')} disabled={!feedbacks.length} className="px-3 py-2 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 disabled:opacity-40">Delete All</button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-5">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
placeholder="Search phone, doctor, or answer..."
            className="md:col-span-2 w-full p-3 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-cyan-100 focus:border-cyan-500 outline-none"
          />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full p-3 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-cyan-100 focus:border-cyan-500 outline-none">
            {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="w-full p-3 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-cyan-100 focus:border-cyan-500 outline-none">
            <option value="all">All Dates</option>
            <option value="today">Today</option>
            <option value="week">Last 7 Days</option>
            <option value="month">This Month</option>
          </select>
        </div>

        <label className="inline-flex items-center gap-2 mb-4 text-sm font-bold text-gray-700 cursor-pointer">
          <input type="checkbox" checked={allSelected} onChange={toggleSelectAllFiltered} className="h-5 w-5 text-cyan-600 rounded" />
          Select all visible
        </label>

        <div className="space-y-4 max-h-[560px] overflow-y-auto pr-2">
          {feedbacks.map((feedback) => {
            const selected = selectedFeedbackIds.includes(feedback.id);
            const hasPhone = hasUsablePhone(feedback.phone_number);
            return (
              <div
                key={feedback.id}
                onClick={() => setSelectedFeedback(feedback)}
                className={cls(
                  'p-4 border rounded-2xl transition-all cursor-pointer group bg-white',
                  selectedFeedback?.id === feedback.id ? 'border-cyan-300 bg-cyan-50 shadow-md' : selected ? 'border-emerald-300 bg-emerald-50' : 'border-gray-200 hover:border-cyan-200 hover:shadow-md',
                  !hasPhone && 'border-l-4 border-l-amber-400'
                )}
              >
                <div className="flex items-start gap-3">
                  <input type="checkbox" checked={selected} onChange={() => toggleSelectedFeedback(feedback.id)} onClick={(e) => e.stopPropagation()} className="mt-1 h-5 w-5 text-cyan-600 rounded" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className={cls('font-black break-all', hasPhone ? 'text-gray-900' : 'text-amber-700')}>{hasPhone ? feedback.phone_number : 'Not Provided'}</h4>
                          {!hasPhone && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">No Phone</span>}
                          {hasPhone && (
                            <button
                              type="button"
                              onClick={(event) => { event.stopPropagation(); copyText(feedback.phone_number, 'Phone copied'); }}
                              className="text-xs text-cyan-700 bg-cyan-50 px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              Copy
                            </button>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 mt-1">{formatDateTime(feedback.created_at)}</p>
                        <div className="mt-2 inline-flex max-w-full items-center gap-1 rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-bold text-cyan-800">
  <span>👨‍⚕️</span>
  <span className="truncate">{getDoctorName(feedback)}</span>
</div>
                      </div>
                      <div className="text-right">
                        <div className="text-yellow-400 text-sm">{ratingStars(feedback.average_rating)}</div>
                        <div className="font-black text-gray-900">{feedback.average_rating}/5</div>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <span className={cls('px-3 py-1 text-xs font-black rounded-full ring-1 capitalize', statusBadgeClass(feedback.status))}>{String(feedback.status || '').replace('_', ' ')}</span>
                      <span className="text-xs text-gray-500">{feedback.answers?.length || 0} answers</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {!feedbacks.length && <div className="text-center py-10 text-gray-500 font-semibold">No feedback found matching your filters.</div>}
        </div>
      </div>

      <FeedbackDetails selectedFeedback={selectedFeedback} updateFeedbackStatus={updateFeedbackStatus} />
    </div>
  );
}

function FeedbackDetails({ selectedFeedback, updateFeedbackStatus }) {
  if (!selectedFeedback) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 flex items-center justify-center min-h-[420px]">
        <div className="text-center text-gray-500">
          <div className="text-5xl mb-3">📋</div>
          <p className="font-bold">Select a feedback to view details</p>
        </div>
      </div>
    );
  }

  const doctor = getDoctorInfo(selectedFeedback);

  const renderAnswerValue = (answer) => {
    if (answer.rating_value) return <span><span className="text-yellow-400">{ratingStars(answer.rating_value)}</span> <b>{answer.rating_value}/5</b></span>;
    if (answer.text_value) return <p className="bg-gray-50 p-3 rounded-xl text-gray-700">{answer.text_value}</p>;
    if (answer.yesno_value !== null && answer.yesno_value !== undefined) return <span className={answer.yesno_value ? 'text-emerald-700 font-bold' : 'text-red-700 font-bold'}>{answer.yesno_value ? 'Yes' : 'No'}</span>;
    if (answer.date_value) return <span className="font-bold text-gray-700">📅 {formatDate(answer.date_value)}</span>;
    return <span className="text-gray-400">No response</span>;
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
      <h3 className="text-xl font-black text-gray-900 mb-5">Feedback Details</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
        <div className="md:col-span-2 bg-gradient-to-r from-cyan-50 to-emerald-50 rounded-2xl p-4 border border-cyan-100">
  <p className="text-xs font-black text-cyan-700 uppercase">Doctor This Response Is About</p>

  <p className="mt-1 font-black text-gray-900">
    {doctor?.name || 'No Doctor Selected'}
  </p>

  {doctor?.specialization && (
    <p className="mt-1 text-sm font-bold text-cyan-700">
      {doctor.specialization}
    </p>
  )}

  {doctor?.qualifications && (
    <p className="mt-1 text-sm text-gray-600">
      {doctor.qualifications}
    </p>
  )}

  <div className="mt-2 flex flex-wrap gap-2">
    {doctor?.chamber_time && (
      <span className="text-xs bg-white text-gray-700 px-2 py-1 rounded-full border border-cyan-100">
        🕒 {doctor.chamber_time}
      </span>
    )}

    {doctor?.fee && (
      <span className="text-xs bg-white text-emerald-700 px-2 py-1 rounded-full border border-emerald-100">
        Fee: {doctor.fee}
      </span>
    )}
  </div>
</div>
        <div className="bg-gray-50 rounded-2xl p-4">
          <p className="text-xs font-black text-gray-500 uppercase">Phone Number</p>
          <p className="mt-1 font-black text-gray-900 break-all">{hasUsablePhone(selectedFeedback.phone_number) ? selectedFeedback.phone_number : 'Not Provided'}</p>
        </div>
        <div className="bg-gray-50 rounded-2xl p-4">
          <p className="text-xs font-black text-gray-500 uppercase">Average Rating</p>
          <p className="mt-1 font-black text-gray-900"><span className="text-yellow-400">★</span> {selectedFeedback.average_rating}/5</p>
        </div>
        <div className="bg-gray-50 rounded-2xl p-4">
          <p className="text-xs font-black text-gray-500 uppercase">Submitted</p>
          <p className="mt-1 font-bold text-gray-900">{formatDateTime(selectedFeedback.created_at)}</p>
        </div>
        <div className="bg-gray-50 rounded-2xl p-4">
          <p className="text-xs font-black text-gray-500 uppercase mb-2">Status</p>
          <select
            value={selectedFeedback.status}
            onChange={(e) => updateFeedbackStatus(selectedFeedback.id, e.target.value)}
            className="w-full p-2 border border-gray-200 rounded-xl focus:ring-4 focus:ring-cyan-100 focus:border-cyan-500 outline-none"
          >
            {statusOptions.filter((option) => option.value !== 'all').map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="font-black text-gray-900">Answers</h4>
        {(selectedFeedback.answers || []).map((answer) => (
          <div key={answer.id} className="border border-gray-100 rounded-2xl p-4">
            <h5 className="font-bold text-gray-900">{answer.question_english}</h5>
            <p className="text-sm text-emerald-700 mt-1">{answer.question_bangla}</p>
            <div className="mt-3">{renderAnswerValue(answer)}</div>
          </div>
        ))}
      </div>

      {(selectedFeedback.additional_responses || []).length > 0 && (
        <div className="mt-6 space-y-3">
          <h4 className="font-black text-gray-900">Additional Responses</h4>
          {selectedFeedback.additional_responses.map((response) => (
            <div key={response.id} className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
              <p className="text-xs font-black text-amber-700 uppercase">{String(response.question_type || '').replaceAll('-', ' ')}</p>
              <p className="mt-2 text-gray-800 font-medium">{response.response_text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function QuestionsTab({ questions, allQuestions, onAddQuestion, onEditQuestion, onDeleteQuestion, onDragEnd, sensors, questionViewMode, setQuestionViewMode }) {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-xl font-black text-gray-900">Question Management</h3>
          <p className="text-sm text-gray-500 mt-1">{questions.length} showing • {allQuestions.length} total</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { value: 'normal', label: 'Normal' },
            { value: 'additional', label: 'Additional' },
            { value: 'all', label: 'All' },
          ].map((item) => (
            <button
              key={item.value}
              onClick={() => setQuestionViewMode(item.value)}
              className={cls('px-4 py-2 rounded-xl text-sm font-black transition-all', questionViewMode === item.value ? 'bg-cyan-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200')}
            >
              {item.label}
            </button>
          ))}
          <button onClick={onAddQuestion} className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-emerald-600 text-white text-sm font-black hover:from-cyan-700 hover:to-emerald-700">
            + Add Question
          </button>
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd} modifiers={[restrictToVerticalAxis, restrictToWindowEdges]}>
        <SortableContext items={allQuestions.map((q) => q.id)} strategy={verticalListSortingStrategy}>
          {questions.map((question) => <SortableQuestionItem key={question.id} question={question} onEdit={onEditQuestion} onDelete={onDeleteQuestion} />)}
        </SortableContext>
      </DndContext>

      {!questions.length && <div className="text-center py-10 text-gray-500 font-semibold">No questions found in this view.</div>}
    </div>
  );
}

function DoctorsTab({ doctors, searchTerm, setSearchTerm, onAddDoctor, onEditDoctor, onDeleteDoctor }) {
  const filteredDoctors = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    if (!search) return doctors;

    return doctors.filter((doctor) => {
      const text = [
        doctor.name,
        doctor.specialization,
        doctor.qualifications,
        doctor.chamber_time,
        doctor.fee,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return text.includes(search);
    });
  }, [doctors, searchTerm]);

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-xl font-black text-gray-900">Doctor Management</h3>
          <p className="text-sm text-gray-500 mt-1">
            {filteredDoctors.length} showing • {doctors.length} total doctors
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search doctor, department, fee..."
            className="w-full sm:w-80 p-3 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-cyan-100 focus:border-cyan-500 outline-none"
          />

          <button
            onClick={onAddDoctor}
            className="px-5 py-3 rounded-2xl bg-gradient-to-r from-cyan-600 to-emerald-600 text-white text-sm font-black hover:from-cyan-700 hover:to-emerald-700 whitespace-nowrap"
          >
            + Add Doctor
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredDoctors.map((doctor) => (
          <div
            key={doctor.id}
            className="rounded-2xl border border-gray-100 bg-gradient-to-br from-white to-cyan-50/40 p-5 shadow-sm hover:shadow-md transition-all"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-xs font-black text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                    Order: {doctor.order ?? 0}
                  </span>

                  <span className={cls(
                    'text-xs font-black px-2 py-1 rounded-full',
                    doctor.is_active
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-red-100 text-red-700'
                  )}>
                    {doctor.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <h4 className="font-black text-gray-900 leading-snug">
                  {doctor.name}
                </h4>

                {doctor.specialization && (
                  <p className="mt-1 text-sm font-bold text-cyan-700">
                    {doctor.specialization}
                  </p>
                )}

                {doctor.qualifications && (
                  <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                    {doctor.qualifications}
                  </p>
                )}

                <div className="mt-3 flex flex-wrap gap-2">
                  {doctor.chamber_time && (
                    <span className="text-xs bg-white text-gray-700 px-2 py-1 rounded-full border border-gray-100">
                      🕒 {doctor.chamber_time}
                    </span>
                  )}

                  {doctor.fee && (
                    <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full border border-emerald-100">
                      Fee: {doctor.fee}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => onEditDoctor(doctor)}
                  className="px-3 py-2 text-sm font-bold text-cyan-700 hover:bg-cyan-100 rounded-xl"
                >
                  Edit
                </button>

                <button
                  type="button"
                  onClick={() => onDeleteDoctor(doctor.id)}
                  className="px-3 py-2 text-sm font-bold text-red-700 hover:bg-red-100 rounded-xl"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {!filteredDoctors.length && (
        <div className="text-center py-12 text-gray-500 font-semibold">
          No doctors found.
        </div>
      )}
    </div>
  );
}

function AnalyticsTab({ stats }) {
  const ratingDistribution = stats.rating_distribution || {};
  const questionStats = stats.question_stats || [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <h3 className="text-xl font-black text-gray-900 mb-4">Rating Distribution</h3>
          <div className="h-72">
            <Doughnut
              data={{ labels: Object.keys(ratingDistribution), datasets: [{ data: Object.values(ratingDistribution), backgroundColor: ['#EF4444', '#F59E0B', '#10B981'], borderColor: '#fff', borderWidth: 2 }] }}
              options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }}
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <h3 className="text-xl font-black text-gray-900 mb-4">Question Average Ratings</h3>
          <div className="h-72">
            <Bar
              data={{ labels: questionStats.map((q) => q.id_name), datasets: [{ label: 'Average Rating', data: questionStats.map((q) => q.average_rating), backgroundColor: '#06B6D4', borderRadius: 8 }] }}
              options={{ responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, max: 5 } }, plugins: { legend: { display: false } } }}
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
        <h3 className="text-xl font-black text-gray-900 mb-4">Question Statistics</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-black text-gray-500 uppercase">Question</th>
                <th className="px-4 py-3 text-left text-xs font-black text-gray-500 uppercase">Average Rating</th>
                <th className="px-4 py-3 text-left text-xs font-black text-gray-500 uppercase">Responses</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {questionStats.map((question) => (
                <tr key={question.question_id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-bold text-gray-900">{question.id_name}</td>
                  <td className="px-4 py-3"><span className="text-yellow-400">{ratingStars(question.average_rating)}</span> <b>{question.average_rating}/5</b></td>
                  <td className="px-4 py-3"><span className="px-3 py-1 rounded-full bg-gray-100 text-gray-800 text-sm font-bold">{question.response_count}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!questionStats.length && <div className="text-center py-10 text-gray-500 font-semibold">No rating question statistics available.</div>}
        </div>
      </div>
    </div>
  );
}

function BulkSMSTab({ status, setStatus, defaultNumbers }) {
  const [numbers, setNumbers] = useState(defaultNumbers.join('\n'));
  const [message, setMessage] = useState('');
  const [senderId, setSenderId] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (status) {
      const timer = setTimeout(() => setStatus(null), 5000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [status, setStatus]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSending(true);
    setStatus(null);

    try {
      const normalizedNumbers = numbers.split(/\n|,/).map((item) => item.trim()).filter(Boolean).join(',');
      if (!normalizedNumbers) throw new Error('Please enter at least one phone number.');
      if (!message.trim()) throw new Error('Please enter an SMS message.');
      if (!senderId.trim()) throw new Error('Please enter Sender ID.');
      if (!apiKey.trim()) throw new Error('Please enter API key.');

      const response = await fetch(BULK_SMS_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: apiKey, senderid: senderId, number: normalizedNumbers, message }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Failed to send SMS.');

      setStatus({ type: 'success', message: data.message || 'SMS sent successfully.' });
      setMessage('');
    } catch (err) {
      setStatus({ type: 'error', message: err.message || 'Error sending SMS.' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
        <h3 className="text-2xl font-black text-gray-900 mb-2">Bulk SMS Sender</h3>
        <p className="text-gray-500 mb-6">Send SMS to multiple patient phone numbers.</p>

        {status && (
          <div className={cls('mb-6 rounded-2xl p-4 font-bold', status.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200')}>
            {status.message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-black text-gray-700 mb-2">Sender ID *</label>
              <input value={senderId} onChange={(e) => setSenderId(e.target.value)} className="w-full p-3 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-cyan-100 focus:border-cyan-500 outline-none" placeholder="Your sender ID" />
            </div>
            <div>
              <label className="block text-sm font-black text-gray-700 mb-2">API Key *</label>
              <input value={apiKey} onChange={(e) => setApiKey(e.target.value)} className="w-full p-3 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-cyan-100 focus:border-cyan-500 outline-none" placeholder="BulkSMSBD API key" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-black text-gray-700 mb-2">Phone Numbers *</label>
            <textarea value={numbers} onChange={(e) => setNumbers(e.target.value)} rows="8" className="w-full p-4 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-cyan-100 focus:border-cyan-500 outline-none resize-none" placeholder="One number per line or comma separated" />
          </div>

          <div>
            <label className="block text-sm font-black text-gray-700 mb-2">Message *</label>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows="5" maxLength={918} className="w-full p-4 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-cyan-100 focus:border-cyan-500 outline-none resize-none" placeholder="Write SMS message..." />
            <div className="text-right text-xs text-gray-500 mt-1">{message.length}/918 characters</div>
          </div>

          <button disabled={sending} className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-600 to-emerald-600 text-white font-black hover:from-cyan-700 hover:to-emerald-700 transition-all disabled:opacity-50">
            {sending ? 'Sending...' : 'Send Bulk SMS'}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 h-fit">
        <h4 className="font-black text-gray-900 mb-3">Tips</h4>
        <ul className="space-y-3 text-sm text-gray-600">
          <li>• Use one phone number per line for easier checking.</li>
          <li>• Keep messages short and clear.</li>
          <li>• Test with a small batch before sending many SMS.</li>
          <li>• If sending fails, check your SMS provider settings and account balance.</li>
        </ul>
      </div>
    </div>
  );
}
