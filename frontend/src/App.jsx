import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Toaster } from 'react-hot-toast';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Register from './pages/Register';
import CompleteProfile from './pages/CompleteProfile';
import Dashboard from './pages/Dashboard';
import Chatbot from './pages/Chatbot';
import NutritionPlan from './pages/NutritionPlan';
import RamadanMode from './pages/RamadanMode';
import Gyms from './pages/Gyms';
import Progress from './pages/Progress';
import UserProfile from './pages/UserProfile';
import HistoryPage from './pages/History';


import { ScreenLoader } from './components/Loader';

// Protected Route Wrapper
const ProtectedRoute = ({ children, requireProfile = true }) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) return <ScreenLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (requireProfile && !user?.profileCompleted) {
    return <Navigate to="/complete-profile" replace />;
  }

  return children;
};

// Main App Layout Wrapper
const AppLayout = ({ darkMode, setDarkMode }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { user } = useAuth();

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-950 text-slate-100">
      <Navbar darkMode={darkMode} setDarkMode={setDarkMode} />
      <div className="flex flex-1 overflow-hidden">
        {user?.profileCompleted && (
          <Sidebar isCollapsed={sidebarCollapsed} setIsCollapsed={setSidebarCollapsed} />
        )}
        <main className="flex-1 overflow-y-auto bg-slate-950">
          <Routes>
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/chat"
              element={
                <ProtectedRoute>
                  <Chatbot />
                </ProtectedRoute>
              }
            />
            <Route
              path="/plan"
              element={
                <ProtectedRoute>
                  <NutritionPlan />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ramadan"
              element={
                <ProtectedRoute>
                  <RamadanMode />
                </ProtectedRoute>
              }
            />
            <Route
              path="/gyms"
              element={
                <ProtectedRoute>
                  <Gyms />
                </ProtectedRoute>
              }
            />
            <Route
              path="/progress"
              element={
                <ProtectedRoute>
                  <Progress />
                </ProtectedRoute>
              }
            />

            <Route
              path="/history"
              element={
                <ProtectedRoute>
                  <HistoryPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute requireProfile={false}>
                  <UserProfile />
                </ProtectedRoute>
              }
            />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export const App = () => {
  const [darkMode, setDarkMode] = useState(true);

  // Apply dark class to body
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      document.body.classList.remove('light-mode');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.add('light-mode');
    }
  }, [darkMode]);

  return (
    <AuthProvider>
      <Router>
        <div className="h-screen bg-slate-950 text-slate-100 selection:bg-emerald-500/30 selection:text-emerald-350">
          {/* Toast Notification Container */}
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: '#0f172a',
                color: '#f1f5f9',
                border: '1px solid #1e293b',
                borderRadius: '16px',
                padding: '12px 16px',
                fontSize: '13px',
                fontWeight: '600',
              },
              success: {
                iconTheme: {
                  primary: '#10b981',
                  secondary: '#0f172a',
                },
              },
              error: {
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#0f172a',
                },
              },
            }}
          />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/complete-profile"
              element={
                <ProtectedRoute requireProfile={false}>
                  <CompleteProfile />
                </ProtectedRoute>
              }
            />
            <Route path="/*" element={<AppLayout darkMode={darkMode} setDarkMode={setDarkMode} />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
};

export default App;
