import { createBrowserRouter, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import UploadSection from './components/upload/UploadSection';
import AnalysisSection from './components/analysis/AnalysisSection';

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
        element: <UploadSection />,
      },
      {
        path: 'analysis',
        element: <AnalysisSection />,
      },
    ],
  },
]);

