"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Star,
  Users,
  ChevronLeft,
  Film,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/utils";

// ── Library Tabs ────────────────────────────────────────────
const LIBRARY_TABS = [
  { id: "favorites", label: "Yêu thích", icon: Star },
  { id: "reviews", label: "Bài viết", icon: Film },
  { id: "following", label: "Diễn viên", icon: Users },
];

export default function LibraryPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("favorites");

  // Redirect if not logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-background pt-24 pb-16 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <BookOpen size={64} className="mx-auto mb-4 text-neutral-600" />
          <h1 className="text-2xl font-bold text-white mb-2">
            Đăng nhập để xem thư viện
          </h1>
          <p className="text-neutral-400 mb-6">
            Bạn cần đăng nhập để truy cập thư viện cá nhân
          </p>
          <button
            onClick={() => router.push("/login")}
            className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 rounded-full font-semibold transition-colors"
          >
            Đăng nhập ngay
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-20 pb-16 lg:ml-20">
      {/* Header */}
      <div className="border-b border-white/10 bg-transparent sticky top-16 z-30">
        <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-6">
          {/* Back Button & Title */}
          <div className="flex items-center space-x-4 mb-6">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-white/5 rounded-lg transition-colors"
            >
              <ChevronLeft size={24} className="text-neutral-400" />
            </button>
            <div>
              <h1 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tight">
                Thư viện của bạn
              </h1>
              <p className="text-sm text-neutral-400 mt-1 normal-case font-normal tracking-normal">
                Quản lý phim yêu thích và danh sách xem sau
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex space-x-1 overflow-x-auto scrollbar-hide">
            {LIBRARY_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center space-x-2 px-4 md:px-6 py-2.5 rounded-lg font-semibold text-sm whitespace-nowrap transition-all",
                    isActive
                      ? "bg-blue-500 text-white"
                      : "text-neutral-400 hover:text-white hover:bg-white/5"
                  )}
                >
                  <Icon size={18} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-8">
        {/* All Tabs - Coming Soon */}
        <div className="text-center py-20">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/5 mb-4">
            {activeTab === "favorites" && <Star size={40} className="text-neutral-600" />}
            {activeTab === "reviews" && <Film size={40} className="text-neutral-600" />}
            {activeTab === "following" && <Users size={40} className="text-neutral-600" />}
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Sắp ra mắt</h3>
          <p className="text-neutral-400">
            Tính năng này đang được phát triển
          </p>
        </div>
      </div>
    </div>
  );
}
