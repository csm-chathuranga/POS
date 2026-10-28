import { createBrowserRouter, createHashRouter, Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectToken, selectRole, selectFeatures } from '../features/auth/authSlice';
import AppLayout      from '../layouts/AppLayout';
import CashierLayout  from '../layouts/CashierLayout';
import GuestLayout    from '../layouts/GuestLayout';
import Login       from '../pages/Login';
import Dashboard        from '../pages/Dashboard';
import ManagerDashboard from '../pages/ManagerDashboard';

function DashboardRoute() {
  return localStorage.getItem('use_manager_dashboard') === 'true' ? <ManagerDashboard /> : <Dashboard />;
}
import ProductsIndex  from '../pages/products/Index';
import ProductCreate  from '../pages/products/Create';
import ProductEdit    from '../pages/products/Edit';
import ProductIntake  from '../pages/products/Intake';
import SalesIndex     from '../pages/sales/Index';
import SalesCreate    from '../pages/sales/Create';
import SalesCreate2   from '../pages/sales/Create2';
import SalesCreate3   from '../pages/sales/Create3';
import SalesShow      from '../pages/sales/Show';
import DailyReport    from '../pages/sales/DailyReport';
import CustomersIndex  from '../pages/customers/Index';
import CustomerCredit  from '../pages/customers/Credit';
import CreditIndex     from '../pages/credit/Index';
import PurchasesIndex      from '../pages/purchases/Index';
import PurchasesCreate     from '../pages/purchases/Create';
import PurchasesShow       from '../pages/purchases/Show';
import FreeItemsReport     from '../pages/purchases/FreeItemsReport';
import Reports         from '../pages/reports/Index';
import UsersIndex     from '../pages/users/Index';
import SuppliersIndex      from '../pages/suppliers/Index';
import SupplierCredit      from '../pages/suppliers/Credit';
import SupplierCreditIndex from '../pages/supplier-credit/Index';
import CategoriesIndex  from '../pages/categories/Index';
import ImportDataPage    from '../pages/admin/ImportData';
import ProvisionTenant  from '../pages/admin/ProvisionTenant';
import ModulesPage      from '../pages/admin/Modules';
import ChartOfAccounts      from '../pages/accounting/ChartOfAccounts';
import LoadingSheetsIndex   from '../pages/loading-sheets/Index';
import LoadingSheetShow     from '../pages/loading-sheets/Show';
import CoopCityIndex        from '../pages/coop-city/Index';
import VanSalesIndex        from '../pages/van-sales/Index';
import VanSalesShow         from '../pages/van-sales/Show';
import SmsCenter            from '../pages/sms/Index';
import PayrollIndex         from '../pages/payroll/Index';
import JournalCreate    from '../pages/accounting/JournalCreate';
import JournalShow      from '../pages/accounting/JournalShow';
import Settings         from '../pages/Settings';
import RolesPage        from '../pages/settings/Roles';
import InvoicesIndex    from '../pages/invoices/Index';
import InvoiceCreate    from '../pages/invoices/Create';
import InvoiceShow      from '../pages/invoices/Show';

function ProtectedRoute() {
  const token = useSelector(selectToken);
  return token ? <Outlet /> : <Navigate to="/login" replace />;
}

function POSRoute() {
  const iface = localStorage.getItem('pos_interface') || '2';
  return iface === '3' ? <SalesCreate3 /> : iface === '2' ? <SalesCreate2 /> : <SalesCreate />;
}

const MGMT_FEATURES = ['reports', 'users', 'settings', 'data_import', 'role_permissions', 'invoices'];

function RoleLayout() {
  const role = useSelector(selectRole);
  return role === 'cashier' ? <CashierLayout /> : <AppLayout />;
}

// Allow access if admin OR if the user has at least one management feature
function AdminRoute() {
  const role     = useSelector(selectRole);
  const features = useSelector(selectFeatures);
  if (role === 'admin') return <Outlet />;
  const hasMgmt = features === null || MGMT_FEATURES.some(f => features.includes(f));
  return hasMgmt ? <Outlet /> : <Navigate to="/dashboard" replace />;
}

// Guard a single page by its feature key
function FeatureRoute({ feature }) {
  const role     = useSelector(selectRole);
  const features = useSelector(selectFeatures);
  const allowed  = role === 'admin' || features === null || features.includes(feature);
  return allowed ? <Outlet /> : <Navigate to="/dashboard" replace />;
}

function AdminOnlyRoute() {
  const role = useSelector(selectRole);
  return role === 'admin' ? <Outlet /> : <Navigate to="/dashboard" replace />;
}

// Electron's packaged renderer loads index.html via the `file://` protocol,
// where `window.location.pathname` resolves to the absolute file path on
// disk instead of `/`. createBrowserRouter can never match a route against
// that, so it falls straight to the router's default 404 error screen.
// createHashRouter keeps all routing state after a `#`, which is untouched
// by `file://` resolution, so it works correctly in the packaged app. The
// web/PWA build still gets clean URLs via createBrowserRouter.
const isElectron = typeof window !== 'undefined' && !!window.electronAPI?.isElectron;
const createAppRouter = isElectron ? createHashRouter : createBrowserRouter;

function SmsPaymentDone() {
  const params = new URLSearchParams(window.location.search);
  const status = params.get('status') || 'success';
  window.parent?.postMessage({ type: 'sms-payment-done', status }, '*');
  return (
    <div style={{ fontFamily: 'sans-serif', textAlign: 'center', padding: '60px 20px' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>{status === 'success' ? '✅' : '❌'}</div>
      <h2 style={{ margin: 0, color: status === 'success' ? '#16a34a' : '#dc2626' }}>
        {status === 'success' ? 'Payment Successful!' : 'Payment Cancelled'}
      </h2>
      <p style={{ color: '#64748b', marginTop: 8 }}>You can close this window.</p>
    </div>
  );
}

export const router = createAppRouter([
  {
    path: '/login',
    element: <GuestLayout><Login /></GuestLayout>,
  },
  {
    path: '/sms-payment-done',
    element: <SmsPaymentDone />,
  },
  {
    element: <ProtectedRoute />,
    children: [{
      element: <RoleLayout />,
      children: [
        { index: true,                  element: <Navigate to="/dashboard" replace /> },
        { path: 'dashboard',            element: <DashboardRoute /> },
        { path: 'sales',                element: <SalesIndex /> },
        { path: 'sales/create',         element: <POSRoute /> },
        { path: 'sales/daily-report',   element: <DailyReport /> },
        { path: 'sales/:id',            element: <SalesShow /> },
        { path: 'products',             element: <ProductsIndex /> },
        { path: 'products/create',      element: <ProductCreate /> },
        { path: 'products/intake',      element: <ProductIntake /> },
        { path: 'products/:id/edit',    element: <ProductEdit /> },
        { path: 'customers',            element: <CustomersIndex /> },
        { path: 'customers/:id/credit', element: <CustomerCredit /> },
        { path: 'credit',               element: <CreditIndex /> },
        { path: 'purchases',                    element: <PurchasesIndex /> },
        { path: 'purchases/create',            element: <PurchasesCreate /> },
        { path: 'purchases/free-items-report', element: <FreeItemsReport /> },
        { path: 'purchases/:id',               element: <PurchasesShow /> },
        { path: 'suppliers',              element: <SuppliersIndex /> },
        { path: 'suppliers/:id/credit',  element: <SupplierCredit /> },
        { path: 'supplier-credit',        element: <SupplierCreditIndex /> },
        { path: 'categories',           element: <CategoriesIndex /> },
        {
          element: <AdminRoute />,
          children: [
            { element: <FeatureRoute feature="reports" />,          children: [{ path: 'reports', element: <Reports /> }] },
            { element: <FeatureRoute feature="users" />,            children: [{ path: 'users',   element: <UsersIndex /> }] },
            { element: <FeatureRoute feature="settings" />,         children: [
              { path: 'settings',       element: <Settings /> },
              { path: 'settings/roles', element: <RolesPage /> },
            ]},
            { element: <FeatureRoute feature="invoices" />,         children: [
              { path: 'invoices',        element: <InvoicesIndex /> },
              { path: 'invoices/create', element: <InvoiceCreate /> },
              { path: 'invoices/:id',    element: <InvoiceShow /> },
            ]},
            {
              element: <AdminOnlyRoute />,
              children: [
                { path: 'admin/data-import',       element: <ImportDataPage /> },
                { path: 'admin/provision-tenant',  element: <ProvisionTenant /> },
                { path: 'admin/modules',           element: <ModulesPage /> },
              ],
            },
            {
              element: <FeatureRoute feature="accounting" />,
              children: [
                { path: 'accounting',                element: <ChartOfAccounts /> },
                { path: 'accounting/accounts',       element: <Navigate to="/accounting" replace /> },
                { path: 'accounting/journal',        element: <Navigate to="/accounting" replace /> },
                { path: 'accounting/journal/create', element: <JournalCreate /> },
                { path: 'accounting/journal/:id',    element: <JournalShow /> },
              ],
            },
            {
              element: <FeatureRoute feature="loading_sheet" />,
              children: [
                { path: 'loading-sheets',     element: <LoadingSheetsIndex /> },
                { path: 'loading-sheets/:id', element: <LoadingSheetShow /> },
              ],
            },
            {
              element: <FeatureRoute feature="coop_city" />,
              children: [
                { path: 'coop-city', element: <CoopCityIndex /> },
              ],
            },
            {
              element: <FeatureRoute feature="van_sales" />,
              children: [
                { path: 'van-sales',     element: <VanSalesIndex /> },
                { path: 'van-sales/:id', element: <VanSalesShow /> },
              ],
            },
            {
              element: <FeatureRoute feature="payroll" />,
              children: [
                { path: 'payroll', element: <PayrollIndex /> },
              ],
            },
            {
              element: <FeatureRoute feature="sms" />,
              children: [
                { path: 'sms', element: <SmsCenter /> },
              ],
            },
          ],
        },
      ],
    }],
  },
]);
