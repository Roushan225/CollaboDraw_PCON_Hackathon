import { createContext, useContext, useState, useEffect } from "react";
import api from "../utils/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true); // checking session on mount

  // On app load — check if user has a valid cookie session
  useEffect(() => {
    api.get("/auth/me")
      .then(res => {
        const u = res.data.user;
        const normalized = u ? { ...u, id: u._id || u.id, _id: u._id || u.id } : null;
        setUser(normalized);
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const res = await api.post("/auth/login", { email: email.trim().toLowerCase(), password });
    if (res.data.token) {
      localStorage.setItem("token", res.data.token);
    }
    const u = res.data.user;
    const normalized = u ? { ...u, id: u._id || u.id, _id: u._id || u.id } : null;
    setUser(normalized);
    return res.data;
  };

  const register = async (username, email, password) => {
    const res = await api.post("/auth/register", { username, email, password });
    if (res.data.token) {
      localStorage.setItem("token", res.data.token);
    }
    const u = res.data.user;
    const normalized = u ? { ...u, id: u._id || u.id, _id: u._id || u.id } : null;
    setUser(normalized);
    return res.data;
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (err) {
      console.error("Logout request error", err);
    }
    localStorage.removeItem("token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook for easy access
export const useAuth = () => useContext(AuthContext);
