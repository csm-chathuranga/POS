import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectToken, selectRole } from '../features/auth/authSlice';
import AppLayout      from '../layouts/AppLayout';
import CashierLayout  from '../layouts/CashierLayout';
import GuestLayout    from '../layouts/GuestLayout';
import Login       from '../pages/Login';
import Dashboard   from '../pages/Dashboard';
import ProductsIndex  from '../pages/products/Index';
import ProductCreate  from '../pages/products/Create';
import ProductEdit    from '../pages/products/Edit';
import SalesIndex     from '../pages/sales/Index';
import SalesCreate    from '../pages/sales/Create';
import SalesCreate2   from '../pages/sales/Create2';
import SalesShow      from '../pages/sales/Show';
import CustomersIndex from '../pages/customers/Index';
import PurchasesIndex from '../pages/purchases/Index';
import PurchasesCreate from '../pages/purchases/Create';
import PurchasesShow   from '../pages/purchases/Show';
import Reports         from '../pages/reports/Index';
import UsersIndex     from '../pages/users/Index';
import SuppliersIndex from '../pages/suppliers/Index';
import Settings       from '../pages/Settings';

function ProtectedRoute() {
  const token = useSelector(selectToken);
  return token ? <Outlet /> : <Navigate to="/login" replace />;
}

function POSRoute() {
  const iface = localStorage.getItem('pos_interface') || '1';
  return iface === '2' ? <SalesCreate2 /> : <SalesCreate />;
}

function RoleLayout() {
  const role = useSelector(selectRole);
  return role === 'cashier' ? <CashierLayout /> : <AppLayout />;
}

function AdminRoute() {
  const role = useSelector(selectRole);
  return (role === 'admin' || role === 'manager') ? <Outlet /> : <Navigate to="/dashboard" replace />;
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <GuestLayout><Login /></GuestLayout>,
  },
  {
    element: <ProtectedRoute />,
    children: [{
      element: <RoleLayout />,
      children: [
        { index: true,                  element: <Navigate to="/dashboard" replace /> },
        { path: 'dashboard',            element: <Dashboard /> },
        { path: 'sales',                element: <SalesIndex /> },
        { path: 'sales/create',         element: <POSRoute /> },
        { path: 'sales/:id',            element: <SalesShow /> },
        { path: 'products',             element: <ProductsIndex /> },
        { path: 'products/create',      element: <ProductCreate /> },
        { path: 'products/:id/edit',    element: <ProductEdit /> },
        { path: 'customers',            element: <CustomersIndex /> },
        { path: 'purchases',            element: <PurchasesIndex /> },
        { path: 'purchases/create',     element: <PurchasesCreate /> },
        { path: 'purchases/:id',        element: <PurchasesShow /> },
        { path: 'suppliers',            element: <SuppliersIndex /> },
        {
          element: <AdminRoute />,
          children: [
            { path: 'reports',  element: <Reports /> },
            { path: 'users',    element: <UsersIndex /> },
            { path: 'settings', element: <Settings /> },
          ],
        },
      ],
    }],
  },
]);
