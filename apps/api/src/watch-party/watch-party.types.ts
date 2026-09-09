export type PlaybackAction = "play" | "pause" | "seek" | "ended" | "episode";

export interface WatchPartyIdentity {
  userId?: string;
  name?: string;
  avatar?: string;
  reconnectToken?: string;
}

export interface WatchPartyMovie {
  slug: string;
  name: string;
  posterUrl?: string;
  episode?: string;
}

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
  serverTime?: number;
}

export interface WatchPartyRoomSnapshot {
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

export interface CreateRoomPayload {
  identity?: WatchPartyIdentity;
  name?: string;
  movie?: Partial<WatchPartyMovie>;
}

export interface JoinRoomPayload {
  roomId?: string;
  identity?: WatchPartyIdentity;
}

export interface PlayerStatePayload {
  roomId?: string;
  action?: PlaybackAction;
  currentTime?: number;
  episode?: string;
}
