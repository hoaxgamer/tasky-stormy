import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { NotificationsProvider } from "./contexts/NotificationsContext";
import Sidebar, { MobileNav } from "./components/Sidebar";
import TopBar from "./components/TopBar";
import Login from "./pages/Login";
import Tasky from "./pages/Tasky";
import Tasker from "./pages/Tasker";
import Stormy from "./pages/Stormy";
import Stormer from "./pages/Stormer";
import Search from "./pages/Search";
import Settings from "./pages/Settings";
import { Loader2 } from "lucide-react";

function ProtectedLayout({ children }) {
  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto pb-16 md:pb-0">{children}</main>
      </div>
      <MobileNav />
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading)
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 size={28} className="text-amber-500 animate-spin" />
      </div>
    );
  if (!user) return <Navigate to="/login" replace />;
  return <ProtectedLayout>{children}</ProtectedLayout>;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading)
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 size={28} className="text-amber-500 animate-spin" />
      </div>
    );
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/" element={<ProtectedRoute><Tasky /></ProtectedRoute>} />
      <Route path="/tasker" element={<ProtectedRoute><Tasker /></ProtectedRoute>} />
      <Route path="/stormy" element={<ProtectedRoute><Stormy /></ProtectedRoute>} />
      <Route path="/stormer" element={<ProtectedRoute><Stormer /></ProtectedRoute>} />
      <Route path="/search" element={<ProtectedRoute><Search /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationsProvider>
          <AppRoutes />
        </NotificationsProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
