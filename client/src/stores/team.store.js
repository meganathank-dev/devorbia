import { create } from 'zustand';
import * as teamService from '../services/team.service.js';

export const useTeamStore = create((set) => ({
  teams: [],
  pagination: null,
  selectedTeam: null,
  isLoading: false,
  error: null,

  fetchTeams: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const result = await teamService.getTeams(params);
      set({
        teams: result.data,
        pagination: result.pagination,
        isLoading: false
      });
    } catch (error) {
      set({
        error: error.message || 'Failed to fetch teams',
        isLoading: false
      });
    }
  },

  fetchTeamById: async (id) => {
    set({ isLoading: true, error: null, selectedTeam: null });
    try {
      const team = await teamService.getTeamById(id);
      set({ selectedTeam: team, isLoading: false });
    } catch (error) {
      set({
        error: error.message || 'Failed to fetch team',
        isLoading: false
      });
    }
  },

  createTeam: async (data) => {
    set({ isLoading: true, error: null });
    try {
      await teamService.createTeam(data);
      set({ isLoading: false });
      return true;
    } catch (error) {
      set({
        error: error.message || 'Failed to create team',
        isLoading: false
      });
      return false;
    }
  },

  updateTeam: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      await teamService.updateTeam(id, data);
      set({ isLoading: false });
      return true;
    } catch (error) {
      set({
        error: error.message || 'Failed to update team',
        isLoading: false
      });
      return false;
    }
  },

  deleteTeam: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await teamService.deleteTeam(id);
      set({ isLoading: false });
      return true;
    } catch (error) {
      set({
        error: error.message || 'Failed to delete team',
        isLoading: false
      });
      return false;
    }
  },

  clearTeams: () => {
    set({
      teams: [],
      pagination: null,
      selectedTeam: null,
      error: null
    });
  },

  clearError: () => {
    set({ error: null });
  },
}));
