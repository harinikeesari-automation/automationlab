import { useEffect, useState, useRef } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import CoursesPage from "./pages/CoursesPage";
import CourseDetailPage from "./pages/CourseDetailPage";
import DashboardPage from "./pages/DashboardPage";
import AdminDashboard from "./pages/AdminDashboard";
import PaymentSuccess from "./pages/PaymentSuccess";
import RecordingsPage from "./pages/RecordingsPage";
import "@/App.css";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Auth Context
export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem("token"));

  const checkAuth = async () => {
    const storedToken = localStorage.getItem("token");
    if (!storedToken) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${storedToken}` },
        credentials: "include"
      });
      
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        setToken(storedToken);
      } else {
        localStorage.removeItem("token");
        setToken(null);
      }
    } catch (error) {
      console.error("Auth check failed:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = (userData, authToken) => {
    setUser(userData);
    setToken(authToken);
    localStorage.setItem("token", authToken);
  };

  const logout = async () => {
    try {
      await fetch(`${API}/auth/logout`, {
        method: "POST",
        credentials: "include"
      });
    } catch (e) {
      console.error(e);
    }
    setUser(null);
    setToken(null);
    localStorage.removeItem("token");
  };

  return { user, token, loading, login, logout, checkAuth };
};

// Protected Route Component
const ProtectedRoute = ({ children, auth, adminOnly = false }) => {
  const location = useLocation();
  
  if (auth.loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary"></div>
      </div>
    );
  }

  if (!auth.user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (adminOnly && auth.user.role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// Auth Callback for Google OAuth
// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
const AuthCallback = ({ auth }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const hash = location.hash;
    const sessionIdMatch = hash.match(/session_id=([^&]+)/);
    
    if (sessionIdMatch) {
      const sessionId = sessionIdMatch[1];
      
      fetch(`${API}/auth/google/session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Session-ID": sessionId
        },
        credentials: "include"
      })
        .then(res => res.json())
        .then(data => {
          if (data.token) {
            auth.login(data.user, data.token);
            navigate("/dashboard", { replace: true, state: { user: data.user } });
          } else {
            navigate("/login", { replace: true });
          }
        })
        .catch(() => {
          navigate("/login", { replace: true });
        });
    }
  }, [location, navigate, auth]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Completing sign in...</p>
      </div>
    </div>
  );
};

function AppRouter({ auth }) {
  const location = useLocation();

  // Check for session_id in hash for Google OAuth callback
  if (location.hash?.includes("session_id=")) {
    return <AuthCallback auth={auth} />;
  }

  return (
    <Routes>
      <Route path="/" element={<LandingPage auth={auth} />} />
      <Route path="/login" element={<LoginPage auth={auth} />} />
      <Route path="/register" element={<RegisterPage auth={auth} />} />
      <Route path="/courses" element={<CoursesPage auth={auth} />} />
      <Route path="/courses/:courseId" element={<CourseDetailPage auth={auth} />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute auth={auth}>
            <DashboardPage auth={auth} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute auth={auth} adminOnly>
            <AdminDashboard auth={auth} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/recordings"
        element={
          <ProtectedRoute auth={auth}>
            <RecordingsPage auth={auth} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/payment/success"
        element={
          <ProtectedRoute auth={auth}>
            <PaymentSuccess auth={auth} />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  const auth = useAuth();

  // Seed data on first load
  useEffect(() => {
    fetch(`${API}/seed`, { method: "POST" }).catch(() => {});
  }, []);

  return (
    <div className="App min-h-screen bg-background">
      <BrowserRouter>
        <AppRouter auth={auth} />
        <Toaster position="top-right" richColors />
      </BrowserRouter>
    </div>
  );
}

export default App;
