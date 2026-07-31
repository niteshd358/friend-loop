import axios from "axios";

const baseURL = import.meta.env.MODE === "production" ? "/api" : "http://localhost:5000/api";
const API = axios.create({ baseURL });

// Add JWT token to requests
API.interceptors.request.use((req) => {
  const token = localStorage.getItem("token");
  if (token) req.headers.Authorization = `Bearer ${token}`;
  return req;
});

export default API;
