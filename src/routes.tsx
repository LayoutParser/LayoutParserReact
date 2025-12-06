import { createBrowserRouter, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import LayoutParserPage from './components/layout/LayoutParserPage';
import AdminPage from './components/admin/AdminPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: <Navigate to="/upload" replace />,
      },
      {
        path: 'upload',
        element: <LayoutParserPage />,
      },
      {
        path: 'analysis',
        element: <LayoutParserPage />,
      },
      {
        path: 'admin',
        element: <AdminPage />,
      },
    ],
  },
]);

