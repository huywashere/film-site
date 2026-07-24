"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ListPlus,
  Heart,
  Sparkles,
  Film,
  Plus,
  Share2,
  User,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useToast } from "@/providers/ToastProvider";
import { resolveImageUrl } from "@/components/film/FilmCard";

export interface CustomList {
  id: string;
  title: string;
  description: string;
  creator: {
    name: string;
    avatar: string;
  };
  posters: string[];
  likes: number;
  filmCount: number;
  createdAt: string;
}

export default function CustomListsPage() {
  const currentUser = useAuthStore((s) => s.user);
  const { toast } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const [lists, setLists] = useState<CustomList[]>([
    {
      id: "l1",
      title: "Top 10 Phim Đỉnh Nhất Thập Kỷ (Must-Watch Cinema)",
      description:
        "Tuyển tập những siêu phẩm chiếu rạp đỉnh cao kịch tính không thể bỏ qua.",
      creator: {
        name: "Phú Huy Nguyễn",
        avatar:
          "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
      },
      posters: [
        "https://phimimg.com/upload/vod/20231201-1/93adff6bcdaeb341d3c0a248f219f7dd.jpg",
        "https://phimimg.com/upload/vod/20231024-1/91b0f590ad4f6153093b169ceefd53bd.jpg",
        "https://phimimg.com/upload/vod/20240112-1/298ce93aa5dce1c0df4e67f0be1092e0.jpg",
        "https://phimimg.com/upload/vod/20230815-1/1d713c23eefc6fdfd5d4d3d3ef0c2020.jpg",
      ],
      likes: 142,
      filmCount: 10,
      createdAt: "2 ngày trước",
    },
    {
      id: "l2",
      title: "Phim Hack Não & Gián Điệp Đêm Halloween",
      description:
        "Những bộ phim giật gân, xoắn não với twist liên tục khiến bạn dính chặt vào màn hình.",
      creator: {
        name: "CineVerse Editor",
        avatar:
          "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&auto=format&fit=crop&q=80",
      },
      posters: [
        "https://phimimg.com/upload/vod/20231024-1/91b0f590ad4f6153093b169ceefd53bd.jpg",
        "https://phimimg.com/upload/vod/20240112-1/298ce93aa5dce1c0df4e67f0be1092e0.jpg",
        "https://phimimg.com/upload/vod/20231201-1/93adff6bcdaeb341d3c0a248f219f7dd.jpg",
      ],
      likes: 89,
      filmCount: 8,
      createdAt: "5 ngày trước",
    },
  ]);

  const handleLikeList = (id: string) => {
    setLists((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, likes: item.likes + 1 } : item,
      ),
    );
    toast("Đã thả tim bộ sưu tập!", "info");
  };

  const handleCreateList = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newList: CustomList = {
      id: Math.random().toString(),
      title: newTitle.trim(),
      description:
        newDesc.trim() || "Bộ sưu tập cá nhân do người dùng tổng hợp.",
      creator: {
        name:
          currentUser?.displayName ||
          currentUser?.username ||
          "Thành viên CineVerse",
        avatar:
          currentUser?.avatarUrl ||
          `https://ui-avatars.com/api/?name=User&background=2c3440&color=fff`,
      },
      posters: [
        "https://phimimg.com/upload/vod/20231201-1/93adff6bcdaeb341d3c0a248f219f7dd.jpg",
        "https://phimimg.com/upload/vod/20231024-1/91b0f590ad4f6153093b169ceefd53bd.jpg",
      ],
      likes: 1,
      filmCount: 2,
      createdAt: "Vừa xong",
    };

    setLists([newList, ...lists]);
    setNewTitle("");
    setNewDesc("");
    setIsModalOpen(false);
    toast("Đã tạo bộ sưu tập phim thành công!", "success");
  };

  return (
    <div className="bg-[#14181c] min-h-screen text-neutral-300 pt-24 pb-16 font-sans">
      <div className="container mx-auto px-4 md:px-8 max-w-6xl space-y-8">
        {/* ── Page Header ── */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 font-extrabold text-xs uppercase tracking-widest mb-1">
              <Sparkles size={16} /> CineVerse Collections
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">
              Bộ Sưu Tập Phim Tùy Chỉnh
            </h1>
            <p className="text-sm text-neutral-400 mt-1">
              Khám phá và sáng tạo các danh sách phim tuyển chọn độc đáo theo
              chủ đề cá nhân (Letterboxd Style).
            </p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-black font-extrabold text-xs px-5 py-3 rounded-xl transition-all cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-95"
          >
            <Plus size={16} /> Tạo Bộ Sưu Tập Mới
          </button>
        </div>

        {/* ── Grid Bộ Sưu Tập ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {lists.map((item) => (
            <div
              key={item.id}
              className="bg-[#1c2228] border border-[#2c3440] hover:border-emerald-500/40 rounded-2xl p-5 shadow-xl transition-all group flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                {/* Creator header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={item.creator.avatar}
                      alt={item.creator.name}
                      className="w-7 h-7 rounded-full object-cover border border-white/10"
                    />
                    <span className="text-xs font-bold text-neutral-300">
                      {item.creator.name}
                    </span>
                  </div>
                  <span className="text-[10px] text-neutral-500">
                    {item.createdAt}
                  </span>
                </div>

                {/* Title & Desc */}
                <h3 className="text-lg font-black text-white group-hover:text-emerald-400 transition-colors leading-snug">
                  {item.title}
                </h3>
                <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed">
                  {item.description}
                </p>

                {/* Posters Overlap Card Grid */}
                <div className="flex items-center -space-x-4 pt-2">
                  {item.posters.map((imgUrl, i) => {
                    const posterSrc = resolveImageUrl(imgUrl) || imgUrl;
                    return (
                      <div
                        key={i}
                        className="w-20 aspect-[2/3] rounded-lg overflow-hidden border-2 border-[#1c2228] shadow-lg transform group-hover:translate-y-1 transition-transform bg-black/40"
                        style={{ zIndex: item.posters.length - i }}
                      >
                        <img
                          src={posterSrc}
                          alt=""
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const fallbacks = [
                              "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=300&auto=format&fit=crop&q=80",
                              "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=300&auto=format&fit=crop&q=80",
                              "https://images.unsplash.com/photo-1518676599602-2170e3d75992?w=300&auto=format&fit=crop&q=80",
                              "https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=300&auto=format&fit=crop&q=80",
                            ];
                            e.currentTarget.src =
                              fallbacks[i % fallbacks.length];
                          }}
                        />
                      </div>
                    );
                  })}
                  <div className="w-12 h-20 rounded-lg bg-black/60 border border-white/10 flex flex-col items-center justify-center text-[10px] font-bold text-emerald-400 z-0">
                    +{item.filmCount}
                  </div>
                </div>
              </div>

              {/* Action Bar */}
              <div className="flex items-center justify-between pt-3 border-t border-white/5 text-xs text-neutral-400">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => handleLikeList(item.id)}
                    className="flex items-center gap-1.5 hover:text-red-400 transition-colors cursor-pointer"
                  >
                    <Heart size={14} className="text-red-400 fill-red-400/20" />
                    <span className="font-bold">{item.likes} lượt thích</span>
                  </button>
                  <span className="flex items-center gap-1">
                    <Film size={14} /> {item.filmCount} phim
                  </span>
                </div>

                <button
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    toast("Đã sao chép liên kết bộ sưu tập!", "success");
                  }}
                  className="p-2 hover:bg-white/5 rounded-lg text-neutral-400 hover:text-white transition-colors cursor-pointer"
                  title="Chia sẻ bộ sưu tập"
                >
                  <Share2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* ── Modal Tạo Bộ Sưu Tập ── */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#1c2228] border border-[#2c3440] rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
              <h3 className="text-xl font-black text-white flex items-center gap-2">
                <ListPlus size={20} className="text-emerald-400" />
                Tạo Bộ Sưu Tập Phim Mới
              </h3>

              <form onSubmit={handleCreateList} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-neutral-300 block mb-1.5">
                    Tên bộ sưu tập
                  </label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="VD: Top 10 Phim Viễn Tưởng Đáng Xem Nhất..."
                    className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-emerald-500/50 transition-colors"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-neutral-300 block mb-1.5">
                    Mô tả ngắn
                  </label>
                  <textarea
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="Giới thiệu điểm đặc sắc của bộ sưu tập phim này..."
                    rows={3}
                    className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-emerald-500/50 transition-colors resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-400 font-bold text-xs transition-colors cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black font-extrabold text-xs transition-all cursor-pointer"
                  >
                    Tạo Danh Sách
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
