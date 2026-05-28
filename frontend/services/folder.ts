import apiClient from "./api";

interface Folder {
  id: string;
  user_id: string;
  name: string;
  discord_channel_id: string;
  created_at: string;
  updated_at: string;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

interface ApiError {
  status: number;
  message: string;
}

export const folderService = {
  async list(parentId?: string): Promise<{ success: boolean; data: Folder[]; error?: string }> {
    try {
      const params: Record<string, string> = {};
      if (parentId) params.parent_id = parentId;
      const response = (await apiClient.get("v1/folders", { params })) as unknown as ApiResponse<Folder[]>;
      return { success: true, data: response.data || [] };
    } catch (error) {
      const apiError = error as ApiError;
      return { success: false, data: [], error: apiError.message || "Failed to fetch folders" };
    }
  },

  async create(name: string, parentId?: string): Promise<{ success: boolean; data?: Folder; error?: string }> {
    try {
      const body: Record<string, string> = { name };
      if (parentId) body.parent_id = parentId;
      const response = (await apiClient.post("v1/folders", body)) as unknown as ApiResponse<Folder>;
      return { success: true, data: response.data };
    } catch (error) {
      const apiError = error as ApiError;
      return { success: false, error: apiError.message || "Failed to create folder" };
    }
  },

  async getById(id: string): Promise<{ success: boolean; data?: Folder; error?: string }> {
    try {
      const response = (await apiClient.get(`v1/folders/${id}`)) as unknown as ApiResponse<Folder>;
      return { success: true, data: response.data };
    } catch (error) {
      const apiError = error as ApiError;
      return { success: false, error: apiError.message || "Failed to fetch folder" };
    }
  },

  async update(id: string, name: string): Promise<{ success: boolean; data?: Folder; error?: string }> {
    try {
      const response = (await apiClient.put(`v1/folders/${id}`, { name })) as unknown as ApiResponse<Folder>;
      return { success: true, data: response.data };
    } catch (error) {
      const apiError = error as ApiError;
      return { success: false, error: apiError.message || "Failed to update folder" };
    }
  },

  async remove(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = (await apiClient.delete(`v1/folders/${id}`)) as unknown as ApiResponse<null>;
      return { success: true };
    } catch (error) {
      const apiError = error as ApiError;
      return { success: false, error: apiError.message || "Failed to delete folder" };
    }
  },
};
