"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Terminal, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [redirectTo, setRedirectTo] = useState<string | undefined>(undefined);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { register, loginAsGuest } = useAuth();

  useEffect(() => {
    const redirect = searchParams.get("redirect");
    if (redirect) {
      setRedirectTo(decodeURIComponent(redirect));
    }
  }, [searchParams]);

  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      const errorMsg = "Name is required";
      setError(errorMsg);
      toast.error("Registration failed", {
        description: errorMsg,
        duration: 3000,
      });
      return;
    }

    if (!email.trim()) {
      const errorMsg = "Email is required";
      setError(errorMsg);
      toast.error("Registration failed", {
        description: errorMsg,
        duration: 3000,
      });
      return;
    }

    if (!isValidEmail(email)) {
      const errorMsg = "Please enter a valid email address";
      setError(errorMsg);
      toast.error("Registration failed", {
        description: errorMsg,
        duration: 3000,
      });
      return;
    }

    if (password !== confirmPassword) {
      const errorMsg = "Passwords do not match";
      setError(errorMsg);
      toast.error("Registration failed", {
        description: errorMsg,
        duration: 3000,
      });
      return;
    }

    if (password.length < 6) {
      const errorMsg = "Password must be at least 6 characters long";
      setError(errorMsg);
      toast.error("Registration failed", {
        description: errorMsg,
        duration: 3000,
      });
      return;
    }

    setLoading(true);

    try {
      await register(email, password, name, redirectTo);

      const userRole =
        email === "iamnick0925@gmail.com" ? "teacher" : "student";
      if (userRole === "teacher") {
        toast.success("Teacher account created successfully! 🎓", {
          description: `Welcome, ${name}! You now have full access to the dashboard.`,
          duration: 4000,
        });
      } else {
        toast.success("Account created successfully! 🎉", {
          description: `Welcome, ${name}!`,
          duration: 3000,
        });
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Registration failed";
      setError(errorMessage);
      toast.error("Registration failed", {
        description: errorMessage,
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setLoading(true);
    try {
      toast.warning("🎮 Guest Mode Activated", {
        description:
          "Your game progress won't be saved. Match history is not available for guest players.",
        duration: 5000,
      });

      setTimeout(async () => {
        await loginAsGuest(redirectTo);
      }, 1000);
    } catch (err) {
      setLoading(false);
      toast.error("Failed to login as guest");
    }
  };

  return (
    <div className="min-h-screen cyber-grid flex items-center justify-center p-4 py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center text-center">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 glow-primary">
              <Terminal className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent text-glow whitespace-nowrap">
              Connect Five: Python Edition
            </h1>
          </div>
          <p className="text-xl text-muted-foreground mb-2 font-mono">
            {">"} New User Registration
          </p>
        </div>

        <Card className="w-full cyber-border mt-8">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold">
              Create an Account
            </CardTitle>
            <CardDescription>
              Enter your details to create your account
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={loading}
                  className="border-2 border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/50 transition-all duration-300 bg-background/50 backdrop-blur-sm hover:border-primary/70 animate-pulse-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  className="border-2 border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/50 transition-all duration-300 bg-background/50 backdrop-blur-sm hover:border-primary/70 animate-pulse-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="border-2 border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/50 transition-all duration-300 bg-background/50 backdrop-blur-sm hover:border-primary/70 animate-pulse-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="border-2 border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/50 transition-all duration-300 bg-background/50 backdrop-blur-sm hover:border-primary/70 animate-pulse-border"
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4 pt-6">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Creating account..." : "Create Account"}
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-muted-foreground/20" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground font-mono">
                    Or
                  </span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full cyber-border border-accent/30 hover:!border-accent hover:shadow-[0_0_20px_rgba(0,255,200,0.3)] hover:!text-foreground transition-all duration-300"
                onClick={handleGuestLogin}
                disabled={loading}
              >
                <Users className="mr-2 h-4 w-4" />
                Play as Guest (Local Only)
              </Button>

              <p className="text-sm text-muted-foreground text-center">
                Already have an account?{" "}
                <Link
                  href={
                    redirectTo
                      ? `/login?redirect=${encodeURIComponent(redirectTo)}`
                      : "/login"
                  }
                  className="text-primary hover:underline"
                >
                  Login
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
