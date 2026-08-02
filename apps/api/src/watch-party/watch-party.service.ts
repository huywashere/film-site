import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { randomBytes, randomUUID } from "crypto";
import {
  CreateRoomPayload,
  PlaybackAction,
  WatchPartyIdentity,
  WatchPartyLobbyRoom,
  WatchPartyMessage,
  WatchPartyParticipant,
  WatchPartyPlayerState,
  WatchPartyRoomSnapshot,
} from "./watch-party.types";

interface InternalRoom extends WatchPartyRoomSnapshot {
  participants: WatchPartyParticipant[];
}

@Injectable()
export class WatchPartyService implements OnModuleDestroy {
  private readonly rooms = new Map<string, InternalRoom>();
  private readonly socketRooms = new Map<string, Set<string>>();
  private readonly cleanupTimer = setInterval(
    () => this.removeExpiredRooms(),
    15 * 60 * 1000,
  );

  onModuleDestroy() {
    clearInterval(this.cleanupTimer);
  }

  createRoom(socketId: string, payload: CreateRoomPayload) {
    const now = new Date().toISOString();
    const id = this.generateRoomId();
    const participant = this.createParticipant(
      socketId,
      payload.identity,
      true,
      now,
    );
    const movieSlug = this.clean(payload.movie?.slug, 160);
    const movieName = this.clean(payload.movie?.name, 160) || "Phim đang xem";
    const room: InternalRoom = {
      id,
      name: this.clean(payload.name, 90) || `Xem chung: ${movieName}`,
      movie: {
        slug: movieSlug,
        name: movieName,
        posterUrl: this.clean(payload.movie?.posterUrl, 500),
        episode: this.clean(payload.movie?.episode, 80),
      },
      hostId: socketId,
      participants: [participant],
      messages: [
        this.systemMessage(
          `Phòng ${id} đã sẵn sàng. Gửi liên kết mời để xem cùng nhau.`,
          now,
        ),
      ],
      playerState: null,
      createdAt: now,
      updatedAt: now,
    };

    this.rooms.set(id, room);
    this.trackSocketRoom(socketId, id);
    return this.snapshot(room);
  }

  joinRoom(socketId: string, roomId: string, identity?: WatchPartyIdentity) {
    const room = this.requireRoom(roomId);
    const existing = room.participants.find((item) => item.id === socketId);
    if (existing) return { room: this.snapshot(room), participant: existing };

    const now = new Date().toISOString();
    const participant = this.createParticipant(socketId, identity, false, now);
    room.participants.push(participant);
    room.updatedAt = now;
    room.messages.push(
      this.systemMessage(`${participant.name} đã vào phòng.`, now),
    );
    this.trimMessages(room);
    this.trackSocketRoom(socketId, room.id);
    return { room: this.snapshot(room), participant };
  }

  leaveRoom(socketId: string, roomId: string) {
    const room = this.rooms.get(this.normalizeRoomId(roomId));
    if (!room) return null;

    const participant = room.participants.find((item) => item.id === socketId);
    if (!participant) return null;

    room.participants = room.participants.filter(
      (item) => item.id !== socketId,
    );
    this.untrackSocketRoom(socketId, room.id);

    if (room.participants.length === 0) {
      this.rooms.delete(room.id);
      return { roomId: room.id, participant, room: null, deleted: true };
    }

    const now = new Date().toISOString();
    room.messages.push(
      this.systemMessage(`${participant.name} đã rời phòng.`, now),
    );

    if (room.hostId === socketId) {
      room.hostId = room.participants[0].id;
      room.participants = room.participants.map((item) => ({
        ...item,
        isHost: item.id === room.hostId,
      }));
      room.messages.push(
        this.systemMessage(
          `${room.participants[0].name} đã trở thành trưởng phòng.`,
          now,
        ),
      );
    }

    room.updatedAt = now;
    this.trimMessages(room);
    return {
      roomId: room.id,
      participant,
      room: this.snapshot(room),
      deleted: false,
    };
  }

  leaveAll(socketId: string) {
    const roomIds = Array.from(this.socketRooms.get(socketId) ?? []);
    return roomIds
      .map((roomId) => this.leaveRoom(socketId, roomId))
      .filter((result): result is NonNullable<typeof result> =>
        Boolean(result),
      );
  }

  addMessage(socketId: string, roomId: string, text: string) {
    const room = this.requireMembership(socketId, roomId);
    const sender = room.participants.find((item) => item.id === socketId)!;
    const cleanText = this.clean(text, 500);
    if (!cleanText) throw new Error("Tin nhắn không được để trống.");

    const message: WatchPartyMessage = {
      id: randomUUID(),
      senderId: sender.id,
      senderName: sender.name,
      senderAvatar: sender.avatar,
      text: cleanText,
      timestamp: new Date().toISOString(),
    };
    room.messages.push(message);
    room.updatedAt = message.timestamp;
    this.trimMessages(room);
    return message;
  }

  addReaction(socketId: string, roomId: string, emoji: string) {
    const room = this.requireMembership(socketId, roomId);
    const sender = room.participants.find((item) => item.id === socketId)!;
    const allowed = new Set(["❤️", "🔥", "😂", "😱", "👏", "🎉"]);
    if (!allowed.has(emoji)) throw new Error("Biểu cảm không hợp lệ.");
    room.updatedAt = new Date().toISOString();
    return { id: randomUUID(), emoji, senderName: sender.name };
  }

  updatePlayer(
    socketId: string,
    roomId: string,
    action: PlaybackAction,
    currentTime: number,
    episode: string,
  ) {
    const room = this.requireMembership(socketId, roomId);
    if (room.hostId !== socketId) {
      throw new Error("Chỉ trưởng phòng mới có thể điều khiển video.");
    }
    if (!["play", "pause", "seek"].includes(action)) {
      throw new Error("Trạng thái player không hợp lệ.");
    }

    const state: WatchPartyPlayerState = {
      action,
      currentTime: Math.max(0, Math.min(Number(currentTime) || 0, 86_400)),
      episode: this.clean(episode, 80),
      updatedAt: new Date().toISOString(),
      senderId: socketId,
    };
    room.playerState = state;
    room.movie.episode = state.episode;
    room.updatedAt = state.updatedAt;
    return state;
  }

  getRoom(roomId: string) {
    const room = this.rooms.get(this.normalizeRoomId(roomId));
    return room ? this.snapshot(room) : null;
  }

  listRooms(): WatchPartyLobbyRoom[] {
    return Array.from(this.rooms.values())
      .filter((room) => room.movie.slug && room.participants.length > 0)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 24)
      .map((room) => ({
        id: room.id,
        name: room.name,
        movie: { ...room.movie },
        hostName:
          room.participants.find((item) => item.id === room.hostId)?.name ||
          "Trưởng phòng",
        participantCount: room.participants.length,
        createdAt: room.createdAt,
        updatedAt: room.updatedAt,
      }));
  }

  private requireRoom(roomId: string) {
    const room = this.rooms.get(this.normalizeRoomId(roomId));
    if (!room) throw new Error("Phòng không tồn tại hoặc đã kết thúc.");
    return room;
  }

  private requireMembership(socketId: string, roomId: string) {
    const room = this.requireRoom(roomId);
    if (!room.participants.some((item) => item.id === socketId)) {
      throw new Error("Bạn chưa tham gia phòng này.");
    }
    return room;
  }

  private createParticipant(
    socketId: string,
    identity: WatchPartyIdentity | undefined,
    isHost: boolean,
    joinedAt: string,
  ): WatchPartyParticipant {
    const name = this.clean(identity?.name, 50) || "Khách Cineverse";
    return {
      id: socketId,
      userId: this.clean(identity?.userId, 100) || undefined,
      name,
      avatar:
        this.clean(identity?.avatar, 500) ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=17202a&color=ffffff`,
      isHost,
      joinedAt,
    };
  }

  private systemMessage(text: string, timestamp: string): WatchPartyMessage {
    return {
      id: randomUUID(),
      senderId: "system",
      senderName: "Cineverse",
      senderAvatar: "",
      text,
      timestamp,
      isSystem: true,
    };
  }

  private snapshot(room: InternalRoom): WatchPartyRoomSnapshot {
    return {
      ...room,
      movie: { ...room.movie },
      participants: room.participants.map((item) => ({ ...item })),
      messages: room.messages.map((item) => ({ ...item })),
      playerState: room.playerState ? { ...room.playerState } : null,
    };
  }

  private clean(value: unknown, maxLength: number) {
    return typeof value === "string"
      ? Array.from(value)
          .filter((character) => {
            const code = character.charCodeAt(0);
            return code >= 32 && code !== 127;
          })
          .join("")
          .trim()
          .slice(0, maxLength)
      : "";
  }

  private normalizeRoomId(roomId: string) {
    return this.clean(roomId, 12).toUpperCase();
  }

  private generateRoomId() {
    let id = "";
    do {
      id = `WP-${randomBytes(3).toString("hex").toUpperCase()}`;
    } while (this.rooms.has(id));
    return id;
  }

  private trackSocketRoom(socketId: string, roomId: string) {
    const roomIds = this.socketRooms.get(socketId) ?? new Set<string>();
    roomIds.add(roomId);
    this.socketRooms.set(socketId, roomIds);
  }

  private untrackSocketRoom(socketId: string, roomId: string) {
    const roomIds = this.socketRooms.get(socketId);
    if (!roomIds) return;
    roomIds.delete(roomId);
    if (roomIds.size === 0) this.socketRooms.delete(socketId);
  }

  private trimMessages(room: InternalRoom) {
    if (room.messages.length > 100)
      room.messages.splice(0, room.messages.length - 100);
  }

  private removeExpiredRooms() {
    const expiresBefore = Date.now() - 6 * 60 * 60 * 1000;
    for (const [roomId, room] of this.rooms) {
      if (new Date(room.updatedAt).getTime() < expiresBefore) {
        this.rooms.delete(roomId);
      }
    }
  }
}
