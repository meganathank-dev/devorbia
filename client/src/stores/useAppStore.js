import { create } from 'zustand';

const useAppStore = create((set) => ({
  isSidebarOpen: false,
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  
  // Future state for Phase 1+
  // user: null,
  // organization: null,
}));

export default useAppStore;
