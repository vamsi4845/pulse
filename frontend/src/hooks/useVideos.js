import { useState, useEffect } from 'react';
import api from '../services/api.js';

export function useVideos(filters = {}) {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });

  const fetchVideos = async (page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
        ...filters,
      });
      
      const response = await api.get(`/videos?${params}`);
      setVideos(response.data.data.videos);
      setPagination(response.data.data.pagination);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch videos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos(pagination.page);
  }, [filters.status, filters.sensitivityStatus]);

  const refresh = () => {
    fetchVideos(pagination.page);
  };

  return {
    videos,
    loading,
    error,
    pagination,
    fetchVideos,
    refresh,
  };
}

