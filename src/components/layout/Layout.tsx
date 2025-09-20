import React, { type ReactNode } from 'react';
import Navigation from './Navigation';

interface LayoutProps {
    children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
    return (
        <div className="app-layout">
            <Navigation />
            <main className="main-content">
                {children}
            </main>
        </div>
    );
};

export default Layout;