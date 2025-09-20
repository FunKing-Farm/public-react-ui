import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Register from '@/components/auth/Register';
import Layout from '@/components/layout/Layout';

const RegisterPage: React.FC = () => {
    const navigate = useNavigate();

    const handleRegisterSuccess = (): void => {
        navigate('/login', {
            state: { message: 'Registration successful! Please log in.' }
        });
    };

    return (
        <Layout>
            <div className="auth-page">
                <Register onSuccess={handleRegisterSuccess} />
                <p className="auth-link">
                    Already have an account? <Link to="/login">Login here</Link>
                </p>
            </div>
        </Layout>
    );
};

export default RegisterPage;