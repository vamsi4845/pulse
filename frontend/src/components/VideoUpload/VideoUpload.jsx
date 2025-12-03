import { useState, useRef, useCallback } from 'react';
import { useSocket } from '../../contexts/SocketContext.jsx';
import { useAuth } from '../../contexts/AuthContext.jsx';
import api from '../../services/api.js';
import { UploadCloud, FileVideo, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils.js';

export function VideoUpload() {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [currentVideoId, setCurrentVideoId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileInputRef = useRef(null);
  const { socket } = useSocket();
  const { user } = useAuth();

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = async (file) => {
    if (!file.type.startsWith('video/')) {
      setError('Please select a valid video file');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setError('File size must be less than 50MB');
      return;
    }

    setError('');
    setSuccess('');
    setUploading(true);
    setUploadProgress(0);
    setProcessingProgress(0);

    const formData = new FormData();
    formData.append('video', file);

    try {
      const response = await api.post('/videos/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setUploadProgress(percentCompleted);
        },
      });

      const videoId = response.data.data.video._id;
      setCurrentVideoId(videoId);

      if (socket) {
        const processingHandler = (data) => {
          if (data.videoId === videoId) {
            setProcessingProgress(data.progress);
          }
        };

        const completedHandler = (data) => {
          if (data.videoId === videoId) {
            setUploading(false);
            setSuccess('Video uploaded and processed successfully!');
            setProcessingProgress(100);
            
            // Clean up listeners
            socket.off('video:processing', processingHandler);
            socket.off('video:completed', completedHandler);
            socket.off('video:failed', failedHandler);

            setTimeout(() => {
              setSuccess('');
              setUploadProgress(0);
              setProcessingProgress(0);
              setCurrentVideoId(null);
            }, 3000);
          }
        };

        const failedHandler = (data) => {
          if (data.videoId === videoId) {
            setUploading(false);
            setError('Video processing failed');
            setUploadProgress(0);
            setProcessingProgress(0);
            setCurrentVideoId(null);
            
            // Clean up listeners
            socket.off('video:processing', processingHandler);
            socket.off('video:completed', completedHandler);
            socket.off('video:failed', failedHandler);
          }
        };

        socket.on('video:processing', processingHandler);
        socket.on('video:completed', completedHandler);
        socket.on('video:failed', failedHandler);
      }
    } catch (err) {
      setUploading(false);
      setError(err.response?.data?.error || 'Upload failed');
      setUploadProgress(0);
      setProcessingProgress(0);
    }
  };

  if (!user || (user.role !== 'editor' && user.role !== 'admin')) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-6">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-lg flex items-center gap-3 text-red-700">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-100 rounded-lg flex items-center gap-3 text-green-700">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium">{success}</p>
          </div>
        )}

        {!uploading ? (
          <div
            className={cn(
              "relative border-2 border-dashed rounded-xl p-12 transition-all duration-200 ease-in-out text-center cursor-pointer group",
              dragActive
                ? "border-indigo-500 bg-indigo-50/50"
                : "border-gray-200 hover:border-indigo-400 hover:bg-gray-50"
            )}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            <div className="flex flex-col items-center gap-4">
              <div className={cn(
                "p-4 rounded-full transition-colors",
                dragActive ? "bg-indigo-100 text-indigo-600" : "bg-gray-100 text-gray-500 group-hover:bg-indigo-50 group-hover:text-indigo-600"
              )}>
                <UploadCloud className="w-8 h-8" />
              </div>
              <div>
                <p className="text-lg font-semibold text-gray-900">
                  Click to upload or drag and drop
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  MP4, WebM or Ogg (max. 50MB)
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6 py-8">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mb-4 relative">
                 <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                {uploadProgress < 100 ? 'Uploading Video...' : 'Processing Video...'}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Please don't close this page
              </p>
            </div>

            <div className="space-y-4 max-w-md mx-auto">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 font-medium">Upload</span>
                  <span className="text-gray-900 font-bold">{uploadProgress}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-indigo-600 transition-all duration-300 ease-out rounded-full"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>

              {uploadProgress === 100 && (
                 <div className="space-y-2">
                   <div className="flex justify-between text-sm">
                     <span className="text-gray-600 font-medium">Processing</span>
                     <span className="text-gray-900 font-bold">{processingProgress}%</span>
                   </div>
                   <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                     <div 
                       className="h-full bg-green-500 transition-all duration-300 ease-out rounded-full"
                       style={{ width: `${processingProgress}%` }}
                     />
                   </div>
                 </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
