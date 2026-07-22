'use client';

import { useState, useRef, useEffect } from 'react';
import { Users, Send, Copy, Check, LogOut, MessageSquare, Sparkles, Crown, Smile } from 'lucide-react';
import { ChatMessage, Participant, FloatingReaction } from '@/hooks/useWatchParty';
import { useToast } from '@/providers/ToastProvider';
import { cn } from '@/lib/utils';

interface WatchPartyPanelProps {
  roomId: string;
  isHost: boolean;
  participants: Participant[];
  messages: ChatMessage[];
  floatingReactions: FloatingReaction[];
  onSendMessage: (text: string) => void;
  onSendReaction: (emoji: string) => void;
  onLeaveRoom: () => void;
  onClose: () => void;
}

export function WatchPartyPanel({
  roomId,
  isHost,
  participants,
  messages,
  floatingReactions,
  onSendMessage,
  onSendReaction,
  onLeaveRoom,
  onClose,
}: WatchPartyPanelProps) {
  const [inputText, setInputText] = useState('');
  const [copied, setCopied] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleCopyLink = () => {
    const url = `${window.location.origin}${window.location.pathname}?room=${roomId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast('Đã sao chép liên kết phòng xem chung!', 'success');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim()) {
      onSendMessage(inputText.trim());
      setInputText('');
    }
  };

  const EMOJIS = ['❤️', '🔥', '😂', '😱', '👏', '🎉'];

  return (
    <div className="flex flex-col h-full bg-[#101418] border-l border-white/10 text-neutral-200 w-full lg:w-80 flex-shrink-0 shadow-2xl relative">
      
      {/* ── Header ── */}
      <div className="p-4 border-b border-white/10 bg-black/40 backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-extrabold text-sm text-white tracking-wider uppercase flex items-center gap-1.5">
            <Sparkles size={14} className="text-emerald-400" />
            Watch Party
          </span>
          <span className="bg-white/10 text-[10px] font-mono px-2 py-0.5 rounded-full text-emerald-300 font-bold border border-emerald-500/30">
            #{roomId}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleCopyLink}
            title="Sao chép link mời"
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white transition-all cursor-pointer"
          >
            {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
          </button>
          <button
            onClick={onLeaveRoom}
            title="Rời phòng"
            className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all cursor-pointer"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>

      {/* ── Online Participants Bar ── */}
      <div className="px-4 py-2.5 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-neutral-400 font-semibold">
          <Users size={13} className="text-neutral-300" />
          <span>Thành viên ({participants.length})</span>
        </div>
        <div className="flex -space-x-2 overflow-hidden">
          {participants.map((p) => (
            <div key={p.id} className="relative group" title={p.name}>
              <img
                src={p.avatar}
                alt={p.name}
                className="w-6 h-6 rounded-full object-cover border-2 border-[#101418] shadow-sm"
              />
              {p.isHost && (
                <Crown size={9} className="absolute -top-1 -right-1 text-amber-400 fill-amber-400" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Messages Feed ── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-white/10">
        {messages.map((msg) => {
          if (msg.isSystem) {
            return (
              <div key={msg.id} className="text-center py-1">
                <span className="text-[11px] bg-white/5 text-neutral-400 px-3 py-1 rounded-full border border-white/5 inline-block">
                  {msg.text}
                </span>
              </div>
            );
          }

          return (
            <div key={msg.id} className="flex gap-2.5 items-start group">
              <img
                src={msg.senderAvatar}
                alt={msg.senderName}
                className="w-7 h-7 rounded-full object-cover mt-0.5 border border-white/10 flex-shrink-0"
              />
              <div className="flex flex-col max-w-[85%]">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-neutral-300">{msg.senderName}</span>
                  <span className="text-[9px] text-neutral-500">{msg.timestamp}</span>
                </div>
                <div className="mt-0.5 bg-white/5 border border-white/5 text-neutral-200 text-xs px-3 py-2 rounded-2xl rounded-tl-sm break-words leading-relaxed">
                  {msg.text}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={chatEndRef} />
      </div>

      {/* ── Floating Reaction Bar ── */}
      <div className="px-3 py-2 border-t border-white/5 bg-black/20 flex items-center justify-around gap-1">
        {EMOJIS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => onSendReaction(emoji)}
            className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-lg transition-transform active:scale-125 cursor-pointer"
            title={`Gửi biểu cảm ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* ── Chat Input ── */}
      <form onSubmit={handleSend} className="p-3 border-t border-white/10 bg-black/40 flex items-center gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Nhắn tin trong phòng..."
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 outline-none focus:border-emerald-500/50 transition-colors"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="p-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-black font-bold transition-all cursor-pointer flex-shrink-0"
        >
          <Send size={14} />
        </button>
      </form>
    </div>
  );
}
