import axios from 'axios';
export const api = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
  timeout: 20000,
  headers: {
    'X-Requested-With': 'DevOrbia'
  }
});
let refreshing,
  unauthorized = () => {};
export const onUnauthorized = callback => {
  unauthorized = callback;
};
const csrf = () => document.cookie.split('; ').find(x => x.startsWith('do_csrf='))?.slice('do_csrf='.length);
api.interceptors.request.use(config => {
  const token = csrf();
  if (token) config.headers['X-CSRF-Token'] = decodeURIComponent(token);
  return config;
});
api.interceptors.response.use(response => response, error => {
  const config = error.config;
  if (error.response?.status === 401 && config && !config._retry && (!config.url.startsWith('/auth/') || config.url === '/auth/me' || config.url === '/auth/logout')) {
    config._retry = true;
    refreshing ||= axios.post('/api/v1/auth/refresh', {}, {
      withCredentials: true,
      headers: {
        'X-Requested-With': 'DevOrbia'
      },
      timeout: 15000
    }).finally(() => {
      refreshing = null;
    });
    return refreshing.catch(refreshError => {
      unauthorized();
      throw refreshError;
    }).then(() => api(config));
  }
  return Promise.reject(error);
});
export const read = async (url, params = {}, signal) => (await api.get(url, {
  params,
  signal
})).data.data;
export const send = async (method, url, data = {}) => (await api.request({
  method,
  url,
  data
})).data.data;
export const errorMessage = error => error?.response?.data?.error?.details?.map(d => `${d.field}: ${d.message}`).join(' · ') || error?.response?.data?.error?.message || (error?.code === 'ECONNABORTED' ? 'The request timed out. Please try again.' : 'Could not reach DevOrbia. Check that the API is running.');
