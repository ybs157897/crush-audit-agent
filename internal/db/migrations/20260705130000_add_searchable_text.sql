-- +goose Up
-- +goose StatementBegin
ALTER TABLE sessions ADD COLUMN searchable_text TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_sessions_project_updated ON sessions (project_path, updated_at);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX IF EXISTS idx_sessions_project_updated;
-- SQLite does not support DROP COLUMN before 3.35; column remains on down.
-- +goose StatementEnd
