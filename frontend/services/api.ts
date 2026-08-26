import axios, {
  AxiosError,
  InternalAxiosRequestConfig,
} from "axios";
import Cookies from "js-cookie";

const baseURL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/";

let isRedirectingToLogin = false;

const apiClient = axios.create({
  baseURL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = Cookies.get("auth_token");
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (config.data instanceof FormData && config.headers) {
      delete config.headers["Content-Type"];
    }

    return config;
  },
  (error: AxiosError) => Promise.reject(error),
);

apiClient.interceptors.response.use(
  (response) => response.data,
  (error: AxiosError<{ message?: string }>) => {
    const requestUrl = error.config?.url || "";
    const isAuthRequest =
      requestUrl.includes("v1/login") || requestUrl.includes("v1/register");
    const isLoginPage =
      typeof window !== "undefined" && window.location.pathname === "/login";

    if (error.response?.status === 401 && !isAuthRequest && !isLoginPage) {
      if (typeof window !== "undefined") {
        if (!isRedirectingToLogin) {
          isRedirectingToLogin = true;
          Cookies.remove("auth_token");
          Cookies.remove("user");
          window.location.replace("/login");
        }
      }
    }

    const message =
      error.response?.data?.message || error.message || "An error occurred";
    return Promise.reject({ status: error.response?.status, message });
  },
);

const extendedClient = {
  get: <T>(url: string, config?: Record<string, unknown>) =>
    apiClient.get(url, config) as Promise<T>,
  getBlob: (url: string, config?: Record<string, unknown>) =>
    apiClient.get(url, { ...config, responseType: "blob" }) as Promise<Blob>,
  post: <T>(url: string, data?: unknown, config?: Record<string, unknown>) =>
    apiClient.post(url, data, config) as Promise<T>,
  put: <T>(url: string, data?: unknown, config?: Record<string, unknown>) =>
    apiClient.put(url, data, config) as Promise<T>,
  patch: <T>(url: string, data?: unknown, config?: Record<string, unknown>) =>
    apiClient.patch(url, data, config) as Promise<T>,
  delete: <T>(url: string, config?: Record<string, unknown>) =>
    apiClient.delete(url, config) as Promise<T>,
  postFormData: <T>(url: string, data: FormData, config?: Record<string, unknown>) =>
    apiClient.post(url, data, config) as Promise<T>,
  putFormData: <T>(url: string, data: FormData, config?: Record<string, unknown>) =>
    apiClient.put(url, data, config) as Promise<T>,
  patchFormData: <T>(url: string, data: FormData, config?: Record<string, unknown>) =>
    apiClient.patch(url, data, config) as Promise<T>,
};

export default extendedClient;
export { extendedClient as apiClient };
