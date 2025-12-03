import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api.js';
import { API_URL } from '../../utils/constants.js';
import { ArrowLeft, AlertTriangle, ShieldCheck, ShieldAlert, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils.js';

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
    if (video.streamUrl) {
      return video.streamUrl;
    }
    return `${API_URL}/videos/${id}/stream`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          <p className="text-gray-500 font-medium">Loading video player...</p>
        </div>
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 max-w-md w-full text-center">
          <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-6 h-6 text-red-500" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Video Not Found</h2>
          <p className="text-gray-500 mb-6">{error || "The video you're looking for doesn't exist or has been removed."}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-gray-600 hover:text-indigo-600 transition-colors group font-medium"
          >
            <div className="p-2 bg-white rounded-lg border border-gray-200 group-hover:border-indigo-200 shadow-sm transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </div>
            Back to Dashboard
          </button>
        </div>

        <div className="space-y-6">
          {/* Video Player Container */}
          <div className="bg-black rounded-2xl overflow-hidden shadow-xl ring-1 ring-black/5 aspect-video relative group">
            <video
              ref={videoRef}
              controls
              className="w-full h-full object-contain"
              poster={video.thumbnailUrl} 
            >
              <source src={getStreamUrl()} type={video.mimeType} />
              Your browser does not support the video tag.
            </video>
          </div>

          {/* Video Details Card */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-gray-900 leading-tight">
                  {video.originalName}
                </h1>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span className="flex items-center gap-1.5">
                     Date: {new Date(video.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                  </span>
                  <span>•</span>
                  <span>Size: {(video.size / (1024 * 1024)).toFixed(2)} MB</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className={cn(
                  "px-4 py-2 rounded-lg flex items-center gap-2 border",
                  video.status === 'completed' 
                    ? "bg-green-50 text-green-700 border-green-100" 
                    : "bg-yellow-50 text-yellow-700 border-yellow-100"
                )}>
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    video.status === 'completed' ? "bg-green-500" : "bg-yellow-500"
                  )} />
                  <span className="text-sm font-medium capitalize">{video.status}</span>
                </div>

                {video.sensitivityStatus && (
                  <div className={cn(
                    "px-4 py-2 rounded-lg flex items-center gap-2 border",
                    video.sensitivityStatus === 'safe'
                      ? "bg-blue-50 text-blue-700 border-blue-100"
                      : "bg-red-50 text-red-700 border-red-100"
                  )}>
                    {video.sensitivityStatus === 'safe' ? (
                      <ShieldCheck className="w-4 h-4" />
                    ) : (
                      <ShieldAlert className="w-4 h-4" />
                    )}
                    <span className="text-sm font-medium capitalize">{video.sensitivityStatus}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
