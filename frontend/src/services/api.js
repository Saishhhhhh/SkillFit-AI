import axios from 'axios';

const api = axios.create({
  // If running in desktop app (same origin), use relative path
  // If running in Vite dev (localhost:5173), point to localhost:8000
  baseURL: import.meta.env.MODE === 'production' ? '/api/v1' : 'http://localhost:8000/api/v1',
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
  
  // GenAI
  suggestRoles: '/genai/suggest-roles',
  generateRoadmap: '/genai/roadmap',
  suggestPivot: '/genai/pivot',
};

export default api;
