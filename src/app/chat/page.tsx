"use client";

import { useState, useRef, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface Role {
  id: string;
  name: string;
  avatar: string;
}

const roleInfo: Record<string, Role> = {
  "gentle-senior": { id: "gentle-senior", name: "林泽", avatar: "🎓" },
  "arrogant-ceo": { id: "arrogant-ceo", name: "顾言", avatar: "💼" },
  "sunny-athlete": { id: "sunny-athlete", name: "沈曜", avatar: "🏃" },
};

export default function ChatPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const roleId = searchParams.get("roleId") || "gentle-senior";
  const role = roleInfo[roleId] || roleInfo["gentle-senior"];

  const [messages, setMessages] = useState<Message[]>([
    { id: "1", role: "assistant", content: `你好呀～我是${role.name}，今天过得怎么样？` },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [hasLoadedHistory, setHasLoadedHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    async function loadHistory() {
      if (hasLoadedHistory) return;
      
      try {
        const response = await fetch(`/api/chat?roleId=${roleId}`);
        const data = await response.json();
        
        if (data.history && data.history.length > 0) {
          const historyMessages: Message[] = data.history.map((m: { id: number; role: string; content: string }, idx: number) => ({
            id: `history-${m.id}`,
            role: m.role as "user" | "assistant",
            content: m.content,
          }));
          
          setMessages((prev) => {
            // 如果有历史记录，用历史记录替换初始欢迎语
            if (historyMessages.length > 0) {
              return historyMessages;
            }
            return prev;
          });
        }
        
        setHasLoadedHistory(true);
      } catch (error) {
        console.error("Failed to load history:", error);
        setHasLoadedHistory(true);
      }
    }
    
    loadHistory();
  }, [roleId, hasLoadedHistory]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: "",
    };
    setMessages((prev) => [...prev, assistantMessage]);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messages.concat(userMessage).map((m) => ({
            role: m.role,
            content: m.content,
          })),
          roleId,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) throw new Error(`请求失败: ${response.status}`);

      const reader = response.body?.getReader();
      if (!reader) throw new Error("无法读取响应");

      const decoder = new TextDecoder();
      let buffer = "";
      let receivedContent = "";
      let hasFirstChunk = false;
      const CHAR_DELAY = 50;
      setIsThinking(true);
      const thinkingTimeout = setTimeout(() => setIsThinking(true), 500);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data: ")) continue;

          const data = trimmed.slice(6);
          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data);
            if (parsed.content) {
              if (!hasFirstChunk) {
                hasFirstChunk = true;
                clearTimeout(thinkingTimeout);
                setIsThinking(false);
              }

              receivedContent += parsed.content;

              for (let i = 0; i < receivedContent.length; i++) {
                const char = receivedContent[i];
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMessage.id
                      ? { ...m, content: m.content + char }
                      : m
                  )
                );
                await new Promise((resolve) => setTimeout(resolve, CHAR_DELAY));
              }
              receivedContent = "";
            }
          } catch {
            // 忽略解析错误
          }
        }
      }

      setIsThinking(false);

      try {
        await fetch("/api/chat/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roleId,
            messages: messages
              .filter((m) => m.id === userMessage.id || m.id === assistantMessage.id)
              .map((m) => ({
                role: m.role,
                content: m.content,
              })),
          }),
        });
      } catch {
        // 保存失败不影响用户体验
      }
    } catch (error: unknown) {
      console.error("Chat error:", error);
      const errorMessage = error instanceof Error ? error.message : "未知错误";
      
      if (errorMessage.includes("abort") || errorMessage.includes("中止")) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessage.id
              ? { ...m, content: "连接超时，请重试..." }
              : m
          )
        );
      } else {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessage.id
              ? { ...m, content: "抱歉，出错了..." }
              : m
          )
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-screen flex-col bg-gradient-to-b from-pink-50 to-purple-50">
      <header className="flex items-center justify-between border-b border-pink-100 bg-white/80 px-4 py-3 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{role.avatar}</span>
          <div>
            <h1 className="font-semibold text-gray-800">{role.name}</h1>
            <p className="text-xs text-green-500">在线</p>
          </div>
        </div>
        <button
          onClick={() => router.push("/role-selection")}
          className="rounded-full bg-pink-100 px-4 py-2 text-sm text-pink-600 transition-colors hover:bg-pink-200"
        >
          切换
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="mx-auto max-w-md space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-3 ${
                  msg.role === "user"
                    ? "bg-pink-500 text-white"
                    : "bg-white text-gray-800 shadow"
                }`}
              >
                {msg.content}
                {msg.role === "assistant" && !msg.content && (
                  <span className="ml-1 inline-block h-3 w-1 animate-pulse bg-gray-400" />
                )}
              </div>
            </div>
          ))}
          {isThinking && (
            <div className="flex justify-start">
              <div className="rounded-2xl bg-white px-4 py-2 text-sm text-gray-400 shadow">
                {role.name}正在思考...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="border-t border-pink-100 bg-white p-4">
        <div className="mx-auto flex max-w-md gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="发送消息..."
            className="flex-1 rounded-full border border-pink-200 px-4 py-3 focus:border-pink-400 focus:outline-none"
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="rounded-full bg-pink-500 px-6 py-3 text-white transition-colors hover:bg-pink-600 disabled:opacity-50"
          >
            ➤
          </button>
        </div>
      </div>
    </div>
  );
}