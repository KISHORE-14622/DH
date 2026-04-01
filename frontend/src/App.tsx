import { NavLink, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { useAuth } from "./context/AuthContext";
import { AdminPage } from "./pages/AdminPage";
import { CharitiesPage } from "./pages/CharitiesPage";
import { DashboardPage } from "./pages/DashboardPage";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";

function App() {
  const { user, logout } = useAuth();

  return (
    <div className="app-shell">
      <header className="topbar">
        <h1>Drive For Good</h1>
        <nav>
          <NavLink to="/">Home</NavLink>
          <NavLink to="/charities">Charities</NavLink>
          {user ? <NavLink to="/dashboard">Dashboard</NavLink> : <NavLink to="/login">Login</NavLink>}
          {user?.role === "admin" && <NavLink to="/admin">Admin</NavLink>}
          {user ? (
            <button className="ghost-btn" onClick={logout}>
              Logout
            </button>
          ) : (
            <NavLink to="/register">Register</NavLink>
          )}
        </nav>
      </header>

      <main className="main-content">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/charities" element={<CharitiesPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute requireAdmin>
                <AdminPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>
    </div>
  );
}

export default App;
