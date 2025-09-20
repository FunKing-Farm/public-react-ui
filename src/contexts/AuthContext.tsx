import React, { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react';
import { apiService, api } from '@/services/api';
import type {
    AuthState,
    LoginCredentials,
    RegisterCredentials,
    AuthResponse,
    AuthAction
} from '@/types/auth';
import type { ApiResponse } from '@/types/api';

interface AuthContextType extends AuthState {
    login: (credentials: LoginCredentials) => Promise<ApiResponse>;
    register: (credentials: RegisterCredentials) => Promise<ApiResponse>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
    switch (action.type) {
        case 'LOGIN_SUCCESS':
            return {
                ...state,
                isAuthenticated: true,
                user: action.payload.user,
                accessToken: action.payload.accessToken,
                loading: false,
                error: null,
            };
        case 'LOGOUT':
            return {
                ...state,
                isAuthenticated: false,
                user: null,
                accessToken: null,
                loading: false,
                error: null,
            };
        case 'TOKEN_REFRESHED':
            return {
                ...state,
                accessToken: action.payload.accessToken,
            };
        case 'SET_USER':
            return {
                ...state,
                user: action.payload,
            };
        case 'SET_LOADING':
            return {
                ...state,
                loading: action.payload,
            };
        case 'SET_ERROR':
            return {
                ...state,
                error: action.payload,
                loading: false,
            };
        default:
            return state;
    }
};

const initialState: AuthState = {
    isAuthenticated: false,
    user: null,
    accessToken: null,
    loading: true,
    error: null,
};

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [state, dispatch] = useReducer(authReducer, initialState);

    // Set up API service callbacks
    useEffect(() => {
        apiService.setTokenRefreshCallback((newToken: string) => {
            dispatch({ type: 'TOKEN_REFRESHED', payload: { accessToken: newToken } });
        });

        apiService.setAuthErrorCallback(() => {
            dispatch({ type: 'LOGOUT' });
        });
    }, []);

    // Update API service when access token changes
    useEffect(() => {
        apiService.setAccessToken(state.accessToken);
    }, [state.accessToken]);

    // Check authentication status on mount
    useEffect(() => {
        const checkAuth = async () => {
            try {
                dispatch({ type: 'SET_LOADING', payload: true });
                const response = await api.post<AuthResponse>('/auth/refresh', {});

                if (response.data.access_token) {
                    apiService.setAccessToken(response.data.access_token);
                    const userResponse = await apiService.getCurrentUser();

                    if (userResponse.success && userResponse.data?.user) {
                    dispatch({
                        type: 'LOGIN_SUCCESS',
                        payload: {
                            accessToken: response.data.access_token,
                            user: userResponse.data.user,
                        },
                    });
                    } else {
                        dispatch({ type: 'LOGOUT' });
                }
                } else {
                    dispatch({ type: 'LOGOUT' });
                }
            } catch (error) {
                dispatch({ type: 'LOGOUT' });
            } finally {
                dispatch({ type: 'SET_LOADING', payload: false });
            }
        };

        checkAuth();
    }, []);

    const login = async (credentials: LoginCredentials): Promise<ApiResponse> => {
        try {
            dispatch({ type: 'SET_LOADING', payload: true });
            const response = await apiService.login(credentials);
            if (response.success && response.data) {
                dispatch({
                    type: 'LOGIN_SUCCESS',
                    payload: {
                        accessToken: response.data.access_token,
                        user: response.data.user,
                    },
                });
                return { success: true };
            }
        } catch (error: any) {
            const errorMessage = error.response?.data?.error || 'Login failed';
            dispatch({ type: 'SET_ERROR', payload: errorMessage });
            return { success: false, error: errorMessage };
        }
        return { success: false, error: 'Login failed: Not sure why' };
    };

    const logout = async (): Promise<void> => {
        try {
            await api.post('/auth/logout');
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            dispatch({ type: 'LOGOUT' });
        }
    };

    const register = async (credentials: RegisterCredentials): Promise<ApiResponse> => {
        try {
            dispatch({ type: 'SET_LOADING', payload: true });

            await api.post('/auth/register', credentials);

            dispatch({ type: 'SET_LOADING', payload: false });
            return { success: true };
        } catch (error: any) {
            const errorMessage = error.response?.data?.error || 'Registration failed';
            dispatch({ type: 'SET_ERROR', payload: errorMessage });
            return { success: false, error: errorMessage };
        }
    };

    const value: AuthContextType = {
        ...state,
        login,
        register,
        logout,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};