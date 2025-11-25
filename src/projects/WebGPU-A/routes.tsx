
import { type RouteObject, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage';

const routesConfig: RouteObject[] = [
    {
        path: "/",
        element: (<HomePage />)
    },
    {
        path: "/*",
        element: <Navigate to="/" replace />
    },
];
export default routesConfig;