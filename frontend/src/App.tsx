import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Landing } from './pages/Landing';
import { Projects } from './pages/Projects';
import { Board } from './pages/Board';
import { Members } from './pages/Members';
import { Chat } from './pages/Chat';
import { FocusMode } from './pages/FocusMode';
import { AppShell } from './components/layout/AppShell';
import { Home } from './pages/Home';
import { getPostLoginPath } from './utils/postLoginPath';
import { Profile } from './pages/Profile';

// Protected route wrapper
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0B0D10] text-[#ECEAE4]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#5EE6B0]"></div>
      </div>
    );
  }
  // Remember where they were heading, so signing in can send them back there
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  return <>{children}</>;
}

// Auth route (redirect if already authenticated)
export function GuestRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0B0D10] text-[#ECEAE4]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#5EE6B0]"></div>
      </div>
    );
  }
  if (user) return <Navigate to={getPostLoginPath(location.state)} replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      {/* Signed-in users skip the marketing page and go to Home */}
      <Route path="/" element={<GuestRoute><Landing /></GuestRoute>} />
      <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
      <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />

      {/* Authenticated — wrapped in AppShell */}
      <Route
        path="/home"
        element={
          <ProtectedRoute>
            <AppShell>
              <Home />
            </AppShell>
          </ProtectedRoute>
        }
      />
            <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <AppShell>
              <Profile />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects"
        element={
          <ProtectedRoute>
            <AppShell>
              <Projects />
            </AppShell>
          </ProtectedRoute>
        }
      />

      {/* Board — also handles task deep-link at /projects/:projectId/tasks/:taskId */}
      <Route
        path="/projects/:projectId"
        element={
          <ProtectedRoute>
            <AppShell>
              <Board />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects/:projectId/tasks/:taskId"
        element={
          <ProtectedRoute>
            <AppShell>
              <Board />
            </AppShell>
          </ProtectedRoute>
        }
      />

      {/* Members */}
      <Route
        path="/projects/:projectId/members"
        element={
          <ProtectedRoute>
            <AppShell>
              <Members />
            </AppShell>
          </ProtectedRoute>
        }
      />

      {/* Chat & AI */}
      <Route
        path="/projects/:projectId/chat"
        element={
          <ProtectedRoute>
            <AppShell>
              <Chat />
            </AppShell>
          </ProtectedRoute>
        }
      />

      {/* Focus Mode — fullscreen, no shell */}
      <Route
        path="/projects/:projectId/focus/:taskId"
        element={
          <ProtectedRoute>
            <FocusMode />
          </ProtectedRoute>
        }
      />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
