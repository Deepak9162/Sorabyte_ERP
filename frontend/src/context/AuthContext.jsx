import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

const AuthContext = createContext();

// Heartbeat interval: 90 seconds
const HEARTBEAT_INTERVAL = 90_000;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const heartbeatRef = useRef(null);

  // Send a single heartbeat ping to backend
  const sendHeartbeat = async () => {
    try {
      await api.post("/auth/heartbeat");
    } catch {
      // silent
    }
  };

  // Start heartbeat: ping IMMEDIATELY, then every 90 seconds
  const startHeartbeat = () => {
    stopHeartbeat();
    sendHeartbeat(); // ✅ Fire immediately — don't wait for first interval
    heartbeatRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);
  };

  const stopHeartbeat = () => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  };

  useEffect(() => {
    const checkLoggedIn = async () => {
      const token = localStorage.getItem("token");
      const storedUser = localStorage.getItem("user");

      if (token && storedUser) {
        setUser(JSON.parse(storedUser));
        startHeartbeat(); // resume heartbeat on page refresh
      }
      setLoading(false);
    };

    checkLoggedIn();

    // ── Mark offline when tab/browser is closed
    const handleUnload = () => {
      const token = localStorage.getItem("token");
      if (token) {
        // sendBeacon works even when page is unloading
        const baseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";
        navigator.sendBeacon(
          `${baseURL}/auth/logout`,
          new Blob([JSON.stringify({})], { type: "application/json" })
        );
      }
    };
    window.addEventListener("beforeunload", handleUnload);

    return () => {
      stopHeartbeat();
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, []);

  const login = async (email, password) => {
    try {
      const response = await api.post("/auth/login", { email, password });
      const { token, user } = response.data.data;

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      setUser(user);
      startHeartbeat(); // start heartbeat immediately after login

      return user;
    } catch (error) {
      throw error.response?.data?.message || "Login failed";
    }
  };

  const logout = async () => {
    try {
      // ── Tell backend to mark user as Offline
      await api.post("/auth/logout");
    } catch {
      // silent — still clear local state even if API fails
    } finally {
      stopHeartbeat();
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      setUser(null);
      navigate("/login");
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

