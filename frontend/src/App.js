import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import useAuthStore from "./stores/authStore";
import AppLayout from "./components/layout/AppLayout";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import BoardsPage from "./pages/BoardsPage";
import BoardPage from "./pages/BoardPage";
import TemplatesPage from "./pages/TemplatesPage";
import CollaborationPage from "./pages/CollaborationPage";
import NotificationsPage from "./pages/NotificationsPage";
import "./styles/globals.css";

function Protected({ children }) {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}
function Public({ children }) {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login"      element={<Public><Login /></Public>} />
        <Route path="/signup"     element={<Public><Signup /></Public>} />
        <Route path="/board/:id"  element={<Protected><BoardPage /></Protected>} />
        <Route path="/dashboard"  element={<Protected><AppLayout><Dashboard /></AppLayout></Protected>} />
        <Route path="/boards"     element={<Protected><AppLayout><BoardsPage /></AppLayout></Protected>} />
        <Route path="/templates"  element={<Protected><AppLayout><TemplatesPage /></AppLayout></Protected>} />
        <Route path="/collaboration" element={<Protected><AppLayout><CollaborationPage /></AppLayout></Protected>} />
        <Route path="/notifications" element={<Protected><AppLayout><NotificationsPage /></AppLayout></Protected>} />
        <Route path="/trash"      element={<Protected><AppLayout><div style={{padding:40,color:"#94A3B8",textAlign:"center"}}><div style={{fontSize:48}}>🗑️</div><p>Trash is empty</p></div></AppLayout></Protected>} />
        <Route path="/"           element={<Navigate to="/dashboard" replace />} />
        <Route path="*"           element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
