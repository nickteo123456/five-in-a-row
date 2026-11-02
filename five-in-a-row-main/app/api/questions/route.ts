import { NextRequest, NextResponse } from "next/server";
import { supabase, isDevMode } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const devQuestions = new Map<string, any>();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const count = searchParams.get("count");
    const random = searchParams.get("random") === "true";

    if (isDevMode) {
      const questions = Array.from(devQuestions.values()).filter(
        (q) => q.is_active
      );

      if (random && count) {
        const shuffled = questions.sort(() => 0.5 - Math.random());
        return NextResponse.json({
          questions: shuffled.slice(0, parseInt(count)),
        });
      }

      return NextResponse.json({ questions });
    }

    let query = supabase.from("questions").select("*").eq("is_active", true);

    if (random && count) {
      const { data: allQuestions, error } = await query;

      if (error) {
        console.error("Error fetching questions:", error);
        return NextResponse.json(
          { error: "Failed to fetch questions" },
          { status: 500 }
        );
      }

      const shuffled = (allQuestions || []).sort(() => 0.5 - Math.random());
      return NextResponse.json({
        questions: shuffled.slice(0, parseInt(count)),
      });
    }

    const { data: questions, error } = await query.order("created_at", {
      ascending: false,
    });

    if (error) {
      console.error("Error fetching questions:", error);
      return NextResponse.json(
        { error: "Failed to fetch questions" },
        { status: 500 }
      );
    }

    return NextResponse.json({ questions });
  } catch (error) {
    console.error("Error in get questions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      question,
      option_a,
      option_b,
      option_c,
      option_d,
      correct_answer,
      explanation,
      difficulty,
      topic,
      created_by,
    } = body;

    if (
      !question ||
      !option_a ||
      !option_b ||
      !option_c ||
      !option_d ||
      correct_answer === undefined ||
      !explanation ||
      !topic
    ) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    if (isDevMode) {
      const newQuestion = {
        id: `question-${Date.now()}`,
        question,
        option_a,
        option_b,
        option_c,
        option_d,
        correct_answer,
        explanation,
        difficulty: difficulty || "beginner",
        topic,
        created_by,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_active: true,
      };

      devQuestions.set(newQuestion.id, newQuestion);
      return NextResponse.json({
        question: newQuestion,
        message: "Question created (dev mode)",
      });
    }

    const { data: newQuestion, error } = await supabase
      .from("questions")
      .insert({
        question,
        option_a,
        option_b,
        option_c,
        option_d,
        correct_answer,
        explanation,
        difficulty: difficulty || "beginner",
        topic,
        created_by,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating question:", error);
      return NextResponse.json(
        { error: "Failed to create question" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      question: newQuestion,
      message: "Question created successfully",
    });
  } catch (error) {
    console.error("Error in create question:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export function getDevQuestions() {
  return devQuestions;
}
