import React, { createContext, useContext, useEffect, useState } from "react";
import api from "../services/api";

type User = {
  user_id: number;
  rol: "admin" | "user";
  email: string;
  id_operario: number;
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType>(null!);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Validar token al arrancar la app
  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      setLoading(false);
      return;
    }

    api.get("/auth/me")
      .then(res => setUser(res.data))
      .catch(() => logout())
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    try {
      console.log("Intentando login a:", api.defaults.baseURL);
      console.log("Enviando:", JSON.stringify({ email, password }));
      const res = await api.post("/auth/login", { email, password });
      console.log("Respuesta login:", JSON.stringify(res.data));
      const { access_token } = res.data;

      localStorage.setItem("token", access_token);

      // El interceptor ya añade el token, pero como acabamos de guardarlo
      // hacemos la petición directamente con el header
      const meRes = await api.get("/auth/me", {
        headers: { Authorization: `Bearer ${access_token}` }
      });

      setUser(meRes.data);
      return true;
    } catch (err: any) {
    console.log("ERROR login status:", err.response?.status);
    console.log("ERROR login data:", JSON.stringify(err.response?.data));
    console.log("ERROR login message:", err.message);
    console.log("Error completo:", JSON.stringify(err.response?.data));
    console.log("Config usado:", JSON.stringify(err.config));  // 👈 esto muestra qué URL y body usó axios
    return false;
  }
};

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};