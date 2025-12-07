import { useQuery } from '@tanstack/react-query';
import api from '../services/api.js';

export function useVideos(filters = {}, page = 1, limit = 10) {
  const queryKey = ['videos', { ...filters, page, limit }];

  const { data, isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== '')
        ),
      });
      
      const response = await api.get(`/videos?${params}`);
      return response.data.data;
    },
  });

  return {
    videos: data?.videos || [],
    loading: isLoading,
    error: error?.response?.data?.error || (error ? 'Failed to fetch videos' : null),
    pagination: data?.pagination || {
      page: 1,
      limit: 10,
      total: 0,
      pages: 0,
    },
    fetchVideos: (newPage) => {
      refetch();
    },
    refresh: refetch,
  };
}

