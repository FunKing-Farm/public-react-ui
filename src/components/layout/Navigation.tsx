import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const Navigation: React.FC = () => {
    const { isAuthenticated, user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    return (
        <nav style={{
            backgroundColor: '#333',
            padding: '10px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
        }}>
            <div>
                <Link to="/" style={{ color: 'white', textDecoration: 'none', marginRight: '20px' }}>
                    Home
                </Link>
                {isAuthenticated && (
                    <Link to="/dashboard" style={{ color: 'white', textDecoration: 'none' }}>
                        Dashboard
                    </Link>
                )}
            </div>

            <div>
                {isAuthenticated ? (
                    <>
                        <span style={{ color: 'white', marginRight: '20px' }}>
                            Hello, {user?.username}
                        </span>
                        <button
                            onClick={handleLogout}
                            style={{
                                backgroundColor: '#dc3545',
                                color: 'white',
                                border: 'none',
                                padding: '5px 15px',
                                cursor: 'pointer',
                            }}
                        >
                            Logout
                        </button>
                    </>
                ) : (
                    <>
                        <Link
                            to="/login"
                            style={{
                                color: 'white',
                                textDecoration: 'none',
                                marginRight: '15px'
                            }}
                        >
                            Login
                        </Link>
                        <Link
                            to="/register"
                            style={{
                                color: 'white',
                                textDecoration: 'none'
                            }}
                        >
                            Register
                        </Link>
                    </>
                )}
            </div>
        </nav>
    );
};

export default Navigation;