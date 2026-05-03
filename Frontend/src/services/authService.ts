import { API_BASE_URL } from "./apiConfig";

export const authService = {
  register: async (userData: any) => {
    const response = await fetch(`${API_BASE_URL}/Auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData),
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Registration failed");
    }
    return response.json();
  },

  login: async (credentials: any) => {
    const response = await fetch(`${API_BASE_URL}/Auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials),
    });

    // FIX: Instead of throwing a generic string, we must read the server's JSON response
    if (!response.ok) {
        const errorData = await response.json();
        // This will now correctly throw "Account not verified. Please verify your email."
        throw new Error(errorData.message || "Invalid email or password");
    }

    const data = await response.json();
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data));
    return data;
  },

  verifyEmail: async (email: string, code: string) => {
    const response = await fetch(`${API_BASE_URL}/Auth/verify-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code }),
    });
    return response.ok;
  },

  resendCode: async (email: string) => {
    const response = await fetch(`${API_BASE_URL}/Auth/resend-code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    return response.ok;
  },

  forgotPassword: async (email: string) => {
    const response = await fetch(`${API_BASE_URL}/Auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    return response.ok;
  },

  resetPassword: async (resetData: any) => {
    const response = await fetch(`${API_BASE_URL}/Auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(resetData),
    });
    return response.ok;
  }
};