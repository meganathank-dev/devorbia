import { create } from 'zustand';
import { read, send, onUnauthorized } from '../api/client';
export const useAuth = create(set => ({
  user: null,
  employee: null,
  loading: true,
  async initialize() {
    try {
      const data = await read('/auth/me');
      set({
        ...data,
        loading: false
      });
    } catch {
      set({
        user: null,
        employee: null,
        loading: false
      });
    }
  },
  async login(values) {
    const data = await send('post', '/auth/login', values);
    set({
      user: data.user,
      loading: false
    });
    const profile = await read('/auth/me');
    set(profile);
  },
  async logout() {
    await send('post', '/auth/logout');
    set({
      user: null,
      employee: null
    });
  }
}));
onUnauthorized(() => useAuth.setState({
  user: null,
  employee: null,
  loading: false
}));
export const useUI = create(set => ({
  revision: 0,
  toasts: [],
  refresh: () => set(s => ({
    revision: s.revision + 1
  })),
  toast: (message, type = 'success') => {
    const id = crypto.randomUUID();
    set(s => ({
      toasts: [...s.toasts, {
        id,
        message,
        type
      }]
    }));
    setTimeout(() => set(s => ({
      toasts: s.toasts.filter(t => t.id !== id)
    })), 6000);
  },
  dismiss: id => set(s => ({
    toasts: s.toasts.filter(t => t.id !== id)
  }))
}));
