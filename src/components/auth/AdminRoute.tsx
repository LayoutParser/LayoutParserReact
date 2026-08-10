import AdminPage from '../admin/AdminPage';
import RequireAdmin from './RequireAdmin';

const AdminRoute = () => (
  <RequireAdmin>
    <AdminPage />
  </RequireAdmin>
);

export default AdminRoute;
