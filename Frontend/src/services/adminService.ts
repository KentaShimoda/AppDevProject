import { API_BASE_URL } from "./apiConfig";

const getAuthHeaders = () => ({
  "Content-Type": "application/json",
  "Authorization": `Bearer ${localStorage.getItem("token")}`
});

export const adminService = {
  // Requirement 4.1: Retrieve all registered subjects
  getAllUsers: async () => {
    const response = await fetch(`${API_BASE_URL}/Admin/users`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Failed to retrieve user registry.");
    return response.json();
  },

  // Requirement 4.2: Retrieve audit archives[cite: 3]
  getAuditLogs: async () => {
    const response = await fetch(`${API_BASE_URL}/Admin/audit-logs`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Failed to synchronize audit archives.");
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  },

  // Protocol: Update access level using the UpdateRoleDto structure[cite: 3]
  updateUserRole: async (userId: number, newRole: string) => {
    const response = await fetch(`${API_BASE_URL}/Admin/users/${userId}/role`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify({ newRole }), 
    });
    if (!response.ok) throw new Error("Failed to update user protocol.");
    return true;
  },

  // Protocol: Permanent account purge
  deleteUser: async (userId: number) => {
    const response = await fetch(`${API_BASE_URL}/Admin/users/${userId}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Account deletion protocol failed.");
    return true;
  },

  // Requirement 4.4: Execute Metadata Backup[cite: 3]
  exportMetadata: async () => {
    const response = await fetch(`${API_BASE_URL}/Admin/backup/metadata`, {
      headers: getAuthHeaders(),
    });
    const result = await response.json();
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `metadata_archive_${new Date().getTime()}.json`;
    link.click();
  }
};