// src/services/researchService.ts
const API_BASE_URL = "http://localhost:5016/api";

export const researchService = {
  getAll: async () => {
    const response = await fetch(`${API_BASE_URL}/research`);
    if (!response.ok) throw new Error("Failed to fetch");
    const data = await response.json();
    return data.map((study: any) => ({
      ...study,
      coordinator: JSON.parse(study.coordinator || "{}"),
      researchers: JSON.parse(study.researchers || "[]")
    }));
  },

  getById: async (id: string | number) => {
    const response = await fetch(`${API_BASE_URL}/research/${id}`);
    if (!response.ok) throw new Error("Not found");
    const study = await response.json();
    return {
      ...study,
      coordinator: JSON.parse(study.coordinator || "{}"),
      researchers: JSON.parse(study.researchers || "[]")
    };
  },

  evaluate: async (id: number, status: string, feedback: string) => {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE_URL}/Research/${id}/evaluate`, {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}` 
        },
        body: JSON.stringify({ status, feedback }) // Matches backend EvaluationDto
      });
      return response.ok;
  },

  getDownloadUrl: (id: string | number) => `${API_BASE_URL}/research/${id}/download`
};