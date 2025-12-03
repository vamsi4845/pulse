import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useSocket } from '../../contexts/SocketContext.jsx';
import { VideoUpload } from '../VideoUpload/VideoUpload.jsx';
import { VideoLibrary } from '../VideoLibrary/VideoLibrary.jsx';
import { Link } from 'react-router-dom';
import api from '../../services/api.js';

export function Dashboard() {
  const { user, logout } = useAuth();
  const { socket, connected } = useSocket();
  const [stats, setStats] = useState({
    total: 0,
    processing: 0,
    completed: 0,
    flagged: 0,
  });

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    if (socket) {
      socket.on('video:processing', () => {
        fetchStats();
      });

      socket.on('video:completed', () => {
        fetchStats();
      });

      return () => {
        socket.off('video:processing');
        socket.off('video:completed');
      };
    }
  }, [socket]);

  const fetchStats = async () => {
    try {
      const [allResponse, processingResponse, completedResponse, flaggedResponse] =
        await Promise.all([
          api.get('/videos?limit=1'),
          api.get('/videos?status=processing&limit=1'),
          api.get('/videos?status=completed&limit=1'),
          api.get('/videos?sensitivityStatus=flagged&limit=1'),
        ]);

      setStats({
        total: allResponse.data.data.pagination.total,
        processing: processingResponse.data.data.pagination.total,
        completed: completedResponse.data.data.pagination.total,
        flagged: flaggedResponse.data.data.pagination.total,
      });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold">Video Processing App</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    connected ? 'bg-green-500' : 'bg-red-500'
                  }`}
                />
                <span className="text-sm text-gray-600">
                  {connected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              <div className="text-sm text-gray-700">
                {user?.email} ({user?.role})
              </div>
              <button
                onClick={logout}
                className="px-4 py-2 text-sm text-white bg-indigo-600 rounded hover:bg-indigo-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="text-2xl font-bold text-gray-900">
                      {stats.total}
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Total Videos
                      </dt>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="text-2xl font-bold text-blue-600">
                      {stats.processing}
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Processing
                      </dt>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="text-2xl font-bold text-green-600">
                      {stats.completed}
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Completed
                      </dt>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="text-2xl font-bold text-red-600">
                      {stats.flagged}
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Flagged
                      </dt>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {(user?.role === 'editor' || user?.role === 'admin') && (
            <div className="mb-6">
              <VideoUpload />
            </div>
          )}

          <VideoLibrary />
        </div>
      </main>
    </div>
  );
}

