package party

import (
	"sync"
	"time"
)

type PlaybackAction string

const (
	ActionPlay    PlaybackAction = "play"
	ActionPause   PlaybackAction = "pause"
	ActionSeek    PlaybackAction = "seek"
	ActionEnded   PlaybackAction = "ended"
	ActionEpisode PlaybackAction = "episode"
)

type Identity struct {
	UserID string `json:"userId"`
	Name   string `json:"name"`
	Avatar string `json:"avatar"`
}

type Movie struct {
	Slug      string `json:"slug"`
	Name      string `json:"name"`
	PosterURL string `json:"posterUrl,omitempty"`
	Episode   string `json:"episode,omitempty"`
}

type Participant struct {
	ID       string `json:"id"`
	UserID   string `json:"userId,omitempty"`
	Name     string `json:"name"`
	Avatar   string `json:"avatar"`
	IsHost   bool   `json:"isHost"`
	JoinedAt string `json:"joinedAt"`
}

type Message struct {
	ID           string `json:"id"`
	SenderID     string `json:"senderId"`
	SenderName   string `json:"senderName"`
	SenderAvatar string `json:"senderAvatar"`
	Text         string `json:"text"`
	Timestamp    string `json:"timestamp"`
	IsSystem     bool   `json:"isSystem,omitempty"`
}

type Reaction struct {
	ID           string `json:"id"`
	SenderID     string `json:"senderId"`
	SenderName   string `json:"senderName"`
	SenderAvatar string `json:"senderAvatar"`
	Emoji        string `json:"emoji"`
	Timestamp    string `json:"timestamp"`
}

type PlayerState struct {
	Action      PlaybackAction `json:"action"`
	CurrentTime float64        `json:"currentTime"`
	Episode     string         `json:"episode"`
	UpdatedAt   string         `json:"updatedAt"`
	SenderID    string         `json:"senderId"`
	ServerTime  int64          `json:"serverTime"`
}

type Room struct {
	ID           string
	Name         string
	Movie        Movie
	HostID       string
	Clients      map[string]*Client
	Participants map[string]Participant
	Messages     []Message
	PlayerState  *PlayerState
	CreatedAt    time.Time
	UpdatedAt    time.Time
	Mu           sync.RWMutex
}

func (r *Room) Snapshot() map[string]any {
	r.Mu.RLock()
	defer r.Mu.RUnlock()

	parts := make([]Participant, 0, len(r.Participants))
	for _, p := range r.Participants {
		parts = append(parts, p)
	}

	msgs := make([]Message, len(r.Messages))
	copy(msgs, r.Messages)

	return map[string]any{
		"id":           r.ID,
		"name":         r.Name,
		"movie":        r.Movie,
		"hostId":       r.HostID,
		"participants": parts,
		"messages":     msgs,
		"playerState":  r.PlayerState,
		"createdAt":    r.CreatedAt.UTC().Format(time.RFC3339),
		"updatedAt":    r.UpdatedAt.UTC().Format(time.RFC3339),
	}
}

func (r *Room) LobbyItem() map[string]any {
	r.Mu.RLock()
	defer r.Mu.RUnlock()

	hostName := "Host"
	if host, ok := r.Participants[r.HostID]; ok && host.Name != "" {
		hostName = host.Name
	}

	return map[string]any{
		"id":               r.ID,
		"name":             r.Name,
		"movie":            r.Movie,
		"hostName":         hostName,
		"participantCount": len(r.Participants),
		"createdAt":        r.CreatedAt.UTC().Format(time.RFC3339),
		"updatedAt":        r.UpdatedAt.UTC().Format(time.RFC3339),
	}
}

type WSIncomingMessage struct {
	Event string         `json:"event"`
	Data  map[string]any `json:"data"`
}

type WSOutgoingMessage struct {
	Event string `json:"event"`
	Data  any    `json:"data"`
}

