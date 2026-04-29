import { createContext, useContext, useState, useEffect } from "react";
import api from "../utils/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState({
    preferred_mode: "study",
    motivation_reason: "",
    motivation_who: "",
    motivation_stakes: "",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("eyespy_token");
    if (token) {
      api
        .get("/api/auth/me")
        .then((res) => {
          setUser(res.data);
          if (res.data.profile) setProfile(res.data.profile);
        })
        .catch(() => {
          localStorage.removeItem("eyespy_token");
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (username, password) => {
    const res = await api.post("/api/auth/login", { username, password });
    localStorage.setItem("eyespy_token", res.data.token);
    setUser({ id: res.data.user_id, username: res.data.username });
    if (res.data.profile) setProfile(res.data.profile);
    return res.data;
  };

  const register = async (username, email, password) => {
    const res = await api.post("/api/auth/register", { username, email, password });
    localStorage.setItem("eyespy_token", res.data.token);
    setUser({ id: res.data.user_id, username: res.data.username });
    return res.data;
  };

  const updateProfile = async (data) => {
    await api.put("/api/auth/profile", data);
    setProfile((prev) => ({ ...prev, ...data }));
  };

  const logout = () => {
    localStorage.removeItem("eyespy_token");
    setUser(null);
    setProfile({ preferred_mode: "study", motivation_reason: "", motivation_who: "", motivation_stakes: "" });
  };

  const needsOnboarding = user && !profile.motivation_reason;

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, register, logout, updateProfile, needsOnboarding }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
