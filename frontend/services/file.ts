import apiClient from "./api";

interface FileItem {
  id: string;
  folder_id: string;
  user_id: string;
  original_name: string;
  stored_name: string;
  mime_type: string;
  size: number;
  discord_message_id: string;
  discord_attachment_url: string;
  created_at: string;
  updated_at: string;
}

interface ListResponse {
  data: FileItem[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
  };
}

interface UploadResult {
  original_name: string;
  success: boolean;
  error?: string;
  file?: FileItem;
}

interface UploadResponse {
  data: UploadResult[];
  total: number;
  success: number;
  failed: number;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
  };
}

interface ApiError {
  status: number;
  message: string;
}

export const fileService = {
  async listByFolder(
    folderId: string,
    page = 1,
    limit = 20,
  ): Promise<{ success: boolean; data: FileItem[]; pagination?: { page: number; limit: number; total: number }; error?: string }> {
    try {
      const response = (await apiClient.get(`v1/folders/${folderId}/files`, {
        params: { page, limit },
      })) as unknown as ApiResponse<ListResponse>;
      return {
        success: true,
        data: response.data?.data || [],
        pagination: response.data?.pagination,
      };
    } catch (error) {
      const apiError = error as ApiError;
      return { success: false, data: [], error: apiError.message || "Failed to fetch files" };
    }
  },

  async uploadMultiple(
    folderId: string,
    files: File[],
  ): Promise<{ success: boolean; data?: UploadResponse; error?: string }> {
    try {
      const formData = new FormData();
      files.forEach((f) => formData.append("files", f));
      const response = (await apiClient.postFormData(
        `v1/folders/${folderId}/files`,
        formData,
      )) as unknown as ApiResponse<UploadResponse>;
      return { success: true, data: response.data };
    } catch (error) {
      const apiError = error as ApiError;
      return { success: false, error: apiError.message || "Failed to upload files" };
    }
  },

  async getById(id: string): Promise<{ success: boolean; data?: FileItem; error?: string }> {
    try {
      const response = (await apiClient.get(`v1/files/${id}`)) as unknown as ApiResponse<FileItem>;
      return { success: true, data: response.data };
    } catch (error) {
      const apiError = error as ApiError;
      return { success: false, error: apiError.message || "Failed to fetch file" };
    }
  },

  async remove(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = (await apiClient.delete(`v1/files/${id}`)) as unknown as ApiResponse<null>;
      return { success: true };
    } catch (error) {
      const apiError = error as ApiError;
      return { success: false, error: apiError.message || "Failed to delete file" };
    }
  },
};
