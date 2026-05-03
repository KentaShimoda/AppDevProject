import { API_BASE_URL, getAuthHeaders } from "./apiConfig";

export const bookmarkService = {
  // POST api/Bookmark/toggle/{researchId}[cite: 37]
  toggle: async (researchId: number) => {
    const res = await fetch(`${API_BASE_URL}/Bookmark/toggle/${researchId}`, {
      method: "POST",
      headers: getAuthHeaders()
    });
    return res.json();
  },

  // GET api/Bookmark/my-list[cite: 37]
  getMyList: async () => {
    const res = await fetch(`${API_BASE_URL}/Bookmark/my-list`, { headers: getAuthHeaders() });
    return res.json();
  }
};