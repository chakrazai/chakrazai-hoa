import { create } from 'zustand';
import { authAPI } from '../lib/api';

export const useAuthStore = create((set) => ({
  user: null,
  token: localStorage.getItem('hoa_token'),
  loading: false,
  error: null,

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const res = await authAPI.login(email, password);
      const { token, user } = res.data;
      localStorage.setItem('hoa_token', token);
      set({ token, user, loading: false });
      return true;
    } catch (err) {
      set({ error: err.response?.data?.message || 'Login failed', loading: false });
      return false;
    }
  },

  logout: () => {
    localStorage.removeItem('hoa_token');
    set({ user: null, token: null });
    window.location.href = '/login';
  },

  fetchMe: async () => {
    try {
      const res = await authAPI.me();
      set({ user: res.data });
    } catch {
      localStorage.removeItem('hoa_token');
      set({ token: null });
    }
  },
}));

export const useCommunityStore = create((set) => ({
  activeCommunityId: null,
  setActiveCommunity: (id) => set({ activeCommunityId: id }),
}));
