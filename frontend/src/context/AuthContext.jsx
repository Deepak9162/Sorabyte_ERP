import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api, { cancelAllPendingRequests } from "../services/api";

const AuthContext = createContext();

// Heartbeat interval: 90 seconds
const HEARTBEAT_INTERVAL = 90_000;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const heartbeatRef = useRef(null);
  const lastActivityTimeRef = useRef(0);

  // Send a single heartbeat ping to backend
  const sendHeartbeat = async () => {
    try {
      await api.post("/auth/heartbeat");
    } catch {
      // silent
    }
  };

  // Start heartbeat: schedule background ping, then every 90 seconds
  const startHeartbeat = () => {
    stopHeartbeat();
    setTimeout(sendHeartbeat, 0); // Non-blocking background ping
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

  const logout = (isInactive = false) => {
    // 1. Immediately abort all pending in-flight API requests
    cancelAllPendingRequests();

    // 2. Stop heartbeat interval
    stopHeartbeat();

    // 3. Clear auth tokens & user state locally
    const token = localStorage.getItem("token");
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    if (isInactive) {
      localStorage.setItem("inactivityLogout", "true");
    }

    setUser(null);

    // 4. Immediately transition UI to login route
    navigate("/login");

    // 5. Fire server-side logout cleanup asynchronously without blocking the UI
    if (token) {
      api.post("/auth/logout").catch(() => {});
    }
  };

  // Inactivity auto-logout: 15 minutes (900,000 ms)
  const INACTIVITY_TIMEOUT = 15 * 60 * 1000;
  const inactivityTimerRef = useRef(null);

  const resetInactivityTimer = () => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    if (user) {
      inactivityTimerRef.current = setTimeout(() => {
        logout(true);
      }, INACTIVITY_TIMEOUT);
    }
  };

  useEffect(() => {
    if (user) {
      const events = ["mousemove", "mousedown", "keypress", "scroll", "touchstart"];
      
      const handleActivity = () => {
        const now = Date.now();
        // Throttle to at most once per 5 seconds (5000ms) to eliminate CPU thrashing & scroll stutter
        if (now - lastActivityTimeRef.current > 5000) {
          lastActivityTimeRef.current = now;
          resetInactivityTimer();
        }
      };

      events.forEach((event) => {
        window.addEventListener(event, handleActivity, { passive: true });
      });

      resetInactivityTimer();

      return () => {
        events.forEach((event) => {
          window.removeEventListener(event, handleActivity);
        });
        if (inactivityTimerRef.current) {
          clearTimeout(inactivityTimerRef.current);
        }
      };
    }
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

