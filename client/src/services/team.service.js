import { apiClient } from '../lib/api.client.js';

export const getTeams = async (params = {}) => {
  const response = await apiClient.get('/teams', { params });
  return {
    data: response.data.data,
    pagination: response.data.pagination,
  };
};

export const getTeamById = async (id) => {
  const response = await apiClient.get(`/teams/${id}`);
  return response.data.data;
};

export const createTeam = async (data) => {
  const response = await apiClient.post('/teams', data);
  return response.data.data;
};

export const updateTeam = async (id, data) => {
  const response = await apiClient.put(`/teams/${id}`, data);
  return response.data.data;
};

export const deleteTeam = async (id) => {
  const response = await apiClient.delete(`/teams/${id}`);
  return response.data;
};
