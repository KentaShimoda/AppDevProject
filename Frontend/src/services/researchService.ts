import { API_BASE_URL, getAuthHeaders } from "./apiConfig";

/**
 * Service protocol for interacting with the Research Archive.
 * Handles manuscript retrieval, metadata updates, and version control.
 */
export const researchService = {
  
  // Requirement: Retrieve the complete registry of research studies
  getAll: async () => {
    const res = await fetch(`${API_BASE_URL}/Research`);
    if (!res.ok) throw new Error("Failed to synchronize with the registry.");
    return res.json();
  },

  // Requirement: Fetch a specific manuscript by its unique identifier[cite: 38]
  getById: async (id: number) => {
    const res = await fetch(`${API_BASE_URL}/Research/${id}`);
    return res.ok ? res.json() : null;
  },

  // Protocol: Execute a multipart upload for a new research study[cite: 38]
  upload: async (formData: FormData) => {
    const res = await fetch(`${API_BASE_URL}/Research/upload`, {
      method: "POST",
      headers: getAuthHeaders(true), // Multi-part boundary is set automatically[cite: 38]
      body: formData
    });
    if (!res.ok) throw new Error("Upload protocol failed.");
    return res.json();
  },

  // Protocol: Commit changes to study metadata (Title, Tags, etc.)[cite: 38]
  updateDetails: async (id: number, details: any) => {
    const res = await fetch(`${API_BASE_URL}/Research/${id}/details`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify(details)
    });
    return res.ok;
  },

  // Protocol: Push a new PDF iteration to the version history[cite: 38]
  uploadNewVersion: async (id: number, formData: FormData) => {
    const res = await fetch(`${API_BASE_URL}/Research/${id}/version`, {
      method: "POST",
      headers: getAuthHeaders(true),
      body: formData
    });
    if (!res.ok) throw new Error("Version update failed.");
    return res.json();
  },

  // Protocol: Faculty/Professional evaluation of the manuscript status[cite: 38]
  evaluate: async (id: number, evaluation: { status: string; feedback: string }) => {
    const res = await fetch(`${API_BASE_URL}/Research/${id}/evaluate`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify(evaluation)
    });
    return res.ok;
  },

  /**
   * UPDATED Protocol: Update feedback remarks for a specific version entry.
   * Targets the relational history table directly.
   */
  updateFeedback: async (id: number, version: number, feedback: string) => {
    const res = await fetch(`${API_BASE_URL}/Research/${id}/history/${version}/feedback`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      // Backend expects a quoted string literal for [FromBody] string[cite: 21, 23]
      body: JSON.stringify(feedback) 
    });
    return res.ok;
},

  // Protocol: Toggle faculty validation points for the study[cite: 38]
  toggleValidation: async (id: number) => {
    const res = await fetch(`${API_BASE_URL}/Research/${id}/validate`, {
      method: "POST",
      headers: getAuthHeaders()
    });
    return res.ok;
  },

  recordView: async (id: number) => {
    await fetch(`${API_BASE_URL}/Research/${id}/view`, {
      method: "POST",
      headers: getAuthHeaders()
    });
  },

  // Helper: Generates the authenticated URL for the live PDF viewer[cite: 38]
  getViewUrl: (id: number) => `${API_BASE_URL}/Research/${id}/view`
};