package party

import (
	"encoding/json"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

func TestWatchPartyRoomLifecycle(t *testing.T) {
	hub := NewHub()
	client := &Client{
		Hub:  hub,
		ID:   "client-1",
		Send: make(chan []byte, 16),
		Identity: Identity{
			UserID: "u1",
			Name:   "Alice",
		},
	}
	hub.RegisterClient(client)
	defer hub.UnregisterClient(client)

	// 1. Create Room
	room := hub.CreateRoom(client, "Phòng xem Spider-Man", Movie{
		Slug: "spider-man",
		Name: "Spider-Man",
	})
	if room == nil {
		t.Fatal("expected room to be created")
	}
	if room.HostID != client.ID {
		t.Fatalf("expected host %s, got %s", client.ID, room.HostID)
	}

	// 2. Chat message
	msg, err := hub.AddMessage(client, room.ID, "Chào mọi người!")
	if err != nil {
		t.Fatalf("unexpected error adding message: %v", err)
	}
	if msg.Text != "Chào mọi người!" {
		t.Fatalf("expected message text, got %s", msg.Text)
	}

	// 3. Player state update (Play at 120.5s)
	state, err := hub.UpdatePlayerState(client, room.ID, PlayerState{
		Action:      ActionPlay,
		CurrentTime: 120.5,
		Episode:     "1",
		SenderID:    client.ID,
		ServerTime:  time.Now().UnixMilli(),
	})
	if err != nil {
		t.Fatalf("unexpected error updating state: %v", err)
	}
	if state.Action != ActionPlay || state.CurrentTime != 120.5 {
		t.Fatalf("unexpected state: %+v", state)
	}

	// 4. Check snapshot
	snap := room.Snapshot()
	if snap["name"] != "Phòng xem Spider-Man" {
		t.Fatalf("unexpected room snapshot name: %v", snap["name"])
	}

	// 5. Check lobby
	lobby := hub.GetLobby()
	if len(lobby) != 1 {
		t.Fatalf("expected 1 lobby item, got %d", len(lobby))
	}
}

func TestWatchPartyWebSocketEndpoints(t *testing.T) {
	gin.SetMode(gin.TestMode)
	hub := NewHub()
	router := gin.New()
	hub.RegisterRoutes(router)

	server := httptest.NewServer(router)
	defer server.Close()

	// Convert http URL to ws URL
	wsURL := "ws" + strings.TrimPrefix(server.URL, "http") + "/watch-party/ws?name=Bob"
	ws, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	if err != nil {
		t.Fatalf("failed to connect to websocket: %v", err)
	}
	defer ws.Close()

	// Read initial lobby state
	_ = ws.SetReadDeadline(time.Now().Add(2 * time.Second))
	_, msg, err := ws.ReadMessage()
	if err != nil {
		t.Fatalf("failed to read initial message: %v", err)
	}

	var parsed WSOutgoingMessage
	if err := json.Unmarshal(msg, &parsed); err != nil {
		t.Fatalf("invalid json message: %v", err)
	}
	if parsed.Event != "lobby:list" {
		t.Fatalf("expected initial event lobby:list, got %s", parsed.Event)
	}
}
