import React, { useState, useEffect, useCallback } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement,
} from 'chart.js';
import { Doughnut, Pie, Bar, Line } from 'react-chartjs-2';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import {
  arrayMove as arrayMoveSortable,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  restrictToVerticalAxis,
  restrictToWindowEdges,
} from '@dnd-kit/modifiers';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement
);

// Sortable question item component
function SortableQuestionItem({ id, question, onEdit, onDelete }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white rounded-xl p-4 mb-3 shadow-sm border border-gray-100 ${
        isDragging ? 'shadow-lg rotate-2' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div
            {...attributes}
            {...listeners}
            className="p-2 mr-3 cursor-grab text-gray-400 hover:text-gray-600 active:cursor-grabbing"
          >
            ≡
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-gray-900">{question.id_name}</h4>
            <p className="text-sm text-gray-600 mt-1">{question.english_text}</p>
            <p className="text-sm text-gray-600 mt-1">{question.bangla_text}</p>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-cyan-100 text-cyan-800 mt-2">
              {question.question_type}
            </span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 mt-2 ml-2">
              Order: {question.order}
            </span>
           {question.is_additional && (
  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 mt-2 ml-2">
    Additional
  </span>
)}

          </div>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => onEdit(question)}
            className="p-2 text-cyan-600 hover:text-cyan-800 hover:bg-cyan-50 rounded-lg"
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(question.id)}
            className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// Question Form Modal Component
function QuestionFormModal({ question, onSave, onClose, isOpen }) {
  const [formData, setFormData] = useState({
    id_name: '',
    english_text: '',
    bangla_text: '',
    question_type: 'rating',
    is_active: true,
    order: 0,
    is_additional: false,
    show_on_rating_below: 3.5,
  });

  useEffect(() => {
    if (question) {
      setFormData({
        id_name: question.id_name || '',
        english_text: question.english_text || '',
        bangla_text: question.bangla_text || '',
        question_type: question.question_type || 'rating',
        is_active: question.is_active !== undefined ? question.is_active : true,
        order: question.order || 0,
        is_additional: question.is_additional || false,
        show_on_rating_below: question.show_on_rating_below || 3.5,
      });
    } else {
      setFormData({
        id_name: '',
        english_text: '',
        bangla_text: '',
        question_type: 'rating',
        is_active: true,
        order: 0,
        is_additional: false,
        show_on_rating_below: 3.5,
      });
    }
  }, [question, isOpen]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-screen overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            {question ? 'Edit Question' : 'Add New Question'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ID Name
              </label>
              <input
                type="text"
                name="id_name"
                value={formData.id_name}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-cyan-500 focus:border-cyan-500"
                required
                placeholder="e.g., doctor-communication"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                English Text
              </label>
              <textarea
                name="english_text"
                value={formData.english_text}
                onChange={handleChange}
                rows="2"
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-cyan-500 focus:border-cyan-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bangla Text
              </label>
              <textarea
                name="bangla_text"
                value={formData.bangla_text}
                onChange={handleChange}
                rows="2"
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-cyan-500 focus:border-cyan-500"
                required
              />
            </div>
            
           <div>
  <label className="block text-sm font-medium text-gray-700 mb-1">
    Question Type
  </label>
  <select
    name="question_type"
    value={formData.question_type}
    onChange={handleChange}
    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-cyan-500 focus:border-cyan-500"
  >
    <option value="rating">Rating</option>
    <option value="textarea">Text Area</option>
    <option value="yesno">Yes/No</option>
    <option value="date">Date</option>
  </select>
</div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                name="is_active"
                id="is_active"
                checked={formData.is_active}
                onChange={handleChange}
                className="h-4 w-4 text-cyan-600 focus:ring-cyan-500 border-gray-300 rounded"
              />
              <label htmlFor="is_active" className="ml-2 block text-sm text-gray-700">
                Active
              </label>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                name="is_additional"
                id="is_additional"
                checked={formData.is_additional}
                onChange={handleChange}
                className="h-4 w-4 text-cyan-600 focus:ring-cyan-500 border-gray-300 rounded"
              />
              <label htmlFor="is_additional" className="ml-2 block text-sm text-gray-700">
                Additional Question (Shown for low ratings)
              </label>
            </div>
            
            {formData.is_additional && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Show when rating is below
                </label>
                <input
                  type="number"
                  name="show_on_rating_below"
                  value={formData.show_on_rating_below}
                  onChange={handleChange}
                  min="1"
                  max="5"
                  step="0.1"
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-cyan-500 focus:border-cyan-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  This question will be shown when the average rating is below this value
                </p>
              </div>
            )}
            
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-emerald-600 text-white text-sm font-medium rounded-lg hover:from-cyan-700 hover:to-emerald-700"
              >
                {question ? 'Update' : 'Create'} Question
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function HealthcareDashboard() {
  const [stats, setStats] = useState({
    total_feedbacks: 0,
    average_rating: 0,
    status_counts: {},
    rating_distribution: {},
    question_stats: [],
    feedback_trend: []
  });
  const [feedbacks, setFeedbacks] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [questionViewMode, setQuestionViewMode] = useState('normal'); // 'normal' | 'additional' | 'all'


  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/';

  // Set up sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchDashboardData();
    fetchFeedbacks();
    fetchQuestions();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch(`${apiUrl}dashboard/analytics/`);
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // Fallback mock data
      setStats({
        total_feedbacks: 42,
        average_rating: 4.2,
        status_counts: { new: 15, reviewed: 20, action_taken: 5, resolved: 2 },
        rating_distribution: { '1-2': 5, '3-4': 12, '4-5': 25 },
        question_stats: [],
        feedback_trend: [
          { date: '2023-11-01', count: 5 },
          { date: '2023-11-02', count: 8 },
          { date: '2023-11-03', count: 12 },
          { date: '2023-11-04', count: 7 },
          { date: '2023-11-05', count: 15 },
        ]
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchFeedbacks = async () => {
    try {
      const response = await fetch(`${apiUrl}feedback/`);
      const data = await response.json();
      setFeedbacks(data);
    } catch (error) {
      console.error('Error fetching feedbacks:', error);
      // Mock data for demonstration
      setFeedbacks([
        {
          id: 1,
          phone_number: '+1234567890',
          average_rating: 4.5,
          status: 'new',
          created_at: '2023-12-01T10:30:00Z',
          answers: [
            {
              id: 1,
              question_id_name: 'doctor-communication',
              question_english: 'Did the doctor answer all your questions?',
              question_bangla: 'ডাক্তার কি আপনার সব প্রশ্নের উত্তর দিয়েছেন?',
              rating_value: 5,
              text_value: null,
              yesno_value: null
            }
          ],
          additional_responses: []
        }
      ]);
    }
  };

  const fetchQuestions = async () => {
    try {
      const response = await fetch(`${apiUrl}questions/`);
      const data = await response.json();
      setQuestions(data);
    } catch (error) {
      console.error('Error fetching questions:', error);
    }
  };

  const updateFeedbackStatus = async (feedbackId, newStatus) => {
    try {
      const response = await fetch(`${apiUrl}dashboard/update-status/${feedbackId}/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        fetchFeedbacks();
        fetchDashboardData();
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleAddQuestion = () => {
    setEditingQuestion(null);
    setIsQuestionModalOpen(true);
  };

  const handleEditQuestion = (question) => {
    setEditingQuestion(question);
    setIsQuestionModalOpen(true);
  };

  const handleSaveQuestion = async (questionData) => {
    try {
      // Remove show_on_rating_below if not an additional question
      if (!questionData.is_additional) {
        delete questionData.show_on_rating_below;
      }
      
      const url = editingQuestion 
        ? `${apiUrl}questions/${editingQuestion.id}/`
        : `${apiUrl}questions/`;
      
      const method = editingQuestion ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(questionData),
      });

      if (response.ok) {
        setIsQuestionModalOpen(false);
        fetchQuestions(); // Refresh the questions list
      }
    } catch (error) {
      console.error('Error saving question:', error);
    }
  };

  const handleDeleteQuestion = async (questionId) => {
    if (window.confirm('Are you sure you want to delete this question?')) {
      try {
        const response = await fetch(`${apiUrl}questions/${questionId}/`, {
          method: 'DELETE',
        });

        if (response.ok) {
          fetchQuestions(); // Refresh the questions list
        }
      } catch (error) {
        console.error('Error deleting question:', error);
      }
    }
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    
    if (active.id !== over.id) {
      const oldIndex = questions.findIndex(q => q.id === active.id);
      const newIndex = questions.findIndex(q => q.id === over.id);
      
      const reorderedQuestions = arrayMoveSortable(questions, oldIndex, newIndex);
      setQuestions(reorderedQuestions);
      
      // Update the order in the backend
      try {
        const updates = reorderedQuestions.map((question, index) => ({
          id: question.id,
          order: index
        }));
        
        const response = await fetch(`${apiUrl}questions/update_order/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ questions: updates }),
        });
        
        if (!response.ok) {
          console.error('Failed to update question order');
          fetchQuestions(); // Revert if failed
        }
      } catch (error) {
        console.error('Error updating question order:', error);
        fetchQuestions(); // Revert if error
      }
    }
  };

  // Filter feedbacks based on search and filters
  const filteredFeedbacks = feedbacks.filter(feedback => {
    const matchesSearch = searchTerm === '' || 
      feedback.phone_number.includes(searchTerm) ||
      feedback.answers.some(answer => 
        answer.text_value && answer.text_value.toLowerCase().includes(searchTerm.toLowerCase())
      );
    
    const matchesStatus = statusFilter === 'all' || feedback.status === statusFilter;
    
    const matchesDate = dateFilter === 'all' || true; // Date filtering logic would go here
    
    return matchesSearch && matchesStatus && matchesDate;
  });

  // Filter questions based on additional toggle
const filteredQuestions = questions.filter(q => {
  if (questionViewMode === 'normal') return !q.is_additional;
  if (questionViewMode === 'additional') return q.is_additional;
  return true; // 'all'
});


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cyan-50 via-white to-emerald-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-cyan-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-emerald-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-cyan-600 via-cyan-500 to-emerald-500 text-white p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <img 
              src="/logo.png" 
              alt="JG Healthcare Logo" 
              className="bg-white w-16 h-12 object-contain rounded-lg p-1 shadow-md"
            />
            <div>
              <h1 className="text-3xl font-bold">JG Healthcare Dashboard</h1>
              <p className="text-cyan-100">Patient Feedback Management System</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="bg-white/20 rounded-lg px-3 py-1">
              <span className="text-sm">Last updated: {new Date().toLocaleTimeString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {['overview', 'responses', 'questions', 'analytics'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm capitalize transition-colors duration-200 ${
                  activeTab === tab
                    ? 'border-cyan-500 text-cyan-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.replace('_', ' ')}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && <OverviewTab stats={stats} feedbacks={feedbacks} />}
        {activeTab === 'responses' && (
          <ResponsesTab 
            feedbacks={filteredFeedbacks} 
            updateFeedbackStatus={updateFeedbackStatus}
            selectedFeedback={selectedFeedback}
            setSelectedFeedback={setSelectedFeedback}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            dateFilter={dateFilter}
            setDateFilter={setDateFilter}
          />
        )}
        {activeTab === 'questions' && (
          <QuestionsTab 
            questions={filteredQuestions} 
            onAddQuestion={handleAddQuestion}
            onEditQuestion={handleEditQuestion}
            onDeleteQuestion={handleDeleteQuestion}
            onDragEnd={handleDragEnd}
            sensors={sensors}
            questionViewMode={questionViewMode}      // <--- pass here
  setQuestionViewMode={setQuestionViewMode} 
          
          />
        )}
        {activeTab === 'analytics' && <AnalyticsTab stats={stats} />}
      </div>

      {/* Question Form Modal */}
      <QuestionFormModal
        question={editingQuestion}
        onSave={handleSaveQuestion}
        onClose={() => setIsQuestionModalOpen(false)}
        isOpen={isQuestionModalOpen}
      />
    </div>
  );
}

const OverviewTab = ({ stats, feedbacks }) => {
  const recentFeedbacks = feedbacks.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-lg p-6 transition-transform duration-300 hover:scale-105">
          <div className="flex items-center">
            <div className="p-3 bg-cyan-100 rounded-lg">
              <span className="text-cyan-600 text-2xl">📊</span>
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500">Total Feedbacks</h3>
              <p className="text-2xl font-bold text-gray-900">{stats.total_feedbacks}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 transition-transform duration-300 hover:scale-105">
          <div className="flex items-center">
            <div className="p-3 bg-emerald-100 rounded-lg">
              <span className="text-emerald-600 text-2xl">⭐</span>
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500">Average Rating</h3>
              <p className="text-2xl font-bold text-gray-900">{stats.average_rating}/5</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 transition-transform duration-300 hover:scale-105">
          <div className="flex items-center">
            <div className="p-3 bg-amber-100 rounded-lg">
              <span className="text-amber-600 text-2xl">⏰</span>
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500">Pending Reviews</h3>
              <p className="text-2xl font-bold text-gray-900">
                {stats.status_counts?.new || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 transition-transform duration-300 hover:scale-105">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-lg">
              <span className="text-purple-600 text-2xl">✅</span>
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500">Resolved Issues</h3>
              <p className="text-2xl font-bold text-gray-900">
                {stats.status_counts?.resolved || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Feedbacks */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Recent Feedbacks</h3>
            <span className="text-sm text-cyan-600 font-medium">{feedbacks.length} total</span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Phone
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rating
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {recentFeedbacks.map((feedback) => (
                  <tr key={feedback.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {feedback.phone_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <span className="text-yellow-400">★</span>
                        <span className="ml-1">{feedback.average_rating}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        feedback.status === 'new' ? 'bg-blue-100 text-blue-800' :
                        feedback.status === 'reviewed' ? 'bg-yellow-100 text-yellow-800' :
                        feedback.status === 'action_taken' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {feedback.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(feedback.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Feedback Distribution</h3>
          <div className="h-64">
            <Doughnut 
              data={{
                labels: Object.keys(stats.status_counts || {}).map(key => 
                  key.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
                ),
                datasets: [
                  {
                    data: Object.values(stats.status_counts || {}),
                    backgroundColor: [
                      '#3B82F6',
                      '#F59E0B',
                      '#10B981',
                      '#6B7280',
                    ],
                    borderWidth: 2,
                    borderColor: '#fff',
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom',
                  },
                },
                cutout: '60%',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

const ResponsesTab = ({ 
  feedbacks, 
  updateFeedbackStatus, 
  selectedFeedback, 
  setSelectedFeedback,
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  dateFilter,
  setDateFilter
}) => {
  const statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'new', label: 'New', color: 'blue' },
    { value: 'reviewed', label: 'Reviewed', color: 'yellow' },
    { value: 'action_taken', label: 'Action Taken', color: 'green' },
    { value: 'resolved', label: 'Resolved', color: 'gray' },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Feedback List */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800">All Feedback Responses</h3>
          <span className="text-sm text-cyan-600 font-medium">{feedbacks.length} results</span>
        </div>
        
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search phone or feedback..."
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-cyan-500 focus:border-cyan-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-cyan-500 focus:border-cyan-500"
            >
              {statusOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-cyan-500 focus:border-cyan-500"
            >
              <option value="all">All Dates</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>
        </div>
        
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {feedbacks.map((feedback) => (
            <div
              key={feedback.id}
              className={`p-4 border rounded-lg cursor-pointer transition-all duration-300 ${
                selectedFeedback?.id === feedback.id
                  ? 'border-cyan-400 bg-cyan-50 shadow-md'
                  : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
              }`}
              onClick={() => setSelectedFeedback(feedback)}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium text-gray-900">{feedback.phone_number}</h4>
                  <p className="text-sm text-gray-500">
                    {new Date(feedback.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-yellow-400">★</span>
                  <span className="font-medium">{feedback.average_rating}</span>
                </div>
              </div>
              <div className="mt-2">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  feedback.status === 'new' ? 'bg-blue-100 text-blue-800' :
                  feedback.status === 'reviewed' ? 'bg-yellow-100 text-yellow-800' :
                  feedback.status === 'action_taken' ? 'bg-green-100 text-green-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {feedback.status.replace('_', ' ')}
                </span>
              </div>
            </div>
          ))}
          
          {feedbacks.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No feedback found matching your criteria
            </div>
          )}
        </div>
      </div>

      {/* Feedback Detail */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Feedback Details</h3>
        {selectedFeedback ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Phone Number</label>
              <p className="mt-1 text-gray-900">{selectedFeedback.phone_number}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Average Rating</label>
              <div className="mt-1 flex items-center">
                <span className="text-yellow-400 text-xl">★</span>
                <span className="ml-1 text-gray-900 text-lg font-medium">
                  {selectedFeedback.average_rating}/5
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Status</label>
              <select
                value={selectedFeedback.status}
                onChange={(e) => updateFeedbackStatus(selectedFeedback.id, e.target.value)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm rounded-md"
              >
                {statusOptions.filter(opt => opt.value !== 'all').map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Date Submitted</label>
              <p className="mt-1 text-gray-900">
                {new Date(selectedFeedback.created_at).toLocaleString()}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Answers</label>
              <div className="mt-2 space-y-3">
                {selectedFeedback.answers?.map((answer) => (
                  <div key={answer.id} className="border-b pb-3 last:border-b-0">
                    <h4 className="font-medium text-gray-900">{answer.question_english}</h4>
                    <p className="text-sm text-gray-600">{answer.question_bangla}</p>
                    <div className="mt-1">
                      {answer.rating_value && (
                        <span className="inline-flex items-center">
                          <span className="text-yellow-400">★</span>
                          <span className="ml-1 text-gray-700">{answer.rating_value}/5</span>
                        </span>
                      )}
                      {answer.text_value && (
                        <p className="text-gray-700 mt-1 bg-gray-50 p-2 rounded">{answer.text_value}</p>
                      )}
                      {answer.yesno_value !== null && (
                        <span className="text-gray-700">
                          {answer.yesno_value ? 'Yes' : 'No'}
                        </span>
                      )}

                      {answer.date_value && ( // Add this condition
    <p className="text-gray-700 mt-1 bg-gray-50 p-2 rounded">
      📅 {new Date(answer.date_value).toLocaleDateString('en-BD', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })}
    </p>
  )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {selectedFeedback.additional_responses?.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Additional Responses</label>
                <div className="mt-2 space-y-3">
                  {selectedFeedback.additional_responses.map((response, index) => (
                    <div key={index} className="border-b pb-3 last:border-b-0">
                      <h4 className="font-medium text-gray-900 capitalize">
                        {response.question_type.replace('-', ' ')}
                      </h4>
                      <p className="text-gray-700 bg-gray-50 p-2 rounded">{response.response_text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            Select a feedback to view details
          </div>
        )}
      </div>
    </div>
  );
};

const QuestionsTab = ({ 
  questions, 
  onAddQuestion, 
  onEditQuestion, 
  onDeleteQuestion, 
  onDragEnd, 
  sensors,
  questionViewMode,
  setQuestionViewMode

}) => {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-gray-800">Question Management</h3>
       <div className="flex space-x-4">
  <button
    onClick={() => setQuestionViewMode('normal')}
    className={`px-4 py-2 rounded-lg font-medium ${questionViewMode === 'normal' ? 'bg-cyan-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
  >
    Normal
  </button>
  <button
    onClick={() => setQuestionViewMode('additional')}
    className={`px-4 py-2 rounded-lg font-medium ${questionViewMode === 'additional' ? 'bg-cyan-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
  >
    Additional
  </button>
  <button
    onClick={() => setQuestionViewMode('all')}
    className={`px-4 py-2 rounded-lg font-medium ${questionViewMode === 'all' ? 'bg-cyan-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
  >
    All
  </button>
  <button
    onClick={onAddQuestion}
    className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-emerald-600 text-white rounded-lg font-medium hover:from-cyan-700 hover:to-emerald-700 transition-colors"
  >
    Add New Question
  </button>
</div>

      </div>
      
      <div className="mb-4 p-3 bg-cyan-50 rounded-lg border border-cyan-200">
        <p className="text-sm text-cyan-800">
          <strong>Tip:</strong> Drag and drop questions to reorder them. Changes are saved automatically.

        </p>
      </div>
      
      {questions.length > 0 ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
          modifiers={[restrictToVerticalAxis, restrictToWindowEdges]}
        >
          <SortableContext items={questions.map(q => q.id)} strategy={verticalListSortingStrategy}>
            <div>
              {questions.map((question) => (
                <SortableQuestionItem
                  key={question.id}
                  id={question.id}
                  question={question}
                  onEdit={onEditQuestion}
                  onDelete={onDeleteQuestion}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div className="text-center py-8 text-gray-500">

        </div>
      )}
    </div>
  );
};

const AnalyticsTab = ({ stats }) => {
  const ratingData = {
    labels: ['1-2 Stars', '3-4 Stars', '4-5 Stars'],
    datasets: [
      {
        data: [
          stats.rating_distribution['1-2'] || 0,
          stats.rating_distribution['3-4'] || 0,
          stats.rating_distribution['4-5'] || 0,
        ],
        backgroundColor: [
          '#EF4444',
          '#F59E0B',
          '#10B981',
        ],
        borderWidth: 2,
        borderColor: '#fff',
      },
    ],
  };

  const statusData = {
    labels: stats.status_counts ? Object.keys(stats.status_counts).map(key => 
      key.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
    ) : [],
    datasets: [
      {
        data: stats.status_counts ? Object.values(stats.status_counts) : [],
        backgroundColor: [
          '#3B82F6',
          '#F59E0B',
          '#10B981',
          '#6B7280',
        ],
        borderWidth: 2,
        borderColor: '#fff',
      },
    ],
  };

  const trendData = {
    labels: stats.feedback_trend ? stats.feedback_trend.map(item => 
      new Date(item.date).toLocaleDateString()
    ) : [],
    datasets: [
      {
        label: 'Feedback Count',
        data: stats.feedback_trend ? stats.feedback_trend.map(item => item.count) : [],
        borderColor: 'rgb(6, 182, 212)',
        backgroundColor: 'rgba(6, 182, 212, 0.1)',
        tension: 0.3,
        fill: true,
      },
    ],
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Rating Distribution */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Rating Distribution</h3>
          <div className="h-64">
            <Doughnut 
              data={ratingData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom',
                  },
                },
                cutout: '60%',
              }}
            />
          </div>
        </div>

        {/* Status Distribution */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Status Distribution</h3>
          <div className="h-64">
            <Pie 
              data={statusData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom',
                  },
                },
                cutout: '60%',
              }}
            />
          </div>
        </div>
      </div>

      {/* Feedback Trend */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Feedback Trend</h3>
        <div className="h-64">
          <Line 
            data={trendData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  position: 'bottom',
                },
              },
              scales: {
                y: {
                  beginAtZero: true,
                  ticks: {
                    stepSize: 1,
                  },
                },
              },
            }}
          />
        </div>
      </div>

      {/* Question Statistics */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Question Statistics</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Question
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Average Rating
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Responses
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {stats.question_stats.map((stat, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {stat.id_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center">
                      <span className="text-yellow-400">★</span>
                      <span className="ml-1">{stat.average_rating}/5</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {stat.response_count}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};