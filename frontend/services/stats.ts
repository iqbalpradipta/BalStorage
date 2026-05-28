import apiClient from "./api";

interface TierInfo {
  name: string;
  label: string;
  limit: number; // bytes, 0 = unlimited
}

interface CatBreakdown {
  size: number;
  count: number;
}

interface DashboardStats {
  total_folders: number;
  total_files: number;
  total_size: number;
  tier: TierInfo;
  category_breakdown: Record<string, CatBreakdown>;
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

export const statsService = {
  async getDashboard(): Promise<{ success: boolean; data?: DashboardStats; error?: string }> {
    try {
      const response = (await apiClient.get("v1/stats")) as unknown as ApiResponse<DashboardStats>;
      return { success: true, data: response.data };
    } catch (error) {
      const apiError = error as ApiError;
      return { success: false, error: apiError.message || "Failed to fetch stats" };
    }
  },
};
