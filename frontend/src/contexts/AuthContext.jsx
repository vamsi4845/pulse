import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      const storedUser = localStorage.getItem('user');
      
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
          await verifyToken();
        } catch (error) {
          console.error('Token verification failed:', error);
          localStorage.removeItem('user');
          setUser(null);
        }
      } else {
        try {
          await verifyToken();
        } catch (error) {
          setUser(null);
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const verifyToken = async () => {
    try {
      const response = await api.get('/auth/me');
      const userData = response.data.data.user;
      const normalizedUser = {
        id: userData._id || userData.id,
        email: userData.email,
        role: userData.role,
        organizationId: userData.organizationId?._id || userData.organizationId,
      };
      setUser(normalizedUser);
      localStorage.setItem('user', JSON.stringify(normalizedUser));
      return normalizedUser;
    } catch (error) {
      throw error;
    }
  };

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { user: userData } = response.data.data;
      
      const normalizedUser = {
        id: userData.id || userData._id,
        email: userData.email,
        role: userData.role,
        organizationId: userData.organizationId?._id || userData.organizationId,
      };
      
      localStorage.setItem('user', JSON.stringify(normalizedUser));
      setUser(normalizedUser);
      setLoading(false);
      
      return { user: normalizedUser };
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const register = async (email, password, role, organizationName) => {
    try {
      const response = await api.post('/auth/register', {
        email,
        password,
        role,
        organizationName,
      });
      const { user: userData } = response.data.data;
      
      const normalizedUser = {
        id: userData.id || userData._id,
        email: userData.email,
        role: userData.role,
        organizationId: userData.organizationId?._id || userData.organizationId,
      };
      
      localStorage.setItem('user', JSON.stringify(normalizedUser));
      setUser(normalizedUser);
      setLoading(false);
      
      return { user: normalizedUser };
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('user');
      setUser(null);
    }
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

