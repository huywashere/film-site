"use client";

import { useEffect, useRef, useState } from "react";
import {
  Check,
  Copy,
  Crown,
  LogOut,
  MessageCircle,
  Radio,
  Send,
  Users,
  X,
} from "lucide-react";
import type {
  ChatMessage,
  FloatingReaction,
  Participant,
  WatchPartyConnectionState,
} from "@/hooks/useWatchParty";
import { useToast } from "@/providers/ToastProvider";

interface WatchPartyPanelProps {
  roomId: string;
  isHost: boolean;
  connectionState: WatchPartyConnectionState;
  participants: Participant[];
  messages: ChatMessage[];
  floatingReactions: FloatingReaction[];
  onSendMessage: (text: string) => void;
  onSendReaction: (emoji: string) => void;
  onLeaveRoom: () => void;
  onClose: () => void;
}

const reactions = ["❤️", "🔥", "😂", "😱", "👏", "🎉"];

function formatMessageTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function WatchPartyPanel({
  roomId,
  isHost,
  connectionState,
  participants,
  messages,
  floatingReactions,
  onSendMessage,
  onSendReaction,
  onLeaveRoom,
  onClose,
}: WatchPartyPanelProps) {
  const [inputText, setInputText] = useState("");
  const [copied, setCopied] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const online = connectionState === "online";

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleCopyLink = async () => {
    const url = new URL(window.location.href);
    url.searchParams.set("room", roomId);
    url.searchParams.delete("party");
    url.searchParams.delete("roomName");
    await navigator.clipboard.writeText(url.toString());
    setCopied(true);
    toast("Đã sao chép liên kết mời.", "success");
    window.setTimeout(() => setCopied(false), 2_000);
  };

  const handleSend = (event: React.FormEvent) => {
    event.preventDefault();
    if (!inputText.trim() || !online) return;
    onSendMessage(inputText.trim());
    setInputText("");
  };

  return (
    <>
      <button
        onClick={onClose}
        className="fixed inset-0 z-[69] bg-black/55 backdrop-blur-[2px] lg:hidden"
        aria-label="Đóng bảng xem chung"
      />
      <aside className="fixed inset-y-0 right-0 z-[70] flex w-full max-w-[390px] flex-col border-l border-white/10 bg-[#0c0f13] text-neutral-200 shadow-[-24px_0_60px_rgba(0,0,0,0.45)] sm:top-16">
        {floatingReactions.map((reaction) => (
          <div
            key={reaction.id}
            className="pointer-events-none fixed bottom-24 z-[90] animate-[watch-party-float_2.5s_ease-out_forwards] text-4xl"
            style={{ left: `${reaction.left}%` }}
            title={reaction.senderName}
          >
            {reaction.emoji}
          </div>
        ))}

        <header className="border-b border-white/10 px-5 pb-4 pt-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-emerald-400">
                <Radio size={15} />
                <span className="text-[11px] font-black uppercase tracking-[0.16em]">
                  Phòng trực tiếp
                </span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <h2 className="font-black text-white">{roomId}</h2>
                {isHost ? (
                  <span className="rounded-full border border-amber-400/25 bg-amber-400/10 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                    Bạn là trưởng phòng
                  </span>
                ) : null}
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-full border border-white/10 p-2 text-neutral-400 transition-colors hover:bg-white/5 hover:text-white"
              aria-label="Đóng"
            >
              <X size={16} />
            </button>
          </div>

          <div
            className={`mt-4 flex items-center justify-between rounded-xl border px-3 py-2.5 text-xs ${
              online
                ? "border-emerald-400/20 bg-emerald-400/[0.05] text-emerald-300"
                : "border-amber-400/20 bg-amber-400/[0.05] text-amber-200"
            }`}
          >
            <span className="flex items-center gap-2 font-bold">
              <span
                className={`h-2 w-2 rounded-full ${
                  online ? "bg-emerald-400" : "animate-pulse bg-amber-400"
                }`}
              />
              {online ? "Đã đồng bộ với phòng" : "Đang kết nối lại"}
            </span>
            <button
              onClick={handleCopyLink}
              disabled={!online}
              className="flex items-center gap-1.5 font-bold text-white disabled:opacity-40"
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
              {copied ? "Đã chép" : "Mời bạn"}
            </button>
          </div>
        </header>

        <section className="border-b border-white/10 px-5 py-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="flex items-center gap-2 text-xs font-bold text-neutral-400">
              <Users size={14} /> {participants.length} người trong phòng
            </span>
            <span className="text-[10px] text-neutral-600">
              Tối đa theo server
            </span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {participants.map((participant) => (
              <div
                key={participant.id}
                className="flex min-w-[62px] flex-col items-center gap-1.5"
                title={participant.name}
              >
                <div className="relative">
                  <img
                    src={participant.avatar}
                    alt=""
                    className="h-9 w-9 rounded-full border border-white/15 object-cover"
                  />
                  {participant.isHost ? (
                    <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-amber-400 text-black">
                      <Crown size={9} fill="currentColor" />
                    </span>
                  ) : null}
                </div>
                <span className="w-16 truncate text-center text-[10px] text-neutral-400">
                  {participant.name}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {messages.length === 0 ? (
            <div className="grid h-full place-items-center text-center">
              <div>
                <MessageCircle size={24} className="mx-auto text-neutral-700" />
                <p className="mt-3 text-xs font-bold text-neutral-500">
                  Chưa có tin nhắn
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) =>
                message.isSystem ? (
                  <div
                    key={message.id}
                    className="border-l-2 border-emerald-400/40 pl-3 text-[11px] leading-5 text-neutral-500"
                  >
                    {message.text}
                  </div>
                ) : (
                  <div key={message.id} className="flex items-start gap-2.5">
                    <img
                      src={message.senderAvatar}
                      alt=""
                      className="mt-0.5 h-7 w-7 shrink-0 rounded-full object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-xs font-bold text-white">
                          {message.senderName}
                        </span>
                        <time className="text-[9px] text-neutral-600">
                          {formatMessageTime(message.timestamp)}
                        </time>
                      </div>
                      <p className="mt-1 break-words text-xs leading-5 text-neutral-300">
                        {message.text}
                      </p>
                    </div>
                  </div>
                ),
              )}
              <div ref={chatEndRef} />
            </div>
          )}
        </section>

        <footer className="border-t border-white/10 bg-[#0a0d10] p-4">
          <div className="mb-3 flex items-center justify-between gap-1">
            {reactions.map((emoji) => (
              <button
                key={emoji}
                onClick={() => onSendReaction(emoji)}
                disabled={!online}
                className="grid h-9 w-9 place-items-center rounded-full text-lg transition-colors hover:bg-white/10 disabled:opacity-35"
                aria-label={`Gửi ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
          <form onSubmit={handleSend} className="flex gap-2">
            <input
              value={inputText}
              maxLength={500}
              onChange={(event) => setInputText(event.target.value)}
              disabled={!online}
              placeholder={online ? "Nhắn tin trong phòng" : "Đang kết nối lại"}
              className="h-11 min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-xs text-white outline-none placeholder:text-neutral-600 focus:border-emerald-400/50 disabled:opacity-50"
            />
            <button
              disabled={!online || !inputText.trim()}
              className="grid h-11 w-11 place-items-center rounded-full bg-emerald-400 text-black transition-colors hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-35"
              aria-label="Gửi tin nhắn"
            >
              <Send size={15} />
            </button>
          </form>
          <button
            onClick={onLeaveRoom}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-full py-2 text-[11px] font-bold text-neutral-500 transition-colors hover:bg-red-400/5 hover:text-red-300"
          >
            <LogOut size={13} /> Rời phòng xem chung
          </button>
        </footer>
      </aside>
      <style jsx global>{`
        @keyframes watch-party-float {
          0% {
            transform: translateY(0) scale(0.75);
            opacity: 0;
          }
          15% {
            opacity: 1;
          }
          100% {
            transform: translateY(-58vh) scale(1.2) rotate(8deg);
            opacity: 0;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          [class*="watch-party-float"] {
            animation: none !important;
          }
        }
      `}</style>
    </>
  );
}
