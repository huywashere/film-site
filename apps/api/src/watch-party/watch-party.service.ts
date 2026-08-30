import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { randomBytes, randomUUID } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { RedisCacheService } from "../redis/redis.service";
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
  peakParticipants: number;
}

@Injectable()
export class WatchPartyService implements OnModuleDestroy {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisCacheService,
  ) {}

  private readonly maxRooms = 500;
  private readonly maxRoomsPerSocket = 3;
  private readonly maxParticipantsPerRoom = 50;
  private readonly rooms = new Map<string, InternalRoom>();
  private readonly socketRooms = new Map<string, Set<string>>();
  private readonly cleanupTimer = setInterval(
    () => this.removeExpiredRooms(),
    15 * 60 * 1000,
  );

  onModuleDestroy() {
    clearInterval(this.cleanupTimer);
  }

  private syncToRedis(room: InternalRoom) {
    void this.redis.setJson(`wp:room:${room.id}`, room, 4 * 3600);
  }

  private removeFromRedis(roomId: string) {
    void this.redis.del(`wp:room:${roomId}`);
  }

  createRoom(
    socketId: string,
    payload: CreateRoomPayload,
    trustedIdentity?: WatchPartyIdentity,
  ) {
    if (this.rooms.size >= this.maxRooms) {
      throw new Error("Hệ thống đã đạt giới hạn phòng đang hoạt động.");
    }
    if ((this.socketRooms.get(socketId)?.size || 0) >= this.maxRoomsPerSocket) {
      throw new Error("Bạn đã đạt giới hạn số phòng có thể tạo.");
    }
    const now = new Date().toISOString();
    const id = this.generateRoomId();
    const participant = this.createParticipant(
      socketId,
      trustedIdentity,
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
      peakParticipants: 1,
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
    this.syncToRedis(room);
    return this.snapshot(room);
  }

  joinRoom(socketId: string, roomId: string, identity?: WatchPartyIdentity) {
    const room = this.requireRoom(roomId);
    const existing = room.participants.find((item) => item.id === socketId);
    if (existing) return { room: this.snapshot(room), participant: existing };
    if (room.participants.length >= this.maxParticipantsPerRoom) {
      throw new Error("Phòng đã đủ người tham gia.");
    }

    const now = new Date().toISOString();
    const participant = this.createParticipant(socketId, identity, false, now);
    room.participants.push(participant);
    room.peakParticipants = Math.max(
      room.peakParticipants,
      room.participants.length,
    );
    room.updatedAt = now;
    room.messages.push(
      this.systemMessage(`${participant.name} đã vào phòng.`, now),
    );
    this.trimMessages(room);
    this.trackSocketRoom(socketId, room.id);
    this.syncToRedis(room);
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
      void this.archiveRoom(room, "Phòng trống", participant.name);
      this.rooms.delete(room.id);
      this.removeFromRedis(room.id);
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
    this.syncToRedis(room);
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
    this.syncToRedis(room);
    return message;
  }

  addReaction(socketId: string, roomId: string, emoji: string) {
    const room = this.requireMembership(socketId, roomId);
    const sender = room.participants.find((item) => item.id === socketId)!;
    const allowed = new Set(["❤️", "🔥", "😂", "😱", "👏", "🎉"]);
    if (!allowed.has(emoji)) throw new Error("Biểu cảm không hợp lệ.");
    room.updatedAt = new Date().toISOString();
    this.syncToRedis(room);
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
    this.syncToRedis(room);
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

  forceCloseRoom(roomId: string) {
    const normalized = this.normalizeRoomId(roomId);
    const room = this.rooms.get(normalized);
    if (!room) return null;
    for (const participant of room.participants) {
      this.untrackSocketRoom(participant.id, normalized);
    }
    this.rooms.delete(normalized);
    this.removeFromRedis(normalized);
    return this.snapshot(room);
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
    const name = this.clean(identity?.name, 50) || "Khách NetPhim";
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
      senderName: "NetPhim",
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
    const expiresBefore = Date.now() - 2 * 60 * 60 * 1000;
    for (const [roomId, room] of this.rooms) {
      if (new Date(room.updatedAt).getTime() < expiresBefore) {
        for (const participant of room.participants) {
          this.untrackSocketRoom(participant.id, roomId);
        }
        void this.archiveRoom(room, "Hết hạn do không hoạt động");
        this.rooms.delete(roomId);
      }
    }
  }

  private async archiveRoom(
    room: InternalRoom,
    closeReason: string,
    hostFallback?: string,
  ) {
    const host = room.participants.find(
      (participant) => participant.id === room.hostId,
    );
    try {
      await this.prisma.watchPartyArchive.upsert({
        where: { id: room.id },
        create: {
          id: room.id,
          name: room.name,
          movieSlug: room.movie.slug,
          movieName: room.movie.name,
          episode: room.movie.episode,
          hostName: host?.name || hostFallback,
          peakParticipants: room.peakParticipants,
          messageCount: room.messages.length,
          closeReason,
          createdAt: new Date(room.createdAt),
        },
        update: {
          peakParticipants: room.peakParticipants,
          messageCount: room.messages.length,
          closeReason,
          endedAt: new Date(),
        },
      });
    } catch (error) {
      console.error(
        `[WatchParty] Không thể lưu lịch sử phòng ${room.id}`,
        error,
      );
    }
  }
}
