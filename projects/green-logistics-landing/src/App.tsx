import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import ShipperLanding from "./pages/ShipperLanding";
import CarrierLanding from "./pages/CarrierLanding";
import OwnerLanding from "./pages/OwnerLanding";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/shipper" replace />} />
        <Route path="/shipper" element={<ShipperLanding />} />
        <Route path="/carrier" element={<CarrierLanding />} />
        <Route path="/owner" element={<OwnerLanding />} />
        {/* backwards compat */}
        <Route path="/" element={<Navigate to="/shipper" replace />} />
        <Route path="*" element={<Navigate to="/shipper" replace />} />
      </Route>
    </Routes>
  );
}
