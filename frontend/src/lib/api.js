import axios from 'axios';

// This grabs the VITE_API_URL from our .env file.
// If it's not set, it defaults to localhost for local testing.
const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const api = axios.create({
  baseURL,
});

// We can add interceptors here later if we need to automatically attach Supabase JWT tokens to every request
