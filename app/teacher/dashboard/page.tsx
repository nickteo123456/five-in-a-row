"use client";

import { useEffect, useState } from "react";
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
  Users,
  Trophy,
  Activity,
  LogOut,
  Trash2,
  TrendingUp,
  Clock,
  Target,
  ArrowLeft,
  AlertTriangle,
  BookOpen,
  Plus,
  Edit,
  Save,
  X,
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { toast } from "sonner";

interface Student {
  user_id: string;
  id?: string;
  name: string;
  email: string;
  total_matches: number;
  highest_score: number;
  average_score: number;
  total_correct: number;
  total_questions_attempted: number;
  overall_accuracy: number;
  last_activity: string | null;
  created_at?: string;
}

interface MatchHistory {
  id: string;
  user_id: string;
  student_name: string;
  student_email: string;
  score: number;
  correct_answers: number;
  total_questions: number;
  game_mode: string;
  duration: number;
  completed_at: string;
  opponent_name?: string;
  opponent_score?: number;
  is_winner?: boolean;
}

interface Question {
  id?: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: number;
  explanation: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  topic: string;
}

export default function TeacherDashboard() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [matchHistory, setMatchHistory] = useState<MatchHistory[]>([]);
  const [teacherMatchHistory, setTeacherMatchHistory] = useState<
    MatchHistory[]
  >([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "overview" | "students" | "history" | "questions"
  >("overview");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);
  const [questionForm, setQuestionForm] = useState<Question>({
    question: "",
    option_a: "",
    option_b: "",
    option_c: "",
    option_d: "",
    correct_answer: 0,
    explanation: "",
    difficulty: "beginner",
    topic: "Control Flow",
  });

  useEffect(() => {
    if (user && user.role !== "teacher") {
      router.push("/");
    }
  }, [user, router]);

  useEffect(() => {
    if (user && user.role === "teacher") {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const studentsRes = await fetch("/api/teacher/students");
      console.log(
        "[Teacher Dashboard] Students response status:",
        studentsRes.status
      );
      if (studentsRes.ok) {
        const studentsData = await studentsRes.json();
        console.log("[Teacher Dashboard] Students data:", studentsData);
        console.log(
          "[Teacher Dashboard] Students array:",
          studentsData.students
        );
        console.log(
          "[Teacher Dashboard] Students count:",
          studentsData.students?.length
        );
        setStudents(studentsData.students || []);
      } else {
        const errorText = await studentsRes.text();
        console.error(
          "[Teacher Dashboard] Students fetch failed:",
          studentsRes.status,
          errorText
        );
      }

      const historyRes = await fetch("/api/teacher/match-history");
      if (historyRes.ok) {
        const historyData = await historyRes.json();

        const allMatches = historyData.matches || [];
        const uniqueMatches: MatchHistory[] = [];
        const seen = new Set<string>();

        allMatches.forEach((match: MatchHistory) => {
          const players = [match.student_name, match.opponent_name]
            .sort()
            .join("-");
          const matchKey = `${players}-${match.completed_at}`;

          if (!seen.has(matchKey)) {
            seen.add(matchKey);
            uniqueMatches.push(match);
          }
        });

        setMatchHistory(uniqueMatches);
      }

      if (user?.email) {
        const teacherHistoryRes = await fetch("/api/student/stats", {
          headers: { "x-user-email": user.email },
        });
        if (teacherHistoryRes.ok) {
          const teacherData = await teacherHistoryRes.json();
          setTeacherMatchHistory(teacherData.matchHistory || []);
        }
      }

      const questionsRes = await fetch("/api/questions");
      if (questionsRes.ok) {
        const questionsData = await questionsRes.json();
        setQuestions(questionsData.questions || []);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStudent = async (
    studentId: string,
    studentName: string
  ) => {
    if (
      !confirm(
        `Are you sure you want to delete ${studentName}'s account? This will also delete all their match history.`
      )
    ) {
      return;
    }

    setDeletingId(studentId);
    try {
      const response = await fetch(`/api/teacher/students/${studentId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success(`${studentName}'s account deleted successfully`);
        fetchData();
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to delete student");
      }
    } catch (error) {
      console.error("Error deleting student:", error);
      toast.error("Failed to delete student");
    } finally {
      setDeletingId(null);
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  const handleAddQuestion = () => {
    setIsAddingQuestion(true);
    setEditingQuestion(null);
    setQuestionForm({
      question: "",
      option_a: "",
      option_b: "",
      option_c: "",
      option_d: "",
      correct_answer: 0,
      explanation: "",
      difficulty: "beginner",
      topic: "Control Flow",
    });
  };

  const handleEditQuestion = (question: Question) => {
    setEditingQuestion(question);
    setIsAddingQuestion(false);
    setQuestionForm(question);
  };

  const handleCancelEdit = () => {
    setEditingQuestion(null);
    setIsAddingQuestion(false);
    setQuestionForm({
      question: "",
      option_a: "",
      option_b: "",
      option_c: "",
      option_d: "",
      correct_answer: 0,
      explanation: "",
      difficulty: "beginner",
      topic: "Control Flow",
    });
  };

  const handleSaveQuestion = async () => {
    if (
      !questionForm.question.trim() ||
      !questionForm.option_a.trim() ||
      !questionForm.option_b.trim() ||
      !questionForm.option_c.trim() ||
      !questionForm.option_d.trim() ||
      !questionForm.explanation.trim()
    ) {
      toast.error("Please fill in all fields");
      return;
    }

    if (questionForm.correct_answer < 0 || questionForm.correct_answer > 3) {
      toast.error("Correct option must be between 0 and 3");
      return;
    }

    try {
      if (editingQuestion) {
        const response = await fetch(`/api/questions/${editingQuestion.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(questionForm),
        });

        if (response.ok) {
          toast.success("Question updated successfully");
          fetchData();
          handleCancelEdit();
        } else {
          const data = await response.json();
          toast.error(data.error || "Failed to update question");
        }
      } else {
        const response = await fetch("/api/questions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(questionForm),
        });

        if (response.ok) {
          toast.success("Question added successfully");
          fetchData();
          handleCancelEdit();
        } else {
          const data = await response.json();
          toast.error(data.error || "Failed to add question");
        }
      }
    } catch (error) {
      console.error("Error saving question:", error);
      toast.error("Failed to save question");
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm("Are you sure you want to delete this question?")) {
      return;
    }

    try {
      const response = await fetch(`/api/questions/${questionId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Question deleted successfully");
        fetchData();
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to delete question");
      }
    } catch (error) {
      console.error("Error deleting question:", error);
      toast.error("Failed to delete question");
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  if (!user || user.role !== "teacher") {
    return (
      <div className="min-h-screen cyber-grid flex items-center justify-center">
        <div className="text-center">
          <Terminal className="h-12 w-12 text-destructive animate-pulse mx-auto mb-4" />
          <p className="text-muted-foreground font-mono">
            Access denied. Teacher privileges required.
          </p>
        </div>
      </div>
    );
  }

  const topStudent = students.length > 0 ? students[0] : null;
  const totalStudents = students.length;

  const studentTotalMatches = students.reduce(
    (sum, s) => sum + s.total_matches,
    0
  );
  const studentAvgScore =
    students.length > 0
      ? students.reduce((sum, s) => sum + s.average_score, 0) / students.length
      : 0;

  const teacherTotalMatches = teacherMatchHistory.length;
  const teacherAvgScore =
    teacherTotalMatches > 0
      ? teacherMatchHistory.reduce((sum, m) => sum + m.score, 0) /
        teacherTotalMatches
      : 0;
  const teacherHighestScore =
    teacherTotalMatches > 0
      ? Math.max(...teacherMatchHistory.map((m) => m.score))
      : 0;
  const teacherWins = teacherMatchHistory.filter((m) => m.is_winner).length;
  const teacherAccuracy =
    teacherTotalMatches > 0
      ? Math.round((teacherWins / teacherTotalMatches) * 100)
      : 0;

  return (
    <div className="min-h-screen cyber-grid">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Button
              onClick={() => router.push("/")}
              variant="outline"
              className="cyber-border"
              size="icon"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 glow-primary">
              <Terminal className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent font-mono">
                TEACHER DASHBOARD
              </h1>
              <p className="text-muted-foreground font-mono mt-1 text-sm md:text-base">
                {">"} Welcome, {user.name}
              </p>
            </div>
          </div>
          <Button
            onClick={handleLogout}
            variant="outline"
            className="cyber-border gap-2"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden md:inline">Logout</span>
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          <Button
            onClick={() => setActiveTab("overview")}
            variant="outline"
            className={`cyber-border transition-all duration-300 ${
              activeTab === "overview"
                ? "!bg-primary/20 !text-primary !border-primary shadow-[0_0_20px_rgba(0,255,255,0.4)] font-semibold hover:!text-primary"
                : "hover:!border-primary hover:shadow-[0_0_20px_rgba(0,255,255,0.4)] hover:!text-foreground"
            }`}
          >
            <Activity className="h-4 w-4 mr-2" />
            Overview
          </Button>
          <Button
            onClick={() => setActiveTab("students")}
            variant="outline"
            className={`cyber-border transition-all duration-300 ${
              activeTab === "students"
                ? "!bg-primary/20 !text-primary !border-primary shadow-[0_0_20px_rgba(0,255,255,0.4)] font-semibold hover:!text-primary"
                : "hover:!border-primary hover:shadow-[0_0_20px_rgba(0,255,255,0.4)] hover:!text-foreground"
            }`}
          >
            <Users className="h-4 w-4 mr-2" />
            Students ({totalStudents})
          </Button>
          <Button
            onClick={() => setActiveTab("history")}
            variant="outline"
            className={`cyber-border transition-all duration-300 ${
              activeTab === "history"
                ? "!bg-primary/20 !text-primary !border-primary shadow-[0_0_20px_rgba(0,255,255,0.4)] font-semibold hover:!text-primary"
                : "hover:!border-primary hover:shadow-[0_0_20px_rgba(0,255,255,0.4)] hover:!text-foreground"
            }`}
          >
            <Trophy className="h-4 w-4 mr-2" />
            Match History ({matchHistory.length})
          </Button>
          <Button
            onClick={() => setActiveTab("questions")}
            variant="outline"
            className={`cyber-border transition-all duration-300 ${
              activeTab === "questions"
                ? "!bg-primary/20 !text-primary !border-primary shadow-[0_0_20px_rgba(0,255,255,0.4)] font-semibold hover:!text-primary"
                : "hover:!border-primary hover:shadow-[0_0_20px_rgba(0,255,255,0.4)] hover:!text-foreground"
            }`}
          >
            <BookOpen className="h-4 w-4 mr-2" />
            Questions ({questions.length})
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground font-mono">
                Loading dashboard...
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Overview Tab - Teacher's Own Stats */}
            {activeTab === "overview" && (
              <div className="space-y-6">
                {/* Teacher Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="cyber-border">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Trophy className="h-4 w-4 text-accent" />
                        Total Matches
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold font-mono text-accent">
                        {teacherTotalMatches}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Games played
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="cyber-border">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-secondary" />
                        Average Score
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold font-mono text-secondary">
                        {teacherAvgScore.toFixed(0)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Your average
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="cyber-border">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Target className="h-4 w-4 text-chart-5" />
                        Highest Score
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold font-mono text-chart-5">
                        {teacherHighestScore}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Personal best
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Teacher Performance Card */}
                <Card className="cyber-border glow-primary">
                  <CardHeader>
                    <CardTitle className="font-mono text-primary flex items-center gap-2">
                      <Trophy className="h-5 w-5" />
                      Your Performance
                    </CardTitle>
                    <CardDescription className="font-mono">
                      Your overall statistics
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4">
                      <Avatar className="h-16 w-16 border-2 border-primary/30">
                        <AvatarFallback className="bg-primary/10 text-primary font-mono text-xl">
                          {user.name?.[0] || "T"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold">{user.name}</h3>
                        <p className="text-sm text-muted-foreground font-mono">
                          {user.email}
                        </p>
                        <div className="flex gap-4 mt-3">
                          <div>
                            <div className="text-xs text-muted-foreground">
                              Highest Score
                            </div>
                            <div className="text-2xl font-bold text-primary font-mono">
                              {teacherHighestScore}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">
                              Win Rate
                            </div>
                            <div className="text-2xl font-bold text-accent font-mono">
                              {teacherAccuracy}%
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">
                              Total Matches
                            </div>
                            <div className="text-2xl font-bold text-secondary font-mono">
                              {teacherTotalMatches}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Recent Activity - Teacher's Own Matches */}
                <Card className="cyber-border">
                  <CardHeader>
                    <CardTitle className="font-mono flex items-center gap-2">
                      <Clock className="h-5 w-5 text-primary" />
                      My Recent Matches
                    </CardTitle>
                    <CardDescription className="font-mono">
                      Your latest 5 completed matches
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {teacherMatchHistory.length > 0 ? (
                      <div className="space-y-3">
                        {teacherMatchHistory.slice(0, 5).map((match, index) => (
                          <div
                            key={match.id}
                            className={`flex items-center gap-4 p-3 rounded-lg border transition-all ${
                              match.is_winner
                                ? "border-accent/40 hover:border-accent/60 hover:bg-accent/5"
                                : "border-destructive/40 hover:border-destructive/60 hover:bg-destructive/5"
                            }`}
                          >
                            <div
                              className={`text-2xl font-mono w-12 text-center ${
                                match.is_winner
                                  ? "text-accent"
                                  : "text-destructive"
                              }`}
                            >
                              {match.is_winner ? "👑" : "💀"}
                            </div>
                            <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                              <div>
                                <div className="text-xs text-muted-foreground">
                                  Result
                                </div>
                                <Badge
                                  className={`font-mono text-xs ${
                                    match.is_winner
                                      ? "bg-accent/20 text-accent"
                                      : "bg-destructive/20 text-destructive"
                                  }`}
                                >
                                  {match.is_winner ? "WIN" : "LOSS"}
                                </Badge>
                              </div>
                              <div>
                                <div className="text-xs text-muted-foreground">
                                  Your Score
                                </div>
                                <div className="font-bold text-primary font-mono">
                                  {match.score}
                                </div>
                              </div>
                              <div>
                                <div className="text-xs text-muted-foreground">
                                  Opponent
                                </div>
                                <div className="font-semibold truncate">
                                  {match.opponent_name}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Score: {match.opponent_score}
                                </div>
                              </div>
                              <div>
                                <div className="text-xs text-muted-foreground">
                                  Date
                                </div>
                                <div className="font-mono text-xs">
                                  {new Date(
                                    match.completed_at
                                  ).toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground font-mono">
                        <Trophy className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>No match history yet</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Students Tab */}
            {activeTab === "students" && (
              <div className="space-y-6">
                {/* Student Aggregate Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="cyber-border">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Trophy className="h-4 w-4 text-accent" />
                        Total Matches
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold font-mono text-accent">
                        {studentTotalMatches}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Games played by all students
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="cyber-border">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-secondary" />
                        Average Score
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold font-mono text-secondary">
                        {studentAvgScore.toFixed(0)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Across all students
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="cyber-border">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Target className="h-4 w-4 text-chart-5" />
                        Highest Score
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold font-mono text-chart-5">
                        {topStudent?.highest_score || 0}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {topStudent ? `by ${topStudent.name}` : "No data"}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Top Student Card */}
                {topStudent && (
                  <Card className="cyber-border glow-primary">
                    <CardHeader>
                      <CardTitle className="font-mono text-primary flex items-center gap-2">
                        <Trophy className="h-5 w-5" />
                        Top Performer
                      </CardTitle>
                      <CardDescription className="font-mono">
                        Student with the highest score
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4">
                        <Avatar className="h-16 w-16 border-2 border-primary/30">
                          <AvatarFallback className="bg-primary/10 text-primary font-mono text-xl">
                            {topStudent.name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <h3 className="text-xl font-bold">
                            {topStudent.name}
                          </h3>
                          <p className="text-sm text-muted-foreground font-mono">
                            {topStudent.email}
                          </p>
                          <div className="flex gap-4 mt-3">
                            <div>
                              <div className="text-xs text-muted-foreground">
                                Highest Score
                              </div>
                              <div className="text-2xl font-bold text-primary font-mono">
                                {topStudent.highest_score}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground">
                                Accuracy
                              </div>
                              <div className="text-2xl font-bold text-accent font-mono">
                                {topStudent.overall_accuracy.toFixed(0)}%
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground">
                                Total Matches
                              </div>
                              <div className="text-2xl font-bold text-secondary font-mono">
                                {topStudent.total_matches}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* All Students List */}
                <Card className="cyber-border">
                  <CardHeader>
                    <CardTitle className="font-mono flex items-center gap-2">
                      <Users className="h-5 w-5 text-primary" />
                      All Students
                    </CardTitle>
                    <CardDescription className="font-mono">
                      Manage student accounts and view their statistics
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {students.length > 0 ? (
                      <div className="space-y-3">
                        {students.map((student) => (
                          <div
                            key={student.user_id || student.id}
                            className="flex items-center gap-4 p-4 rounded-lg border border-primary/20 hover:border-primary hover:shadow-[0_0_20px_rgba(0,255,255,0.3)] transition-all duration-300"
                          >
                            <Avatar className="h-12 w-12 border-2 border-primary/30">
                              <AvatarFallback className="bg-primary/10 text-primary font-mono">
                                {student.name[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-3">
                              <div className="md:col-span-2">
                                <div className="font-semibold">
                                  {student.name}
                                </div>
                                <div className="text-sm text-muted-foreground font-mono">
                                  {student.email}
                                </div>
                              </div>
                              <div>
                                <div className="text-xs text-muted-foreground">
                                  Matches
                                </div>
                                <div className="font-bold font-mono">
                                  {student.total_matches}
                                </div>
                              </div>
                              <div>
                                <div className="text-xs text-muted-foreground">
                                  Highest Score
                                </div>
                                <div className="font-bold text-primary font-mono">
                                  {student.highest_score}
                                </div>
                              </div>
                              <div>
                                <div className="text-xs text-muted-foreground">
                                  Accuracy
                                </div>
                                <div className="font-bold text-accent font-mono">
                                  {student.overall_accuracy.toFixed(0)}%
                                </div>
                              </div>
                            </div>
                            <Button
                              onClick={() =>
                                handleDeleteStudent(
                                  student.user_id || student.id!,
                                  student.name
                                )
                              }
                              disabled={
                                deletingId === (student.user_id || student.id)
                              }
                              variant="destructive"
                              size="icon"
                              className="shrink-0"
                            >
                              {deletingId ===
                              (student.user_id || student.id) ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-muted-foreground font-mono">
                        <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>No students registered yet</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Match History Tab */}
            {activeTab === "history" && (
              <Card className="cyber-border">
                <CardHeader>
                  <CardTitle className="font-mono flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-primary" />
                    Complete Match History
                  </CardTitle>
                  <CardDescription className="font-mono">
                    All completed games across all students
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {matchHistory.length > 0 ? (
                    <div className="space-y-4 max-h-[600px] overflow-y-auto">
                      {matchHistory.map((match, index) => {
                        const winner = match.is_winner
                          ? { name: match.student_name, score: match.score }
                          : {
                              name: match.opponent_name || "Unknown",
                              score: match.opponent_score || 0,
                            };
                        const loser = match.is_winner
                          ? {
                              name: match.opponent_name || "Unknown",
                              score: match.opponent_score || 0,
                            }
                          : { name: match.student_name, score: match.score };

                        return (
                          <div
                            key={match.id}
                            className="p-4 rounded-lg border border-primary/20 hover:border-primary/40 hover:bg-primary/5 transition-all"
                          >
                            <div className="space-y-3">
                              {/* Header with game mode and date */}
                              <div className="flex items-center justify-between">
                                <Badge
                                  variant="outline"
                                  className="font-mono text-xs"
                                >
                                  {match.game_mode?.toUpperCase() || "ONLINE"}
                                </Badge>
                                <div className="text-xs text-muted-foreground font-mono">
                                  {new Date(
                                    match.completed_at
                                  ).toLocaleDateString()}
                                </div>
                              </div>

                              {/* Winner */}
                              <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/10 border border-accent/30">
                                <div className="text-2xl">👑</div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <Badge className="bg-accent/20 text-accent font-mono text-xs">
                                      WINNER
                                    </Badge>
                                  </div>
                                  <div className="font-bold mt-1">
                                    {winner.name}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    Score: {winner.score}
                                  </div>
                                </div>
                              </div>

                              {/* VS divider */}
                              <div className="text-center text-xs text-muted-foreground font-mono">
                                VS
                              </div>

                              {/* Loser */}
                              <div className="flex items-center gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                                <div className="text-2xl">💀</div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <Badge className="bg-destructive/20 text-destructive font-mono text-xs">
                                      LOSER
                                    </Badge>
                                  </div>
                                  <div className="font-bold mt-1">
                                    {loser.name}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    Score: {loser.score}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground font-mono">
                      <Trophy className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No match history yet</p>
                      <p className="text-sm mt-2">
                        Matches will appear here after students play games
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Questions Tab */}
            {activeTab === "questions" && (
              <div className="space-y-6">
                {/* Add Question Button */}
                {!isAddingQuestion && !editingQuestion && (
                  <div className="flex justify-end">
                    <Button
                      onClick={handleAddQuestion}
                      className="bg-primary hover:bg-primary/90 glow-primary font-mono gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Add New Question
                    </Button>
                  </div>
                )}

                {/* Question Form */}
                {(isAddingQuestion || editingQuestion) && (
                  <Card className="cyber-border glow-primary">
                    <CardHeader>
                      <CardTitle className="font-mono text-primary flex items-center gap-2">
                        <BookOpen className="h-5 w-5" />
                        {editingQuestion ? "Edit Question" : "Add New Question"}
                      </CardTitle>
                      <CardDescription className="font-mono">
                        Fill in the details for the Python Control Flow question
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <label className="text-sm font-medium font-mono mb-2 block">
                          Question Text
                        </label>
                        <textarea
                          value={questionForm.question}
                          onChange={(e) =>
                            setQuestionForm({
                              ...questionForm,
                              question: e.target.value,
                            })
                          }
                          className="w-full p-3 rounded-lg border border-primary/20 bg-background/50 font-mono text-sm min-h-[80px]"
                          placeholder="Enter your question..."
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium font-mono mb-2 block">
                            Option A
                          </label>
                          <input
                            type="text"
                            value={questionForm.option_a}
                            onChange={(e) =>
                              setQuestionForm({
                                ...questionForm,
                                option_a: e.target.value,
                              })
                            }
                            className="w-full p-3 rounded-lg border border-primary/20 bg-background/50 font-mono text-sm"
                            placeholder="First option..."
                          />
                        </div>

                        <div>
                          <label className="text-sm font-medium font-mono mb-2 block">
                            Option B
                          </label>
                          <input
                            type="text"
                            value={questionForm.option_b}
                            onChange={(e) =>
                              setQuestionForm({
                                ...questionForm,
                                option_b: e.target.value,
                              })
                            }
                            className="w-full p-3 rounded-lg border border-primary/20 bg-background/50 font-mono text-sm"
                            placeholder="Second option..."
                          />
                        </div>

                        <div>
                          <label className="text-sm font-medium font-mono mb-2 block">
                            Option C
                          </label>
                          <input
                            type="text"
                            value={questionForm.option_c}
                            onChange={(e) =>
                              setQuestionForm({
                                ...questionForm,
                                option_c: e.target.value,
                              })
                            }
                            className="w-full p-3 rounded-lg border border-primary/20 bg-background/50 font-mono text-sm"
                            placeholder="Third option..."
                          />
                        </div>

                        <div>
                          <label className="text-sm font-medium font-mono mb-2 block">
                            Option D
                          </label>
                          <input
                            type="text"
                            value={questionForm.option_d}
                            onChange={(e) =>
                              setQuestionForm({
                                ...questionForm,
                                option_d: e.target.value,
                              })
                            }
                            className="w-full p-3 rounded-lg border border-primary/20 bg-background/50 font-mono text-sm"
                            placeholder="Fourth option..."
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="text-sm font-medium font-mono mb-2 block">
                            Correct Option
                          </label>
                          <select
                            value={questionForm.correct_answer}
                            onChange={(e) =>
                              setQuestionForm({
                                ...questionForm,
                                correct_answer: parseInt(e.target.value),
                              })
                            }
                            className="w-full p-3 rounded-lg border border-primary/20 bg-background/50 font-mono text-sm"
                          >
                            <option value={0}>Option A</option>
                            <option value={1}>Option B</option>
                            <option value={2}>Option C</option>
                            <option value={3}>Option D</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-sm font-medium font-mono mb-2 block">
                            Difficulty
                          </label>
                          <select
                            value={questionForm.difficulty}
                            onChange={(e) =>
                              setQuestionForm({
                                ...questionForm,
                                difficulty: e.target.value as
                                  | "beginner"
                                  | "intermediate"
                                  | "advanced",
                              })
                            }
                            className="w-full p-3 rounded-lg border border-primary/20 bg-background/50 font-mono text-sm"
                          >
                            <option value="beginner">Beginner</option>
                            <option value="intermediate">Intermediate</option>
                            <option value="advanced">Advanced</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-sm font-medium font-mono mb-2 block">
                            Topic
                          </label>
                          <input
                            type="text"
                            value={questionForm.topic}
                            onChange={(e) =>
                              setQuestionForm({
                                ...questionForm,
                                topic: e.target.value,
                              })
                            }
                            className="w-full p-3 rounded-lg border border-primary/20 bg-background/50 font-mono text-sm"
                            placeholder="e.g., Control Flow"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-sm font-medium font-mono mb-2 block">
                          Explanation
                        </label>
                        <textarea
                          value={questionForm.explanation}
                          onChange={(e) =>
                            setQuestionForm({
                              ...questionForm,
                              explanation: e.target.value,
                            })
                          }
                          className="w-full p-3 rounded-lg border border-primary/20 bg-background/50 font-mono text-sm min-h-[80px]"
                          placeholder="Explain the correct answer..."
                        />
                      </div>

                      <div className="flex gap-3 justify-end">
                        <Button
                          onClick={handleCancelEdit}
                          variant="outline"
                          className="border-secondary/30 hover:border-secondary hover:bg-secondary/10 font-mono gap-2"
                        >
                          <X className="h-4 w-4" />
                          Cancel
                        </Button>
                        <Button
                          onClick={handleSaveQuestion}
                          className="bg-primary hover:bg-primary/90 glow-primary font-mono gap-2"
                        >
                          <Save className="h-4 w-4" />
                          {editingQuestion
                            ? "Update Question"
                            : "Save Question"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Questions List */}
                {!isAddingQuestion && !editingQuestion && (
                  <Card className="cyber-border">
                    <CardHeader>
                      <CardTitle className="font-mono flex items-center gap-2">
                        <BookOpen className="h-5 w-5 text-primary" />
                        All Questions
                      </CardTitle>
                      <CardDescription className="font-mono">
                        Manage your Python Control Flow questions
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {questions.length > 0 ? (
                        <div className="space-y-3 max-h-[600px] overflow-y-auto">
                          {questions.map((question, index) => (
                            <div
                              key={question.id}
                              className="p-4 rounded-lg border border-primary/20 hover:border-primary hover:shadow-[0_0_20px_rgba(0,255,255,0.3)] transition-all duration-300"
                            >
                              <div className="flex items-start gap-4">
                                <div className="text-xl font-bold text-primary font-mono w-12">
                                  #{index + 1}
                                </div>
                                <div className="flex-1 space-y-3">
                                  <div>
                                    <div className="font-semibold text-lg mb-2">
                                      {question.question}
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                      <div
                                        className={`p-2 rounded ${
                                          question.correct_answer === 0
                                            ? "bg-accent/20 border border-accent/40"
                                            : "bg-secondary/10"
                                        }`}
                                      >
                                        A: {question.option_a}
                                      </div>
                                      <div
                                        className={`p-2 rounded ${
                                          question.correct_answer === 1
                                            ? "bg-accent/20 border border-accent/40"
                                            : "bg-secondary/10"
                                        }`}
                                      >
                                        B: {question.option_b}
                                      </div>
                                      <div
                                        className={`p-2 rounded ${
                                          question.correct_answer === 2
                                            ? "bg-accent/20 border border-accent/40"
                                            : "bg-secondary/10"
                                        }`}
                                      >
                                        C: {question.option_c}
                                      </div>
                                      <div
                                        className={`p-2 rounded ${
                                          question.correct_answer === 3
                                            ? "bg-accent/20 border border-accent/40"
                                            : "bg-secondary/10"
                                        }`}
                                      >
                                        D: {question.option_d}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="text-sm text-muted-foreground italic">
                                    💡 {question.explanation}
                                  </div>
                                  <div className="flex gap-2">
                                    <Badge
                                      variant="outline"
                                      className="font-mono text-xs"
                                    >
                                      {question.difficulty}
                                    </Badge>
                                    <Badge
                                      variant="outline"
                                      className="font-mono text-xs"
                                    >
                                      {question.topic}
                                    </Badge>
                                  </div>
                                </div>
                                <div className="flex gap-2 shrink-0">
                                  <Button
                                    onClick={() => handleEditQuestion(question)}
                                    variant="outline"
                                    size="icon"
                                    className="cyber-border"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    onClick={() =>
                                      handleDeleteQuestion(question.id!)
                                    }
                                    variant="destructive"
                                    size="icon"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12 text-muted-foreground font-mono">
                          <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
                          <p>No questions yet</p>
                          <p className="text-sm mt-2">
                            Click "Add New Question" to create your first
                            question
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
