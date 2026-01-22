import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../utils/axios';

const ReportProblem = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    type: 'problem',
    subject: '',
    message: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
    setMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    if (!formData.message.trim()) {
      setError('Please provide a message');
      setLoading(false);
      return;
    }

    try {
      await api.post('/users/report', formData);
      setMessage('Thank you for your report! We will review it and get back to you if needed.');
      setFormData({
        type: 'problem',
        subject: '',
        message: ''
      });
      // Redirect after 2 seconds
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Error submitting report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-mesh-gradient">
      {/* Ambient Orbs */}
      <div className="ambient-orb-1"></div>
      <div className="ambient-orb-2"></div>
      <div className="ambient-orb-3"></div>

      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="glass-card bg-white/60 backdrop-blur-xl border border-white/40 rounded-3xl shadow-2xl p-6 sm:p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Report a Problem or Send Feedback</h1>
          <p className="text-gray-600 mb-6">Help us improve by reporting issues or sharing your feedback</p>

          {error && (
            <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          {message && (
            <div className="bg-green-50 border border-green-400 text-green-700 px-4 py-3 rounded-lg mb-4">
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-gray-700 font-semibold mb-2">
                Type *
              </label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                required
              >
                <option value="problem">Report a Problem</option>
                <option value="survey">Survey Response</option>
                <option value="feedback">General Feedback</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-2">
                Subject (Optional)
              </label>
              <input
                type="text"
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                placeholder="Brief description of your report..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-2">
                Message *
              </label>
              <textarea
                name="message"
                value={formData.message}
                onChange={handleChange}
                placeholder="Please describe the problem, provide feedback, or share your thoughts..."
                rows={8}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white resize-none"
                required
              />
            </div>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-6 rounded-lg transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !formData.message.trim()}
                className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ReportProblem;
