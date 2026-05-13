"use client";

import { Suspense } from "react";
import ChatContent from "./ChatContent";

export const dynamic = 'force-dynamic';

function ChatLoading() {
  return (
    <div className="flex h-screen flex-col items-center justify-center bg-gradient-to-b from-pink-50 to-purple-50">
      <div className="text-pink-500">加载中...</div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<ChatLoading />}>
      <ChatContent />
    </Suspense>
  );
}