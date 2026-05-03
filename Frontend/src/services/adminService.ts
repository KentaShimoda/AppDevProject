import { API_BASE_URL, getAuthHeaders } from "./apiConfig";

export const adminService = {
  // Requirement: Synchronize with the researcher registry[cite: 13]
  getAllUsers: async () => {
    const res = await fetch(`${API_BASE_URL}/Admin/users`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error("Registry access denied.");
    return res.json();
  },

  // Protocol: Fetch Audit Archive[cite: 13]
  getAuditLogs: async () => {
    const res = await fetch(`${API_BASE_URL}/Admin/audit-logs`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error("Audit archive access denied.");
    return res.json();
  },

  // Protocol: Update User authorization[cite: 13]
  updateUserRole: async (userId: number, role: string) => {
    const res = await fetch(`${API_BASE_URL}/Admin/users/${userId}/role`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify(role) 
    });
    return res.ok;
  },

  // Protocol: Remove researcher record[cite: 13]
  deleteUser: async (userId: number) => {
    const res = await fetch(`${API_BASE_URL}/Admin/users/${userId}`, {
      method: "DELETE",
      headers: getAuthHeaders()
    });
    return res.ok;
  },

  // 🚀 Protocol: Enhanced Metadata Export with Stream Handling[cite: 13, 14]
    exportMetadata: async () => {
        const res = await fetch(`${API_BASE_URL}/Admin/backup/metadata`, {
        headers: getAuthHeaders()
        });
        if (!res.ok) throw new Error("Export failed.");
        return res.json(); // Returns { timestamp, source, data }[cite: 20]
    }
};