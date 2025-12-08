import { useState, useEffect } from 'react';
import { useVideos } from '../../hooks/useVideos.js';
import { Link } from 'react-router-dom';
import { VIDEO_STATUS, SENSITIVITY_STATUS } from '../../utils/constants.js';
import { 
  Search, 
  Filter, 
  Play, 
  FileVideo, 
  AlertOctagon, 
  ChevronLeft, 
  ChevronRight,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import { cn } from '../../lib/utils.js';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select.jsx';

const StatusBadge = ({ status, type = 'status' }) => {
  const styles = {
    uploading: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    processing: 'bg-blue-50 text-blue-700 border-blue-200',
    completed: 'bg-green-50 text-green-700 border-green-200',
    failed: 'bg-red-50 text-red-700 border-red-200',
    safe: 'bg-green-50 text-green-700 border-green-200',
    flagged: 'bg-red-50 text-red-700 border-red-200',
  };

  const icons = {
    uploading: Clock,
    processing: Clock,
    completed: CheckCircle2,
    failed: XCircle,
    safe: CheckCircle2,
    flagged: AlertTriangle,
  };

  const Icon = icons[status] || Clock;
  const style = styles[status] || 'bg-gray-50 text-gray-700 border-gray-200';

  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border",
      style
    )}>
      <Icon className="w-3.5 h-3.5" />
      <span className="capitalize">{status}</span>
    </span>
  );
};

export function VideoLibrary() {
  const [filters, setFilters] = useState({
    status: '',
    sensitivityStatus: '',
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const { videos, loading, error, pagination, fetchVideos } = useVideos(filters, page);

  useEffect(() => {
    setPage(1);
  }, [filters.status, filters.sensitivityStatus]);

  const filteredVideos = videos.filter((video) => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        video.originalName.toLowerCase().includes(searchLower) ||
        video.filename.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col">
      <div className="p-6 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-gray-900">Video Library</h2>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search videos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-64 pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>
          
          <div className="flex gap-2">
            <Select
              value={filters.status || 'all'}
              onValueChange={(value) => {
                setFilters({ ...filters, status: value === 'all' ? '' : value });
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[140px] pl-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value={VIDEO_STATUS.UPLOADING}>Uploading</SelectItem>
                <SelectItem value={VIDEO_STATUS.PROCESSING}>Processing</SelectItem>
                <SelectItem value={VIDEO_STATUS.COMPLETED}>Completed</SelectItem>
                <SelectItem value={VIDEO_STATUS.FAILED}>Failed</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.sensitivityStatus || 'all'}
              onValueChange={(value) => {
                setFilters({ ...filters, sensitivityStatus: value === 'all' ? '' : value });
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sensitivity</SelectItem>
                <SelectItem value={SENSITIVITY_STATUS.SAFE}>Safe</SelectItem>
                <SelectItem value={SENSITIVITY_STATUS.FLAGGED}>Flagged</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {error && (
        <div className="m-6 bg-red-50 border border-red-100 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertOctagon className="w-5 h-5" />
          {error}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-200">
              <th className="px-6 py-4 font-medium text-gray-500">Name</th>
              <th className="px-6 py-4 font-medium text-gray-500">Status</th>
              <th className="px-6 py-4 font-medium text-gray-500">Sensitivity</th>
              <th className="px-6 py-4 font-medium text-gray-500">Size</th>
              <th className="px-6 py-4 font-medium text-gray-500">Date</th>
              <th className="px-6 py-4 font-medium text-gray-500 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    <p>Loading library...</p>
                  </div>
                </td>
              </tr>
            ) : filteredVideos.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-6 py-16 text-center text-gray-500">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                      <FileVideo className="w-6 h-6 text-gray-400" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">No videos found</p>
                      <p className="text-sm text-gray-500 mt-1">Upload a video to get started</p>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              filteredVideos.map((video) => (
                <tr key={video._id} className="hover:bg-gray-50/80 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-indigo-50 rounded flex items-center justify-center flex-shrink-0">
                        <FileVideo className="w-4 h-4 text-indigo-600" />
                      </div>
                      <div className="font-medium text-gray-900 truncate max-w-[200px]" title={video.originalName}>
                        {video.originalName}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={video.status} />
                  </td>
                  <td className="px-6 py-4">
                    {video.sensitivityStatus ? (
                      <StatusBadge status={video.sensitivityStatus} type="sensitivity" />
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-gray-500 font-mono text-xs">
                    {formatFileSize(video.size)}
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    {new Date(video.createdAt).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {video.status === VIDEO_STATUS.COMPLETED && (
                      <Link
                        to={`/videos/${video._id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                      >
                        <Play className="w-3.5 h-3.5" />
                        View
                      </Link>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination.pages > 1 && (
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50/30 rounded-b-xl">
          <div className="text-sm text-gray-500">
            Page <span className="font-medium text-gray-900">{pagination.page}</span> of <span className="font-medium text-gray-900">{pagination.pages}</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="p-2 border border-gray-200 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage(pagination.page + 1)}
              disabled={pagination.page === pagination.pages}
              className="p-2 border border-gray-200 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
