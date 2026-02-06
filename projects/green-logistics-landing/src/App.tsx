import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ToastProvider } from "./contexts/ToastContext";
import { Layout } from "./components/Layout";
import { DashboardLayout } from "./components/DashboardLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ConsoleProvider } from "./console/context/ConsoleContext";
import { ConsoleLayout } from "./console/components/ConsoleLayout";
import Gate from "./pages/Gate";
import ShipperLanding from "./pages/ShipperLanding";
import CarrierLanding from "./pages/CarrierLanding";
import OwnerLanding from "./pages/OwnerLanding";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ShipperDashboard from "./pages/dashboards/ShipperDashboard";
import CarrierDashboard from "./pages/dashboards/CarrierDashboard";
import OwnerDashboard from "./pages/dashboards/OwnerDashboard";
import { Dashboard as ConsoleDashboard } from "./console/pages/Dashboard";
import { APIKeys } from "./console/pages/APIKeys";
import { Documentation } from "./console/pages/Documentation";
import { Logs } from "./console/pages/Logs";
import { Webhooks } from "./console/pages/Webhooks";
import { Integrations } from "./console/pages/Integrations";
import { Billing } from "./console/pages/Billing";
import { Settings } from "./console/pages/Settings";

export default function App() {
  // Check window flags for app type (set by index.html)
  const appType = (window as any).__APP_TYPE__ || 'landing';
  const blockedRoutes = (window as any).__BLOCKED_ROUTES__ || [];

  // Helper to check if route is blocked
  const isRouteBlocked = (path: string) => {
    return blockedRoutes.some((blocked: string) => {
      if (blocked === '/') return path === '/';
      return path.startsWith(blocked);
    });
  };

  return (
    <ToastProvider>
      <AuthProvider>
        <ConsoleProvider>
          <Routes>
            {/* Landing Pages - Only render if not blocked */}
            {!isRouteBlocked('/') && (
              <Route element={<Layout />}>
                <Route index element={<Gate />} />
                {!isRouteBlocked('/shipper') && <Route path="/shipper" element={<ShipperLanding />} />}
                {!isRouteBlocked('/carrier') && <Route path="/carrier" element={<CarrierLanding />} />}
                {!isRouteBlocked('/owner') && <Route path="/owner" element={<OwnerLanding />} />}
              </Route>
            )}

            {/* Auth Pages */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Dashboard Pages */}
            <Route
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard/shipper" element={<ShipperDashboard />} />
              <Route path="/dashboard/carrier" element={<CarrierDashboard />} />
              <Route path="/dashboard/owner" element={<OwnerDashboard />} />
            </Route>

            {/* API Console Pages - Only render if not blocked */}
            {!isRouteBlocked('/console') && (
              <Route
                path="/console"
                element={<ConsoleLayout />}
              >
                <Route index element={<ConsoleDashboard />} />
                <Route path="api-keys" element={<APIKeys />} />
                <Route path="documentation" element={<Documentation />} />
                <Route path="logs" element={<Logs />} />
                <Route path="webhooks" element={<Webhooks />} />
                <Route path="integrations" element={<Integrations />} />
                <Route path="billing" element={<Billing />} />
                <Route path="settings" element={<Settings />} />
              </Route>
            )}

            {/* Catch All - Redirect based on app type */}
            <Route path="*" element={<Navigate to={appType === 'console' ? '/console' : '/'} replace />} />
          </Routes>
        </ConsoleProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
