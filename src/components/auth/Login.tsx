import React, { useState, type FormEvent } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { type LoginCredentials } from '@/types/auth';

interface LoginProps {
    onSuccess?: () => void;
}

const Login: React.FC<LoginProps> = ({ onSuccess }) => {
    const [formData, setFormData] = useState<LoginCredentials>({
        username: '',
        password: '',
    });
    const [localError, setLocalError] = useState<string | null>(null);

    const { login, loading, error } = useAuth();

    const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
        e.preventDefault();
        setLocalError(null);

        if (!formData.username.trim() || !formData.password.trim()) {
            setLocalError('Please fill in all fields');
            return;
        }

        const result = await login(formData);

        if (result.success) {
            onSuccess?.();
        } else {
            setLocalError(result.error || 'Login failed');
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value,
        }));
    };

    const displayError = localError || error;

    return (
        <div className="login-form">
            <h2>Login</h2>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label htmlFor="username">Username or Email:</label>
                    <input
                        type="text"
                        id="username"
                        name="username"
                        value={formData.username}
                        onChange={handleChange}
                        required
                        disabled={loading}
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="password">Password:</label>
                    <input
                        type="password"
                        id="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                        disabled={loading}
                    />
                </div>
                {displayError && <div className="error-message">{displayError}</div>}
                <button type="submit" disabled={loading} className="submit-button">
                    {loading ? 'Logging in...' : 'Login'}
                </button>
            </form>
        </div>
    );
};

export default Login;