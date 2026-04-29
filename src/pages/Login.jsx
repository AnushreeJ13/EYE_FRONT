import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (isRegister) {
        await register(form.username, form.email, form.password);
        navigate("/onboarding");
      } else {
        await login(form.username, form.password);
        navigate("/dashboard");
      }
    } catch (err) {
      setError(err.response?.data?.detail || "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const update = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2 className="h2">👁️ EyeSpy</h2>
        <p className="auth-sub">
          {isRegister ? "Create your guardian account" : "Welcome back, stay sharp"}
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input id="username" type="text" value={form.username} onChange={update("username")} required autoComplete="username" placeholder="Your unique username" />
          </div>
          {isRegister && (
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input id="email" type="email" value={form.email} onChange={update("email")} required autoComplete="email" placeholder="you@example.com" />
            </div>
          )}
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input id="password" type="password" value={form.password} onChange={update("password")} required minLength={6} autoComplete={isRegister ? "new-password" : "current-password"} placeholder="Min 6 characters" />
          </div>
          {error && <p className="form-error">{error}</p>}
          <button type="submit" className="btn btn-primary w-full" disabled={loading} style={{ justifyContent: "center" }}>
            {loading && <span className="spinner" />}
            {isRegister ? "Create Account" : "Sign In"}
          </button>
        </form>

        <p className="auth-toggle">
          {isRegister ? "Already have an account? " : "Don't have an account? "}
          <a href="#" onClick={(e) => { e.preventDefault(); setIsRegister(!isRegister); setError(""); }}>
            {isRegister ? "Sign In" : "Sign Up"}
          </a>
        </p>
      </div>
    </div>
  );
}
