import { create } from 'zustand';
import api from '../../../api/axios';

const useAuthStore = create((set, get) => ({
  user: null,
  isAuthenticated: false,
  isInitialized: false,
  isLoading: false,
  error: null,

  // Initialize Auth (Call /me to check if session is active)
  initializeAuth: async () => {
    if (get().isInitialized) return;

    set({ isLoading: true });
    try {
      const response = await api.get('/auth/me');
      set({
        user: response.data.data.user,
        isAuthenticated: true,
        isInitialized: true,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      // If /me fails, it might be an expired access token.
      // We will attempt to refresh the session.
      try {
        const refreshResponse = await api.post('/auth/refresh');
        
        // If refresh succeeds, retry /me
        if (refreshResponse.status === 200) {
          const retryResponse = await api.get('/auth/me');
          set({
            user: retryResponse.data.data.user,
            isAuthenticated: true,
            isInitialized: true,
            isLoading: false,
            error: null,
          });
        }
      } catch (refreshError) {
        // Refresh failed (e.g. revoked, expired, no token)
        set({
          user: null,
          isAuthenticated: false,
          isInitialized: true,
          isLoading: false,
        });
      }
    }
  },

  // Login
  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/auth/login', { email, password });
      set({
        user: response.data.data.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
      return { success: true };
    } catch (error) {
      set({
        isLoading: false,
        error: error.response?.data?.error?.message || 'Login failed',
      });
      return { success: false, error: error.response?.data?.error?.message };
    }
  },

  // Logout
  logout: async () => {
    set({ isLoading: true });
    try {
      await api.post('/auth/logout');
    } catch (error) {
      // We still clear local state even if server logout fails
      console.error('Logout API failed', error);
    } finally {
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    }
  },
  
  // Set explicit error
  setError: (error) => set({ error }),
}));

export default useAuthStore;
