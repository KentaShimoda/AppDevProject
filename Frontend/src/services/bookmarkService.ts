import { API_BASE_URL } from "./apiConfig";

export const bookmarkService = {
  // Toggles the bookmark state for a specific research ID
  toggle: async (researchId: number) => {
    const token = localStorage.getItem("token");
    const response = await fetch(`${API_BASE_URL}/Bookmark/toggle/${researchId}`, {
      method: "POST",
      headers: { 
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });
    return await response.json();
  },

  // Retrieves the current user's bookmarked studies
  getMyList: async () => {
    const token = localStorage.getItem("token");
    const response = await fetch(`${API_BASE_URL}/Bookmark/my-list`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    return await response.json();
  }
};