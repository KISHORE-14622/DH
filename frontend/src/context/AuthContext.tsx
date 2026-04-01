import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { apiClient } from "../api/client";

type User = {
  _id: string;
  name: string;
  email: string;
  role: "subscriber" | "admin";
  subscription: {
    status: "inactive" | "active" | "canceled" | "lapsed";
    plan: "monthly" | "yearly";
    renewalDate: string | null;
  };
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = async () => {
    try {
      const { data } = await apiClient.get("/auth/me");
      setUser(data.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchMe();
  }, []);

  const login = async (email: string, password: string) => {
    const { data } = await apiClient.post("/auth/login", { email, password });
    localStorage.setItem("golf_token", data.token);
    await fetchMe();
  };

  const register = async (name: string, email: string, password: string) => {
    const { data } = await apiClient.post("/auth/register", { name, email, password });
    localStorage.setItem("golf_token", data.token);
    await fetchMe();
  };

  const logout = () => {
    localStorage.removeItem("golf_token");
    setUser(null);
  };

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      register,
      logout
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
};
