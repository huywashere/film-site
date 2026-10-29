package party

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  16 * 1024,
	WriteBufferSize: 16 * 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow cross-origin WebSocket connections
	},
}

type Hub struct {
	rooms   map[string]*Room
	clients map[string]*Client
	mu      sync.RWMutex
}

func NewHub() *Hub {
	return &Hub{
		rooms:   make(map[string]*Room),
		clients: make(map[string]*Client),
	}
}

func randomUUID() string {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}

func (h *Hub) RegisterClient(client *Client) {
	h.mu.Lock()
	h.clients[client.ID] = client
	h.mu.Unlock()
}

func (h *Hub) UnregisterClient(client *Client) {
	h.mu.Lock()
	delete(h.clients, client.ID)
	roomID := client.RoomID
	h.mu.Unlock()

	if roomID != "" {
		h.LeaveRoom(client, roomID)
	}
}

func (h *Hub) HandleClientMessage(client *Client, msg WSIncomingMessage) {
	switch msg.Event {
	case "room:create":
		name, _ := msg.Data["name"].(string)
		movieData, _ := msg.Data["movie"].(map[string]any)
		movie := Movie{}
		if movieData != nil {
			movie.Slug, _ = movieData["slug"].(string)
			movie.Name, _ = movieData["name"].(string)
			movie.PosterURL, _ = movieData["posterUrl"].(string)
			movie.Episode, _ = movieData["episode"].(string)
		}
		room := h.CreateRoom(client, name, movie)
		client.Emit("room:snapshot", room.Snapshot())
		h.BroadcastLobby()

	case "room:join":
		roomID, _ := msg.Data["roomId"].(string)
		room, err := h.JoinRoom(client, roomID)
		if err != nil {
			client.Emit("error", map[string]string{"message": err.Error()})
			return
		}
		h.BroadcastToRoom(room.ID, "room:snapshot", room.Snapshot())
		h.BroadcastLobby()

	case "room:leave":
		roomID, _ := msg.Data["roomId"].(string)
		if roomID == "" {
			roomID = client.RoomID
		}
		h.LeaveRoom(client, roomID)
		h.BroadcastLobby()

	case "chat:send":
		roomID, _ := msg.Data["roomId"].(string)
		if roomID == "" {
			roomID = client.RoomID
		}
		text, _ := msg.Data["text"].(string)
		chatMsg, err := h.AddMessage(client, roomID, text)
		if err == nil {
			h.BroadcastToRoom(roomID, "chat:message", chatMsg)
		}

	case "reaction:send":
		roomID, _ := msg.Data["roomId"].(string)
		if roomID == "" {
			roomID = client.RoomID
		}
		emoji, _ := msg.Data["emoji"].(string)
		reaction := Reaction{
			ID:           randomUUID(),
			SenderID:     client.ID,
			SenderName:   client.Identity.Name,
			SenderAvatar: client.Identity.Avatar,
			Emoji:        emoji,
			Timestamp:    time.Now().UTC().Format(time.RFC3339),
		}
		h.BroadcastToRoom(roomID, "reaction", reaction)

	case "player:state":
		roomID, _ := msg.Data["roomId"].(string)
		if roomID == "" {
			roomID = client.RoomID
		}
		actionStr, _ := msg.Data["action"].(string)
		currentTime, _ := msg.Data["currentTime"].(float64)
		episode, _ := msg.Data["episode"].(string)

		state := PlayerState{
			Action:      PlaybackAction(actionStr),
			CurrentTime: currentTime,
			Episode:     episode,
			UpdatedAt:   time.Now().UTC().Format(time.RFC3339),
			SenderID:    client.ID,
			ServerTime:  time.Now().UnixMilli(),
		}

		updatedState, err := h.UpdatePlayerState(client, roomID, state)
		if err == nil {
			// Broadcast player state to other peers in room
			h.BroadcastToRoomExcept(roomID, client.ID, "player:state", updatedState)
		}

	case "lobby:list":
		client.Emit("lobby:list", h.GetLobby())
	}
}

func (h *Hub) CreateRoom(client *Client, name string, movie Movie) *Room {
	roomID := randomUUID()[:8]
	if name == "" {
		name = fmt.Sprintf("Phòng của %s", client.Identity.Name)
	}

	room := &Room{
		ID:           roomID,
		Name:         name,
		Movie:        movie,
		HostID:       client.ID,
		Clients:      make(map[string]*Client),
		Participants: make(map[string]Participant),
		Messages:     make([]Message, 0),
		CreatedAt:    time.Now().UTC(),
		UpdatedAt:    time.Now().UTC(),
	}

	h.mu.Lock()
	h.rooms[roomID] = room
	h.mu.Unlock()

	_, _ = h.JoinRoom(client, roomID)
	return room
}

func (h *Hub) JoinRoom(client *Client, roomID string) (*Room, error) {
	h.mu.RLock()
	room, ok := h.rooms[roomID]
	h.mu.RUnlock()

	if !ok || room == nil {
		return nil, fmt.Errorf("không tìm thấy phòng xem chung")
	}

	room.Mu.Lock()
	defer room.Mu.Unlock()

	client.RoomID = roomID
	room.Clients[client.ID] = client

	isHost := len(room.Participants) == 0 || room.HostID == client.ID
	if isHost {
		room.HostID = client.ID
	}

	room.Participants[client.ID] = Participant{
		ID:       client.ID,
		UserID:   client.Identity.UserID,
		Name:     client.Identity.Name,
		Avatar:   client.Identity.Avatar,
		IsHost:   isHost,
		JoinedAt: time.Now().UTC().Format(time.RFC3339),
	}
	room.UpdatedAt = time.Now().UTC()

	return room, nil
}

func (h *Hub) LeaveRoom(client *Client, roomID string) {
	h.mu.RLock()
	room, ok := h.rooms[roomID]
	h.mu.RUnlock()

	if !ok || room == nil {
		return
	}

	room.Mu.Lock()
	delete(room.Clients, client.ID)
	delete(room.Participants, client.ID)
	client.RoomID = ""
	remaining := len(room.Participants)

	// If host left, elect new host if participants remain
	if room.HostID == client.ID && remaining > 0 {
		for pid, p := range room.Participants {
			p.IsHost = true
			room.Participants[pid] = p
			room.HostID = pid
			break
		}
	}
	room.UpdatedAt = time.Now().UTC()
	room.Mu.Unlock()

	// If empty room, delete after 5 minutes
	if remaining == 0 {
		h.mu.Lock()
		delete(h.rooms, roomID)
		h.mu.Unlock()
	} else {
		h.BroadcastToRoom(roomID, "room:snapshot", room.Snapshot())
	}
}

func (h *Hub) AddMessage(client *Client, roomID string, text string) (*Message, error) {
	h.mu.RLock()
	room, ok := h.rooms[roomID]
	h.mu.RUnlock()

	if !ok || room == nil {
		return nil, fmt.Errorf("room not found")
	}

	trimmed := strings.TrimSpace(text)
	if trimmed == "" {
		return nil, fmt.Errorf("empty text")
	}

	msg := Message{
		ID:           randomUUID(),
		SenderID:     client.ID,
		SenderName:   client.Identity.Name,
		SenderAvatar: client.Identity.Avatar,
		Text:         trimmed,
		Timestamp:    time.Now().UTC().Format(time.RFC3339),
	}

	room.Mu.Lock()
	room.Messages = append(room.Messages, msg)
	if len(room.Messages) > 100 {
		room.Messages = room.Messages[len(room.Messages)-100:]
	}
	room.UpdatedAt = time.Now().UTC()
	room.Mu.Unlock()

	return &msg, nil
}

func (h *Hub) UpdatePlayerState(client *Client, roomID string, state PlayerState) (*PlayerState, error) {
	h.mu.RLock()
	room, ok := h.rooms[roomID]
	h.mu.RUnlock()

	if !ok || room == nil {
		return nil, fmt.Errorf("room not found")
	}

	room.Mu.Lock()
	room.PlayerState = &state
	room.UpdatedAt = time.Now().UTC()
	room.Mu.Unlock()

	return &state, nil
}

func (h *Hub) BroadcastToRoom(roomID string, event string, data any) {
	h.mu.RLock()
	room, ok := h.rooms[roomID]
	h.mu.RUnlock()

	if !ok || room == nil {
		return
	}

	room.Mu.RLock()
	defer room.Mu.RUnlock()

	for _, client := range room.Clients {
		client.Emit(event, data)
	}
}

func (h *Hub) BroadcastToRoomExcept(roomID string, exceptClientID string, event string, data any) {
	h.mu.RLock()
	room, ok := h.rooms[roomID]
	h.mu.RUnlock()

	if !ok || room == nil {
		return
	}

	room.Mu.RLock()
	defer room.Mu.RUnlock()

	for cid, client := range room.Clients {
		if cid != exceptClientID {
			client.Emit(event, data)
		}
	}
}

func (h *Hub) BroadcastLobby() {
	lobby := h.GetLobby()
	h.mu.RLock()
	defer h.mu.RUnlock()

	for _, client := range h.clients {
		if client.RoomID == "" {
			client.Emit("lobby:list", lobby)
		}
	}
}

func (h *Hub) GetLobby() []map[string]any {
	h.mu.RLock()
	defer h.mu.RUnlock()

	result := make([]map[string]any, 0, len(h.rooms))
	for _, room := range h.rooms {
		result = append(result, room.LobbyItem())
	}
	return result
}

func (h *Hub) GetRoom(id string) *Room {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return h.rooms[id]
}

func (h *Hub) RegisterRoutes(router *gin.Engine) {
	// WebSocket Connection Handler
	wsHandler := func(c *gin.Context) {
		conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
		if err != nil {
			return
		}

		name := c.Query("name")
		if name == "" {
			name = fmt.Sprintf("Khách-%s", randomUUID()[:4])
		}
		userID := c.Query("userId")
		avatar := c.Query("avatar")

		client := &Client{
			Hub:  h,
			Conn: conn,
			Send: make(chan []byte, 256),
			ID:   randomUUID()[:12],
			Identity: Identity{
				UserID: userID,
				Name:   name,
				Avatar: avatar,
			},
		}

		h.RegisterClient(client)

		go client.writePump()
		go client.readPump()

		// Send initial lobby state
		client.Emit("lobby:list", h.GetLobby())
	}

	router.GET("/watch-party/ws", wsHandler)
	router.GET("/v1/watch-party/ws", wsHandler)

	// REST APIs for inspection and integrations
	router.GET("/v1/watch-party/rooms", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"rooms": h.GetLobby()})
	})

	router.GET("/v1/watch-party/rooms/:id", func(c *gin.Context) {
		room := h.GetRoom(c.Param("id"))
		if room == nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Phòng xem chung không tồn tại"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"room": room.Snapshot()})
	})
}

