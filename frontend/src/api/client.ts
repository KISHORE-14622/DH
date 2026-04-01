import axios from "axios";

const apiBase = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

export const apiClient = axios.create({
  baseURL: apiBase
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("golf_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});
