import { createBrowserRouter, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import RouteErrorPage from './components/shared/RouteErrorPage';
import RouteLoading from './components/shared/RouteLoading';

export const router = createBrowserRouter([
  {
    path: 'terms',
    errorElement: <RouteErrorPage />,
    hydrateFallbackElement: <RouteLoading />,
    lazy: async () => ({
      Component: (await import('./components/marketing/TermsPage')).default,
    }),
  },
  {
    path: 'privacy',
    errorElement: <RouteErrorPage />,
    hydrateFallbackElement: <RouteLoading />,
    lazy: async () => ({
      Component: (await import('./components/marketing/PrivacyPage')).default,
    }),
  },
  {
    path: '/',
    element: <MainLayout />,
    errorElement: <RouteErrorPage />,
    hydrateFallbackElement: <RouteLoading />,
    children: [
      {
        index: true,
        element: <Navigate to="/workspace" replace />,
      },
      {
        path: 'workspace',
        lazy: async () => ({
          Component: (await import('./components/workspace/WorkspacePage')).default,
        }),
      },
      {
        path: 'upload',
        lazy: async () => ({
          Component: (await import('./components/layout/LayoutParserPage')).default,
        }),
      },
      {
        path: 'analysis',
        lazy: async () => ({
          Component: (await import('./components/layout/LayoutParserPage')).default,
        }),
      },
      {
        path: 'admin',
        lazy: async () => ({
          Component: (await import('./components/auth/AdminRoute')).default,
        }),
      },
    ],
  },
]);
