"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Role {
  id: string;
  name: string;
  description: string;
  avatar: string;
  color: string;
}

const roles: Role[] = [
  {
    id: "gentle-senior",
    name: "温柔学长",
    description: "总是轻声细语，关心你的每一个细节",
    avatar: "🎓",
    color: "bg-pink-100 border-pink-300",
  },
  {
    id: "arrogant-ceo",
    name: "傲娇总裁",
    description: "外表冷漠其实超级在乎你",
    avatar: "💼",
    color: "bg-purple-100 border-purple-300",
  },
  {
    id: "sunny-athlete",
    name: "阳光运动生",
    description: "充满活力，永远像小太阳一样温暖",
    avatar: "🏃",
    color: "bg-yellow-100 border-yellow-300",
  },
];

export default function RoleSelection() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSelectRole = async (roleId: string) => {
    setSelectedRole(roleId);
    setIsLoading(true);

    try {
      localStorage.setItem("selectedRole", roleId);
      router.push(`/chat?roleId=${roleId}`);
    } catch (error) {
      console.error("Failed to save role:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-purple-50 px-4 py-12">
      <div className="mx-auto max-w-md">
        <h1 className="mb-2 text-center text-3xl font-bold text-gray-800">
          选择你的纸片人男友
        </h1>
        <p className="mb-8 text-center text-gray-500">
          点击卡片，开始你们的相遇
        </p>

        <div className="space-y-4">
          {roles.map((role) => (
            <button
              key={role.id}
              onClick={() => handleSelectRole(role.id)}
              disabled={isLoading}
              className={`w-full rounded-2xl border-2 p-4 text-left transition-all duration-300 hover:scale-[1.02] hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${role.color} ${
                selectedRole === role.id ? "ring-4 ring-pink-400" : ""
              }`}
            >
              <div className="flex items-center gap-4">
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-3xl shadow">
                  {role.avatar}
                </span>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-800">
                    {role.name}
                  </h3>
                  <p className="mt-1 text-sm text-gray-600">{role.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        <p className="mt-8 text-center text-sm text-gray-400">
          {isLoading ? "正在进入对话..." : "选择一个角色开始相处"}
        </p>
      </div>
    </div>
  );
}