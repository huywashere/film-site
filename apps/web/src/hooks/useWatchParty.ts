"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import { useAuthStore } from "@/store/authStore";
import { useAuthModalStore } from "@/store/authModalStore";
import { useToast } from "@/providers/ToastProvider";
import {
  createWatchPartySocket,
  type PlaybackAction,
  type SocketAck,
  type WatchPartyMessage,
  type WatchPartyParticipant,
  type WatchPartyPlayerState,
  type WatchPartyRoom,
} from "@/lib/watch-party-socket";

export type Participant = WatchPartyParticipant;
export type ChatMessage = WatchPartyMessage;

export interface FloatingReaction {
  id: string;
  emoji: string;
  senderName: string;
  left: number;
}

export interface CreateWatchPartyInput {
  name?: string;
  movieName?: string;
  posterUrl?: string;
}

export type WatchPartyConnectionState = "connecting" | "online" | "offline";

function getGuestId() {
  if (typeof window === "undefined") return "guest";
  const key = "netphim-watch-party-guest";
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;
  const id = `guest-${crypto.randomUUID()}`;
  window.localStorage.setItem(key, id);
  return id;
}

function getGuestReconnectToken() {
  if (typeof window === "undefined") return "";
  const key = "netphim-watch-party-reconnect";
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;
  const token = crypto.randomUUID();
  window.localStorage.setItem(key, token);
  return token;
}

export function useWatchParty(
  movieSlug: string,
  episodeName: string,
  enabled = true,
) {
  const user = useAuthStore((state) => state.user);
  const { toast } = useToast();
  const [socket, setSocket] = useState<Socket | null>(null);

  const [room, setRoom] = useState<WatchPartyRoom | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [connectionState, setConnectionState] =
    useState<WatchPartyConnectionState>("offline");
  const [floatingReactions, setFloatingReactions] = useState<
    FloatingReaction[]
  >([]);
  const [remotePlayerState, setRemotePlayerState] =
    useState<WatchPartyPlayerState | null>(null);

  const roomIdRef = useRef<string | null>(null);
  const identityRef = useRef({
    userId: user?.id || getGuestId(),
    name: user?.displayName || user?.username || "Khách FlexPhim",
    avatar: user?.avatarUrl,
    reconnectToken: user ? undefined : getGuestReconnectToken(),
  });
  identityRef.current = {
    userId: user?.id || getGuestId(),
    name: user?.displayName || user?.username || "Khách FlexPhim",
    avatar: user?.avatarUrl,
    reconnectToken: user ? undefined : getGuestReconnectToken(),
  };

  const triggerReaction = useCallback(
    (reaction: { id?: string; emoji: string; senderName: string }) => {
      const item: FloatingReaction = {
        id: reaction.id || crypto.randomUUID(),
        emoji: reaction.emoji,
        senderName: reaction.senderName,
        left: Math.floor(Math.random() * 70) + 15,
      };
      setFloatingReactions((current) => [...current.slice(-9), item]);
      window.setTimeout(
        () =>
          setFloatingReactions((current) =>
            current.filter((entry) => entry.id !== item.id),
          ),
        2_500,
      );
    },
    [],
  );

  useEffect(() => {
    if (!enabled) {
      setConnectionState("offline");
      return;
    }

    let active = true;
    setConnectionState("connecting");
    void createWatchPartySocket(identityRef.current)
      .then((nextSocket) => {
        if (!active) {
          nextSocket.disconnect();
          return;
        }
        setSocket(nextSocket);
      })
      .catch(() => {
        if (active) setConnectionState("offline");
      });

    return () => {
      active = false;
      setSocket((current) => {
        current?.removeAllListeners();
        current?.disconnect();
        return null;
      });
    };
  }, [enabled]);

  useEffect(() => {
    if (!socket) return;
    const handleConnect = () => {
      setConnectionState("online");
      if (roomIdRef.current) {
        socket.timeout(8_000).emit(
          "room:join",
          { roomId: roomIdRef.current, identity: identityRef.current },
          (error: Error | null, result?: SocketAck) => {
            if (error || !result) return;
            if (result.ok && result.room) setRoom(result.room);
          },
        );
      }
    };
    const handleDisconnect = () => setConnectionState("offline");
    const handleConnectError = () => setConnectionState("offline");
    const handleSnapshot = (snapshot: WatchPartyRoom) => setRoom(snapshot);
    const handleMessage = (message: WatchPartyMessage) =>
      setRoom((current) =>
        current
          ? { ...current, messages: [...current.messages, message].slice(-100) }
          : current,
      );
    const handlePlayerState = (state: WatchPartyPlayerState) =>
      setRemotePlayerState(state);

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);
    socket.on("room:snapshot", handleSnapshot);
    socket.on("chat:message", handleMessage);
    socket.on("reaction", triggerReaction);
    socket.on("player:state", handlePlayerState);
    socket.connect();

    return () => {
      if (roomIdRef.current && socket.connected) {
        socket.emit("room:leave", { roomId: roomIdRef.current });
      }
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [socket, triggerReaction]);

  const createRoom = useCallback(
    (input: CreateWatchPartyInput = {}) =>
      new Promise<string | null>((resolve) => {
        if (!user) {
          toast("Vui lòng đăng nhập để tạo phòng xem chung.", "warning");
          useAuthModalStore.getState().openModal("login");
          resolve(null);
          return;
        }
        if (!socket?.connected) {
          toast("Chưa kết nối được máy chủ xem chung.", "error");
          resolve(null);
          return;
        }
        socket.timeout(8_000).emit(
          "room:create",
          {
            identity: identityRef.current,
            name: input.name,
            movie: {
              slug: movieSlug,
              name: input.movieName || "Phim đang xem",
              posterUrl: input.posterUrl,
              episode: episodeName,
            },
          },
          (error: Error | null, result?: SocketAck) => {
            if (error || !result) {
              toast("Máy chủ xem chung phản hồi quá lâu. Hãy thử lại.", "error");
              resolve(null);
              return;
            }
            if (!result.ok || !result.room) {
              toast(result.error || "Không thể tạo phòng xem chung.", "error");
              resolve(null);
              return;
            }
            roomIdRef.current = result.room.id;
            setRoom(result.room);
            setIsOpen(true);
            toast(`Đã tạo phòng ${result.room.id}.`, "success");
            resolve(result.room.id);
          },
        );
      }),
    [episodeName, movieSlug, socket, toast, user],
  );

  const joinRoom = useCallback(
    (targetRoomId: string) =>
      new Promise<boolean>((resolve) => {
        const roomId = targetRoomId.trim().toUpperCase();
        if (!roomId) return resolve(false);
        roomIdRef.current = roomId;
        if (!socket) {
          toast("Chưa kết nối được máy chủ xem chung.", "error");
          resolve(false);
          return;
        }
        let settled = false;
        const sendJoin = () => {
          socket.timeout(8_000).emit(
            "room:join",
            { roomId, identity: identityRef.current },
            (error: Error | null, result?: SocketAck) => {
              if (settled) return;
              if (error || !result) {
                roomIdRef.current = null;
                toast("Máy chủ xem chung phản hồi quá lâu. Hãy thử lại.", "error");
                finish(false);
                return;
              }
              if (!result.ok || !result.room) {
                roomIdRef.current = null;
                toast(result.error || "Không thể tham gia phòng.", "error");
                finish(false);
                return;
              }
              setRoom(result.room);
              setIsOpen(true);
              if (result.room.playerState) {
                setRemotePlayerState(result.room.playerState);
              }
              finish(true);
            },
          );
        };
        const finish = (value: boolean) => {
          if (settled) return;
          settled = true;
          window.clearTimeout(connectTimer);
          socket.off("connect", sendJoin);
          resolve(value);
        };
        const connectTimer = window.setTimeout(() => {
          roomIdRef.current = null;
          toast("Kết nối phòng quá lâu. Hãy kiểm tra mạng và thử lại.", "error");
          finish(false);
        }, 10_000);
        if (socket.connected) sendJoin();
        else socket.once("connect", sendJoin);
      }),
    [socket, toast],
  );

  const leaveRoom = useCallback(() => {
    const roomId = roomIdRef.current;
    if (roomId && socket?.connected) socket.emit("room:leave", { roomId });
    roomIdRef.current = null;
    setRoom(null);
    setRemotePlayerState(null);
    setIsOpen(false);
    toast("Đã rời phòng xem chung.", "info");
  }, [socket, toast]);

  const sendMessage = useCallback(
    (text: string) => {
      if (!user) {
        toast("Vui lòng đăng nhập để tham gia trò chuyện.", "warning");
        useAuthModalStore.getState().openModal("login");
        return;
      }
      if (!socket || !room?.id || !text.trim() || connectionState !== "online")
        return;
      socket.emit(
        "chat:send",
        { roomId: room.id, text: text.trim() },
        (result: SocketAck) => {
          if (!result.ok)
            toast(result.error || "Không gửi được tin nhắn.", "error");
        },
      );
    },
    [connectionState, room?.id, socket, toast, user],
  );

  const sendReaction = useCallback(
    (emoji: string) => {
      if (!socket || !room?.id || connectionState !== "online") return;
      socket.emit(
        "reaction:send",
        { roomId: room.id, emoji },
        (result: SocketAck) => {
          if (!result.ok)
            toast(result.error || "Không gửi được biểu cảm.", "error");
        },
      );
    },
    [connectionState, room?.id, socket, toast],
  );

  const syncPlayerState = useCallback(
    (action: PlaybackAction, currentTime: number, episode = episodeName) => {
      if (
        !socket ||
        !room?.id ||
        room.hostId !== socket.id ||
        !socket.connected
      )
        return;
      socket.emit("player:state", {
        roomId: room.id,
        action,
        currentTime,
        episode,
      });
    },
    [episodeName, room?.hostId, room?.id, socket],
  );

  return {
    room,
    roomId: room?.id || null,
    isHost: Boolean(room && socket && room.hostId === socket.id),
    participants: room?.participants || [],
    messages: room?.messages || [],
    floatingReactions,
    remotePlayerState,
    connectionState,
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
