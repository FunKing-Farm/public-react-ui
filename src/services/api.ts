import type { AuthResponse, LoginCredentials, RegisterCredentials, User } from '@/types/auth.ts';
import type { ImageListResponse, ImageMetadata } from '@/types/image.ts';
import type { ApiResponse, ApiError } from '@/types/api.ts';
import axios, { type AxiosInstance, type AxiosError, type InternalAxiosRequestConfig, type AxiosResponse } from 'axios';

const API_BASE_URL = '/api';

class ApiService {
    private axiosInstance: AxiosInstance;
    private accessToken: string | null = null;
    private onTokenRefreshed: ((token: string) => void) | null = null;
    private onAuthError: (() => void) | null = null;

    constructor() {
        this.axiosInstance = axios.create({
            baseURL: API_BASE_URL,
            withCredentials: true,
            headers: {
                'Content-Type': 'application/json',
            },
            timeout: 10000,
        });

        this.setupInterceptors();
    }

    private setupInterceptors(): void {
        // Request interceptor
        this.axiosInstance.interceptors.request.use(
            (config: InternalAxiosRequestConfig) => {
                if (this.accessToken && config.headers) {
                    config.headers.Authorization = `Bearer ${this.accessToken}`;
                }
                return config;
            },
            (error: AxiosError) => Promise.reject(error)
        );

        // Response interceptor
        this.axiosInstance.interceptors.response.use(
            (response) => response,
            async (error: AxiosError) => {
                const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

                if (error.response?.status === 401 && !originalRequest._retry && originalRequest) {
                    originalRequest._retry = true;

                    try {
                        const response = await axios.post(
                            `${API_BASE_URL}/auth/refresh`,
                            {},
                            { withCredentials: true }
                        );

                        const newAccessToken = response.data.access_token;
                        this.setAccessToken(newAccessToken);

                        if (this.onTokenRefreshed) {
                            this.onTokenRefreshed(newAccessToken);
                        }

                        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                        return this.axiosInstance(originalRequest);
                    } catch (refreshError) {
                        if (this.onAuthError) {
                            this.onAuthError();
                        }
                        return Promise.reject(refreshError);
                    }
                }

                return Promise.reject(error);
            }
        );
    }

    setAccessToken(token: string | null): void {
        this.accessToken = token;
    }

    private handleApiError(error: ApiError): string {
        return error.response?.data?.error || error.message || 'An unexpected error occurred';
    }

    // Auth endpoints
    public async login(credentials: LoginCredentials): Promise<ApiResponse<AuthResponse>> {
        try {
            const response: AxiosResponse<AuthResponse> = await this.axiosInstance.post('/auth/login', credentials);
            return { success: true, data: response.data };
        } catch (error) {
            return { success: false, error: this.handleApiError(error as ApiError) };
        }
    }

    public async register(credentials: RegisterCredentials): Promise<ApiResponse<{ user: User; message: string }>> {
        try {
            const response = await this.axiosInstance.post('/auth/register', credentials);
            return { success: true, data: response.data };
        } catch (error) {
            return { success: false, error: this.handleApiError(error as ApiError) };
        }
    }

    public async refreshToken(): Promise<ApiResponse<{ access_token: string }>> {
        try {
            const response = await this.axiosInstance.post('/auth/refresh', "", { headers: { 'Content-Type': 'application/json' } });
            return { success: true, data: response.data };
        } catch (error) {
            return { success: false, error: this.handleApiError(error as ApiError) };
        }
    }

    public async logout(): Promise<ApiResponse> {
        try {
            await this.axiosInstance.post('/auth/logout');
            return { success: true };
        } catch (error) {
            return { success: false, error: this.handleApiError(error as ApiError) };
        }
    }

    public async getCurrentUser(): Promise<ApiResponse<{ user: User }>> {
        try {
            const response = await this.axiosInstance.get('/auth/me');
            return { success: true, data: response.data };
        } catch (error) {
            return { success: false, error: this.handleApiError(error as ApiError) };
        }
    }

    // Image endpoints
    public async getImageList(): Promise<ApiResponse<ImageListResponse>> {
        try {
            const response = await this.axiosInstance.get('/images/list');
            return { success: true, data: response.data };
        } catch (error) {
            return { success: false, error: this.handleApiError(error as ApiError) };
        }
    }

    public async getImage(imageId: number): Promise<ApiResponse<Blob>> {
        try {
            const response = await this.axiosInstance.get(`/images/${imageId}`, {
                responseType: 'blob'
            });
            return { success: true, data: response.data };
        } catch (error) {
            return { success: false, error: this.handleApiError(error as ApiError) };
        }
    }

    public async getImageMetadata(imageId: number): Promise<ApiResponse<{ metadata: ImageMetadata }>> {
        try {
            const response = await this.axiosInstance.get(`/images/metadata/${imageId}`);
            return { success: true, data: response.data };
        } catch (error) {
            return { success: false, error: this.handleApiError(error as ApiError) };
        }
    }
    setTokenRefreshCallback(callback: (token: string) => void): void {
        this.onTokenRefreshed = callback;
    }

    setAuthErrorCallback(callback: () => void): void {
        this.onAuthError = callback;
    }

    get instance(): AxiosInstance {
        return this.axiosInstance;
    }
}

export const apiService = new ApiService();
export const api = apiService.instance;