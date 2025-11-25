
import React from 'react';
import { RouterProvider, createBrowserRouter } from "react-router-dom";
import appRoutes from './routes.tsx';
import './index.css';

const appRouter = createBrowserRouter(appRoutes);

const App: React.FC = () => {

    return (
            <RouterProvider router={appRouter} />
    );
};

export default App;