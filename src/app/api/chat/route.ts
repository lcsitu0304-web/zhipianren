import { OpenAI } from "openai";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { messages } from "@/lib/schema";
import { eq, asc } from "drizzle-orm";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL || "https://api.aicodewith.com",
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages: chatMessages, roleId } = body;

    if (!chatMessages || !Array.isArray(chatMessages)) {
      return NextResponse.json(
        { error: "messages is required" },
        { status: 400 }
      );
    }

    // 获取用户输入
    const userMsg = chatMessages.find((m: { role: string }) => m.role === "user");
    const userMessage = userMsg?.content || "";

    const systemMessage = getSystemMessage(roleId);

    const stream = await openai.chat.completions.create({
      model: "gpt-5.2",
      messages: [
        { role: "system", content: systemMessage },
        ...chatMessages,
      ],
      stream: true,
    });

    const encoder = new TextEncoder();
    let fullContent = "";

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
              fullContent += content;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
            }
          }
          // 流式传输结束后，保存到数据库
          if (userMessage && fullContent) {
            try {
              await saveToDatabase(roleId, userMessage, fullContent);
            } catch (dbError) {
              console.error("Failed to save to database:", dbError);
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new NextResponse(readableStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function saveToDatabase(roleId: string, userMessage: string, aiResponse: string) {
  // 保存用户消息
  await db.insert(messages).values({
    roleId: roleId,
    role: "user",
    content: userMessage,
  });

  // 保存 AI 回复
  await db.insert(messages).values({
    roleId: roleId,
    role: "assistant",
    content: aiResponse,
  });

  console.log("Saved to database:", { roleId, userMessage, aiResponse });
}

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const roleId = searchParams.get("roleId");

    if (!roleId) {
      return NextResponse.json(
        { error: "roleId is required" },
        { status: 400 }
      );
    }

    const history = await db
      .select()
      .from(messages)
      .where(eq(messages.roleId, roleId))
      .orderBy(asc(messages.createdAt));

    return NextResponse.json({ history });
  } catch (error) {
    console.error("Get history API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

function getSystemMessage(roleId: string | undefined): string {
  const roles: Record<string, string> = {
    "gentle-senior": "你是一个温柔学长的角色名叫林泽。你总是轻声细语，关心对方的每一个细节。性格温暖、体贴。",
    "arrogant-ceo": "你是一个傲娇总裁的角色名叫顾言。你外表冷漠但其实非常在乎对方。说话简短但有安全感。",
    "sunny-athlete": "你是一个阳光运动生的角色名叫沈曜。你充满活力，像小太阳一样温暖。性格开朗乐观。",
  };

  return (
    roles[roleId || ""] ||
    "你是一个虚拟男友角色。请根据对话氛围友好地回应对方。"
  );
}