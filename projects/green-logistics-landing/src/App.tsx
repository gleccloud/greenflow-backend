import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import Gate from "./pages/Gate";
import ShipperLanding from "./pages/ShipperLanding";
import CarrierLanding from "./pages/CarrierLanding";
import OwnerLanding from "./pages/OwnerLanding";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Gate />} />
        <Route path="/shipper" element={<ShipperLanding />} />
        <Route path="/carrier" element={<CarrierLanding />} />
        <Route path="/owner" element={<OwnerLanding />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
