import { NextRequest, NextResponse } from "next/server";
import { db, saveConversation } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { roleId, messages } = body;

    if (!roleId || !messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "roleId and messages are required" },
        { status: 400 }
      );
    }

    await saveConversation(roleId, messages);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Save API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}