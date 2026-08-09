import { create } from 'zustand';
import * as departmentService from '../services/department.service.js';

export const useDepartmentStore = create((set) => ({
  departments: [],
  pagination: null,
  selectedDepartment: null,
  isLoading: false,
  error: null,

  fetchDepartments: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const result = await departmentService.getDepartments(params);
      set({
        departments: result.data,
        pagination: result.pagination,
        isLoading: false
      });
    } catch (error) {
      set({
        error: error.message || 'Failed to fetch departments',
        isLoading: false
      });
    }
  },

  fetchDepartmentById: async (id) => {
    set({ isLoading: true, error: null, selectedDepartment: null });
    try {
      const department = await departmentService.getDepartmentById(id);
      set({ selectedDepartment: department, isLoading: false });
    } catch (error) {
      set({
        error: error.message || 'Failed to fetch department',
        isLoading: false
      });
    }
  },

  createDepartment: async (data) => {
    set({ isLoading: true, error: null });
    try {
      await departmentService.createDepartment(data);
      set({ isLoading: false });
      return true;
    } catch (error) {
      set({
        error: error.message || 'Failed to create department',
        isLoading: false
      });
      return false;
    }
  },

  updateDepartment: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      await departmentService.updateDepartment(id, data);
      set({ isLoading: false });
      return true;
    } catch (error) {
      set({
        error: error.message || 'Failed to update department',
        isLoading: false
      });
      return false;
    }
  },

  deleteDepartment: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await departmentService.deleteDepartment(id);
      set({ isLoading: false });
      return true;
    } catch (error) {
      set({
        error: error.message || 'Failed to delete department',
        isLoading: false
      });
      return false;
    }
  },

  clearDepartments: () => {
    set({
      departments: [],
      pagination: null,
      selectedDepartment: null,
      error: null
    });
  },

  clearError: () => {
    set({ error: null });
  },
}));
