import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useState } from "react";

const MODE_ICONS = { study: "🎓", drive: "🚗", work: "💼", night: "🌙", custom: "⚡" };

export default function Navbar() {
  const { user, profile, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const isActive = (path) => location.pathname === path ? "active" : "";
  const mode = profile?.preferred_mode || "study";

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-logo">
          <span className="logo-icon">👁️</span>
          <span>EyeSpy</span>
          {user && <span className="mode-badge">{MODE_ICONS[mode]} {mode}</span>}
        </Link>

        <button className="hamburger" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">
          <span /><span /><span />
        </button>

        <div className={`navbar-links ${menuOpen ? "open" : ""}`}>
          <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle Theme">
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
          <Link to="/" className={isActive("/")} onClick={() => setMenuOpen(false)}>Home</Link>
          {user ? (
            <>
              <Link to="/dashboard" className={isActive("/dashboard")} onClick={() => setMenuOpen(false)}>Dashboard</Link>
              <Link to="/history" className={isActive("/history")} onClick={() => setMenuOpen(false)}>History</Link>
              <Link to="/onboarding" className={isActive("/onboarding")} onClick={() => setMenuOpen(false)}>Settings</Link>
              <span className="nav-user">{user.username}</span>
              <button className="btn btn-sm btn-secondary" onClick={() => { logout(); setMenuOpen(false); }}>Logout</button>
            </>
          ) : (
            <Link to="/login" onClick={() => setMenuOpen(false)}>
              <button className="btn btn-sm btn-primary">Get Started</button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
