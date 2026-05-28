import apiClient from "./api";

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: string;
  tier: string;
  storage_used: number;
  created_at: string;
}

interface ListResponse {
  data: UserItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
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

export const adminService = {
  async listUsers(
    page = 1,
    limit = 20,
    query = "",
  ): Promise<{ success: boolean; data: UserItem[]; pagination?: { page: number; limit: number; total: number }; error?: string }> {
    try {
      const response = (await apiClient.get("v1/admin/users", {
        params: { page, limit, q: query || undefined },
      })) as unknown as ApiResponse<ListResponse>;
      return {
        success: true,
        data: response.data?.data || [],
        pagination: response.data?.pagination,
      };
    } catch (error) {
      const apiError = error as ApiError;
      return { success: false, data: [], error: apiError.message || "Failed to fetch users" };
    }
  },

  async updateTier(userId: string, tier: string): Promise<{ success: boolean; data?: UserItem; error?: string }> {
    try {
      const response = (await apiClient.put(`v1/admin/users/${userId}/tier`, { tier })) as unknown as ApiResponse<UserItem>;
      return { success: true, data: response.data };
    } catch (error) {
      const apiError = error as ApiError;
      return { success: false, error: apiError.message || "Failed to update tier" };
    }
  },
};
