import { apiClient } from '../lib/api.client.js';

export const getDepartments = async (params = {}) => {
  const response = await apiClient.get('/departments', { params });
  return {
    data: response.data.data,
    pagination: response.data.pagination,
  };
};

export const getDepartmentById = async (id) => {
  const response = await apiClient.get(`/departments/${id}`);
  return response.data.data;
};

export const createDepartment = async (data) => {
  const response = await apiClient.post('/departments', data);
  return response.data.data;
};

export const updateDepartment = async (id, data) => {
  const response = await apiClient.put(`/departments/${id}`, data);
  return response.data.data;
};

export const deleteDepartment = async (id) => {
  const response = await apiClient.delete(`/departments/${id}`);
  return response.data;
};
