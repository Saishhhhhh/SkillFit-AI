import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add response interceptor for easier error handling
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error("API Error:", error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export const endpoints = {
  uploadResume: '/profile/upload',
  confirmSkills: '/profile/embed',
  searchJobs: '/jobs/search',
  getStatus: (taskId) => `/jobs/status/${taskId}`,
  getResults: (taskId) => `/jobs/results/${taskId}`,
  getAnalytics: (taskId) => `/jobs/analytics/${taskId}`,
  simulate: (searchId) => `/jobs/simulate/${searchId}`,
  getHistoryProfiles: '/history/profiles',
  getProfileSearches: (profileId) => `/history/profiles/${profileId}/searches`,
  deleteProfile: (id) => `/history/profiles/${id}`,
  deleteSearch: (id) => `/history/searches/${id}`,
};

export default api;
