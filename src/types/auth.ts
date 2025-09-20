export interface User {
    id: number;
    username: string;
    email: string;
    is_active: boolean;
    created_at: string | null;
    last_login: string | null;
}

export interface LoginCredentials {
    username: string;
    password: string;
}

export interface RegisterCredentials {
    username: string;
    email: string;
    password: string;
}

export interface AuthResponse {
    message: string;
    access_token: string;
    user: User;
}

export interface AuthError {
    error: string;
}

export interface AuthState {
    isAuthenticated: boolean;
    user: User | null;
    accessToken: string | null;
    loading: boolean;
    error: string | null;
}

export type AuthAction =
    | { type: 'LOGIN_SUCCESS'; payload: { user: User; accessToken: string } }
    | { type: 'LOGOUT' }
    | { type: 'TOKEN_REFRESHED'; payload: { accessToken: string } }
    | { type: 'SET_LOADING'; payload: boolean }
    | { type: 'SET_ERROR'; payload: string | null }
    | { type: 'SET_USER'; payload: User };