import axios from "axios";

const baseURL = import.meta.env.MODE === "production" ? "/api" : "http://localhost:5000/api";
const API = axios.create({ baseURL, withCredentials: true });

// In-Memory Access Token Storage (mitigates XSS token theft from localStorage)
let inMemoryAccessToken = null;

export const setAccessToken = (token) => {
  inMemoryAccessToken = token;
};

export const getAccessToken = () => {
  return inMemoryAccessToken;
};

// Add JWT Bearer token to requests from memory
API.interceptors.request.use((req) => {
  const token = inMemoryAccessToken;
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
});

// Intercept 401 Responses to silently rotate and refresh token via HttpOnly cookie
API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    // Don't retry the refresh route itself to prevent infinite loops
    if (originalRequest.url?.includes("/auth/refresh")) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const { data } = await axios.get(`${baseURL}/auth/refresh`, { withCredentials: true });
        setAccessToken(data.token);
        originalRequest.headers.Authorization = `Bearer ${data.token}`;
        return API(originalRequest);
      } catch (err) {
        setAccessToken(null);
        if (window.location.pathname !== "/login" && window.location.pathname !== "/register") {
          window.location.href = "/login";
        }
        return Promise.reject(err);
      }
    }
    return Promise.reject(error);
  }
);

export default API;
