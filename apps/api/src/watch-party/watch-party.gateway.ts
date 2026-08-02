import {
  ConnectedSocket,
  MessageBody,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import type { Namespace, Socket } from "socket.io";
import { WatchPartyService } from "./watch-party.service";
import {
  CreateRoomPayload,
  JoinRoomPayload,
  PlayerStatePayload,
} from "./watch-party.types";

const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(",").map((origin) => origin.trim())
  : ["http://localhost:3000"];

@WebSocketGateway({
  namespace: "/watch-party",
  cors: { origin: allowedOrigins, credentials: true },
  maxHttpBufferSize: 16_384,
})
export class WatchPartyGateway implements OnGatewayDisconnect {
  @WebSocketServer()
  private namespace!: Namespace;

  private readonly activity = new Map<string, Map<string, number[]>>();

  constructor(private readonly rooms: WatchPartyService) {}

  @SubscribeMessage("rooms:list")
  listRooms() {
    return { ok: true, rooms: this.rooms.listRooms() };
  }

  @SubscribeMessage("room:create")
  async createRoom(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: CreateRoomPayload,
  ) {
    return this.execute(async () => {
      const room = this.rooms.createRoom(socket.id, payload || {});
      await socket.join(this.channel(room.id));
      this.emitLobby();
      return { room };
    });
  }

  @SubscribeMessage("room:join")
  async joinRoom(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: JoinRoomPayload,
  ) {
    return this.execute(async () => {
      const roomId = String(payload?.roomId || "");
      const result = this.rooms.joinRoom(socket.id, roomId, payload?.identity);
      await socket.join(this.channel(result.room.id));
      this.namespace
        .to(this.channel(result.room.id))
        .emit("room:snapshot", result.room);
      this.emitLobby();
      return { room: result.room };
    });
  }

  @SubscribeMessage("room:leave")
  async leaveRoom(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: { roomId?: string },
  ) {
    return this.execute(async () => {
      const result = this.rooms.leaveRoom(
        socket.id,
        String(payload?.roomId || ""),
      );
      if (result) {
        await socket.leave(this.channel(result.roomId));
        if (result.room) {
          this.namespace
            .to(this.channel(result.roomId))
            .emit("room:snapshot", result.room);
        }
        this.emitLobby();
      }
      return {};
    });
  }

  @SubscribeMessage("chat:send")
  sendMessage(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: { roomId?: string; text?: string },
  ) {
    return this.execute(() => {
      this.enforceRateLimit(socket.id, "chat", 6, 5_000);
      const roomId = String(payload?.roomId || "");
      const message = this.rooms.addMessage(
        socket.id,
        roomId,
        String(payload?.text || ""),
      );
      this.namespace.to(this.channel(roomId)).emit("chat:message", message);
      return { message };
    });
  }

  @SubscribeMessage("reaction:send")
  sendReaction(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: { roomId?: string; emoji?: string },
  ) {
    return this.execute(() => {
      this.enforceRateLimit(socket.id, "reaction", 12, 5_000);
      const roomId = String(payload?.roomId || "");
      const reaction = this.rooms.addReaction(
        socket.id,
        roomId,
        String(payload?.emoji || ""),
      );
      this.namespace.to(this.channel(roomId)).emit("reaction", reaction);
      return {};
    });
  }

  @SubscribeMessage("player:state")
  updatePlayer(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: PlayerStatePayload,
  ) {
    return this.execute(() => {
      this.enforceRateLimit(socket.id, "player", 16, 5_000);
      const roomId = String(payload?.roomId || "");
      const state = this.rooms.updatePlayer(
        socket.id,
        roomId,
        payload.action || "pause",
        Number(payload.currentTime || 0),
        String(payload.episode || ""),
      );
      socket.to(this.channel(roomId)).emit("player:state", state);
      return { state };
    });
  }

  handleDisconnect(socket: Socket) {
    this.activity.delete(socket.id);
    const results = this.rooms.leaveAll(socket.id);
    for (const result of results) {
      if (result.room) {
        this.namespace
          .to(this.channel(result.roomId))
          .emit("room:snapshot", result.room);
      }
    }
    if (results.length > 0) this.emitLobby();
  }

  private async execute(callback: () => unknown | Promise<unknown>) {
    try {
      const data = await callback();
      return { ok: true, ...(data as object) };
    } catch (error) {
      return {
        ok: false,
        error:
          error instanceof Error ? error.message : "Không thể xử lý yêu cầu.",
      };
    }
  }

  private emitLobby() {
    this.namespace.emit("rooms:changed", this.rooms.listRooms());
  }

  private channel(roomId: string) {
    return `party:${roomId.trim().toUpperCase()}`;
  }

  private enforceRateLimit(
    socketId: string,
    key: string,
    limit: number,
    windowMs: number,
  ) {
    const now = Date.now();
    const socketActivity =
      this.activity.get(socketId) ?? new Map<string, number[]>();
    const attempts = (socketActivity.get(key) ?? []).filter(
      (time) => now - time < windowMs,
    );
    if (attempts.length >= limit) {
      throw new Error("Bạn thao tác quá nhanh, hãy thử lại sau.");
    }
    attempts.push(now);
    socketActivity.set(key, attempts);
    this.activity.set(socketId, socketActivity);
  }
}
