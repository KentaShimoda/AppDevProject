// export const API_BASE_URL = "https://appdevproject-8ffe.onrender.com/api";
export const API_BASE_URL = "http://localhost:5016/api";

export const getAuthHeaders = (isMultipart = false) => {
  const token = localStorage.getItem("token");
  const headers: HeadersInit = {
    "Authorization": token ? `Bearer ${token}` : "",
  };
  
  // Fetch automatically sets the boundary for FormData; do not set Content-Type
  if (!isMultipart) {
    headers["Content-Type"] = "application/json";
  }
  
  return headers;
};