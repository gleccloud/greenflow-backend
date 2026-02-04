import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ToastProvider } from "./contexts/ToastContext";
import { Layout } from "./components/Layout";
import { DashboardLayout } from "./components/DashboardLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Gate from "./pages/Gate";
import ShipperLanding from "./pages/ShipperLanding";
import CarrierLanding from "./pages/CarrierLanding";
import OwnerLanding from "./pages/OwnerLanding";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ShipperDashboard from "./pages/dashboards/ShipperDashboard";
import CarrierDashboard from "./pages/dashboards/CarrierDashboard";
import OwnerDashboard from "./pages/dashboards/OwnerDashboard";

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
      <Routes>
        {/* Landing Pages */}
        <Route element={<Layout />}>
          <Route index element={<Gate />} />
          <Route path="/shipper" element={<ShipperLanding />} />
          <Route path="/carrier" element={<CarrierLanding />} />
          <Route path="/owner" element={<OwnerLanding />} />
        </Route>

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

        {/* Catch All */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </AuthProvider>
    </ToastProvider>
  );
}
