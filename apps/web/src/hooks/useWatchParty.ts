"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuthStore } from "@/store/authStore";
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
  const key = "cineverse-watch-party-guest";
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;
  const id = `guest-${crypto.randomUUID()}`;
  window.localStorage.setItem(key, id);
  return id;
}

export function useWatchParty(movieSlug: string, episodeName: string) {
  const user = useAuthStore((state) => state.user);
  const { toast } = useToast();
  const socket = useMemo(() => createWatchPartySocket(), []);

  const [room, setRoom] = useState<WatchPartyRoom | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [connectionState, setConnectionState] =
    useState<WatchPartyConnectionState>("connecting");
  const [floatingReactions, setFloatingReactions] = useState<
    FloatingReaction[]
  >([]);
  const [remotePlayerState, setRemotePlayerState] =
    useState<WatchPartyPlayerState | null>(null);

  const roomIdRef = useRef<string | null>(null);
  const identityRef = useRef({
    userId: user?.id || getGuestId(),
    name: user?.displayName || user?.username || "Khách Cineverse",
    avatar: user?.avatarUrl,
  });
  identityRef.current = {
    userId: user?.id || getGuestId(),
    name: user?.displayName || user?.username || "Khách Cineverse",
    avatar: user?.avatarUrl,
  };

  const triggerReaction = useCallback(
    (reaction: { id?: string; emoji: string; senderName: string }) => {
      const item: FloatingReaction = {
        id: reaction.id || crypto.randomUUID(),
        emoji: reaction.emoji,
        senderName: reaction.senderName,
        left: Math.floor(Math.random() * 70) + 15,
      };
      setFloatingReactions((current) => [...current, item]);
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
    const handleConnect = () => {
      setConnectionState("online");
      if (roomIdRef.current) {
        socket.emit(
          "room:join",
          { roomId: roomIdRef.current, identity: identityRef.current },
          (result: SocketAck) => {
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
        if (!socket.connected) {
          toast("Chưa kết nối được máy chủ xem chung.", "error");
          resolve(null);
          return;
        }
        socket.emit(
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
          (result: SocketAck) => {
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
    [episodeName, movieSlug, socket, toast],
  );

  const joinRoom = useCallback(
    (targetRoomId: string) =>
      new Promise<boolean>((resolve) => {
        const roomId = targetRoomId.trim().toUpperCase();
        if (!roomId) return resolve(false);
        roomIdRef.current = roomId;
        const sendJoin = () => {
          socket.emit(
            "room:join",
            { roomId, identity: identityRef.current },
            (result: SocketAck) => {
              if (!result.ok || !result.room) {
                roomIdRef.current = null;
                toast(result.error || "Không thể tham gia phòng.", "error");
                resolve(false);
                return;
              }
              setRoom(result.room);
              setIsOpen(true);
              if (result.room.playerState) {
                setRemotePlayerState(result.room.playerState);
              }
              resolve(true);
            },
          );
        };
        if (socket.connected) sendJoin();
        else socket.once("connect", sendJoin);
      }),
    [socket, toast],
  );

  const leaveRoom = useCallback(() => {
    const roomId = roomIdRef.current;
    if (roomId && socket.connected) socket.emit("room:leave", { roomId });
    roomIdRef.current = null;
    setRoom(null);
    setRemotePlayerState(null);
    setIsOpen(false);
    toast("Đã rời phòng xem chung.", "info");
  }, [socket, toast]);

  const sendMessage = useCallback(
    (text: string) => {
      if (!room?.id || !text.trim() || connectionState !== "online") return;
      socket.emit(
        "chat:send",
        { roomId: room.id, text: text.trim() },
        (result: SocketAck) => {
          if (!result.ok)
            toast(result.error || "Không gửi được tin nhắn.", "error");
        },
      );
    },
    [connectionState, room?.id, socket, toast],
  );

  const sendReaction = useCallback(
    (emoji: string) => {
      if (!room?.id || connectionState !== "online") return;
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
    (action: PlaybackAction, currentTime: number) => {
      if (!room?.id || room.hostId !== socket.id || !socket.connected) return;
      socket.emit("player:state", {
        roomId: room.id,
        action,
        currentTime,
        episode: episodeName,
      });
    },
    [episodeName, room?.hostId, room?.id, socket],
  );

  return {
    room,
    roomId: room?.id || null,
    isHost: Boolean(room && room.hostId === socket.id),
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
