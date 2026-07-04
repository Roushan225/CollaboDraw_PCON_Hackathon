import axios from "axios";

let baseURL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// Dynamically rewrite localhost to the actual IP address if accessing from another device in dev network
if (
  import.meta.env.DEV &&
  window.location.hostname !== "localhost" &&
  window.location.hostname !== "127.0.0.1" &&
  baseURL.includes("localhost")
) {
  baseURL = baseURL.replace("localhost", window.location.hostname);
}

const api = axios.create({
  baseURL,
  withCredentials: true,
});

// Interceptor to attach Authorization header if token is in local storage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export default api;
