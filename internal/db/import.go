package db

import (
	"context"
	"database/sql"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
)

// ImportProjectSessions copies sessions and related rows from a
// per-project crush.db into the global database when the project has
// not yet been migrated. Existing session IDs are skipped.
func ImportProjectSessions(ctx context.Context, globalConn *sql.DB, projectPath, localDBPath string) error {
	if projectPath == "" {
		return nil
	}

	localDBPath = filepath.Clean(localDBPath)
	globalPath := filepath.Join(filepath.Dir(localDBPath), "crush.db")
	if sameFile(localDBPath, globalPath) {
		return nil
	}

	if _, err := os.Stat(localDBPath); err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return fmt.Errorf("stat local database: %w", err)
	}

	var existing int64
	if err := globalConn.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM sessions WHERE parent_session_id IS NULL AND project_path = ?`,
		projectPath,
	).Scan(&existing); err != nil {
		return fmt.Errorf("count existing sessions: %w", err)
	}
	if existing > 0 {
		return nil
	}

	tx, err := globalConn.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin import transaction: %w", err)
	}
	defer tx.Rollback() //nolint:errcheck

	if _, err := tx.ExecContext(ctx, `ATTACH DATABASE ? AS local_db`, localDBPath); err != nil {
		return fmt.Errorf("attach local database: %w", err)
	}
	defer func() {
		if _, detachErr := tx.ExecContext(ctx, `DETACH DATABASE local_db`); detachErr != nil {
			slog.Warn("Failed to detach local database after import", "error", detachErr)
		}
	}()

	// Copy parent sessions first, tagging them with the resolved project path.
	if _, err := tx.ExecContext(ctx, `
		INSERT INTO sessions (
			id, parent_session_id, title, message_count, prompt_tokens,
			completion_tokens, cost, summary_message_id, todos, project_path,
			updated_at, created_at
		)
		SELECT
			id, parent_session_id, title, message_count, prompt_tokens,
			completion_tokens, cost, summary_message_id, todos, ?,
			updated_at, created_at
		FROM local_db.sessions
		WHERE id NOT IN (SELECT id FROM sessions)
	`, projectPath); err != nil {
		return fmt.Errorf("import sessions: %w", err)
	}

	// Child sessions (title/task) inherit project_path from their parent row.
	if _, err := tx.ExecContext(ctx, `
		INSERT INTO sessions (
			id, parent_session_id, title, message_count, prompt_tokens,
			completion_tokens, cost, summary_message_id, todos, project_path,
			updated_at, created_at
		)
		SELECT
			s.id, s.parent_session_id, s.title, s.message_count, s.prompt_tokens,
			s.completion_tokens, s.cost, s.summary_message_id, s.todos,
			COALESCE(p.project_path, ?),
			s.updated_at, s.created_at
		FROM local_db.sessions s
		LEFT JOIN sessions p ON p.id = s.parent_session_id
		WHERE s.parent_session_id IS NOT NULL
		  AND s.id NOT IN (SELECT id FROM sessions)
	`, projectPath); err != nil {
		return fmt.Errorf("import child sessions: %w", err)
	}

	if _, err := tx.ExecContext(ctx, `
		INSERT INTO messages (
			id, session_id, role, parts, model, provider, is_summary,
			created_at, updated_at, finished_at
		)
		SELECT
			id, session_id, role, parts, model, provider, is_summary,
			created_at, updated_at, finished_at
		FROM local_db.messages
		WHERE id NOT IN (SELECT id FROM messages)
	`); err != nil {
		return fmt.Errorf("import messages: %w", err)
	}

	if _, err := tx.ExecContext(ctx, `
		INSERT INTO files (
			id, session_id, path, content, version, created_at, updated_at
		)
		SELECT id, session_id, path, content, version, created_at, updated_at
		FROM local_db.files
		WHERE id NOT IN (SELECT id FROM files)
	`); err != nil {
		return fmt.Errorf("import files: %w", err)
	}

	if _, err := tx.ExecContext(ctx, `
		INSERT INTO read_files (session_id, path, read_at)
		SELECT session_id, path, read_at
		FROM local_db.read_files
		WHERE rowid NOT IN (SELECT rowid FROM read_files)
	`); err != nil {
		// read_files may not exist in older project databases.
		slog.Debug("Skipping read_files import", "error", err)
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("commit import transaction: %w", err)
	}

	slog.Info("Imported project sessions into global database", "project", projectPath)
	return nil
}

func sameFile(a, b string) bool {
	aAbs, errA := filepath.Abs(a)
	bAbs, errB := filepath.Abs(b)
	if errA != nil || errB != nil {
		return filepath.Clean(a) == filepath.Clean(b)
	}
	return aAbs == bAbs
}
