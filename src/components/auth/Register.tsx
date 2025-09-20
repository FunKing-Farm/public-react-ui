import React, { useState, type FormEvent } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { RegisterCredentials } from '@/types/auth';

interface RegisterProps {
    onSuccess?: () => void;
}

const Register: React.FC<RegisterProps> = ({ onSuccess }) => {
    const [formData, setFormData] = useState<RegisterCredentials>({
        username: '',
        email: '',
        password: '',
    });
    const [confirmPassword, setConfirmPassword] = useState<string>('');
    const [localError, setLocalError] = useState<string | null>(null);

    const { register, loading, error } = useAuth();

    const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
        e.preventDefault();
        setLocalError(null);

        // Validation
        if (!formData.username.trim() || !formData.email.trim() || !formData.password.trim()) {
            setLocalError('Please fill in all fields');
            return;
        }

        if (formData.password !== confirmPassword) {
            setLocalError('Passwords do not match');
            return;
        }

        if (formData.password.length < 8) {
            setLocalError('Password must be at least 8 characters long');
            return;
        }

        const result = await register(formData);

        if (result.success) {
            onSuccess?.();
        } else {
            setLocalError(result.error || 'Registration failed');
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
        const { name, value } = e.target;
        if (name === 'confirmPassword') {
            setConfirmPassword(value);
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: value,
            }));
        }
    };

    const displayError = localError || error;

    return (
        <div className="register-form">
            <h2>Register</h2>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label htmlFor="username">Username:</label>
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
                    <label htmlFor="email">Email:</label>
                    <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
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
                        minLength={8}
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="confirmPassword">Confirm Password:</label>
                    <input
                        type="password"
                        id="confirmPassword"
                        name="confirmPassword"
                        value={confirmPassword}
                        onChange={handleChange}
                        required
                        disabled={loading}
                    />
                </div>
                {displayError && <div className="error-message">{displayError}</div>}
                <button type="submit" disabled={loading} className="submit-button">
                    {loading ? 'Creating Account...' : 'Register'}
                </button>
            </form>
        </div>
    );
};

export default Register;