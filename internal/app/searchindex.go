package app

import (
	"context"
	"log/slog"
	"sync"
	"time"

	"github.com/charmbracelet/crush/internal/pubsub"
	"github.com/charmbracelet/crush/internal/session"
)

const searchIndexDebounce = 2 * time.Second

// startSearchIndexUpdater rebuilds sessions.searchable_text after message changes.
func (app *App) startSearchIndexUpdater(ctx context.Context) {
	if app.Messages == nil || app.Sessions == nil {
		return
	}

	var (
		mu     sync.Mutex
		timers = make(map[string]*time.Timer)
	)

	schedule := func(sessionID string) {
		if sessionID == "" || app.Sessions.IsAgentToolSession(sessionID) {
			return
		}
		mu.Lock()
		defer mu.Unlock()
		if t, ok := timers[sessionID]; ok {
			t.Stop()
		}
		timers[sessionID] = time.AfterFunc(searchIndexDebounce, func() {
			reindexCtx, cancel := context.WithTimeout(context.WithoutCancel(ctx), 30*time.Second)
			defer cancel()
			if err := app.reindexSessionSearchText(reindexCtx, sessionID); err != nil {
				slog.Warn("Failed to reindex session searchable text", "error", err, "sessionID", sessionID)
			}
			mu.Lock()
			delete(timers, sessionID)
			mu.Unlock()
		})
	}

	go app.backfillEmptySearchableText(ctx)

	events := app.Messages.Subscribe(ctx)
	go func() {
		for {
			select {
			case <-ctx.Done():
				mu.Lock()
				for _, t := range timers {
					t.Stop()
				}
				mu.Unlock()
				return
			case event, ok := <-events:
				if !ok {
					return
				}
				if event.Type == pubsub.DeletedEvent {
					continue
				}
				schedule(event.Payload.SessionID)
			}
		}
	}()
}

func (app *App) reindexSessionSearchText(ctx context.Context, sessionID string) error {
	if err := app.Messages.FlushAll(ctx); err != nil {
		return err
	}
	messages, err := app.Messages.List(ctx, sessionID)
	if err != nil {
		return err
	}
	text := session.BuildSearchableText(messages)
	return app.Sessions.UpdateSearchableText(ctx, sessionID, text)
}

func (app *App) backfillEmptySearchableText(ctx context.Context) {
	const batchSize = 16
	for i := 0; i < 8; i++ {
		select {
		case <-ctx.Done():
			return
		default:
		}
		sessions, err := app.Sessions.List(ctx)
		if err != nil {
			slog.Warn("Failed to list sessions for searchable text backfill", "error", err)
			return
		}
		var pending []string
		for _, sess := range sessions {
			if sess.SearchableText == "" && sess.MessageCount > 0 {
				pending = append(pending, sess.ID)
			}
			if len(pending) >= batchSize {
				break
			}
		}
		if len(pending) == 0 {
			return
		}
		for _, sessionID := range pending {
			if err := app.reindexSessionSearchText(ctx, sessionID); err != nil {
				slog.Warn("Failed to backfill searchable text", "error", err, "sessionID", sessionID)
			}
		}
	}
}
