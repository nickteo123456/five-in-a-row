"use client";

import { createContext, useContext, useState, useEffect, ReactNode, } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

interface User { id: string; email: string; name: string; role: string; }

interface AuthContextType {
  user: User | null;
  login: ( email: string, password: string, redirectTo?: string ) => Promise<void>;
  register: ( email: string, password: string, name: string, redirectTo?: string ) => Promise<void>;
  loginAsGuest: (redirectTo?: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
  isGuest: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const getInitialSession = async () => {
      try {
        const savedUser = localStorage.getItem("user");
        const savedIsGuest = localStorage.getItem("isGuest") === "true";
        const sessionTimestamp = localStorage.getItem("sessionTimestamp");

        if (savedUser && sessionTimestamp) {
          const timestamp = parseInt(sessionTimestamp);
          const now = Date.now();
          const twentyFourHours = 24 * 60 * 60 * 1000;

          if (now - timestamp < twentyFourHours) {
            const parsedUser = JSON.parse(savedUser);
            setUser(parsedUser);
            setIsGuest(savedIsGuest);
            setLoading(false);
            return;
          } else {
            localStorage.removeItem("user");
            localStorage.removeItem("isGuest");
            localStorage.removeItem("sessionTimestamp");
          }
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.user) {
          await fetchUserProfile(session.user.email!);
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.log("Supabase not configured, using development mode");
        setLoading(false);
      }
    };

    getInitialSession();

    try {
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === "SIGNED_IN" && session?.user) {
          await fetchUserProfile(session.user.email!);
        } else if (event === "SIGNED_OUT") {
          setUser(null);
          setLoading(false);
          localStorage.removeItem("user");
          localStorage.removeItem("isGuest");
          localStorage.removeItem("sessionTimestamp");
        }
      });

      return () => subscription.unsubscribe();
    } catch (error) {
      console.log("Supabase auth listener not available in development mode");
    }
  }, []);

  const fetchUserProfile = async (email: string) => {
    try {
      const response = await fetch("/api/auth/me");
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        localStorage.setItem("user", JSON.stringify(data.user));
        localStorage.setItem("isGuest", "false");
        localStorage.setItem("sessionTimestamp", Date.now().toString());
      } else {
        console.warn("User not found in database, they need to register");
        setUser(null);
        localStorage.removeItem("user");
        localStorage.removeItem("isGuest");
        localStorage.removeItem("sessionTimestamp");
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);

      setUser(null);
      localStorage.removeItem("user");
      localStorage.removeItem("isGuest");
      localStorage.removeItem("sessionTimestamp");
    } finally {
      setLoading(false);
    }
  };

  const login = async ( email: string, password: string, redirectTo?: string ) => {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "Login failed");
    }

    const data = await response.json();
    setUser(data.user);
    localStorage.setItem("user", JSON.stringify(data.user));
    localStorage.setItem("isGuest", "false");
    localStorage.setItem("sessionTimestamp", Date.now().toString());

    try {
      await supabase.auth.signInWithPassword({
        email,
        password,
      });
    } catch (authError) {
      console.log("Supabase Auth not configured, using local session only");
    }

    router.push(redirectTo || "/");
  };

  const register = async ( email: string, password: string, name: string, redirectTo?: string ) => {
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        name: name,
      }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "Failed to create user profile");
    }

    const data = await response.json();
    setUser(data.user);
    localStorage.setItem("user", JSON.stringify(data.user));
    localStorage.setItem("isGuest", "false");
    localStorage.setItem("sessionTimestamp", Date.now().toString());

    try {
      await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name,
          },
        },
      });
    } catch (authError) {
      console.log(
        "Supabase Auth not configured, using local authentication only"
      );
    }

    router.push(redirectTo || "/");
  };

  const loginAsGuest = async (redirectTo?: string) => {
    const guestUser: User = { id: `guest-${Date.now()}`, email: "guest@local", name: "Guest Player", role: "student", };

    setUser(guestUser);
    setIsGuest(true);
    localStorage.setItem("user", JSON.stringify(guestUser));
    localStorage.setItem("isGuest", "true");
    localStorage.setItem("sessionTimestamp", Date.now().toString());

    router.push(redirectTo || "/");
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.log("Supabase Auth not configured");
    }
    setUser(null);
    setIsGuest(false);
    localStorage.removeItem("user");
    localStorage.removeItem("isGuest");
    localStorage.removeItem("sessionTimestamp");
    router.push("/login");
  };

  return (
    <AuthContext.Provider
      value={{ user, login, register, loginAsGuest, logout, loading, isGuest }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
