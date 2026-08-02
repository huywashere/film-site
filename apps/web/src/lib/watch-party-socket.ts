import { io, type Socket } from "socket.io-client";

export type PlaybackAction = "play" | "pause" | "seek";

export interface WatchPartyParticipant {
  id: string;
  userId?: string;
  name: string;
  avatar: string;
  isHost: boolean;
  joinedAt: string;
}

export interface WatchPartyMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  text: string;
  timestamp: string;
  isSystem?: boolean;
}

export interface WatchPartyPlayerState {
  action: PlaybackAction;
  currentTime: number;
  episode: string;
  updatedAt: string;
  senderId: string;
}

export interface WatchPartyMovie {
  slug: string;
  name: string;
  posterUrl?: string;
  episode?: string;
}

export interface WatchPartyRoom {
  id: string;
  name: string;
  movie: WatchPartyMovie;
  hostId: string;
  participants: WatchPartyParticipant[];
  messages: WatchPartyMessage[];
  playerState: WatchPartyPlayerState | null;
  createdAt: string;
  updatedAt: string;
}

export interface WatchPartyLobbyRoom {
  id: string;
  name: string;
  movie: WatchPartyMovie;
  hostName: string;
  participantCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SocketAck {
  ok: boolean;
  error?: string;
  room?: WatchPartyRoom;
  rooms?: WatchPartyLobbyRoom[];
}

function getSocketOrigin() {
  const configured =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";
  try {
    return new URL(configured).origin;
  } catch {
    return "http://localhost:3001";
  }
}

export function createWatchPartySocket(): Socket {
  return io(`${getSocketOrigin()}/watch-party`, {
    autoConnect: false,
    withCredentials: true,
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionDelay: 800,
    reconnectionDelayMax: 5_000,
    timeout: 8_000,
  });
}
