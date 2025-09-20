export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
}

export interface ApiError {
    response?: {
        data?: {
            error?: string;
        };
        status?: number;
    };
    message?: string;
}