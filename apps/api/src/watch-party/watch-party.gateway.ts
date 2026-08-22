import {
  ConnectedSocket,
  MessageBody,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import type { Namespace, Socket } from "socket.io";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { randomUUID } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
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
export class WatchPartyGateway implements OnGatewayDisconnect, OnGatewayInit {
  @WebSocketServer()
  private namespace!: Namespace;

  private readonly activity = new Map<string, Map<string, number[]>>();
  private lobbyTimer: NodeJS.Timeout | null = null;

  constructor(
    private readonly rooms: WatchPartyService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  afterInit(namespace: Namespace) {
    namespace.use(async (socket, next) => {
      try {
        const cookies = this.parseCookies(socket.handshake.headers.cookie || "");
        const token = cookies.accessToken;
        if (token) {
          const payload = await this.jwt.verifyAsync(token, {
            secret: this.config.get<string>("JWT_SECRET"),
          });
          const user = await this.prisma.user.findUnique({
            where: { id: payload.sub },
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
              isBanned: true,
              isLocked: true,
            },
          });
          if (!user || user.isBanned || user.isLocked) {
            return next(new Error("Tài khoản không được phép tham gia."));
          }
          socket.data.identity = {
            userId: user.id,
            name: user.displayName || user.username,
            avatar: user.avatarUrl || undefined,
          };
        } else {
          const guestId = `guest-${randomUUID()}`;
          const guestName = `Khách ${guestId.slice(-6).toUpperCase()}`;
          socket.data.identity = {
            userId: guestId,
            name: guestName,
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(guestName)}&background=17202a&color=ffffff`,
          };
        }
        next();
      } catch {
        next(new Error("Phiên đăng nhập không hợp lệ."));
      }
    });
  }

  @SubscribeMessage("rooms:list")
  listRooms(@ConnectedSocket() socket: Socket) {
    this.enforceRateLimit(this.rateKey(socket), "list", 10, 10_000);
    return { ok: true, rooms: this.rooms.listRooms() };
  }

  @SubscribeMessage("room:create")
  async createRoom(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: CreateRoomPayload,
  ) {
    return this.execute(async () => {
      this.enforceRateLimit(this.rateKey(socket), "create", 3, 60_000);
      const room = this.rooms.createRoom(
        socket.id,
        payload || {},
        socket.data.identity,
      );
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
      this.enforceRateLimit(this.rateKey(socket), "join", 12, 30_000);
      const roomId = String(payload?.roomId || "");
      const result = this.rooms.joinRoom(
        socket.id,
        roomId,
        socket.data.identity,
      );
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
      this.enforceRateLimit(this.rateKey(socket), "chat", 6, 5_000);
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
      this.enforceRateLimit(this.rateKey(socket), "reaction", 12, 5_000);
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
      this.enforceRateLimit(this.rateKey(socket), "player", 16, 5_000);
      const roomId = String(payload?.roomId || "");
      const state = this.rooms.updatePlayer(
        socket.id,
        roomId,
        payload.action || "pause",
        Number(payload.currentTime || 0),
        String(payload.episode || ""),
      );
      socket.to(this.channel(roomId)).emit("player:state", {
        ...state,
        serverTime: Date.now(),
      });
      return { state };
    });
  }

  handleDisconnect(socket: Socket) {
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
    if (this.lobbyTimer) return;
    this.lobbyTimer = setTimeout(() => {
      this.lobbyTimer = null;
      this.namespace.emit("rooms:changed", this.rooms.listRooms());
    }, 1200);
  }

  private channel(roomId: string) {
    return `party:${roomId.trim().toUpperCase()}`;
  }

  private enforceRateLimit(
    identifier: string,
    key: string,
    limit: number,
    windowMs: number,
  ) {
    const now = Date.now();
    const socketActivity =
      this.activity.get(identifier) ?? new Map<string, number[]>();
    const attempts = (socketActivity.get(key) ?? []).filter(
      (time) => now - time < windowMs,
    );
    if (attempts.length >= limit) {
      throw new Error("Bạn thao tác quá nhanh, hãy thử lại sau.");
    }
    attempts.push(now);
    socketActivity.set(key, attempts);
    this.activity.set(identifier, socketActivity);
    while (this.activity.size > 10_000) {
      const oldest = this.activity.keys().next().value;
      if (!oldest) break;
      this.activity.delete(oldest);
    }
  }

  private rateKey(socket: Socket) {
    return `ip:${socket.handshake.address || "unknown"}`;
  }

  private parseCookies(raw: string): Record<string, string> {
    return Object.fromEntries(
      raw
        .split(";")
        .map((part) => part.trim())
        .filter(Boolean)
        .map((part) => {
          const separator = part.indexOf("=");
          if (separator < 0) return [part, ""];
          const key = part.slice(0, separator);
          const value = part.slice(separator + 1);
          try {
            return [key, decodeURIComponent(value)];
          } catch {
            return [key, value];
          }
        }),
    );
  }
}
