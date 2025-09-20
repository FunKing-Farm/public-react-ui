import React from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import Login from '@/components/auth/Login';
import Layout from '@/components/layout/Layout';

const LoginPage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const from = (location.state as any)?.from?.pathname || '/dashboard';

    const handleLoginSuccess = (): void => {
        navigate(from, { replace: true });
    };

    return (
        <Layout>
            <div className="auth-page">
                <Login onSuccess={handleLoginSuccess} />
                <p className="auth-link">
                    Don't have an account? <Link to="/register">Register here</Link>
                </p>
            </div>
        </Layout>
    );
};

export default LoginPage;