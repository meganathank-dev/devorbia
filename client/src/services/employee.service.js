import { apiClient } from '../lib/api.client.js';

export const getEmployees = async (params = {}) => {
  const response = await apiClient.get('/employees', { params });
  return {
    data: response.data.data,
    pagination: response.data.pagination,
  };
};

export const getEmployeeById = async (id) => {
  const response = await apiClient.get(`/employees/${id}`);
  return response.data.data;
};

export const createEmployee = async (data) => {
  const response = await apiClient.post('/employees', data);
  return response.data.data;
};

export const assignEmployee = async (id, data) => {
  const response = await apiClient.patch(`/employees/${id}/assign`, data);
  return response.data;
};
