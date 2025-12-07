import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useSocket } from '../../contexts/SocketContext.jsx';
import { VideoUpload } from '../VideoUpload/VideoUpload.jsx';
import { VideoLibrary } from '../VideoLibrary/VideoLibrary.jsx';
import api from '../../services/api.js';
import { 
  LayoutDashboard, 
  Activity, 
  CheckCircle, 
  AlertTriangle, 
  LogOut,
  Wifi,
  WifiOff,
  User
} from 'lucide-react';
import { cn } from '../../lib/utils.js';

function StatsCard({ title, value, icon: Icon, className, iconColor }) {
  return (
    <div className={cn("bg-white rounded-xl border border-gray-100 p-6 shadow-sm transition-all hover:shadow-md", className)}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
        </div>
        <div className={cn("p-3 rounded-full bg-opacity-10", iconColor)}>
          <Icon className={cn("w-6 h-6", iconColor.replace('bg-', 'text-'))} />
        </div>
      </div>
    </div>
  );
}

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
      socket.on('video:processing', fetchStats);
      socket.on('video:completed', fetchStats);

      return () => {
        socket.off('video:processing', fetchStats);
        socket.off('video:completed', fetchStats);
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
    <div className="min-h-screen bg-gray-50/50">
      {/* Top Navigation */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-600 p-2 rounded-lg">
                <LayoutDashboard className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">Pulse <span className="text-indigo-600 hidden md:block">Video</span></h1>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-50 border border-gray-200">
                {connected ? (
                  <Wifi className="w-4 h-4 text-green-500" />
                ) : (
                  <WifiOff className="w-4 h-4 text-red-500" />
                )}
                <span className={cn("text-xs font-medium", connected ? "text-green-700" : "text-red-700")}>
                  {connected ? 'System Online' : 'Disconnected'}
                </span>
              </div>

              <div className="h-6 w-px bg-gray-200" />

              <div className="flex items-center gap-4">
                <div className="text-right hidden sm:block">
                  <div className="text-sm font-medium text-gray-900">{user?.email}</div>
                  <div className="text-xs text-gray-500 capitalize">{user?.role}</div>
                </div>
                <div className="bg-gray-100 p-2 rounded-full">
                  <User className="w-5 h-5 text-gray-600" />
                </div>
                <button
                  onClick={logout}
                  className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard 
            title="Total Videos" 
            value={stats.total} 
            icon={LayoutDashboard}
            iconColor="bg-gray-100 text-gray-600"
          />
          <StatsCard 
            title="Processing" 
            value={stats.processing} 
            icon={Activity}
            iconColor="bg-blue-100 text-blue-600"
          />
          <StatsCard 
            title="Completed" 
            value={stats.completed} 
            icon={CheckCircle}
            iconColor="bg-green-100 text-green-600"
          />
          <StatsCard 
            title="Flagged Content" 
            value={stats.flagged} 
            icon={AlertTriangle}
            iconColor="bg-red-100 text-red-600"
          />
        </div>

        <div className="space-y-8">
          {(user?.role === 'editor' || user?.role === 'admin') && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Upload New Content</h2>
              </div>
              <VideoUpload />
            </section>
          )}

          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Recent Videos</h2>
            </div>
            <VideoLibrary />
          </section>
        </div>
      </main>
    </div>
  );
}
