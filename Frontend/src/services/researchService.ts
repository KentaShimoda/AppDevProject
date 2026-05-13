import { API_BASE_URL, getAuthHeaders } from "./apiConfig";

// ── DTOs (mirror the C# DTOs used in the controller) ─────────────────────────

export interface ResearchItem {
  id: number;
  title: string;
  category?: string;
  tags?: string[];
  status?: string;
  viewCount?: number;
  versions?: ResearchVersion[];
  [key: string]: unknown;
}

export interface ResearchVersion {
  version: number;
  feedback?: string;
  uploadedAt?: string;
  [key: string]: unknown;
}

/** Matches ResearchUploadDto [FromForm] — POST /api/research/upload */
export interface ResearchUploadDto {
  title: string;
  category?: string;
  tags?: string[];
  file: File;
}

/** Matches EditDetailsDto [FromBody] — PATCH /api/research/{id}/details */
export interface EditDetailsDto {
  title?: string;
  tags?: string[];
  category?: string;
  [key: string]: unknown;
}

/** Matches EvaluationDto [FromBody] — PATCH /api/research/{id}/evaluate */
export interface EvaluationDto {
  status: string;
  feedback: string;
}

/** Matches NewVersionDto [FromForm] — POST /api/research/{id}/version */
export interface NewVersionDto {
  file: File;
  notes?: string;
}

// ── Service ───────────────────────────────────────────────────────────────────

export const researchService = {

  /**
   * GET /api/research
   * Retrieve the complete registry of research studies.
   */
  getAll: async (): Promise<ResearchItem[]> => {
    const res = await fetch(`${API_BASE_URL}/Research`);
    if (!res.ok) throw new Error("Failed to synchronize with the registry.");
    return res.json();
  },

  /**
   * GET /api/research/{id}
   * Fetch a specific manuscript by its unique identifier.
   * Returns null when the server responds with 404.
   */
  getById: async (id: number): Promise<ResearchItem | null> => {
    const res = await fetch(`${API_BASE_URL}/Research/${id}`);
    return res.ok ? res.json() : null;
  },

  /**
   * GET /api/research/category/{category}
   * Returns all approved studies matching a specific category.
   * Used by the frontend to browse by interest topic.
   */
  getByCategory: async (category: string): Promise<ResearchItem[]> => {
    const res = await fetch(
      `${API_BASE_URL}/Research/category/${encodeURIComponent(category)}`
    );
    if (!res.ok) throw new Error(`Failed to fetch studies for category: ${category}`);
    return res.json();
  },

  /**
   * POST /api/research/upload  [Authorize]
   * Execute a multipart upload for a new research study.
   * Accepts title, optional category, optional tags, and a PDF file.
   */
  upload: async (dto: ResearchUploadDto): Promise<ResearchItem> => {
    const formData = new FormData();
    formData.append("title", dto.title);
    if (dto.category) formData.append("category", dto.category);
    if (dto.tags) dto.tags.forEach((tag) => formData.append("tags", tag));
    formData.append("file", dto.file);

    const res = await fetch(`${API_BASE_URL}/Research/upload`, {
      method: "POST",
      headers: getAuthHeaders(true), // multipart boundary is set automatically
      body: formData,
    });
    if (!res.ok) throw new Error("Upload protocol failed.");
    return res.json();
  },

  /**
   * PATCH /api/research/{id}/details  [Authorize]
   * Commit changes to study metadata (Title, Tags, Category, etc.).
   * Returns true on 204 NoContent, false on 404.
   */
  updateDetails: async (id: number, details: EditDetailsDto): Promise<boolean> => {
    const res = await fetch(`${API_BASE_URL}/Research/${id}/details`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify(details),
    });
    return res.ok;
  },

  /**
   * POST /api/research/{id}/version  [Authorize]
   * Push a new PDF iteration to the version history.
   * Returns the updated/new version record.
   */
  uploadNewVersion: async (
    id: number,
    dto: NewVersionDto
  ): Promise<ResearchVersion> => {
    const formData = new FormData();
    formData.append("file", dto.file);
    if (dto.notes) formData.append("notes", dto.notes);

    const res = await fetch(`${API_BASE_URL}/Research/${id}/version`, {
      method: "POST",
      headers: getAuthHeaders(true),
      body: formData,
    });
    if (!res.ok) throw new Error("Version update failed.");
    return res.json();
  },

  /**
   * PATCH /api/research/{id}/evaluate  [Authorize(Roles = "Faculty / Professional")]
   * Faculty/Professional evaluation of the manuscript status.
   * Returns true on 204 NoContent, false on 404.
   */
  evaluate: async (id: number, evaluation: EvaluationDto): Promise<boolean> => {
    const res = await fetch(`${API_BASE_URL}/Research/${id}/evaluate`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify(evaluation),
    });
    return res.ok;
  },

  /**
   * PATCH /api/research/{id}/history/{version}/feedback
   *   [Authorize(Roles = "Faculty / Professional")]
   * Update feedback remarks for a specific version entry.
   * The backend expects a quoted JSON string literal for [FromBody] string.
   * Returns true on 204 NoContent, false on 404.
   */
  updateFeedback: async (
    id: number,
    version: number,
    feedback: string
  ): Promise<boolean> => {
    const res = await fetch(
      `${API_BASE_URL}/Research/${id}/history/${version}/feedback`,
      {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify(feedback), // serialised as a JSON string literal e.g. "\"Great work\""
      }
    );
    return res.ok;
  },

  /**
   * POST /api/research/{id}/validate  [Authorize(Roles = "Faculty / Professional")]
   * Toggle faculty validation points for the study.
   * Returns true on 200 Ok, false on 404.
   */
  toggleValidation: async (id: number): Promise<boolean> => {
    const res = await fetch(`${API_BASE_URL}/Research/${id}/validate`, {
      method: "POST",
      headers: getAuthHeaders(),
    });
    return res.ok;
  },

  /**
   * POST /api/research/{id}/view
   * Record / increment the view count for a study.
   * Fire-and-forget — errors are silently swallowed.
   */
  recordView: async (id: number): Promise<void> => {
    await fetch(`${API_BASE_URL}/Research/${id}/view`, {
      method: "POST",
      headers: getAuthHeaders(),
    });
  },

  /**
   * GET /api/research/{id}/view
   * Returns the authenticated URL for the live PDF viewer.
   * The controller streams PdfData directly with the stored ContentType.
   */
  getViewUrl: (id: number): string => `${API_BASE_URL}/Research/${id}/view`,
};