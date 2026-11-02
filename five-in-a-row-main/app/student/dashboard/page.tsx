"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Terminal,
  Trophy,
  Target,
  Activity,
  TrendingUp,
  Clock,
  ArrowLeft,
  LogOut,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth-provider";

interface MatchRecord {
  id: string;
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  gameMode: string;
  duration: number;
  completedAt: string;
  opponentName?: string;
  opponentScore?: number;
  isWinner?: boolean;
}

interface StudentData {
  user: {
    id: string;
    email: string;
    name: string | null;
    role: string;
    createdAt: string;
  };
  stats: {
    totalMatches: number;
    totalScore: number;
    highestScore: number;
    avgScore: number;
    accuracy: number;
    totalCorrect: number;
    totalQuestions: number;
  };
  matchHistory: MatchRecord[];
}

export default function StudentDashboard() {
  const [data, setData] = useState<StudentData | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { user, logout } = useAuth();
  const hasFetchedRef = useRef(false);

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Logged out successfully");
    } catch (error) {
      toast.error("Failed to logout");
    }
  };

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }

    if (hasFetchedRef.current) {
      return;
    }

    hasFetchedRef.current = true;
    fetchStudentData();
  }, [user, router]);

  const fetchStudentData = async () => {
    try {
      console.log("[Dashboard] Fetching student data for user:", user?.email);

      const headers: HeadersInit = {};
      if (user?.email) {
        headers["x-user-email"] = user.email;
      }

      const response = await fetch("/api/student/stats", { headers });

      console.log("[Dashboard] API response status:", response.status);

      if (response.status === 401) {
        toast.error("Authentication required", {
          description: "Please log in to view your dashboard",
        });
        router.push("/login");
        return;
      }

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Unknown error" }));
        console.error("[Dashboard] API Error:", errorData);

        toast.error("Failed to load dashboard", {
          description: errorData.error || `Server error (${response.status})`,
        });
        return;
      }

      const studentData = await response.json();
      console.log("[Dashboard] Student data received successfully");
      setData(studentData);
    } catch (error) {
      console.error("[Dashboard] Fetch error:", error);
      toast.error("Failed to load dashboard", {
        description:
          error instanceof Error ? error.message : "Network error occurred",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen cyber-grid flex items-center justify-center">
        <div className="text-center">
          <Terminal className="h-12 w-12 text-primary animate-pulse mx-auto mb-4" />
          <p className="text-muted-foreground font-mono">
            Loading dashboard...
          </p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen cyber-grid flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground font-mono">No data available</p>
        </div>
      </div>
    );
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen cyber-grid">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 glow-primary">
              <Terminal className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent font-mono">
                MY DASHBOARD
              </h1>
              <p className="text-muted-foreground font-mono mt-1">
                {">"} Personal Stats & Match History
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => router.push("/")}
              variant="outline"
              className="cyber-border gap-2 hover:!text-foreground hover:!border-primary hover:shadow-[0_0_20px_rgba(0,255,255,0.4)] transition-all duration-300"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Game
            </Button>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="cyber-border gap-2 border-destructive/30 hover:!border-destructive hover:bg-destructive/10 hover:!text-destructive text-destructive hover:shadow-[0_0_20px_rgba(239,68,68,0.4)] transition-all duration-300"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>

        {/* Profile Section */}
        <div className="mb-8">
          <Card className="cyber-border glow-primary">
            <CardContent className="pt-6">
              <div className="flex items-center gap-6">
                <Avatar className="h-20 w-20 border-4 border-primary/30">
                  <AvatarFallback className="bg-primary/10 text-primary font-mono text-3xl">
                    {(user?.name || data.user.name)?.[0] ||
                      (user?.email || data.user.email)[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold font-mono text-foreground">
                    {user?.name || data.user.name || "Student"}
                  </h2>
                  <p className="text-muted-foreground font-mono">
                    {user?.email || data.user.email}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1 font-mono">
                    Joined:{" "}
                    {new Date(data.user.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
                <Badge className="text-lg px-4 py-2 bg-primary/20 text-primary border-primary/30 font-mono">
                  STUDENT
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="cyber-border glow-primary">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-primary" />
                <CardTitle className="font-mono text-primary">
                  Highest Score
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-primary font-mono">
                {data.stats.highestScore}
              </div>
            </CardContent>
          </Card>

          <Card className="cyber-border glow-accent">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-accent" />
                <CardTitle className="font-mono text-accent">
                  Total Score
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-accent font-mono">
                {data.stats.totalScore}
              </div>
            </CardContent>
          </Card>

          <Card className="cyber-border glow-secondary">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-secondary" />
                <CardTitle className="font-mono text-secondary">
                  Matches Played
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-secondary font-mono">
                {data.stats.totalMatches}
              </div>
            </CardContent>
          </Card>

          <Card className="cyber-border glow-primary">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-chart-5" />
                <CardTitle className="font-mono text-chart-5">
                  Accuracy
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-chart-5 font-mono">
                {data.stats.accuracy}%
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Match History */}
        <Card className="cyber-border">
          <CardHeader>
            <CardTitle className="font-mono text-primary flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Match History
            </CardTitle>
            <CardDescription className="font-mono">
              Your recent game results
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.matchHistory.length > 0 ? (
                data.matchHistory.map((match, index) => (
                  <div
                    key={match.id}
                    className={`flex items-center gap-4 p-4 rounded-lg border transition-all ${
                      match.isWinner
                        ? "border-accent/40 hover:border-accent/60 hover:bg-accent/5"
                        : "border-destructive/40 hover:border-destructive/60 hover:bg-destructive/5"
                    }`}
                  >
                    <div
                      className={`text-2xl font-bold font-mono w-12 text-center ${
                        match.isWinner ? "text-accent" : "text-destructive"
                      }`}
                    >
                      {match.isWinner ? "👑" : "💀"}
                    </div>
                    <div className="flex-1 grid grid-cols-2 md:grid-cols-5 gap-4">
                      <div>
                        <div className="text-xs text-muted-foreground">
                          Result
                        </div>
                        <Badge
                          className={`font-mono text-xs mt-1 ${
                            match.isWinner
                              ? "bg-accent/20 text-accent"
                              : "bg-destructive/20 text-destructive"
                          }`}
                        >
                          {match.isWinner ? "WIN" : "LOSS"}
                        </Badge>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">
                          Your Score
                        </div>
                        <div className="text-lg font-bold text-primary font-mono">
                          {match.score}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">
                          Opponent
                        </div>
                        <div className="text-sm font-bold font-mono truncate">
                          {match.opponentName}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Score: {match.opponentScore}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">
                          Mode
                        </div>
                        <Badge
                          variant="outline"
                          className="font-mono text-xs mt-1"
                        >
                          {match.gameMode.toUpperCase()}
                        </Badge>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">
                          Date
                        </div>
                        <div className="text-sm font-mono">
                          {new Date(match.completedAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-muted-foreground font-mono">
                  <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No matches played yet</p>
                  <p className="text-sm mt-2">
                    Start playing to see your match history!
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Average Stats */}
        {data.stats.totalMatches > 0 && (
          <div className="mt-8">
            <Card className="cyber-border glow-accent">
              <CardHeader>
                <CardTitle className="font-mono text-accent">
                  Performance Summary
                </CardTitle>
                <CardDescription className="font-mono">
                  Your overall statistics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="text-center p-4 rounded-lg bg-primary/5 border border-primary/20">
                    <div className="text-3xl font-bold text-primary font-mono mb-1">
                      {data.stats.avgScore}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Average Score
                    </div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-accent/5 border border-accent/20">
                    <div className="text-3xl font-bold text-accent font-mono mb-1">
                      {data.stats.accuracy}%
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Overall Accuracy
                    </div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-secondary/5 border border-secondary/20">
                    <div className="text-3xl font-bold text-secondary font-mono mb-1">
                      {data.stats.totalMatches}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Games Completed
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
