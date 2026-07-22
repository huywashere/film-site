'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/providers/ToastProvider';
import { checkWatchPartyReactionRateLimit } from '@/lib/rate-limiter';

export interface Participant {
  id: string;
  name: string;
  avatar: string;
  isHost?: boolean;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  text: string;
  timestamp: string;
  isSystem?: boolean;
}

export interface FloatingReaction {
  id: string;
  emoji: string;
  senderName: string;
  left: number; // Percentage 10-90%
}

export function useWatchParty(movieSlug: string, episodeName: string) {
  const user = useAuthStore((s) => s.user);
  const { toast } = useToast();

  const [roomId, setRoomId] = useState<string | null>(null);
  const [isHost, setIsHost] = useState<boolean>(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([]);
  const [isOpen, setIsOpen] = useState<boolean>(false);

  // Sync state broadcast channel (using BroadcastChannel API for multi-tab sync + simulated live network)
  const [channel, setChannel] = useState<BroadcastChannel | null>(null);

  useEffect(() => {
    if (!roomId) return;

    const bc = new BroadcastChannel(`cineverse_watch_party_${roomId}`);
    setChannel(bc);

    bc.onmessage = (event) => {
      const { type, payload } = event.data;
      if (type === 'USER_JOINED') {
        setParticipants((prev) => {
          if (prev.some((p) => p.id === payload.id)) return prev;
          return [...prev, payload];
        });
        addSystemMessage(`${payload.name} đã tham gia phòng xem chung!`);
      } else if (type === 'USER_LEFT') {
        setParticipants((prev) => prev.filter((p) => p.id !== payload.id));
        addSystemMessage(`${payload.name} đã rời phòng.`);
      } else if (type === 'CHAT_MESSAGE') {
        setMessages((prev) => [...prev, payload]);
      } else if (type === 'REACTION') {
        triggerFloatingReaction(payload.emoji, payload.senderName);
      } else if (type === 'PLAYER_SYNC') {
        // Broadcasted playback sync event
        if (payload.senderId !== user?.id) {
          addSystemMessage(`${payload.senderName} vừa ${payload.action === 'play' ? 'phát' : payload.action === 'pause' ? 'tạm dừng' : 'chuyển thời gian'} video.`);
        }
      }
    };

    return () => {
      bc.close();
    };
  }, [roomId, user?.id]);

  const addSystemMessage = (text: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: Math.random().toString(),
        senderId: 'system',
        senderName: 'Hệ thống',
        senderAvatar: '',
        text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isSystem: true,
      },
    ]);
  };

  const triggerFloatingReaction = (emoji: string, senderName: string) => {
    const newReaction: FloatingReaction = {
      id: Math.random().toString(),
      emoji,
      senderName,
      left: Math.floor(Math.random() * 70) + 15, // 15% to 85%
    };
    setFloatingReactions((prev) => [...prev, newReaction]);
    setTimeout(() => {
      setFloatingReactions((prev) => prev.filter((r) => r.id !== newReaction.id));
    }, 2500);
  };

  const createRoom = () => {
    const newRoomId = 'WP-' + Math.random().toString(36).substring(2, 7).toUpperCase();
    setRoomId(newRoomId);
    setIsHost(true);
    setIsOpen(true);

    const currentUser: Participant = {
      id: user?.id || 'guest-' + Math.random().toString(36).substring(2, 5),
      name: user?.displayName || user?.username || 'Bạn (Trưởng phòng)',
      avatar: user?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.username || 'User')}&background=00e054&color=000`,
      isHost: true,
    };

    setParticipants([currentUser]);
    setMessages([
      {
        id: 'init',
        senderId: 'system',
        senderName: 'Hệ thống',
        senderAvatar: '',
        text: `Phòng xem chung #${newRoomId} đã sẵn sàng! Chia sẻ đường link để mời bạn bè cùng xem.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isSystem: true,
      },
    ]);

    toast(`Đã tạo phòng xem chung #${newRoomId}!`, 'success');
  };

  const joinRoom = (targetRoomId: string) => {
    setRoomId(targetRoomId);
    setIsHost(false);
    setIsOpen(true);

    const currentUser: Participant = {
      id: user?.id || 'guest-' + Math.random().toString(36).substring(2, 5),
      name: user?.displayName || user?.username || 'Thành viên mới',
      avatar: user?.avatarUrl || `https://ui-avatars.com/api/?name=User&background=2c3440&color=fff`,
    };

    setParticipants([currentUser]);
    toast(`Đã tham gia phòng xem chung #${targetRoomId}!`, 'success');
  };

  const leaveRoom = () => {
    if (channel && user) {
      channel.postMessage({
        type: 'USER_LEFT',
        payload: { id: user.id, name: user.displayName || user.username },
      });
    }
    setRoomId(null);
    setIsHost(false);
    setParticipants([]);
    setMessages([]);
    setIsOpen(false);
    toast('Đã rời phòng xem chung.', 'info');
  };

  const sendMessage = (text: string) => {
    if (!text.trim() || !roomId) return;
    const msg: ChatMessage = {
      id: Math.random().toString(),
      senderId: user?.id || 'guest',
      senderName: user?.displayName || user?.username || 'Thành viên',
      senderAvatar: user?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.username || 'U')}&background=2c3440&color=fff`,
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, msg]);
    if (channel) {
      channel.postMessage({ type: 'CHAT_MESSAGE', payload: msg });
    }
  };

  const sendReaction = (emoji: string) => {
    const rateCheck = checkWatchPartyReactionRateLimit(user?.id || 'guest');
    if (!rateCheck.allowed) {
      toast(`Bạn đang thả biểu cảm quá nhanh! Vui lòng đợi ${rateCheck.retryAfterSeconds}s.`, 'error');
      return;
    }

    const senderName = user?.displayName || user?.username || 'Thành viên';
    triggerFloatingReaction(emoji, senderName);
    if (channel) {
      channel.postMessage({
        type: 'REACTION',
        payload: { emoji, senderName },
      });
    }
  };

  const syncPlayerState = (action: 'play' | 'pause' | 'seek', currentTime: number) => {
    if (channel && roomId) {
      channel.postMessage({
        type: 'PLAYER_SYNC',
        payload: {
          action,
          currentTime,
          senderId: user?.id || 'guest',
          senderName: user?.displayName || user?.username || 'Thành viên',
        },
      });
    }
  };

  return {
    roomId,
    isHost,
    participants,
    messages,
    floatingReactions,
    isOpen,
    setIsOpen,
    createRoom,
    joinRoom,
    leaveRoom,
    sendMessage,
    sendReaction,
    syncPlayerState,
  };
}
