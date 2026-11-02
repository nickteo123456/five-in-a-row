import { NextRequest, NextResponse } from "next/server";
import { verifyPassword } from "@/lib/auth";
import { isDevMode } from "@/lib/supabase";
import { findDevUserByEmail } from "@/lib/dev-users";

async function findUserByEmail(email: string) {
  if (isDevMode) {
    console.log("🔧 Development mode: Using in-memory user store");
    return findDevUserByEmail(email);
  }

  try {
    const { supabase } = await import("@/lib/supabase");
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("Database error:", error);
      return null;
    }

    return data || null;
  } catch (error) {
    console.error("Database connection error:", error);
    return null;
  }
}

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const user = await findUserByEmail(email);

    if (!user) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const isValidPassword = await verifyPassword(password, user.password_hash);

    if (!isValidPassword) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role, },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
