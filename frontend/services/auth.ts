import apiClient from "./api";
import Cookies from "js-cookie";

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
}

interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    token: string;
  };
}

interface ApiError {
  status: number;
  message: string;
}

export const authService = {
  async login(email: string, password: string) {
    try {
      const response = (await apiClient.post("v1/login", {
        email,
        password,
      })) as unknown as LoginResponse;

      if (response.success) {
        Cookies.set("auth_token", response.data.token, { expires: 3 });
        Cookies.set("user", JSON.stringify(response.data.user), {
          expires: 3,
        });
        return { success: true, data: response.data };
      }

      return { success: false, error: response.message };
    } catch (error) {
      const apiError = error as ApiError;
      return {
        success: false,
        error: apiError.message || "Login failed",
      };
    }
  },

  async register(
    name: string,
    email: string,
    password: string,
    phone?: string,
  ) {
    try {
      const response = (await apiClient.post("v1/register", {
        name,
        email,
        password,
        phone,
      })) as unknown as LoginResponse;

      return { success: response.success, message: response.message };
    } catch (error) {
      const apiError = error as ApiError;
      return {
        success: false,
        error: apiError.message || "Registration failed",
      };
    }
  },

  logout() {
    Cookies.remove("auth_token");
    Cookies.remove("user");
  },

  getUser(): User | null {
    try {
      const userStr = Cookies.get("user");
      if (!userStr) return null;
      return JSON.parse(userStr) as User;
    } catch {
      return null;
    }
  },
};
