import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api.js';
import { API_URL } from '../../utils/constants.js';

export function VideoPlayer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const videoRef = useRef(null);

  useEffect(() => {
    fetchVideo();
  }, [id]);

  const fetchVideo = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/videos/${id}`);
      setVideo(response.data.data.video);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load video');
    } finally {
      setLoading(false);
    }
  };

  const getStreamUrl = () => {
    if (!video) return '';
    return `${API_URL}/videos/${id}/stream`;
  };

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="text-center text-gray-600">Loading video...</div>
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error || 'Video not found'}
        </div>
        <button
          onClick={() => navigate('/dashboard')}
          className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  if (video.status !== 'completed') {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded mb-4">
          Video is still processing. Status: {video.status}
        </div>
        <button
          onClick={() => navigate('/dashboard')}
          className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="mb-4">
        <button
          onClick={() => navigate('/dashboard')}
          className="text-indigo-600 hover:text-indigo-800 mb-4"
        >
          ← Back to Dashboard
        </button>
        <h2 className="text-xl font-semibold">{video.originalName}</h2>
        <div className="mt-2 flex space-x-4 text-sm text-gray-600">
          <span>Status: {video.status}</span>
          {video.sensitivityStatus && (
            <span>Sensitivity: {video.sensitivityStatus}</span>
          )}
        </div>
      </div>

      <div className="w-full">
        <video
          ref={videoRef}
          controls
          className="w-full rounded-lg"
          style={{ maxHeight: '70vh' }}
        >
          <source src={getStreamUrl()} type={video.mimeType} />
          Your browser does not support the video tag.
        </video>
      </div>
    </div>
  );
}

