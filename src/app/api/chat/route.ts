import { OpenAI } from "openai";
import { NextRequest, NextResponse } from "next/server";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL || "https://api.aicodewith.com",
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, roleId } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "messages is required" },
        { status: 400 }
      );
    }

    const systemMessage = getSystemMessage(roleId);

    const stream = await openai.chat.completions.create({
      model: "gpt-5.2",
      messages: [
        { role: "system", content: systemMessage },
        ...messages,
      ],
      stream: true,
    });

    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
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