import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import AdminDashboard from "./pages/AdminDashboard";
import ClimateDashboard from "./pages/ClimateDashboard";
import UserPanel from "./pages/UserPanel";
import UploadDataset from "./pages/UploadDataset";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot" element={<ForgotPassword />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/upload" element={<UploadDataset />} />
        <Route path="/user" element={<UserPanel />} />
        <Route path="/climate" element={<ClimateDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
