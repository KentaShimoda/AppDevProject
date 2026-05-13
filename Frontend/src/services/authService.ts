import { API_BASE_URL } from "./apiConfig";

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export interface RegisterDto {
  honorific?: string;
  firstName: string;
  lastName: string;
  birthDate: string;          // ISO date string  "YYYY-MM-DD"
  organization: string;
  userType: string;
  researchInterest: string;
  email: string;
  password: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface VerifyEmailDto {
  email: string;
  code: string;
}

export interface ForgotPasswordDto {
  email: string;
}

export interface ResetPasswordDto {
  email: string;
  code: string;
  newPassword: string;
}

export interface ResendCodeDto {
  email: string;
}

export interface SetInterestDto {
  researchInterest: string;
}

// ─── Response shapes ──────────────────────────────────────────────────────────

export interface AuthResult {
  token: string;
  email: string;
  firstName: string;
  lastName: string;
  userType: string;
  researchInterest?: string;
}

export interface InterestResult {
  researchInterest: string;
}

export interface ApiError {
  message: string;
}

// ─── Helper ───────────────────────────────────────────────────────────────────

/**
 * Parses an error body from the API and returns a human-readable message.
 * Falls back to the HTTP status text when the body is not JSON.
 */
async function extractErrorMessage(res: Response): Promise<string> {
  try {
    const body: ApiError = await res.json();
    return body.message ?? `Request failed (${res.status})`;
  } catch {
    return res.statusText || `Request failed (${res.status})`;
  }
}

function headers(token?: string): HeadersInit {
  const base: HeadersInit = { "Content-Type": "application/json" };
  if (token) base["Authorization"] = `Bearer ${token}`;
  return base;
}

// ─── Auth Service ─────────────────────────────────────────────────────────────

export const authService = {
  /**
   * POST /api/Auth/register
   * Registers a new user.
   * @returns AuthResult on success.
   * @throws Error with the API message on failure (e.g. "Email already in use").
   */
  register: async (dto: RegisterDto): Promise<AuthResult> => {
    const res = await fetch(`${API_BASE_URL}/Auth/register`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(dto),
    });

    if (!res.ok) {
      const msg = await extractErrorMessage(res);
      throw new Error(msg);
    }

    return res.json() as Promise<AuthResult>;
  },

  /**
   * POST /api/Auth/login
   * Authenticates an existing user.
   * @returns AuthResult (includes JWT token) on success.
   * @throws Error with the API message on failure (e.g. "Invalid email or password").
   */
  login: async (dto: LoginDto): Promise<AuthResult> => {
    const res = await fetch(`${API_BASE_URL}/Auth/login`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(dto),
    });

    if (!res.ok) {
      const msg = await extractErrorMessage(res);
      throw new Error(msg);
    }

    return res.json() as Promise<AuthResult>;
  },

  /**
   * POST /api/Auth/verify-email
   * Submits the email verification OTP code.
   * @returns true on success.
   * @throws Error on failure.
   */
  verifyEmail: async (dto: VerifyEmailDto): Promise<true> => {
    const res = await fetch(`${API_BASE_URL}/Auth/verify-email`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(dto),
    });

    if (!res.ok) {
      const msg = await extractErrorMessage(res);
      throw new Error(msg);
    }

    return true;
  },

  /**
   * POST /api/Auth/resend-code
   * Resends the email verification code.
   * @returns true on success.
   * @throws Error on failure.
   */
  resendCode: async (email: string): Promise<true> => {
    const res = await fetch(`${API_BASE_URL}/Auth/resend-code`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ email } satisfies ResendCodeDto),
    });

    if (!res.ok) {
      const msg = await extractErrorMessage(res);
      throw new Error(msg);
    }

    return true;
  },

  /**
   * POST /api/Auth/forgot-password
   * Triggers a password-reset code email.
   * Always resolves (the API never reveals whether the email exists).
   */
  forgotPassword: async (email: string): Promise<void> => {
    await fetch(`${API_BASE_URL}/Auth/forgot-password`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ email } satisfies ForgotPasswordDto),
    });
    // The backend always returns 200 regardless, so we swallow the response.
  },

  /**
   * POST /api/Auth/reset-password
   * Resets the user's password using the OTP code.
   * @returns true on success.
   * @throws Error on failure (e.g. "Invalid code").
   */
  resetPassword: async (dto: ResetPasswordDto): Promise<true> => {
    const res = await fetch(`${API_BASE_URL}/Auth/reset-password`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(dto),
    });

    if (!res.ok) {
      const msg = await extractErrorMessage(res);
      throw new Error(msg);
    }

    return true;
  },

  // ── Interest (requires auth) ───────────────────────────────────────────────

  /**
   * GET /api/Auth/me/interest
   * Fetches the current user's research interest.
   * @throws Error on failure.
   */
  getInterest: async (token: string): Promise<InterestResult> => {
    const res = await fetch(`${API_BASE_URL}/Auth/me/interest`, {
      method: "GET",
      headers: headers(token),
    });

    if (!res.ok) {
      const msg = await extractErrorMessage(res);
      throw new Error(msg);
    }

    return res.json() as Promise<InterestResult>;
  },

  /**
   * POST /api/Auth/me/interest
   * Sets (creates) the current user's research interest.
   * @throws Error on failure.
   */
  setInterest: async (token: string, dto: SetInterestDto): Promise<InterestResult> => {
    const res = await fetch(`${API_BASE_URL}/Auth/me/interest`, {
      method: "POST",
      headers: headers(token),
      body: JSON.stringify(dto),
    });

    if (!res.ok) {
      const msg = await extractErrorMessage(res);
      throw new Error(msg);
    }

    return res.json() as Promise<InterestResult>;
  },

  /**
   * PATCH /api/Auth/me/interest
   * Updates the current user's research interest.
   * @throws Error on failure.
   */
  updateInterest: async (token: string, dto: SetInterestDto): Promise<InterestResult> => {
    const res = await fetch(`${API_BASE_URL}/Auth/me/interest`, {
      method: "PATCH",
      headers: headers(token),
      body: JSON.stringify(dto),
    });

    if (!res.ok) {
      const msg = await extractErrorMessage(res);
      throw new Error(msg);
    }

    return res.json() as Promise<InterestResult>;
  },

  /**
   * GET /api/Auth/me/recommended?limit=N
   * Returns recommended content for the current user.
   * @throws Error on failure.
   */
  getRecommended: async <T = unknown>(token: string, limit = 10): Promise<T[]> => {
    const res = await fetch(
      `${API_BASE_URL}/Auth/me/recommended?limit=${limit}`,
      {
        method: "GET",
        headers: headers(token),
      }
    );

    if (!res.ok) {
      const msg = await extractErrorMessage(res);
      throw new Error(msg);
    }

    return res.json() as Promise<T[]>;
  },
};