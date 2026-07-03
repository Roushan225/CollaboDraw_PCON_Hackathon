import axios from "axios";

// Base URL points to the backend
// In production, set VITE_API_URL in your Vercel environment variables
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
});

export default api;
