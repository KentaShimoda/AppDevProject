import { API_BASE_URL } from "./apiConfig";

export const authService = {
  // POST api/Auth/register[cite: 36]
  register: async (dto: any) => {
    const res = await fetch(`${API_BASE_URL}/Auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dto)
    });
    return res.ok ? res.json() : null;
  },

  // POST api/Auth/login[cite: 36]
  login: async (dto: any) => {
    const res = await fetch(`${API_BASE_URL}/Auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dto)
    });
    return res.ok ? res.json() : null;
  },

  // POST api/Auth/verify-email[cite: 36]
  verifyEmail: async (dto: any) => {
    const res = await fetch(`${API_BASE_URL}/Auth/verify-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dto)
    });
    return res.ok;
  },

  // POST api/Auth/resend-code[cite: 36]
  resendCode: async (email: string) => {
    const res = await fetch(`${API_BASE_URL}/Auth/resend-code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });
    return res.ok;
  },

  // POST api/Auth/forgot-password[cite: 36]
  forgotPassword: async (email: string) => {
    const res = await fetch(`${API_BASE_URL}/Auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });
    return res.ok;
  },

  // POST api/Auth/reset-password[cite: 36]
  resetPassword: async (dto: any) => {
    const res = await fetch(`${API_BASE_URL}/Auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dto)
    });
    return res.ok;
  }
};